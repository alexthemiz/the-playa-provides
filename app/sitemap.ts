import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://theplayaprovides.com', lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: 'https://theplayaprovides.com/find-items', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://theplayaprovides.com/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://theplayaprovides.com/resources', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: 'https://theplayaprovides.com/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://theplayaprovides.com/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
