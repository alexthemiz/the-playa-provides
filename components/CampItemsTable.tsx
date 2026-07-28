'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutGrid, List, MapPin, User, Package } from 'lucide-react'
import PolaroidPhoto from '@/components/PolaroidPhoto'

interface Props {
  items: any[]
  loading: boolean
  // Uncontrolled by default (owns its own toggle, rendered above the
  // table). Pass both to let a caller place the toggle itself -- e.g. on
  // the same row as a heading -- instead of on its own row.
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
}

export function CampViewToggle({ viewMode, onChange }: { viewMode: 'grid' | 'list'; onChange: (mode: 'grid' | 'list') => void }) {
  return (
    <div style={campToggleGroupStyle}>
      <button onClick={() => onChange('grid')} style={{ ...campToggleButtonStyle, backgroundColor: viewMode === 'grid' ? '#1C1610' : 'transparent' }}>
        <LayoutGrid size={18} color={viewMode === 'grid' ? '#fff' : '#4A3828'} />
      </button>
      <button onClick={() => onChange('list')} style={{ ...campToggleButtonStyle, backgroundColor: viewMode === 'list' ? '#1C1610' : 'transparent' }}>
        <List size={18} color={viewMode === 'list' ? '#fff' : '#4A3828'} />
      </button>
    </div>
  )
}

