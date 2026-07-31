import ResourcesClientPage from './client-page'

export const metadata = {
  title: 'On-Playa Resources | The Playa Provides',
  description: 'Camps offering sustainability and community services at the 2026 Burn — composting, bike repair, mental health support, and more.',
  openGraph: {
    type: 'website',
    siteName: 'The Playa Provides',
    title: 'On-Playa Resources',
    description: 'Camps offering sustainability and community services at the 2026 Burn — composting, bike repair, mental health support, and more.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'On-Playa Resources',
    description: 'Camps offering sustainability and community services at the 2026 Burn — composting, bike repair, mental health support, and more.',
  },
}

export default function ResourcesPage() {
  return <ResourcesClientPage />
}
