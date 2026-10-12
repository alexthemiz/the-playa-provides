/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Clickjacking protection: only this site may frame itself.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // /list-item -> /add-item rename (2026-07-22). Query strings (e.g.
      // ?edit=123 on old bookmarked/shared edit links) pass through
      // automatically since the source has no params of its own to consume.
      {
        source: '/list-item',
        destination: '/add-item',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
