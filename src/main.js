import { HeroScene } from './hero/HeroScene.js'

/* ── Config ──────────────────────────────────── */
const VIDEO_PATH = `${import.meta.env.BASE_URL}video/kling_20260621_VIDEO_hazme_un_v_1414_0.mp4`

const KEY_OPTIONS = {
  keyColor:   { r: 0.93, g: 0.93, b: 0.93 },
  threshold:  0.38,
  softness:   0.12,
  despill:    0.0,
  lumaWeight: 0.2,
}

/* ── Bootstrap ────────────────────────────────── */
;(async () => {
  const container = document.getElementById('hero-visual')
  const loadingEl = document.getElementById('hero-loading')
  if (!container) return

  /* Lazy load: esperar a que el hero esté cerca */
  await lazyLoadWhenNear(container, 400)

  const scene = new HeroScene(container)

  try {
    const video = await scene.load(VIDEO_PATH, KEY_OPTIONS)

    /* Quitar loading */
    if (loadingEl) loadingEl.remove()

    /* IntersectionObserver: render loop solo si visible */
    let rendering = false
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !rendering) { scene.start(); rendering = true }
        if (!entry.isIntersecting && rendering)  { scene.stop();  rendering = false }
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

    ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     'bottom top',
      scrub:   1.2,
      onUpdate: (self) => { scene.setTime(self.progress * duration) },
    })

    /* Consola de debugging */
    window.__hero = { scene, video, KEY_OPTIONS }

  } catch (err) {
    console.warn('HeroScene — error cargando el video:', err.message)
    if (loadingEl) loadingEl.textContent = 'Video no disponible'
  }
})()

/* ── Lazy load helper ────────────────────────── */
function lazyLoadWhenNear(el, marginPx = 200) {
  return new Promise((resolve) => {
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight + marginPx && rect.bottom > -marginPx) {
      return resolve()
    }
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { obs.disconnect(); resolve() } },
      { rootMargin: `${marginPx}px` },
    )
    obs.observe(el)
  })
}
