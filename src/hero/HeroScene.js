import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createChromaKeyMaterial } from './ChromaKeyShader.js'

export class HeroScene {
  constructor(container) {
    this.container = container
    this.rect      = container.getBoundingClientRect()
    this.w         = this.rect.width
    this.h         = this.rect.height

    /* ── Renderer ── */
    const gl = this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    gl.setSize(this.w, this.h)
    gl.setClearColor(0x000000, 0)
    gl.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(gl.domElement)

    /* ── Scene ── */
    this.scene = new THREE.Scene()

    /* ── Orthographic camera ── */
    const aspect = this.w / this.h
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 100)
    this.camera.position.z = 1

    /* ── Post-processing ── */
    this.composer = new EffectComposer(gl)
    this.composer.addPass(new RenderPass(this.scene, this.camera))

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.w, this.h),
      1.6,   /* strength */
      0.35,  /* radius */
      0.75,  /* threshold */
    )
    this.composer.addPass(this.bloomPass)

    /* ── State ── */
    this.video      = null
    this.texture    = null
    this.material   = null
    this.mesh       = null
    this._ready     = false
    this._destroyed = false
    this._raf       = null

    window.addEventListener('resize', this._onResize.bind(this))
  }

  /* ── Load video & build scene ── */
  async load(videoSrc, matOptions = {}) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src         = videoSrc
      video.muted       = true
      video.playsInline = true
      video.preload     = 'auto'
      video.crossOrigin = 'anonymous'

      const onMeta = () => {
        video.removeEventListener('error', onError)
        video.removeEventListener('loadedmetadata', onMeta)
        this._buildScene(video, matOptions)
        this._ready = true
        resolve(video)
      }
      const onError = () => {
        video.removeEventListener('error', onError)
        reject(new Error('Video load failed'))
      }

      video.addEventListener('loadedmetadata', onMeta, { once: true })
      video.addEventListener('error', onError, { once: true })
      video.load()
    })
  }

  _buildScene(video, matOptions) {
    this.video = video

    this.texture = new THREE.VideoTexture(video)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.minFilter  = THREE.LinearFilter
    this.texture.magFilter  = THREE.LinearFilter

    this.material = createChromaKeyMaterial(this.texture, matOptions)

    const vw = video.videoWidth
    const vh = video.videoHeight
    const vA = vw / vh
    const cA = this.w / this.h
    let pw, ph
    if (vA > cA) { ph = 2; pw = ph * vA }
    else         { pw = 2 * cA; ph = pw / vA }

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), this.material)
    this.scene.add(this.mesh)
  }

  /* ── Render loop ── */
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

  /* ── Scroll sync ── */
  setTime(seconds) {
    if (!this.video || !this._ready) return
    const t = Math.min(Math.max(seconds, 0), this.video.duration || Infinity)
    if (Math.abs(this.video.currentTime - t) > 0.016) {
      this.video.currentTime = t
    }
  }

  /* ── Resize ── */
  _onResize() {
    if (this._destroyed) return
    const r = this.container.getBoundingClientRect()
    this.w = r.width
    this.h = r.height

    this.renderer.setSize(this.w, this.h)
    this.composer.setSize(this.w, this.h)

    const aspect = this.w / this.h
    this.camera.left   = -aspect
    this.camera.right  =  aspect
    this.camera.top    =  1
    this.camera.bottom = -1
    this.camera.updateProjectionMatrix()

    if (this.video && this.video.videoWidth) {
      const vA = this.video.videoWidth / this.video.videoHeight
      let pw, ph
      if (vA > aspect) { ph = 2; pw = ph * vA }
      else             { pw = 2 * aspect; ph = pw / vA }
      if (this.mesh) {
        this.mesh.geometry.dispose()
        this.mesh.geometry = new THREE.PlaneGeometry(pw, ph)
      }
    }
  }

  /* ── Cleanup ── */
  destroy() {
    this._destroyed = true
    this.stop()
    window.removeEventListener('resize', this._onResize)
    if (this.video) { this.video.pause(); this.video.src = ''; this.video.load() }
    this.texture?.dispose()
    this.material?.dispose()
    if (this.mesh) { this.mesh.geometry.dispose(); this.scene.remove(this.mesh) }
    this.renderer.dispose()
    this.container.querySelector('canvas')?.remove()
  }
}
