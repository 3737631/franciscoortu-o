import { HeroScene } from './hero/HeroScene.js'

/* ── Config desde URL params ─────────────────── */
const params = new URLSearchParams(location.search)
const VIDEO_PATH = `${import.meta.env.BASE_URL}video/kling_20260621_VIDEO_hazme_un_v_1414_0.mp4`

const KEY_OPTIONS = {
  keyColor:  hexToColor(params.get('key')  || '#e8e8e8'),
  threshold: parseFloat(params.get('th')   || '0.12'),
  softness:  parseFloat(params.get('soft') || '0.2'),
  despill:   parseFloat(params.get('spill')|| '0.3'),
}

const BLOOM = {
  strength:  parseFloat(params.get('bloom')    || '1.8'),
  radius:    parseFloat(params.get('radius')   || '0.3'),
  threshold: parseFloat(params.get('bthresh')  || '0.7'),
}

/* ── Bootstrap ────────────────────────────────── */
;(async () => {
  const container = document.getElementById('hero-visual')
  const loadingEl  = document.getElementById('hero-loading')
  if (!container) return

  console.log('[Hero] Iniciando...')
  await lazyLoadWhenNear(container, 400)

  const scene = new HeroScene(container)

  /* Ajustar bloom desde params */
  scene.bloomPass.strength  = BLOOM.strength
  scene.bloomPass.radius    = BLOOM.radius
  scene.bloomPass.threshold = BLOOM.threshold

  try {
    console.log('[Hero] Cargando video...', VIDEO_PATH)
    const video = await scene.load(VIDEO_PATH, KEY_OPTIONS)
    console.log('[Hero] Video cargado, duración:', video.duration)

    if (loadingEl) loadingEl.remove()

    /* IntersectionObserver */
    let rendering = false
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !rendering) { scene.start(); rendering = true; console.log('[Hero] Render ON') }
        if (!e.isIntersecting && rendering)  { scene.stop();  rendering = false; console.log('[Hero] Render OFF') }
      },
      { threshold: 0.01 },
    )
    obs.observe(container)

    /* GSAP ScrollTrigger */
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ])
    gsap.registerPlugin(ScrollTrigger)

    const duration = video.duration || 5
    console.log('[Hero] ScrollTrigger creado, duración video:', duration)

    ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     'bottom top',
      scrub:   1,
      onUpdate: (self) => {
        const t = self.progress * duration
        scene.setTime(t)
      },
    })

    console.log('[Hero] Listo. Ajusta con: ?key=eee&th=0.12&soft=0.2&spill=0.3&bloom=1.8')
    window.__hero = { scene, video, KEY_OPTIONS, BLOOM }

  } catch (err) {
    console.warn('[Hero] Error:', err.message)
    if (loadingEl) loadingEl.textContent = 'Video no disponible'
  }
})()

/* ── Helpers ──────────────────────────────────── */
function lazyLoadWhenNear(el, margin = 400) {
  return new Promise((resolve) => {
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight + margin && r.bottom > -margin) return resolve()
    const o = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { o.disconnect(); resolve() } },
      { rootMargin: `${margin}px` },
    )
    o.observe(el)
  })
}

function hexToColor(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
