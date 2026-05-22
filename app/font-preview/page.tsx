import {
  Cormorant_Garamond,
  Playfair_Display,
  DM_Serif_Display,
  Instrument_Serif,
  Lora,
  EB_Garamond,
  Spectral,
  Libre_Baskerville,
  Vollkorn,
  Cardo,
} from 'next/font/google'

const cormorant   = Cormorant_Garamond({ subsets: ['latin'], weight: ['400','600','700'], style: ['normal','italic'] })
const playfair    = Playfair_Display({ subsets: ['latin'], weight: ['700','900'], style: ['normal','italic'] })
const dmSerif     = DM_Serif_Display({ subsets: ['latin'], weight: ['400'], style: ['normal','italic'] })
const instrument  = Instrument_Serif({ subsets: ['latin'], weight: ['400'], style: ['normal','italic'] })
const lora        = Lora({ subsets: ['latin'], weight: ['700'], style: ['normal','italic'] })
const ebGaramond  = EB_Garamond({ subsets: ['latin'], weight: ['400','700','800'], style: ['normal','italic'] })
const spectral    = Spectral({ subsets: ['latin'], weight: ['700','800'], style: ['normal','italic'] })
const baskerville = Libre_Baskerville({ subsets: ['latin'], weight: ['400','700'], style: ['normal','italic'] })
const vollkorn    = Vollkorn({ subsets: ['latin'], weight: ['700','900'], style: ['normal','italic'] })
const cardo       = Cardo({ subsets: ['latin'], weight: ['400'], style: ['normal','italic'] })

const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const PAPER_DK = '#EDE5D0'
const LIME     = '#B8CC2A'
const RUST     = '#C24820'
const TEAL     = '#1E8A82'

const FONTS = [
  { num: '01', name: 'Cormorant Garamond', cls: cormorant.className,   note: 'Very high stroke contrast, old-press feel. Italics are dramatically calligraphic.' },
  { num: '02', name: 'Playfair Display',   cls: playfair.className,    note: 'Strong ink contrast, editorial. The most "newspaper headline" of the bunch.' },
  { num: '03', name: 'DM Serif Display',   cls: dmSerif.className,     note: 'Geometric-influenced. Clean, slightly modern. Confident at large sizes.' },
  { num: '04', name: 'Instrument Serif',   cls: instrument.className,  note: 'Newer and less common. Humanist, slightly narrow. Elegant without trying.' },
  { num: '05', name: 'Lora',               cls: lora.className,        note: 'Brushed serifs, slightly informal. Warm and legible. Works at any size.' },
  { num: '06', name: 'EB Garamond',        cls: ebGaramond.className,  note: 'Classic Renaissance typeface. Thin strokes, scholarly, very readable.' },
  { num: '07', name: 'Spectral',           cls: spectral.className,    note: 'Screen-optimized serif. Slightly condensed, high contrast. Feels printed.' },
  { num: '08', name: 'Libre Baskerville', cls: baskerville.className,  note: 'Sturdy, utilitarian Baskerville revival. Thick serifs, reliable, less flashy.' },
  { num: '09', name: 'Vollkorn',           cls: vollkorn.className,    note: 'Full-bodied, slightly wide. Robust and unpretentious. Strong on dark backgrounds.' },
  { num: '10', name: 'Cardo',              cls: cardo.className,       note: 'Scholarly, inspired by ancient manuscripts. Very fine strokes, literary feel.' },
]

export default function FontPreviewPage() {
  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', padding: '48px 40px 80px', color: INK }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '40px', borderBottom: `2px solid ${INK}`, paddingBottom: '20px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '8px' }}>
            Internal Tool — Font Comparison
          </div>
          <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: '1rem', fontWeight: 700, color: INK }}>
            10 font options for The Playa Provides
          </h1>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: INK_LITE, marginTop: '6px' }}>
            Currently using: Fraunces · Click a number to pick a replacement
          </p>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', border: `2px solid ${INK}` }}>
          {FONTS.map(({ num, name, cls, note }, i) => (
            <div
              key={num}
              style={{
                backgroundColor: i % 2 === 0 ? PAPER_LT : PAPER_DK,
                padding: '32px 32px 26px',
                borderRight:  i % 2 === 0 ? `1px solid ${INK}` : 'none',
                borderBottom: i < FONTS.length - 2 ? `1px solid ${INK}` : 'none',
                position: 'relative' as const,
              }}
            >
              {/* Number badge */}
              <div style={{
                position: 'absolute' as const, top: '16px', right: '20px',
                fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '0.1em', color: INK_LITE,
              }}>
                {num}
              </div>

              {/* Font name */}
              <div style={{
                fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEAL,
                marginBottom: '18px',
              }}>
                {name}
              </div>

              {/* Logo */}
              <div className={cls} style={{
                fontSize: '1rem', fontWeight: 700,
                backgroundColor: INK, color: PAPER,
                display: 'inline-block', padding: '5px 12px',
                marginBottom: '18px', letterSpacing: '-0.01em',
              }}>
                The Playa <em style={{ fontStyle: 'italic', color: LIME }}>Provides</em>
              </div>

              {/* Hero headline */}
              <h2 className={cls} style={{
                fontSize: 'clamp(1.8rem, 2.8vw, 2.6rem)',
                fontWeight: 900, lineHeight: 1.05,
                letterSpacing: '-0.02em', color: INK,
                margin: '0 0 14px',
              }}>
                Gear sharing<br />for the{' '}
                <em style={{ fontStyle: 'italic', color: RUST }}>Burning Man</em>{' '}
                <span style={{ textDecoration: 'underline', textDecorationColor: LIME, textDecorationThickness: '3px', textUnderlineOffset: '5px' }}>community.</span>
              </h2>

              {/* Section title */}
              <div className={cls} style={{
                fontSize: '1.05rem', fontWeight: 700,
                borderTop: `1.5px solid rgba(28,22,16,0.15)`,
                paddingTop: '12px', marginBottom: '10px', color: INK,
              }}>
                The playa can only provide because people provide.
              </div>

              {/* Note */}
              <p style={{
                fontFamily: "'Space Mono', monospace", fontSize: '0.62rem',
                color: INK_LITE, lineHeight: 1.6, margin: 0,
              }}>
                {note}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
