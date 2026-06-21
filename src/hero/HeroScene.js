export class HeroScene {
  constructor(container) {
    this.container = container
    const r       = container.getBoundingClientRect()
    this.w        = r.width
    this.h        = r.height

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.w, this.h)
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
    this.camera.position.z = 1

    this.video    = null
    this.texture  = null
    this.material = null
    this.mesh     = null
    this._ready   = false
    this._dead    = false
    this._raf     = null
    this._resize  = () => this.resize()
    window.addEventListener('resize', this._resize)
  }

  async load(src) {
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
      const timeout = setTimeout(() => reject(new Error('Timeout 15s')), 15000)
      const ok = () => {
        clearTimeout(timeout)
        video.removeEventListener('loadeddata', ok)
        video.removeEventListener('error', err)
        this._build(video)
        this._ready = true
        resolve({ video, bgColor: this._bgColor })
      }
      const err = () => {
        clearTimeout(timeout)
        video.removeEventListener('error', err)
        reject(new Error('Video load failed'))
      }
      video.addEventListener('loadeddata', ok, { once: true })
      video.addEventListener('error', err, { once: true })
      video.load()
    })
  }

  _build(video) {
    /* Detectar color de fondo del primer frame */
    this._bgColor = this._sampleBgColor(video)

    /* Aplicar color al scene */
    this.scene.background = new THREE.Color(this._bgColor)
    this.renderer.setClearColor(this._bgColor)

    /* Ajustar cámara al aspect ratio del container */
    const a = this.w / this.h
    this.camera.left = -a
    this.camera.right = a
    this.camera.updateProjectionMatrix()

    this.texture = new THREE.VideoTexture(video)
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      toneMapped: false,
    })

    const vw = video.videoWidth, vh = video.videoHeight
    const vA = vw / vh, cA = this.w / this.h
    let pw, ph
    if (vA > cA) { ph = 2; pw = ph * vA }
    else         { pw = 2 * cA; ph = pw / vA }

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), this.material)
    this.scene.add(this.mesh)
  }

  /* Muestra el primer frame en un canvas y extrae el color de las esquinas */
  _sampleBgColor(video) {
    const c = document.createElement('canvas')
    c.width = video.videoWidth
    c.height = video.videoHeight
    const ctx = c.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const w = c.width, h = c.height
    const corners = [
      ctx.getImageData(0, 0, 1, 1).data,                   /* top-left */
      ctx.getImageData(w - 1, 0, 1, 1).data,               /* top-right */
      ctx.getImageData(0, h - 1, 1, 1).data,               /* bottom-left */
      ctx.getImageData(w - 1, h - 1, 1, 1).data,           /* bottom-right */
      ctx.getImageData(Math.floor(w / 2), 0, 1, 1).data,   /* top-center */
      ctx.getImageData(Math.floor(w / 2), h - 1, 1, 1).data, /* bottom-center */
    ]
    /* Promediar los colores */
    let r = 0, g = 0, b = 0
    for (const p of corners) { r += p[0]; g += p[1]; b += p[2] }
    r = Math.round(r / corners.length)
    g = Math.round(g / corners.length)
    b = Math.round(b / corners.length)
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
    c.remove()
    return hex
  }

  start() {
    if (this._raf) return
    const loop = () => {
      if (this._dead) return
      if (this._ready && this.texture) this.texture.needsUpdate = true
      this.renderer.render(this.scene, this.camera)
      this._raf = requestAnimationFrame(loop)
    }
    loop()
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null }
  }

  setTime(t) {
    if (!this.video || !this._ready) return
    const s = Math.min(Math.max(t, 0), this.video.duration || 5)
    try { this.video.currentTime = s } catch (_) {}
  }

  resize() {
    if (this._dead) return
    const r = this.container.getBoundingClientRect()
    this.w = r.width; this.h = r.height
    this.renderer.setSize(this.w, this.h)
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
    this._dead = true
    this.stop()
    window.removeEventListener('resize', this._resize)
    if (this.video && this.video.parentNode) this.video.parentNode.removeChild(this.video)
    this.texture?.dispose()
    this.material?.dispose()
    this.mesh?.geometry.dispose()
    if (this.mesh) this.scene.remove(this.mesh)
    this.renderer.dispose()
    this.container.querySelector('canvas')?.remove()
  }
}
