import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Create the initial response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Initialize Supabase with the 'setAll' pattern
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          // IMPORTANT: Modify the existing response, don't re-assign with NextResponse.next()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Use getUser for the server-side check
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isPublicRoute = ['/login', '/signup', '/'].includes(url.pathname) || url.pathname.startsWith('/auth') || url.pathname.startsWith('/resources') || url.pathname.startsWith('/about')

  console.log(`📡 PATH: ${url.pathname} | AUTH: ${user ? 'YES' : 'NO'}`)

  // 4. Redirect Logic
  if (!user && !isPublicRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (url.pathname === '/login' || url.pathname === '/signup')) {
    url.pathname = '/inventory'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}