export default function CampItemsTable({ items, loading, viewMode: controlledViewMode, onViewModeChange }: Props) {
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('list')
  const isControlled = controlledViewMode !== undefined
  const viewMode = isControlled ? controlledViewMode : internalViewMode
  const setViewMode = isControlled ? onViewModeChange! : setInternalViewMode

  return (
    <div>
      {!isControlled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <CampViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>
      )}

      {loading ? (
        <>
          <style>{campGridResponsiveCss}</style>
          <div className="camp-grid">{[...Array(3)].map((_, i) => <div key={i} style={campSkeletonStyle} />)}</div>
        </>
      ) : items.length === 0 ? (
        <p style={{ color: '#9A8878', fontSize: '0.9rem', fontStyle: 'italic' as const }}>No items have been shared by camp members yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' as const, maxWidth: '100%', width: '100%' }}>
          {viewMode === 'grid' && <style>{campGridResponsiveCss}</style>}
          <div className={viewMode === 'grid' ? 'camp-grid' : undefined} style={viewMode === 'grid' ? undefined : campListContainerStyle}>
            {viewMode === 'list' && (
              <div style={campListHeaderStyle}>
                <div style={{ width: '50px' }} />
                <div>Item</div>
                <div>Owner</div>
                <div>Category</div>
                <div>Location</div>
                <div>Description</div>
                <div>Terms</div>
              </div>
            )}
            {items.map(item => (
              <Link key={item.id} href={`/find-items/${item.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                {viewMode === 'grid' ? <CampCardView item={item} /> : <CampListView item={item} />}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CampCardView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member'
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : 'N/A'
  const isKeep = item.availability_status === 'Available to Keep'
  const hasTerms = !isKeep && (item.return_by || item.return_terms)
  return (
    <div style={{ backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.15)', boxShadow: '3px 3px 0 rgba(28,22,16,0.1)' }}>
      <div style={{ position: 'relative' as const, backgroundColor: 'transparent', padding: '8px 8px 0 8px', width: '100%', overflow: 'hidden', boxSizing: 'border-box' as const }}>
        <PolaroidPhoto src={item.image_urls?.[0]} alt={item.item_name} itemId={item.id} noRotate />
        <div style={{ position: 'absolute', top: '6px', left: '6px', backgroundColor: isKeep ? '#C24820' : '#1E8A82', color: '#fff', padding: '2px 6px', border: 'none', fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', fontWeight: 700, zIndex: 5 }}>
          {isKeep ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <h3 style={{ margin: 0, color: '#1C1610', fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.2, fontFamily: "'Arvo', serif" }}>{item.item_name}</h3>
        <p style={{ color: '#9A8878', fontSize: '0.65rem', margin: '4px 0 8px', textTransform: 'uppercase' as const, fontWeight: 'bold' }}>{item.category} • {item.condition}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4A3828', fontSize: '0.7rem', borderTop: '1px solid rgba(28,22,16,0.08)', paddingTop: '8px', gap: '6px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}><MapPin size={10} style={{ flexShrink: 0 }} />{locationDisplay}</span>
          {item.profiles?.username ? (
            <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#1E8A82', textDecoration: 'none', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}>
              <User size={10} style={{ flexShrink: 0 }} />{ownerName}
            </Link>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' as const }}><User size={10} style={{ flexShrink: 0 }} />{ownerName}</span>
          )}
        </div>
        {hasTerms && (
          <div style={{ fontSize: '0.65rem', color: '#9A8878', borderTop: '1px solid rgba(28,22,16,0.08)', paddingTop: '6px', marginTop: '6px' }}>
            {item.return_by && <span>Return by {new Date(item.return_by).toLocaleDateString()}</span>}
            {item.return_terms && !item.return_by && <span>Has terms</span>}
          </div>
        )}
      </div>
    </div>
  )
}

const CAMP_LIST_COLS = '50px 160px 90px 100px 110px 1.5fr 1fr'

function CampListView({ item }: { item: any }) {
  const ownerName = item.profiles?.preferred_name || 'Member'
  const locationDisplay = item.locations
    ? [item.locations.city, item.locations.state].filter(Boolean).join(', ')
    : '—'
  const isKeep = item.availability_status === 'Available to Keep'
  const termsSummary = isKeep ? '' : [
    item.return_by ? `Return by ${new Date(item.return_by).toLocaleDateString()}` : null,
    item.damage_price ? `Damage agr. $${item.damage_price}` : null,
    item.loss_price ? `Loss agr. $${item.loss_price}` : null,
    item.return_terms ? 'Custom terms' : null,
  ].filter(Boolean).join(' · ')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', alignItems: 'center', padding: '10px 12px', backgroundColor: '#FDFAF4', borderBottom: '1px solid rgba(28,22,16,0.08)' }}>
      <div style={{ width: '50px', height: '50px', overflow: 'hidden', backgroundColor: '#EDE5D0', flexShrink: 0 }}>
        {item.image_urls?.[0]
          ? <img src={item.image_urls[0]} alt={item.item_name} style={{ width: '100%', height: '100%', objectFit: 'contain' as const }} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9A8878' }}><Package size={16} /></div>}
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, color: '#1C1610', fontSize: '14px' }}>{item.item_name}</div>
        <div style={{ fontSize: '0.5rem', backgroundColor: isKeep ? '#C24820' : '#1E8A82', color: '#fff', fontFamily: "'Space Mono', monospace", fontWeight: 700, textTransform: 'uppercase' as const, marginTop: '2px', display: 'inline-block', padding: '2px 6px' }}>
          {isKeep ? 'Keep' : 'Borrow'}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>
        {item.profiles?.username ? (
          <Link href={`/profile/${item.profiles.username}`} onClick={e => e.stopPropagation()} style={{ color: '#1E8A82', textDecoration: 'none' }}>{ownerName}</Link>
        ) : ownerName}
      </div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{item.category}</div>
      <div style={{ fontSize: '12px', color: '#4A3828', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' as const }}><MapPin size={11} style={{ marginRight: '3px', flexShrink: 0 }} />{locationDisplay}</div>
      <div style={{ fontSize: '12px', color: '#4A3828', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{item.description || '—'}</div>
      <div style={{ fontSize: '11px', color: '#9A8878', overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{termsSummary || '—'}</div>
    </div>
  )
}

const campToggleGroupStyle: React.CSSProperties = { display: 'flex', border: '2px solid #1C1610', overflow: 'hidden' }
const campToggleButtonStyle: React.CSSProperties = { border: 'none', padding: '6px 10px', cursor: 'pointer' }
// Mirrors .fi-grid on /find-items so camp item cards match the browse-items
// layout: 3 per row on mobile (portrait and landscape), same breakpoints.
const campGridResponsiveCss = `
  .camp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  @media (min-width: 1100px) { .camp-grid { grid-template-columns: repeat(5, 1fr); } }
  @media (min-width:  860px) and (max-width: 1099px) { .camp-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 859px) { .camp-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
  @media (max-width: 480px) { .camp-grid { gap: 8px; } }
`
const campListContainerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' as const, backgroundColor: '#FDFAF4', border: '1.5px solid rgba(28,22,16,0.12)', overflowX: 'auto' as const }
const campListHeaderStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: CAMP_LIST_COLS, gap: '10px', padding: '12px 15px', fontSize: '0.6rem', fontWeight: 700, color: '#4A3828', fontFamily: "'Space Mono', monospace", textTransform: 'uppercase' as const, letterSpacing: '0.08em', borderBottom: '1.5px solid rgba(28,22,16,0.12)', backgroundColor: '#EDE5D0' }
const campSkeletonStyle: React.CSSProperties = { height: '280px', backgroundColor: '#EDE5D0' }
