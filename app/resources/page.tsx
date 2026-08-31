const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const TEAL     = '#1E8A82'

export const metadata = {
  title: 'On-Playa Resources | The Playa Provides',
  description: 'On-Playa Resources will be back in 2027.',
  openGraph: {
    type: 'website',
    siteName: 'The Playa Provides',
    title: 'On-Playa Resources',
    description: 'On-Playa Resources will be back in 2027.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'On-Playa Resources',
    description: 'On-Playa Resources will be back in 2027.',
  },
}

// The directory didn't get enough submissions in 2026 to be worth showing.
// The full layout + data-fetching logic is preserved, unused, in ./client-page.tsx
// for next year — swap this back to <ResourcesClientPage /> when ready.
export default function ResourcesPage() {
  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ textAlign: 'center' as const, maxWidth: '480px', backgroundColor: PAPER_LT, border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`, padding: '48px 36px' }}>
        <h1 style={{ fontFamily: "'Arvo', serif", fontSize: '1.7rem', fontWeight: 900, color: INK, margin: '0 0 14px', lineHeight: 1.15 }}>
          On-Playa <em style={{ fontStyle: 'italic', color: TEAL }}>Resources</em> will be back in 2027.
        </h1>
        <p style={{ fontSize: '0.9rem', color: INK_MID, lineHeight: 1.6, margin: 0 }}>
          Check back next season for camps offering sustainability and community services on playa.
        </p>
      </div>
    </div>
  )
}
