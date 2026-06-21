import { HeroScene } from './hero/HeroScene.js'

const P = new URLSearchParams(location.search)
const BG = P.get('bg') || '#0a0a0a'

/* Sincronizar fondo de la página con el fondo del video */
document.documentElement.style.setProperty('--bg-page', BG)
document.body.style.background = BG

;(async () => {
  const el   = document.getElementById('hero-visual')
  const load = document.getElementById('hero-loading')
  if (!el) return

  console.log('[Hero] Iniciando… fondo:', BG)

  await nearViewport(el, 400)

  const scene = new HeroScene(el, BG)
  scene.setBgColor(BG)

  const src = `${import.meta.env.BASE_URL}video/kling_20260621_VIDEO_hazme_un_v_1414_0.mp4`

  try {
    console.log('[Hero] Cargando video…')
    const video = await scene.load(src)
    console.log('[Hero] OK. Duración:', video.duration)
    load?.remove()

    let running = false
    new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) { scene.start(); running = true }
        if (!e.isIntersecting && running)  { scene.stop();  running = false }
      }, { threshold: 0.01 }
    ).observe(el)

    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ])
    gsap.registerPlugin(ScrollTrigger)

    const dur = video.duration || 5
    console.log('[Hero] ScrollTrigger, duración:', dur)

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

  } catch (e) {
    console.warn('[Hero] Error:', e.message)
    if (load) load.textContent = 'Error al cargar'
  }
})()

function nearViewport(el, m = 400) {
  return new Promise(r => {
    const b = el.getBoundingClientRect()
    if (b.top < innerHeight + m && b.bottom > -m) return r()
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); r() } }, { rootMargin: m + 'px' })
    o.observe(el)
  })
}
