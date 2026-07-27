'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Given a camp's member user IDs, returns the gear items they've made
// available to campmates -- the exact same query the camp page has always
// used. `memberIds` is joined into the effect's dependency array because a
// fresh array reference (e.g. from `.map()`) on every render would
// otherwise refetch every render even when the actual IDs haven't changed.
export function useCampItems(memberIds: string[]) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const key = memberIds.join(',')

  useEffect(() => {
    if (memberIds.length === 0) {
      setItems([])
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchItems() {
      setLoading(true)
      try {
        const { data: gear, error } = await supabase
          .from('gear_items')
          .select('*')
          .in('user_id', memberIds)
          .in('availability_status', ['Available to Borrow', 'Available to Keep'])
          .in('visibility', ['public', 'campmates'])
          .eq('owner_deleted', false)
        if (error) throw error

        const userIds = [...new Set((gear || []).map((i: any) => i.user_id))]
        const locationIds = [...new Set((gear || []).map((i: any) => i.location_id).filter(Boolean))]

        const [profilesRes, locationsRes] = await Promise.all([
          supabase.from('profiles').select('id, preferred_name, username').in('id', userIds),
          locationIds.length
            ? supabase.from('locations').select('id, city, state, zip_code').in('id', locationIds)
            : Promise.resolve({ data: [] as any[] }),
        ])

        if (cancelled) return
        setItems((gear || []).map((item: any) => ({
          ...item,
          profiles: profilesRes.data?.find((p: any) => p.id === item.user_id),
          locations: (locationsRes.data || []).find((l: any) => l.id === item.location_id),
        })))
      } catch (err: any) {
        console.error('useCampItems error:', err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchItems()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { items, loading }
}
