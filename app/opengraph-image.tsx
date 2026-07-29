import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'The Playa Provides — peer-to-peer gear sharing for the Burning Man community'

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const PAPER    = '#F6F1E8'
const TEAL     = '#1E8A82'
const LIME     = '#B8CC2A'

async function loadGoogleFont(fontQuery: string, text: string) {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${fontQuery}&text=${encodeURIComponent(text)}`)
  ).text()
  const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/)
  if (match) {
    const res = await fetch(match[1])
    if (res.status === 200) return res.arrayBuffer()
  }
  throw new Error(`failed to load font: ${fontQuery}`)
}

export default async function Image() {
  const headline = 'The Playa Provides'
  const tagline = 'Peer-to-peer gear sharing for the Burning Man community'
  const [arvoBold, arvoBoldItalic, outfitMedium] = await Promise.all([
    loadGoogleFont('Arvo:wght@700', headline),
    loadGoogleFont('Arvo:ital,wght@1,700', headline),
    loadGoogleFont('Outfit:wght@500', tagline),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: PAPER,
          position: 'relative',
        }}
      >
        {/* Faint radial motif — echoes Black Rock City's concentric layout */}
        <svg
          width="820"
          height="820"
          viewBox="0 0 120 120"
          style={{ position: 'absolute', top: -80, left: 190, opacity: 0.1 }}
        >
          <circle cx="60" cy="60" r="52" fill="none" stroke={INK} strokeWidth="1.2" />
          <circle cx="60" cy="60" r="36" fill="none" stroke={INK} strokeWidth="1" />
          <circle cx="60" cy="60" r="20" fill="none" stroke={INK} strokeWidth="1" />
          <line x1="60" y1="8" x2="60" y2="112" stroke={INK} strokeWidth="1" />
          <line x1="8" y1="60" x2="112" y2="60" stroke={INK} strokeWidth="1" />
          <line x1="23" y1="23" x2="97" y2="97" stroke={INK} strokeWidth="1" />
          <line x1="97" y1="23" x2="23" y2="97" stroke={INK} strokeWidth="1" />
        </svg>

        <div style={{ display: 'flex', fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>
          <span style={{ fontFamily: 'Arvo', color: INK }}>The Playa&nbsp;</span>
          <span style={{ fontFamily: 'Arvo Italic', fontStyle: 'italic', color: TEAL }}>Provides</span>
        </div>

        <div style={{ display: 'flex', width: 140, height: 4, backgroundColor: LIME, marginTop: 28, marginBottom: 28 }} />

        <div style={{ display: 'flex', fontFamily: 'Outfit', fontSize: 32, color: INK_MID, textAlign: 'center' }}>
          {tagline}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Arvo', data: arvoBold, style: 'normal', weight: 700 },
        { name: 'Arvo Italic', data: arvoBoldItalic, style: 'italic', weight: 700 },
        { name: 'Outfit', data: outfitMedium, style: 'normal', weight: 500 },
      ],
    }
  )
}
