/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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