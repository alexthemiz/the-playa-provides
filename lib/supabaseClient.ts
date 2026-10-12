import { createBrowserClient } from '@supabase/ssr'

// The installed auth library implements lockAcquireTimeout, but @supabase/ssr's
// type wrapper doesn't list it yet — hence the cast, not a real type error.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authOptions = { lockAcquireTimeout: 5000 } as any // fail faster than default 10s when lock is busy

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: authOptions }
)
