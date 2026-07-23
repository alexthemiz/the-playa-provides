import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/inventory', '/settings', '/add-item', '/list-item', '/login', '/signup', '/auth/'] },
    ],
    sitemap: 'https://theplayaprovides.com/sitemap.xml',
  }
}
