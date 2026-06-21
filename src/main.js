import { HeroScene } from './hero/HeroScene.js'

/* Parámetros ajustables desde URL */
const P = new URLSearchParams(location.search)

const KEY_OPTIONS = {
  keyColor:  hexToColor(P.get('key')  || '#f0f0f0'),
  threshold: +P.get('th')   || 0.1,
  softness:  +P.get('soft') || 0.22,
  despill:   +P.get('spill')|| 0.2,
}

;(async () => {
  const el   = document.getElementById('hero-visual')
  const load = document.getElementById('hero-loading')
  if (!el) return

  console.log('[Hero] Iniciando…')

  await nearViewport(el, 400)

  const scene = new HeroScene(el)
  const src   = `${import.meta.env.BASE_URL}video/kling_20260621_VIDEO_hazme_un_v_1414_0.mp4`

  try {
    console.log('[Hero] Cargando video…')
    const video = await scene.load(src, KEY_OPTIONS)
    console.log('[Hero] OK. Duración:', video.duration)
    load?.remove()

    /* IntersectionObserver: solo renderiza si visible */
    let running = false
    new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) { scene.start(); running = true }
        if (!e.isIntersecting && running)  { scene.stop();  running = false }
      }, { threshold: 0.01 }
    ).observe(el)

    /* GSAP ScrollTrigger – anima currentTime directamente */
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ])
    gsap.registerPlugin(ScrollTrigger)

    const dur = video.duration || 5
    console.log('[Hero] ScrollTrigger duración:', dur)

    gsap.to(video, {
      currentTime: dur,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.2,
      },
    })

    window.__hero = { scene, video, KEY_OPTIONS }

  } catch (e) {
    console.warn('[Hero] Error:', e.message)
    if (load) load.textContent = 'Error al cargar'
  }
})()

/* ── helpers ── */
function nearViewport(el, m = 400) {
  return new Promise(r => {
    const b = el.getBoundingClientRect()
    if (b.top < innerHeight + m && b.bottom > -m) return r()
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); r() } }, { rootMargin: m + 'px' })
    o.observe(el)
  })
}

function hexToColor(h) {
  const n = parseInt(h.replace('#', ''), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}
