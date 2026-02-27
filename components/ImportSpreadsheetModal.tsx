'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Upload } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// ---- Types ----
type Step = 'upload' | 'map' | 'review';

interface ImportSpreadsheetModalProps {
  existingItemNames: string[];
  onClose: () => void;
  onSuccess: () => void;
}

// ---- Gear fields the user can map columns to ----
const GEAR_FIELDS = [
  { value: 'item_name', label: 'Item Name *' },
  { value: 'description', label: 'Description' },
  { value: 'category', label: 'Category' },
  { value: 'condition', label: 'Condition' },
] as const;

// ---- Synonym auto-mapper: normalised column header → gear field ----
const SYNONYMS: Record<string, string> = {
  name: 'item_name', item: 'item_name', 'item name': 'item_name',
  gear: 'item_name', 'gear name': 'item_name', title: 'item_name', thing: 'item_name',
  description: 'description', desc: 'description', notes: 'description',
  note: 'description', about: 'description', details: 'description', info: 'description',
  category: 'category', cat: 'category', type: 'category', kind: 'category',
  condition: 'condition', cond: 'condition', quality: 'condition', state: 'condition',
};

// ---- File parsing (returns same shape for CSV and Excel) ----
async function parseFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data as string[][];
          if (!data.length) return reject(new Error('File is empty'));
          const [headers, ...rows] = data;
          resolve({ headers: headers.map(String), rows: rows.map(r => r.map(String)) });
        },
        error: (err) => reject(new Error(err.message)),
      });
    });
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][];
    if (!data.length) throw new Error('File is empty');
    const [headers, ...rows] = data;
    return { headers: headers.map(String), rows: rows.map(r => r.map(String)) };
  }

  throw new Error('Unsupported file type. Please use .csv, .xlsx, or .xls');
}

