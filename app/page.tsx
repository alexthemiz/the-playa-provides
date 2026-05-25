'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

// ── Design tokens ────────────────────────────────────────────────────────────
const INK      = '#1C1610'
const INK_MID  = '#4A3828'
const INK_LITE = '#9A8878'
const PAPER    = '#F6F1E8'
const PAPER_DK = '#EDE5D0'
const PAPER_LT = '#FDFAF4'
const LIME     = '#B8CC2A'
const LIME_DK  = '#8A9A10'
const TEAL     = '#1E8A82'
const RUST     = '#C24820'
const RUST_LT  = '#F5E0D8'
const MUSTARD  = '#D4A020'

const CATEGORY_EMOJI: Record<string, string> = {
  'Bikes & Transport':  '🚲',
  'Clothing & Fun':     '🧥',
  'Kitchen & Water':    '🥘',
  'Power & Lighting':   '🔆',
  'Safety & First Aid': '🩹',
  'Shelter & Shade':    '⛺',
  'Tools & Hardware':   '🔧',
  'Miscellaneous':      '📦',
}

// Fallback data shown before Supabase data loads (or if empty)
const FALLBACK_TAGS = ['shade structure','camp stove','sleeping bag','bike lights','solar charger','dust goggles','water container','generator','faux fur coat','LED strip lights','camp chair','e-bike','sound system','EL wire','propane','tarp']
const TAG_COLORS    = ['rust','teal','mustard','lime','','rust','teal','mustard','','teal'] as const
const FALLBACK_ITEMS = [
  { emoji: '⛺', label: 'Shade Structure' }, { emoji: '🚲', label: 'Trail Bike' },
  { emoji: '🔆', label: 'LED Lights' },      { emoji: '🛌', label: 'Sleeping Bag' },
  { emoji: '🥘', label: 'Camp Stove' },       { emoji: '🧥', label: 'Fur Coat' },
  { emoji: '⚡', label: 'Solar Charger' },   { emoji: '🪑', label: 'Camp Chair' },
  { emoji: '🎸', label: 'Sound System' },    { emoji: '🏕️', label: 'Tent' },
]

// Tag color class → inline style mapping
const TAG_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  rust:    { bg: RUST_LT,   border: RUST,    color: RUST },
  teal:    { bg: '#D4EDEB', border: TEAL,    color: TEAL },
  mustard: { bg: '#F5F0D0', border: MUSTARD, color: MUSTARD },
  lime:    { bg: '#EDFAD4', border: LIME_DK, color: LIME_DK },
  '':      { bg: PAPER_LT,  border: INK,     color: INK },
}

// ── Game constants ────────────────────────────────────────────────────────────
const ZONE_H    = 16
const PAD       = 48
const P_W       = 40
const P_H       = 40
const STEP_X    = 52
const MOVE_CD   = 130
const SHRINK    = 6
const GAP       = 240
const MAX_LEVEL = 5   // levels 1-5; completing 5 = final win

