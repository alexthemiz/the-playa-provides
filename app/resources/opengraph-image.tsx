import { ImageResponse } from 'next/og'
import { RadialPlayaMotif } from '@/components/RadialPlayaMotif'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'On-Playa Resources — camps offering sustainability and community services at the 2026 Burn'

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
  const headline = 'On-Playa Resources'
  const tagline = 'Camps offering sustainability and community services at the 2026 Burn'
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
        {/* Faint radial motif — echoes Black Rock City's real layout, gap and all */}
        <div style={{ display: 'flex', position: 'absolute', width: 820, height: 820, top: -80, left: 190, opacity: 0.1 }}>
          <RadialPlayaMotif color={INK} />
        </div>

        <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>
          <span style={{ fontFamily: 'Arvo', color: INK }}>On-Playa&nbsp;</span>
          <span style={{ fontFamily: 'Arvo Italic', fontStyle: 'italic', color: TEAL }}>Resources</span>
        </div>

        <div style={{ display: 'flex', width: 140, height: 4, backgroundColor: LIME, marginTop: 28, marginBottom: 28 }} />

        <div style={{ display: 'flex', fontFamily: 'Outfit', fontSize: 30, color: INK_MID, textAlign: 'center', maxWidth: 880 }}>
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