// ---- Component ----
export default function ImportSpreadsheetModal({
  existingItemNames,
  onClose,
  onSuccess,
}: ImportSpreadsheetModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Step 1: handle file drop/select ----
  const handleFile = async (file: File) => {
    setFileError('');
    try {
      const { headers: h, rows: r } = await parseFile(file);
      setHeaders(h);
      setRows(r);
      const map: Record<string, string> = {};
      h.forEach(col => { map[col] = SYNONYMS[col.toLowerCase().trim()] || 'skip'; });
      setColumnMap(map);
      setStep('map');
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : 'Could not read file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ---- Derived values ----
  const nameCol = Object.entries(columnMap).find(([, v]) => v === 'item_name')?.[0];
  const nameColIdx = nameCol !== undefined ? headers.indexOf(nameCol) : -1;
  const validRows = rows.filter(row => nameColIdx >= 0 && row[nameColIdx]?.trim());

  const existingLower = existingItemNames.map(n => n.toLowerCase());
  const duplicateIndices = new Set(
    validRows
      .map((row, i) => ({ i, name: row[nameColIdx]?.toLowerCase() }))
      .filter(({ name }) => existingLower.includes(name))
      .map(({ i }) => i)
  );

  const rowsToImport = validRows.filter((_, i) => !skipped.has(i));

  // ---- Step 3: import ----
  const handleImport = async () => {
    setImporting(true);
    setImportError('');
    try {
      const insertData = rowsToImport.map(row => {
        const record: Record<string, string> = { availability_status: 'Not Available' };
        Object.entries(columnMap).forEach(([col, field]) => {
          if (field === 'skip') return;
          const idx = headers.indexOf(col);
          const val = row[idx]?.trim();
          if (val) record[field] = val;
        });
        return record;
      });
      const { error } = await supabase.from('gear_items').insert(insertData);
      if (error) throw error;
      onSuccess();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  // ---- Render ----
  const mappedFields = GEAR_FIELDS.filter(f =>
    Object.values(columnMap).includes(f.value)
  );

  return (
    <div style={overlayStyle}>
      <div style={{ ...modalStyle, maxWidth: step === 'review' ? '720px' : '520px' }}>
        <div style={{ padding: '28px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#2D241E' }}>
                {step === 'upload' && 'Import from Spreadsheet'}
                {step === 'map' && 'Map Your Columns'}
                {step === 'review' && 'Review & Import'}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#aaa' }}>
                {step === 'upload' && 'Accepts .csv, .xlsx, or .xls'}
                {step === 'map' && 'Tell us which column is which — we\'ve made our best guess'}
                {step === 'review' && `${rowsToImport.length} item${rowsToImport.length !== 1 ? 's' : ''} will be added as Not Available`}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', padding: '4px', lineHeight: 1 }}>
              <X size={20} />
            </button>
          </div>

          {/* ---- STEP 1: UPLOAD ---- */}
          {step === 'upload' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#00ccff' : '#ddd'}`,
                  borderRadius: '12px',
                  padding: '52px 24px',
                  textAlign: 'center' as const,
                  cursor: 'pointer',
                  backgroundColor: dragOver ? '#f0fbff' : '#fafafa',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <Upload size={32} color={dragOver ? '#00ccff' : '#ccc'} style={{ marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#2D241E', fontSize: '0.95rem' }}>Drop your file here</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa' }}>or click to browse — CSV, Excel, or Google Sheets export</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
              {fileError && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px', textAlign: 'center' as const }}>{fileError}</p>
              )}
            </>
          )}

          {/* ---- STEP 2: MAP ---- */}
          {step === 'map' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '6px', padding: '0 4px' }}>
                <span style={colHeadStyle}>Your column</span>
                <span style={colHeadStyle}>Maps to</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '24px' }}>
                {headers.map(col => {
                  const sampleVal = rows[0]?.[headers.indexOf(col)] || '';
                  return (
                    <div key={col} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                      <div style={{ padding: '10px 12px', backgroundColor: '#f7f7f7', borderRadius: '8px', border: '1px solid #eee', minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#2D241E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{col}</div>
                        {sampleVal && (
                          <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                            e.g. {sampleVal}
                          </div>
                        )}
                      </div>
                      <select
                        value={columnMap[col] || 'skip'}
                        onChange={(e) => setColumnMap(prev => ({ ...prev, [col]: e.target.value }))}
                        style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.85rem', color: '#2D241E', backgroundColor: '#fff', width: '100%' }}
                      >
                        <option value="skip">— Skip this column —</option>
                        {GEAR_FIELDS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep('upload')} style={secondaryBtnStyle}>← Back</button>
                <button
                  onClick={() => setStep('review')}
                  disabled={!nameCol || validRows.length === 0}
                  style={{ ...primaryBtnStyle, opacity: (nameCol && validRows.length > 0) ? 1 : 0.4, cursor: (nameCol && validRows.length > 0) ? 'pointer' : 'not-allowed' }}
                >
                  {!nameCol
                    ? 'Map "Item Name" to continue'
                    : validRows.length === 0
                    ? 'No valid rows found'
                    : `Preview ${validRows.length} item${validRows.length !== 1 ? 's' : ''} →`}
                </button>
              </div>
            </>
          )}

          {/* ---- STEP 3: REVIEW ---- */}
          {step === 'review' && (
            <>
              {duplicateIndices.size > 0 && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '0.85rem', color: '#92400e' }}>
                  <strong>These look like they might already be in your list.</strong> Uncheck any you don&apos;t want to add again.
                </div>
              )}
              <div style={{ overflowX: 'auto', marginBottom: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#fafafa' }}>
                      <th style={thStyle}></th>
                      {mappedFields.map(f => (
                        <th key={f.value} style={thStyle}>{f.label.replace(' *', '')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((row, i) => {
                      const isDupe = duplicateIndices.has(i);
                      const isSkipped = skipped.has(i);
                      return (
                        <tr key={i} style={{ borderTop: '1px solid #f5f5f5', opacity: isSkipped ? 0.35 : 1, transition: 'opacity 0.1s' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="checkbox"
                              checked={!isSkipped}
                              onChange={() => setSkipped(prev => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          {mappedFields.map(f => {
                            const col = Object.entries(columnMap).find(([, v]) => v === f.value)?.[0];
                            const idx = col !== undefined ? headers.indexOf(col) : -1;
                            const val = idx >= 0 ? row[idx] : '—';
                            return (
                              <td key={f.value} style={{ padding: '8px 12px', color: '#444', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                                {val}
                                {isDupe && f.value === 'item_name' && (
                                  <span style={{ marginLeft: '6px', fontSize: '0.68rem', backgroundColor: '#fde68a', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    already listed
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {importError && (
                <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '12px', textAlign: 'center' as const }}>{importError}</p>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setStep('map')} style={secondaryBtnStyle}>← Back</button>
                <button
                  onClick={handleImport}
                  disabled={importing || rowsToImport.length === 0}
                  style={{ ...primaryBtnStyle, opacity: (importing || rowsToImport.length === 0) ? 0.4 : 1, cursor: (importing || rowsToImport.length === 0) ? 'not-allowed' : 'pointer' }}
                >
                  {importing ? 'Importing...' : rowsToImport.length === 0 ? 'No items selected' : `Import ${rowsToImport.length} item${rowsToImport.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

// ---- Styles ----
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 2000, padding: '20px',
};
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: '16px', width: '100%',
  maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};
const colHeadStyle: React.CSSProperties = { fontSize: '0.7rem', textTransform: 'uppercase' as const, color: '#aaa', fontWeight: 'bold', letterSpacing: '0.08em' };
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left' as const, fontSize: '0.7rem', textTransform: 'uppercase' as const, color: '#aaa', fontWeight: 'bold', letterSpacing: '0.08em' };
const primaryBtnStyle: React.CSSProperties = { flex: 2, padding: '12px', backgroundColor: '#00ccff', color: '#000', fontWeight: 600, border: 'none', borderRadius: '8px', fontSize: '0.9rem' };
const secondaryBtnStyle: React.CSSProperties = { flex: 1, padding: '12px', backgroundColor: '#f5f5f5', color: '#444', border: '1px solid #ddd', borderRadius: '8px', fontSize: '0.9rem', cursor: 'pointer' };
