import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createChromaKeyMaterial } from './ChromaKeyShader.js'

export class HeroScene {
  constructor(container) {
    this.container = container
    const r       = container.getBoundingClientRect()
    this.w        = r.width
    this.h        = r.height

    /* Renderer — sin alpha, fondo sólido como la página */
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.w, this.h)
    this.renderer.setClearColor(0x020202)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x020202)

    const a = this.w / this.h
    this.camera = new THREE.OrthographicCamera(-a, a, 1, -1, 0.1, 100)
    this.camera.position.z = 1

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.w, this.h),
      1.8, 0.3, 0.7,
    )
    this.composer.addPass(this.bloomPass)

    this.video      = null
    this.texture    = null
    this.material   = null
    this.mesh       = null
    this._ready     = false
    this._destroyed = false
    this._raf       = null

    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
  }

  async load(src, opts = {}) {
    const video = document.createElement('video')
    video.src         = src
    video.muted       = true
    video.playsInline = true
    video.preload     = 'auto'
    video.crossOrigin = 'anonymous'
    video.style.display = 'none'
    document.body.appendChild(video)
    this.video = video

    return new Promise((resolve, reject) => {
      const ok = () => {
        video.removeEventListener('loadeddata', ok)
        video.removeEventListener('error', err)
        /* Activa decoder: play + pause inmediato */
        video.play().then(() => video.pause()).catch(() => {})
        this._buildScene(video, opts)
        this._ready = true
        resolve(video)
      }
      const err = () => { video.removeEventListener('error', err); reject(new Error('Video load failed')) }
      video.addEventListener('loadeddata', ok, { once: true })
      video.addEventListener('error', err, { once: true })
      video.load()
    })
  }

  _buildScene(video, opts) {
    this.texture = new THREE.VideoTexture(video)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter

    this.material = createChromaKeyMaterial(this.texture, opts)

    const vw = video.videoWidth, vh = video.videoHeight
    const vA = vw / vh, cA = this.w / this.h
    let pw, ph
    if (vA > cA) { ph = 2; pw = ph * vA }
    else         { pw = 2 * cA; ph = pw / vA }

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), this.material)
    this.scene.add(this.mesh)
  }

  start() {
    if (this._raf) return
    const loop = () => {
      if (this._destroyed) return
      if (this._ready && this.texture) this.texture.needsUpdate = true
      this.composer.render()
      this._raf = requestAnimationFrame(loop)
    }
    loop()
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null }
  }

  setTime(seconds) {
    if (!this.video || !this._ready) return
    const t = Math.min(Math.max(seconds, 0), this.video.duration || 5)
    try { this.video.currentTime = t } catch (_) {}
  }

  resize() {
    if (this._destroyed) return
    const r = this.container.getBoundingClientRect()
    this.w = r.width; this.h = r.height
    this.renderer.setSize(this.w, this.h)
    this.composer.setSize(this.w, this.h)
    const a = this.w / this.h
    this.camera.left = -a; this.camera.right = a
    this.camera.top = 1; this.camera.bottom = -1
    this.camera.updateProjectionMatrix()
    if (this.video && this.video.videoWidth) {
      const vA = this.video.videoWidth / this.video.videoHeight
      let pw, ph
      if (vA > a) { ph = 2; pw = ph * vA }
      else        { pw = 2 * a; ph = pw / vA }
      if (this.mesh) {
        this.mesh.geometry.dispose()
        this.mesh.geometry = new THREE.PlaneGeometry(pw, ph)
      }
    }
  }

  destroy() {
    this._destroyed = true
    this.stop()
    window.removeEventListener('resize', this._onResize)
    if (this.video && this.video.parentNode) this.video.parentNode.removeChild(this.video)
    this.texture?.dispose()
    this.material?.dispose()
    this.mesh?.geometry.dispose()
    if (this.mesh) this.scene.remove(this.mesh)
    this.renderer.dispose()
    this.container.querySelector('canvas')?.remove()
  }
}
