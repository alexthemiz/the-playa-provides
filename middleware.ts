import { createServerClient } from '@supabase/ssr' // Remove NextRequest from here
import { NextResponse, type NextRequest } from 'next/server' // Add it here

export async function middleware(request: NextRequest) {
  // HEARTBEAT LOG: Shows you in the terminal which page is being checked
  console.log("🛡️ Middleware checking path:", request.nextUrl.pathname)

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This refreshes the auth token if needed
  const { data: { user } } = await supabase.auth.getUser()

  // Define which pages anyone can see without logging in
  const isPublicRoute = 
    request.nextUrl.pathname === '/login' || 
    request.nextUrl.pathname === '/signup' || 
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/auth')

  // If no user and not a public page, kick to login
  if (!user && !isPublicRoute) {
    console.log("🚫 Access Denied: Redirecting to /login")
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Images/SVG in public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}