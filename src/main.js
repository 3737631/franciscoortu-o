import { HeroScene } from './hero/HeroScene.js'

/* ── Config ── */
const VIDEO_PATH = 'video/kling_20260621_VIDEO_hazme_un_v_1414_0.mp4'

/* Chroma-key tuning — adjust these in the browser console if needed */
const KEY_OPTIONS = {
  keyColor:   { r: 0.93, g: 0.93, b: 0.93 },  /* near-white background */
  threshold:  0.38,
  softness:   0.12,
  despill:    0.0,
  lumaWeight: 0.2,   /* blend in luma key for very bright areas */
}

/* ── Bootstrap ── */
;(async () => {
  const container = document.getElementById('hero-visual')
  if (!container) return

  /* Lazy-load: wait until the hero is near the viewport */
  await lazyLoadWhenNear(container, 300)

  const scene = new HeroScene(container)

  try {
    const video = await scene.load(VIDEO_PATH, KEY_OPTIONS)

    /* Start render loop only when the section is visible */
    let rendering = false
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting
        if (visible && !rendering) { scene.start(); rendering = true }
        if (!visible && rendering) { scene.stop();  rendering = false }
      },
      { threshold: 0.01 },
    )
    obs.observe(container)

    /* ── ScrollTrigger ── */
    const { gsap }      = await import('gsap')
    const { ScrollTrigger } = await import('gsap/ScrollTrigger')
    gsap.registerPlugin(ScrollTrigger)

    const duration = video.duration || 5

    ScrollTrigger.create({
      trigger: '#hero',
      start:   'top top',
      end:     `bottom top`,
      scrub:   1.2,
      onUpdate: (self) => {
        scene.setTime(self.progress * duration)
      },
    })

    /* Expose tuning globals for developer console */
    window.__hero = { scene, video, KEY_OPTIONS }
  } catch (err) {
    console.error('HeroScene failed:', err)
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;
                  height:100%;color:#555;font-family:system-ui;">
        <p>Video no disponible</p>
      </div>`
  }
})()

/* ── Lazy-load helper ── */
function lazyLoadWhenNear(element, marginPx = 200) {
  return new Promise((resolve) => {
    if (element.getBoundingClientRect().top < window.innerHeight + marginPx) {
      return resolve()
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect()
          resolve()
        }
      },
      { rootMargin: `${marginPx}px` },
    )
    obs.observe(element)
  })
}
