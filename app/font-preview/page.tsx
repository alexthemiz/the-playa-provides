import {
  Alfa_Slab_One,
  Bitter,
  Special_Elite,
  Courier_Prime,
  Abril_Fatface,
  Oswald,
  Josefin_Slab,
  Zilla_Slab,
  Arvo,
  Rokkitt,
} from 'next/font/google'

const alfaSlab   = Alfa_Slab_One({ subsets: ['latin'], weight: ['400'] })
const bitter     = Bitter({ subsets: ['latin'], weight: ['700','900'], style: ['normal','italic'] })
const specialEl  = Special_Elite({ subsets: ['latin'], weight: ['400'] })
const courier    = Courier_Prime({ subsets: ['latin'], weight: ['400','700'], style: ['normal','italic'] })
const abril      = Abril_Fatface({ subsets: ['latin'], weight: ['400'] })
const oswald     = Oswald({ subsets: ['latin'], weight: ['500','700'] })
const josefin    = Josefin_Slab({ subsets: ['latin'], weight: ['600','700'], style: ['normal','italic'] })
const zilla      = Zilla_Slab({ subsets: ['latin'], weight: ['500','700'], style: ['normal','italic'] })
const arvo       = Arvo({ subsets: ['latin'], weight: ['400','700'], style: ['normal','italic'] })
const rokkitt    = Rokkitt({ subsets: ['latin'], weight: ['700','900'], style: ['normal','italic'] })

const INK      = '#1C1610'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_LT = '#FDFAF4'
const PAPER_DK = '#EDE5D0'
const LIME     = '#B8CC2A'
const RUST     = '#C24820'
const TEAL     = '#1E8A82'

// headline weight varies per font — some only have 400
const FONTS: {
  num: string; name: string; cls: string; hw: number; note: string
}[] = [
  { num: '01', name: 'Alfa Slab One',   cls: alfaSlab.className,  hw: 400, note: 'Maximum chonk. One weight, all attitude. Very boxy slab.' },
  { num: '02', name: 'Bitter',          cls: bitter.className,    hw: 900, note: 'Crisp editorial slab. Built for screen reading. Clean and sturdy.' },
  { num: '03', name: 'Special Elite',   cls: specialEl.className, hw: 400, note: 'Actual typewriter character — uneven ink, slightly roughed-up.' },
  { num: '04', name: 'Courier Prime',   cls: courier.className,   hw: 700, note: 'Clean monospaced typewriter. Precise, techy, retro terminal.' },
  { num: '05', name: 'Abril Fatface',   cls: abril.className,     hw: 400, note: 'Ultra-high contrast display. Extremely thin/thick strokes. Poster energy.' },
  { num: '06', name: 'Oswald',          cls: oswald.className,    hw: 700, note: 'Condensed sans-serif. Tall, boxy, industrial. Very different from the rest.' },
  { num: '07', name: 'Josefin Slab',    cls: josefin.className,   hw: 700, note: 'Geometric art deco slab. Even strokes, square terminals. Structured.' },
  { num: '08', name: 'Zilla Slab',      cls: zilla.className,     hw: 700, note: "Mozilla's slab. Modern, humanist, slightly warm. Practical but distinctive." },
  { num: '09', name: 'Arvo',            cls: arvo.className,      hw: 700, note: 'Geometric slab with soft corners. Friendly and sturdy. Very legible.' },
  { num: '10', name: 'Rokkitt',         cls: rokkitt.className,   hw: 900, note: 'Display slab, slightly condensed. Heavier than Bitter. Good ink presence.' },
]

export default function FontPreviewPage() {
  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', padding: '48px 40px 80px', color: INK }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <div style={{ marginBottom: '36px', borderBottom: `2px solid ${INK}`, paddingBottom: '20px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: INK_LITE, marginBottom: '6px' }}>
            Internal — Font Comparison · Round 2
          </div>
          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: INK_LITE }}>
            Slabs · Typewriters · Condensed · Display — pick a number
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', border: `2px solid ${INK}` }}>
          {FONTS.map(({ num, name, cls, hw, note }, i) => (
            <div
              key={num}
              style={{
                backgroundColor: i % 2 === 0 ? PAPER_LT : PAPER_DK,
                padding: '30px 30px 24px',
                borderRight:  i % 2 === 0 ? `1px solid ${INK}` : 'none',
                borderBottom: i < FONTS.length - 2 ? `1px solid ${INK}` : 'none',
                position: 'relative' as const,
              }}
            >
              <div style={{ position: 'absolute' as const, top: '14px', right: '18px', fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, color: INK_LITE }}>
                {num}
              </div>

              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: TEAL, marginBottom: '14px' }}>
                {name}
              </div>

              {/* Logo on dark */}
              <div className={cls} style={{ fontSize: '1rem', fontWeight: hw >= 700 ? 700 : 400, backgroundColor: INK, color: PAPER, display: 'inline-block', padding: '5px 12px', marginBottom: '16px', letterSpacing: '-0.01em' }}>
                The Playa <em style={{ fontStyle: 'italic', color: LIME }}>Provides</em>
              </div>

              {/* Hero headline */}
              <h2
                className={cls}
                style={{ fontSize: 'clamp(1.8rem, 2.6vw, 2.5rem)', fontWeight: hw, lineHeight: 1.06, letterSpacing: '-0.01em', color: INK, margin: '0 0 14px' }}
              >
                Gear sharing<br />for the{' '}
                <em style={{ fontStyle: 'italic', color: RUST }}>Burning Man</em>{' '}
                <span style={{ textDecoration: 'underline', textDecorationColor: LIME, textDecorationThickness: '3px', textUnderlineOffset: '5px' }}>community.</span>
              </h2>

              {/* Section title */}
              <div className={cls} style={{ fontSize: '1rem', fontWeight: hw >= 700 ? 700 : 400, borderTop: `1.5px solid rgba(28,22,16,0.15)`, paddingTop: '11px', marginBottom: '10px', color: INK }}>
                The playa can only provide because people provide.
              </div>

              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: INK_LITE, lineHeight: 1.6, margin: 0 }}>
                {note}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