export default function HomePage() {
  const [wishlistTags,    setWishlistTags]    = useState<{ tag: string; username: string }[]>([])
  const [marqueeItems,    setMarqueeItems]    = useState<any[]>([])
  const [wishHovered,     setWishHovered]     = useState(false)
  const [photoHovered,    setPhotoHovered]    = useState(false)
  const [gameRunning,     setGameRunning]     = useState(false)
  const [showDeletedBanner, setShowDeletedBanner] = useState(false)
  const [featureTab,      setFeatureTab]      = useState<'how' | 'why'>('how')

  // ── Game refs ──────────────────────────────────────────────────────────────
  const heroRightRef = useRef<HTMLDivElement>(null)
  const gameViewRef  = useRef<HTMLDivElement>(null)
  const playerRef    = useRef<HTMLDivElement>(null)
  const flashRef     = useRef<HTMLDivElement>(null)
  const gs = useRef({
    obstacles:  [] as any[],
    player:     { row: 0, x: 0, alive: true },
    paused:     false,
    lastMove:   0,
    animId:     null as number | null,
    flashTimer: null as ReturnType<typeof setTimeout> | null,
    level:      1,
  })

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('deleted') === 'true') {
      setShowDeletedBanner(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('deleted')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  useEffect(() => {
    async function fetchWishlists() {
      const { data } = await supabase.from('profiles').select('username, wish_list').not('wish_list', 'is', null)
      const tags: { tag: string; username: string }[] = []
      for (const row of data || []) {
        if (!row.username) continue
        const list = Array.isArray(row.wish_list) ? row.wish_list : []
        for (const tag of list) { if (tag) tags.push({ tag, username: row.username }) }
      }
      setWishlistTags(tags)
    }
    fetchWishlists()
  }, [])

  useEffect(() => {
    async function fetchMarqueeItems() {
      const { data } = await supabase
        .from('gear_items')
        .select('id, item_name, image_urls, category, availability_status')
        .in('availability_status', ['Available to Borrow', 'Available to Keep'])
        .limit(20)
      setMarqueeItems(data || [])
    }
    fetchMarqueeItems()
  }, [])

  // ── Frogger game ───────────────────────────────────────────────────────────
  const tagData   = wishlistTags.length > 0 ? wishlistTags.map(t => t.tag)  : FALLBACK_TAGS
  const photoData = marqueeItems.length  > 0
    ? marqueeItems.map(i => ({ emoji: CATEGORY_EMOJI[i.category] || '📦', label: i.item_name, id: i.id }))
    : FALLBACK_ITEMS.map(i => ({ ...i, id: null }))

  const LANE_DEFS = [
    { speed: 0.55, dir: -1 as const, type: 'tag'      as const, items: tagData },
    { speed: 0.70, dir:  1 as const, type: 'polaroid'  as const, items: photoData },
    { speed: 0.50, dir:  1 as const, type: 'tag'      as const, items: [...tagData].reverse() },
    { speed: 0.65, dir: -1 as const, type: 'polaroid'  as const, items: [...photoData].reverse() },
  ]

  useEffect(() => {
    if (!gameRunning) {
      if (gs.current.animId !== null) cancelAnimationFrame(gs.current.animId)
      if (gs.current.flashTimer !== null) clearTimeout(gs.current.flashTimer)
      return
    }

    const panel    = heroRightRef.current
    const gameView = gameViewRef.current
    const playerEl = playerRef.current
    const flashEl  = flashRef.current
    if (!panel || !gameView || !playerEl || !flashEl) return

    const panelH = () => panel.offsetHeight
    const panelW = () => panel.offsetWidth
    const innerH = () => panelH() - PAD * 2
    const laneH  = () => Math.floor((innerH() - ZONE_H * 2) / 4)

    // Layout lanes
    const zoneWin   = gameView.querySelector('#g-zone-win')   as HTMLElement
    const zoneStart = gameView.querySelector('#g-zone-start') as HTMLElement
    const laneEls   = [0,1,2,3].map(i => gameView.querySelector(`#g-lane-${i}`) as HTMLElement)

    function layoutLanes() {
      const LH = laneH()
      if (zoneWin)   { zoneWin.style.top = PAD + 'px'; zoneWin.style.height = ZONE_H + 'px' }
      if (zoneStart) { zoneStart.style.bottom = PAD + 'px'; zoneStart.style.height = ZONE_H + 'px' }
      laneEls.forEach((el, i) => {
        if (!el) return
        el.style.top    = (PAD + ZONE_H + (3 - i) * LH) + 'px'
        el.style.height = LH + 'px'
      })
    }

    function itemW(type: string, item: any) {
      if (type === 'tag') return Math.max(90, (typeof item === 'string' ? item.length : 10) * 8 + 26)
      return 78
    }

    function chirp() {
      try {
        const ACtx = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!ACtx) return
        const ctx  = new ACtx()
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.06)
        osc.frequency.exponentialRampToValueAtTime(700,  ctx.currentTime + 0.14)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.18)
        setTimeout(() => ctx.close(), 500)
      } catch (_) { /* audio unavailable */ }
    }

    function buildObstacles() {
      gs.current.obstacles = []
      const W   = panelW()
      const LH  = laneH()
      const CNT = 5 + gs.current.level  // 6 items at lvl 1, 10 at lvl 5

      LANE_DEFS.forEach((def, li) => {
        const laneEl = laneEls[li]
        if (!laneEl) return
        laneEl.innerHTML = ''
        const laneTop = PAD + ZONE_H + (3 - li) * LH
        let cursor = def.dir === -1 ? W * 0.4 : -(def.type === 'tag' ? 120 : 88)

        for (let idx = 0; idx < CNT; idx++) {
          const item = def.items[idx % def.items.length]
          const label = typeof item === 'string' ? item : (item as any).label || ''
          const w = itemW(def.type, label)
          const h = def.type === 'tag' ? 30 : 92
          const el = document.createElement('div')

          if (def.type === 'tag') {
            const colorKey = TAG_COLORS[idx % TAG_COLORS.length]
            const ts = TAG_STYLE[colorKey]
            Object.assign(el.style, {
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              padding: '5px 13px', fontSize: '0.75rem', fontWeight: '700',
              whiteSpace: 'nowrap', border: `1.5px solid ${ts.border}`,
              background: ts.bg, color: ts.color,
              fontFamily: "'Space Mono', monospace", cursor: 'pointer',
            })
            el.textContent = label
          } else {
            const rot = ((idx % 5) - 2) * 0.9
            Object.assign(el.style, {
              position: 'absolute', top: '50%',
              transform: `translateY(-50%) rotate(${rot}deg)`,
              background: PAPER_LT, padding: '5px 5px 18px',
              border: `1.5px solid rgba(28,22,16,0.22)`,
              boxShadow: `2px 2px 0 rgba(28,22,16,0.15)`,
              width: '78px', cursor: 'pointer', display: 'block',
            })
            el.innerHTML = `
              <div style="width:66px;height:66px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:${PAPER}">${(item as any).emoji || '📦'}</div>
              <span style="display:block;text-align:center;font-size:0.48rem;font-family:'Arvo',serif;font-style:italic;color:${INK_MID};margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</span>
            `
          }

          el.addEventListener('mouseenter', () => { gs.current.paused = true })
          el.addEventListener('mouseleave', () => { gs.current.paused = false })
          el.style.left = cursor + 'px'
          laneEl.appendChild(el)
          gs.current.obstacles.push({ li, el, x: cursor, w, h, def, laneTop, LH })
          cursor += def.dir === -1 ? (w + GAP) : -(w + GAP)
        }
      })
    }

    function rowTopPx(row: number) {
      const LH = laneH(); const H = panelH()
      if (row === 0) return H - P_H - 4
      if (row === 5) return PAD + ZONE_H + 2
      return PAD + ZONE_H + (3 - (row - 1)) * LH + Math.floor((LH - P_H) / 2)
    }

    function renderPlayer() {
      playerEl.style.top  = rowTopPx(gs.current.player.row) + 'px'
      playerEl.style.left = gs.current.player.x + 'px'
    }

    function initPlayer() {
      gs.current.player = { row: 0, x: panelW() / 2 - P_W / 2, alive: true }
      renderPlayer()
    }

    function die() {
      const p = gs.current.player
      if (!p.alive) return
      p.alive = false
      playerEl.classList.add('g-dead')
      flashEl.style.background = RUST; flashEl.style.opacity = '0.32'
      if (gs.current.flashTimer) clearTimeout(gs.current.flashTimer)
      gs.current.flashTimer = setTimeout(() => {
        flashEl.style.opacity = '0'
        playerEl.classList.remove('g-dead')
        initPlayer()
      }, 550)
    }

    const levelDisplayEl = gameView.querySelector('#g-level-display') as HTMLElement | null

    function updateLevelDisplay() {
      if (levelDisplayEl) levelDisplayEl.textContent = `LVL ${gs.current.level}`
    }

    function win() {
      const p = gs.current.player
      if (!p.alive) return
      p.alive = false
      chirp()
      const isFinalWin = gs.current.level >= MAX_LEVEL
      playerEl.classList.add('g-won')
      flashEl.style.background = isFinalWin ? MUSTARD : LIME
      flashEl.style.opacity = isFinalWin ? '0.5' : '0.32'
      if (gs.current.flashTimer) clearTimeout(gs.current.flashTimer)
      gs.current.flashTimer = setTimeout(() => {
        flashEl.style.opacity = '0'
        playerEl.classList.remove('g-won')
        if (isFinalWin) {
          gs.current.level = 1
          updateLevelDisplay()
          setGameRunning(false)
        } else {
          gs.current.level++
          updateLevelDisplay()
          buildObstacles()
          initPlayer()
        }
      }, isFinalWin ? 1200 : 700)
    }

    function checkCollision() {
      const p = gs.current.player
      if (!p.alive || p.row < 1 || p.row > 4) return
      const li = p.row - 1
      const px = p.x + SHRINK, pw = P_W - SHRINK * 2
      const pt = rowTopPx(p.row) + SHRINK, pb = pt + P_H - SHRINK * 2

      for (const obs of gs.current.obstacles) {
        if (obs.li !== li) continue
        const oc = obs.laneTop + obs.LH / 2
        const ot = oc - obs.h / 2 + SHRINK, ob_ = oc + obs.h / 2 - SHRINK
        const ox = obs.x + SHRINK, ow = obs.w - SHRINK * 2
        if (px < ox + ow && px + pw > ox && pt < ob_ && pb > ot) { die(); return }
      }
    }

    function gameTick() {
      if (!gs.current.paused) {
        const W = panelW()
        const speedMult = 1 + (gs.current.level - 1) * 0.18
        for (const obs of gs.current.obstacles) {
          obs.x += obs.def.speed * obs.def.dir * speedMult
          if (obs.def.dir === -1 && obs.x < -obs.w - 20) {
            const maxX = Math.max(...gs.current.obstacles.filter(o => o.li === obs.li).map(o => o.x))
            obs.x = maxX + obs.w + GAP
          } else if (obs.def.dir === 1 && obs.x > W + 20) {
            const minX = Math.min(...gs.current.obstacles.filter(o => o.li === obs.li).map(o => o.x))
            obs.x = minX - obs.w - GAP
          }
          obs.el.style.left = obs.x + 'px'
        }
        if (gs.current.player.alive && gs.current.player.row >= 1 && gs.current.player.row <= 4) checkCollision()
      }
      gs.current.animId = requestAnimationFrame(gameTick)
    }

    function movePlayer(dir: 'up' | 'down' | 'left' | 'right') {
      const p = gs.current.player
      if (!p.alive) return
      const now = Date.now()
      if (now - gs.current.lastMove < MOVE_CD) return
      gs.current.lastMove = now
      if (dir === 'up'    && p.row < 5) p.row++
      if (dir === 'down'  && p.row > 0) p.row--
      if (dir === 'left'  ) p.x = Math.max(0, p.x - STEP_X)
      if (dir === 'right' ) p.x = Math.min(panelW() - P_W, p.x + STEP_X)
      renderPlayer()
      if (p.row === 5) { win(); return }
      checkCollision()
    }

    function handleKey(e: KeyboardEvent) {
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return
      e.preventDefault()
      const map: Record<string, 'up'|'down'|'left'|'right'> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      }
      movePlayer(map[e.key])
    }

    let touchX = 0, touchY = 0
    function handleTouchStart(e: TouchEvent) {
      touchX = e.changedTouches[0].clientX
      touchY = e.changedTouches[0].clientY
    }
    function handleTouchEnd(e: TouchEvent) {
      const dx = e.changedTouches[0].clientX - touchX
      const dy = e.changedTouches[0].clientY - touchY
      const ax = Math.abs(dx), ay = Math.abs(dy)
      if (Math.max(ax, ay) < 10) return
      if (ax > ay) movePlayer(dx > 0 ? 'right' : 'left')
      else         movePlayer(dy > 0 ? 'down'  : 'up')
    }
    function handleTouchMove(e: TouchEvent) { e.preventDefault() }

    gs.current.level = 1
    layoutLanes()
    buildObstacles()
    initPlayer()
    updateLevelDisplay()
    gameView.focus()
    gs.current.animId = requestAnimationFrame(gameTick)
    document.addEventListener('keydown', handleKey)
    gameView.addEventListener('touchstart', handleTouchStart, { passive: true })
    gameView.addEventListener('touchend',   handleTouchEnd)
    gameView.addEventListener('touchmove',  handleTouchMove, { passive: false })

    return () => {
      if (gs.current.animId !== null) cancelAnimationFrame(gs.current.animId)
      if (gs.current.flashTimer !== null) clearTimeout(gs.current.flashTimer)
      document.removeEventListener('keydown', handleKey)
      gameView.removeEventListener('touchstart', handleTouchStart)
      gameView.removeEventListener('touchend',   handleTouchEnd)
      gameView.removeEventListener('touchmove',  handleTouchMove)
    }
  }, [gameRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll view data ───────────────────────────────────────────────────────
  const displayTags  = wishlistTags.length > 0  ? wishlistTags  : FALLBACK_TAGS.map(t => ({ tag: t, username: '' }))
  const displayItems = marqueeItems.length  > 0 ? marqueeItems  : null

  return (
    <div style={{ backgroundColor: PAPER, minHeight: '100vh', color: INK }}>
      <style>{`
        @keyframes scrollL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes g-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px) rotate(-8deg)} 75%{transform:translateX(5px) rotate(8deg)} }
        @keyframes g-pop   { 0%{transform:scale(1)} 50%{transform:scale(1.6) rotate(-10deg)} 100%{transform:scale(1)} }
        .g-dead { animation: g-shake 0.3s ease; }
        .g-won  { animation: g-pop   0.4s ease; }
        @media (max-width: 640px) {
          .home-hero { display: block !important; }
          .home-hero-left { padding: 32px 16px !important; border-right: none !important; }
          .home-hero-right { display: none !important; }
          .home-feature-grid { grid-template-columns: 1fr !important; }
          .home-tab-row { flex-direction: column !important; align-items: flex-start !important; }
          .resources-row { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
        }
      `}</style>

      {/* Deleted account banner */}
      {showDeletedBanner && (
        <div style={{ backgroundColor: '#dcfce7', borderBottom: '1px solid #86efac', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#166534', fontSize: '0.9rem', fontWeight: 600 }}>Your account has been successfully deleted.</span>
          <button onClick={() => setShowDeletedBanner(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', fontSize: '1.2rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="home-hero" style={{
        display: 'grid',
        gridTemplateColumns: '60% 40%',
        borderBottom: `2px solid ${INK}`,
        minHeight: '420px',
      }}>

        {/* Left */}
        <div className="home-hero-left" style={{
          padding: '52px 32px 48px',
          borderRight: `2px solid ${INK}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backgroundColor: PAPER_LT,
        }}>
          {/* Content block — centered in panel, text stays left-aligned */}
          <div style={{ width: '100%', maxWidth: '520px' }}>
            <h1 style={{
              fontFamily: "'Arvo', serif",
              fontSize: 'clamp(1.6rem, 2.6vw, 2.4rem)',
              fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em',
              color: INK, margin: '0 0 18px',
            }}>
              Why let your stuff collect<br />
              <em style={{ fontStyle: 'italic', color: RUST }}>dust in storage</em>{' '}
              when it could be{' '}
              <span>earning it on playa?</span>
            </h1>

            <p style={{ fontSize: '1rem', color: INK_MID, lineHeight: 1.65, margin: '0 0 32px', fontWeight: 500 }}>
              Lend what you've got. Borrow what you need. Keep stuff out of landfills and your money away from Amazon.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link href="/find-items" style={{
                padding: '13px 28px', backgroundColor: TEAL, color: '#fff',
                fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
              }}>
                Browse Gear →
              </Link>
              <Link href="/list-item" style={{
                padding: '13px 28px', backgroundColor: 'transparent', color: INK,
                fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
              }}>
                List Your Stuff
              </Link>
            </div>
          </div>

        </div>

        {/* Right panel */}
        <div ref={heroRightRef} className="home-hero-right" style={{ backgroundColor: PAPER_DK, position: 'relative', display: 'flex', flexDirection: 'column', padding: gameRunning ? '0' : '20px 0', overflow: 'hidden' }}>


          {/* ── Scroll view (default) ── */}
          {!gameRunning && (
            <>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>

              {/* Wish list row */}
              <div style={{ padding: '16px 0', overflow: 'hidden', borderBottom: `1.5px solid rgba(28,22,16,0.14)` }}>
                <div style={{ padding: '0 24px 10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontFamily: "'Arvo', serif", fontSize: '0.95rem', fontWeight: 700, color: INK }}>The Wish List</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: INK_LITE }}>— hover to pause</span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div
                    onMouseEnter={() => setWishHovered(true)}
                    onMouseLeave={() => setWishHovered(false)}
                    style={{
                      display: 'flex', gap: '8px', width: 'max-content', paddingLeft: '24px',
                      animation: 'scrollL 55s linear infinite',
                      animationPlayState: wishHovered ? 'paused' : 'running',
                    }}
                  >
                    {[...displayTags, ...displayTags].map(({ tag, username }, i) => {
                      const colorKey = TAG_COLORS[i % TAG_COLORS.length]
                      const ts = TAG_STYLE[colorKey]
                      return (
                        <a
                          key={i}
                          href={username ? `/profile/${username}` : `/find-items?search=${encodeURIComponent(tag)}`}
                          style={{
                            flexShrink: 0, padding: '5px 13px', fontSize: '0.78rem', fontWeight: 600,
                            whiteSpace: 'nowrap', border: `1.5px solid ${ts.border}`,
                            color: ts.color, background: ts.bg,
                            fontFamily: "'Space Mono', monospace", textDecoration: 'none',
                          }}
                        >
                          {tag}
                        </a>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Available items row */}
              <div style={{ padding: '16px 0', overflow: 'hidden' }}>
                <div style={{ padding: '0 24px 10px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontFamily: "'Arvo', serif", fontSize: '0.95rem', fontWeight: 700, color: INK }}>Available Now</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.58rem', color: INK_LITE }}>— from the community</span>
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div
                    onMouseEnter={() => setPhotoHovered(true)}
                    onMouseLeave={() => setPhotoHovered(false)}
                    style={{
                      display: 'flex', gap: '14px', width: 'max-content', paddingLeft: '24px',
                      animation: 'scrollL 55s linear infinite',
                      animationPlayState: photoHovered ? 'paused' : 'running',
                    }}
                  >
                    {(() => {
                      const items = displayItems
                        ? [...displayItems, ...displayItems]
                        : [...FALLBACK_ITEMS, ...FALLBACK_ITEMS]
                      return items.map((item: any, i: number) => {
                        const emoji   = item.emoji ?? CATEGORY_EMOJI[item.category] ?? '📦'
                        const label   = item.item_name ?? item.label ?? ''
                        const href    = item.id ? `/find-items/${item.id}` : '/find-items'
                        const imgUrl  = Array.isArray(item.image_urls) && item.image_urls.length > 0 ? item.image_urls[0] : null
                        const rotDeg  = [0.6, -0.8, 0.3, -1.1, 0.7, -0.4, 1.0, -0.5, 0.9, -1.2][i % 10]
                        return (
                          <a
                            key={i}
                            href={href}
                            style={{
                              flexShrink: 0, textDecoration: 'none', display: 'block',
                              backgroundColor: PAPER_LT, padding: '5px 5px 18px',
                              border: `1.5px solid rgba(28,22,16,0.2)`,
                              boxShadow: `2px 2px 0 rgba(28,22,16,0.18)`,
                              width: '90px', transform: `rotate(${rotDeg}deg)`,
                            }}
                          >
                            <div style={{ width: '78px', height: '78px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAPER, overflow: 'hidden' }}>
                              {imgUrl
                                ? <img src={imgUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: '1.3rem', opacity: 0.55 }}>{emoji}</span>
                              }
                            </div>
                            <span style={{ display: 'block', textAlign: 'center', fontFamily: "'Arvo', serif", fontSize: '0.55rem', fontStyle: 'italic', color: INK_MID, marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {label}
                            </span>
                          </a>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Frogger trigger — below polaroids, centered */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <button
                onClick={() => setGameRunning(true)}
                title="Play a game"
                style={{
                  background: 'none', border: '1.5px solid rgba(28,22,16,0.18)',
                  borderRadius: '4px', padding: '5px 10px', cursor: 'pointer',
                  fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', fontWeight: 700,
                  letterSpacing: '0.06em', color: INK_LITE,
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                🚲
              </button>
            </div>
            </>
          )}

          {/* ── Game view ── */}
          {gameRunning && (
            <div
              ref={gameViewRef}
              tabIndex={0}
              style={{ position: 'absolute', inset: 0, overflow: 'hidden', outline: 'none', touchAction: 'none' }}
            >
              <div ref={flashRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, opacity: 0, transition: 'opacity 0.08s' }} />
              <div id="g-zone-win"   style={{ position: 'absolute', left: 0, right: 0, borderBottom: `1px dashed rgba(184,204,42,0.4)` }} />
              <div id="g-lane-0" style={{ position: 'absolute', left: 0, right: 0, overflow: 'hidden' }} />
              <div id="g-lane-1" style={{ position: 'absolute', left: 0, right: 0, overflow: 'hidden', background: 'rgba(28,22,16,0.02)' }} />
              <div id="g-lane-2" style={{ position: 'absolute', left: 0, right: 0, overflow: 'hidden' }} />
              <div id="g-lane-3" style={{ position: 'absolute', left: 0, right: 0, overflow: 'hidden', background: 'rgba(28,22,16,0.02)' }} />
              <div id="g-zone-start" style={{ position: 'absolute', left: 0, right: 0, borderTop: `1px dashed rgba(28,22,16,0.1)` }} />
              <div
                ref={playerRef}
                style={{
                  position: 'absolute', width: `${P_W}px`, height: `${P_H}px`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem', zIndex: 20,
                  filter: 'drop-shadow(1px 2px 0 rgba(28,22,16,0.25))',
                  transition: 'left 0.07s, top 0.09s',
                }}
              >
                <span style={{ position: 'relative' as const, display: 'inline-block' }}>
                  🚲
                  <span style={{ position: 'absolute' as const, top: '-0.7em', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75em', lineHeight: 1 }}>🐸</span>
                </span>
              </div>

              {/* Exit + controls bar — bottom safe zone */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', zIndex: 30 }}>
                <button
                  onClick={() => { gs.current.level = 1; setGameRunning(false) }}
                  title="Back to browsing"
                  style={{
                    background: 'none', border: '1.5px solid rgba(184,204,42,0.35)',
                    borderRadius: '4px', padding: '5px 10px', cursor: 'pointer',
                    fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', fontWeight: 700,
                    letterSpacing: '0.06em', color: 'rgba(184,204,42,0.7)',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}
                >
                  <span style={{ position: 'relative' as const, display: 'inline-block' }}>
                    🚲
                    <span style={{ position: 'absolute' as const, top: '-0.7em', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75em', lineHeight: 1 }}>🐸</span>
                  </span>
                </button>
                <span id="g-level-display" style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(184,204,42,0.6)' }}>LVL 1</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {(['←','↑','↓','→'] as const).map(arrow => (
                    <span key={arrow} style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '22px', height: '22px',
                      border: '1.5px solid rgba(184,204,42,0.35)',
                      borderRadius: '3px',
                      fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', fontWeight: 700,
                      color: 'rgba(184,204,42,0.6)',
                      userSelect: 'none' as const,
                    }}>
                      {arrow}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION RULE ─────────────────────────────────────────────────── */}
      <hr style={{ border: 'none', borderTop: `1.5px solid ${INK}`, margin: 0 }} />

      {/* ── FEATURES / WHY ───────────────────────────────────────────────── */}
      <section className="rsp-px" style={{ backgroundColor: PAPER_LT, paddingTop: '52px', paddingBottom: '52px', borderBottom: `2px solid ${INK}` }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>

          {/* Header row */}
          <div className="home-tab-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '24px', gap: '20px' }}>
            <h2 style={{ fontFamily: "'Arvo', serif", fontSize: '1.3rem', fontWeight: 700, fontStyle: 'italic', color: INK }}>
              The playa can only provide because people provide.
            </h2>
            <div style={{ display: 'flex', border: `2px solid ${INK}`, flexShrink: 0 }}>
              {(['how', 'why'] as const).map((tab, i) => (
                <button key={tab} onClick={() => setFeatureTab(tab)} style={{
                  padding: '6px 16px',
                  fontFamily: "'Space Mono', monospace", fontSize: '0.62rem', fontWeight: 700,
                  letterSpacing: '0.06em', cursor: 'pointer', border: 'none',
                  borderLeft: i === 1 ? `1px solid ${INK}` : 'none',
                  backgroundColor: featureTab === tab ? INK : 'transparent',
                  color: featureTab === tab ? LIME : INK,
                }}>
                  {tab === 'how' ? "What's the Deal" : "What's the Point"}
                </button>
              ))}
            </div>
          </div>

          {/* ── HOW IT WORKS ── */}
          {featureTab === 'how' && (
            <div className="home-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', border: `2px solid ${INK}` }}>
              {[
                { n: '01', title: 'Connect with your Campmates',      body: <><Link href="/profile" style={{ color: TEAL, fontWeight: 700 }}>Complete your profile</Link> to see if past or current campmates have what you're looking for — or need something you have.</> },
                { n: '02', title: 'Decide How Wide to Provide',       body: 'Choose who can see your listings: campmates, followers, everyone — or no one.' },
                { n: '03', title: 'Reduce the Stress of Generosity',  body: 'Set your terms at the start — return date, replacement cost, what happens if something breaks. Say it once, up front.' },
                { n: '04', title: 'Maintain an Easy Inventory',       body: 'Add an item once and it stays logged for as long as you want. Your gear list is there when you need it.' },
              ].map(({ n, title, body }, i) => (
                <div key={i} style={{
                  padding: '28px 26px', position: 'relative',
                  borderRight:  i % 2 === 0 ? `1px solid ${INK}` : 'none',
                  borderBottom: i < 2       ? `1px solid ${INK}` : 'none',
                  backgroundColor: ['#FDFAF4','#F8F4E8','#F4F8EC','#F8F2EE'][i],
                }}>
                  <span style={{ position: 'absolute', top: '12px', right: '14px', fontFamily: "'Arvo', serif", fontSize: '3rem', fontWeight: 900, fontStyle: 'italic', opacity: 0.07, userSelect: 'none' as const }}>{n}</span>
                  <h3 style={{ fontFamily: "'Arvo', serif", fontSize: '1.02rem', fontWeight: 700, color: INK, marginBottom: '8px', paddingRight: '30px', lineHeight: 1.25 }}>{title}</h3>
                  <p style={{ fontSize: '0.86rem', color: INK_MID, lineHeight: 1.65, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── WHY IT MATTERS ── */}
          {featureTab === 'why' && (
            <div className="home-feature-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', border: `2px solid ${INK}` }}>
              {[
                { n: 'I',   title: 'Radical Interdependence',      body: 'Others may have what you need. You may have what others need. Turns out that\'s enough.' },
                { n: 'II',  title: 'A Decommodification Modification',  body: 'Make it a year-round thing. Every shared item is one less Amazon order.' },
                { n: 'III', title: 'Lending is a Type of Gifting', body: 'You don\'t even have to give it away. Let someone borrow it. That counts.' },
                { n: 'IV',  title: 'Not Going This Year?',         body: 'Your gear still can. Let it earn its keep while it collects dust in your garage.' },
              ].map(({ n, title, body }, i) => (
                <div key={i} style={{
                  padding: '28px 26px', position: 'relative',
                  borderRight:  i % 2 === 0 ? `1px solid ${INK}` : 'none',
                  borderBottom: i < 2       ? `1px solid ${INK}` : 'none',
                  backgroundColor: ['#FDFAF4','#F8F4E8','#F4F8EC','#F8F2EE'][i],
                }}>
                  <span style={{ position: 'absolute', top: '12px', right: '14px', fontFamily: "'Arvo', serif", fontSize: '3rem', fontWeight: 900, fontStyle: 'italic', opacity: 0.07, userSelect: 'none' as const }}>{n}</span>
                  <h3 style={{ fontFamily: "'Arvo', serif", fontSize: '1.02rem', fontWeight: 700, color: INK, marginBottom: '8px', paddingRight: '30px', lineHeight: 1.25 }}>{title}</h3>
                  <p style={{ fontSize: '0.86rem', color: INK_MID, lineHeight: 1.65, margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>
          )}

        </div>
      </section>

      {/* ── SECTION RULE ─────────────────────────────────────────────────── */}
      <hr style={{ border: 'none', borderTop: `1.5px solid ${INK}`, margin: 0 }} />

      {/* ── RESOURCES ────────────────────────────────────────────────────── */}
      <section className="rsp-px" style={{ backgroundColor: PAPER_DK, paddingTop: '56px', paddingBottom: '64px' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'Arvo', serif", fontSize: '1.5rem', fontWeight: 700, fontStyle: 'italic', color: INK, marginBottom: '18px', textAlign: 'center' as const }}>
            On-Playa Resources
          </h2>
          <div className="resources-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <p style={{ color: INK_MID, fontSize: '0.92rem', margin: 0, lineHeight: 1.6, maxWidth: '240px' }}>
              Camps providing services that make Burning Man more sustainable.
            </p>
            <Link href="/resources" style={{
              padding: '13px 34px', backgroundColor: PAPER_LT, color: INK,
              fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
              border: `2px solid ${INK}`, boxShadow: `3px 3px 0 ${INK}`,
              display: 'inline-block', whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}>
              Browse the Directory →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
