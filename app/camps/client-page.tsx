'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useCampItems } from '@/lib/useCampItems'
import CampItemsTable from '@/components/CampItemsTable'

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
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    async function fetchMyCamps() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }

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
    if (!query.trim()) { setResults([]); return }
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
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={eyebrowStyle}>Camps</div>
        <h1 style={h1Style}>Your <em style={{ fontStyle: 'italic', color: TEAL }}>Camps.</em></h1>

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
          myCamps.map(camp => <CampSection key={camp.id} camp={camp} />)
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

function CampSection({ camp }: { camp: MyCamp }) {
  const [memberIds, setMemberIds] = useState<string[]>([])

  useEffect(() => {
    async function fetchMemberIds() {
      const { data } = await supabase
        .from('user_camp_affiliations')
        .select('user_id')
        .eq('camp_id', camp.id)
      setMemberIds([...new Set((data || []).map((r: any) => r.user_id))])
    }
    fetchMemberIds()
  }, [camp.id])

  const { items, loading } = useCampItems(memberIds)

  return (
    <div style={{ marginBottom: '40px' }}>
      <h2 style={sectionHeadStyle}>
        <Link href={`/camps/${camp.slug}`} style={{ color: INK, textDecoration: 'none' }}>
          {camp.display_name} →
        </Link>
      </h2>
      <CampItemsTable items={items} loading={loading} />
    </div>
  )
}

const eyebrowStyle: React.CSSProperties = { fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }
const h1Style: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '2rem', fontWeight: 900, color: INK, margin: '0 0 28px', lineHeight: 1.1 }
const sectionHeadStyle: React.CSSProperties = { fontFamily: "'Arvo', serif", fontSize: '1.2rem', fontWeight: 700, color: INK, margin: '0 0 14px' }
const emptyStateStyle: React.CSSProperties = { backgroundColor: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.15)`, padding: '20px', marginBottom: '20px' }
const searchInputStyle: React.CSSProperties = { width: '100%', maxWidth: '400px', padding: '10px 12px', border: `1.5px solid rgba(28,22,16,0.25)`, backgroundColor: PAPER_LT, color: INK, outline: 'none', boxSizing: 'border-box' as const, fontSize: '0.9rem' }
const resultRowStyle: React.CSSProperties = { display: 'block', padding: '8px 12px', backgroundColor: PAPER_LT, border: `1.5px solid rgba(28,22,16,0.12)`, color: INK, textDecoration: 'none', fontSize: '0.9rem' }
