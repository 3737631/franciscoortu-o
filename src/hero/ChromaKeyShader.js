import * as THREE from 'three'

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform sampler2D uTexture;
uniform vec3      uKeyColor;
uniform float     uThreshold;
uniform float     uSoftness;
uniform float     uDespill;
uniform float     uLumaWeight;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv);

  /* ── Luma key fallback for very bright backgrounds ── */
  float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float lumaAlpha = 1.0 - smoothstep(uThreshold - uSoftness,
                                     uThreshold + uSoftness,
                                     luma);

  /* ── Chroma key ── */
  float dist    = distance(color.rgb, uKeyColor);
  float chromaAlpha = smoothstep(uThreshold - uSoftness,
                                 uThreshold + uSoftness,
                                 dist);

  /* blend between luma and chroma key */
  float alpha = mix(chromaAlpha, lumaAlpha, uLumaWeight);

  /* ── Despill (remove residual key colour from edges) ── */
  vec3 despilled = mix(color.rgb, color.rgb * uKeyColor, uDespill * (1.0 - alpha));

  gl_FragColor = vec4(despilled, alpha);
}
`

export function createChromaKeyMaterial(texture, options = {}) {
  const {
    keyColor    = new THREE.Color(0xeeeeee),
    threshold   = 0.35,
    softness    = 0.12,
    despill     = 0.0,
    lumaWeight  = 0.0,
  } = options

  return new THREE.ShaderMaterial({
    uniforms: {
      uTexture:    { value: texture },
      uKeyColor:   { value: keyColor },
      uThreshold:  { value: threshold },
      uSoftness:   { value: softness },
      uDespill:    { value: despill },
      uLumaWeight: { value: lumaWeight },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  })
}
