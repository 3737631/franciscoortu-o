import * as THREE from 'three'

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform sampler2D uTexture;
uniform vec3      uKeyColor;
uniform float     uThreshold;
uniform float     uSoftness;
uniform float     uDespill;

varying vec2 vUv;

void main() {
  vec4 color = texture2D(uTexture, vUv);

  /* Chroma distance from key color */
  vec3 diff          = color.rgb - uKeyColor;
  float dist         = length(diff);
  float alpha        = smoothstep(uThreshold - uSoftness,
                                  uThreshold + uSoftness,
                                  dist);

  /* Despill suave solo en bordes semitransparentes */
  float spill        = 1.0 - alpha;
  vec3  despilled    = color.rgb - diff * uDespill * spill;

  gl_FragColor = vec4(despilled, max(alpha, 0.001));
}
`

export function createChromaKeyMaterial(texture, options = {}) {
  const {
    keyColor  = new THREE.Color(0xf0f0f0),
    threshold = 0.15,
    softness  = 0.18,
    despill   = 0.3,
  } = options

  return new THREE.ShaderMaterial({
    uniforms: {
      uTexture:    { value: texture },
      uKeyColor:   { value: keyColor },
      uThreshold:  { value: threshold },
      uSoftness:   { value: softness },
      uDespill:    { value: despill },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  })
}
