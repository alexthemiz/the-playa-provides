'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useCampItems } from '@/lib/useCampItems'
import CampItemsTable, { CampViewToggle } from '@/components/CampItemsTable'

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const TEAL     = '#1E8A82'

interface MyCamp {
  id: string
  slug: string
  display_name: string
}

interface SearchResult {
  id: string
  slug: string
  display_name: string
}

export default function ClientPage() {
  const [myCamps, setMyCamps] = useState<MyCamp[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    async function fetchMyCamps() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      setCurrentUserId(session.user.id)

      const { data: affRows } = await supabase
        .from('user_camp_affiliations')
        .select('camp_id')
        .eq('user_id', session.user.id)
        .not('camp_id', 'is', null)

      const campIds = [...new Set((affRows || []).map((r: any) => r.camp_id))]
      if (campIds.length === 0) { setLoading(false); return }

      const { data: camps } = await supabase
        .from('camps')
        .select('id, slug, display_name')
        .in('id', campIds)
        .order('display_name')

      setMyCamps(camps || [])
      setLoading(false)
    }
    fetchMyCamps()
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('camps')
        .select('id, slug, display_name')
        .ilike('display_name', `%${query.trim()}%`)
        .limit(8)
      if (!cancelled) { setResults(data || []); setSearching(false) }
    }, 250)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [query])

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh' }}>
      {/* Page header band */}
      <div style={{ backgroundColor: PAPER_LT, borderBottom: `2px solid ${INK}`, padding: '28px 0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
          <h1 style={h1Style}>Your <em style={{ fontStyle: 'italic', color: TEAL }}>Camps.</em></h1>
          <p style={{ fontSize: '0.9rem', color: INK_MID, lineHeight: 1.65, margin: 0 }}>
            Every camp you belong to, and what your campmates have to share.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 20px 40px' }}>
        {loading ? (
          <p style={{ color: INK_MID }}>Loading…</p>
        ) : myCamps.length === 0 ? (
          <div style={emptyStateStyle}>
            <p style={{ color: INK_MID, margin: '0 0 4px' }}>You&apos;re not in a camp yet.</p>
            <p style={{ color: INK_LITE, fontSize: '0.85rem', margin: 0 }}>
              Search for your camp below, or{' '}
              <Link href="/settings" style={{ color: TEAL }}>update your Playa History on your profile</Link> to join one.
            </p>
          </div>
        ) : (
          myCamps.map(camp => <CampSection key={camp.id} camp={camp} currentUserId={currentUserId} />)
        )}

        <div style={{ marginTop: '48px' }}>
          <h2 style={sectionHeadStyle}>Find Your Camp</h2>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by camp name…"
            style={searchInputStyle}
          />
          {searching && <p style={{ color: INK_LITE, fontSize: '0.85rem', marginTop: '8px' }}>Searching…</p>}
          {results.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              {results.map(r => (
                <Link key={r.id} href={`/camps/${r.slug}`} style={resultRowStyle}>
                  {r.display_name}
                </Link>
              ))}
            </div>
          )}
          {!searching && query.trim() && results.length === 0 && (
            <p style={{ color: INK_LITE, fontSize: '0.85rem', marginTop: '8px' }}>No camps found matching &quot;{query}&quot;.</p>
          )}
        </div>

        <p style={{ marginTop: '32px', fontSize: '0.9rem' }}>
          <Link href="/settings" style={{ color: TEAL }}>Update your Playa History on your profile →</Link>
        </p>
      </div>
    </div>
  )
}

function CampSection({ camp, currentUserId }: { camp: MyCamp; currentUserId: string | null }) {
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  useEffect(() => {
    async function fetchMemberIds() {
      const { data } = await supabase
        .from('user_camp_affiliations')
        .select('user_id')
        .eq('camp_id', camp.id)
      // Excludes the viewer's own items -- this list is for discovering
      // what OTHER members have, not a mirror of your own inventory.
      // Matches the same exclusion /find-items already applies for its
      // campmates filter.
      const ids = [...new Set((data || []).map((r: any) => r.user_id))].filter(id => id !== currentUserId)
      setMemberIds(ids)
    }
    fetchMemberIds()
  }, [camp.id, currentUserId])

  const { items, loading } = useCampItems(memberIds)

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h2 style={{ ...sectionHeadStyle, margin: 0 }}>
          <Link href={`/camps/${camp.slug}`} style={{ color: INK, textDecoration: 'none' }}>
            {camp.display_name} →
          </Link>
        </h2>
        <CampViewToggle viewMode={viewMode} onChange={setViewMode} />
      </div>
      <CampItemsTable items={items} loading={loading} viewMode={viewMode} onViewModeChange={setViewMode} />
    </div>
  )
}

const h1Style: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.9rem', fontWeight: 900, color: INK, margin: '0 0 12px', lineHeight: 1.05 }
const sectionHeadStyle: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.2rem', fontWeight: 700, color: INK, margin: '0 0 14px' }
const emptyStateStyle: React.CSSProperties = { backgroundColor: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.15)`, padding: '20px', marginBottom: '20px' }
const searchInputStyle: React.CSSProperties = { width: '100%', maxWidth: '400px', padding: '10px 12px', border: `1.5px solid rgba(28,22,16,0.25)`, backgroundColor: PAPER_LT, color: INK, outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.9rem' }
const resultRowStyle: React.CSSProperties = { display: 'block', padding: '8px 12px', backgroundColor: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.12)`, color: INK, textDecoration: 'none', fontSize: '0.9rem' }
