import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
  type Scene,
  type Vector3,
} from 'three';

import { PALETTE } from './palette';
import type { DayMood } from '../systems/mood/dayCycle';

export interface SynthwaveSky {
  update: (deltaSeconds: number, cameraPosition: Vector3) => void;
  setMood: (mood: Readonly<DayMood>) => void;
  dispose: () => void;
}

const skyVertexShader = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function createSynthwaveSky(scene: Scene): SynthwaveSky {
  const group = new Group();
  group.name = 'synthwave-sky';

  const skyMaterial = new ShaderMaterial({
    name: 'SynthwaveGradientSky',
    uniforms: {
      uZenith: { value: new Color(PALETTE.nightSky) },
      uRose: { value: new Color(PALETTE.sunsetRose) },
      uHorizon: { value: new Color(PALETTE.sunsetOrange) },
    },
    vertexShader: skyVertexShader,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uRose;
      uniform vec3 uHorizon;
      varying vec3 vDirection;

      void main() {
        float height = clamp(vDirection.y * 0.95 + 0.08, 0.0, 1.0);
        vec3 sunset = mix(uHorizon, uRose, smoothstep(0.0, 0.32, height));
        vec3 color = mix(sunset, uZenith, smoothstep(0.16, 0.62, height));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const dome = new Mesh(new SphereGeometry(96, 32, 18), skyMaterial);
  dome.renderOrder = -100;
  group.add(dome);

  const sunMaterial = new ShaderMaterial({
    name: 'SlicedSynthwaveSun',
    uniforms: {
      uOrange: { value: new Color(PALETTE.sunsetOrange).multiplyScalar(2.5) },
      uMagenta: { value: new Color(PALETTE.neonMagenta).multiplyScalar(1.8) },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uOrange;
      uniform vec3 uMagenta;
      uniform float uTime;
      varying vec2 vUv;

      void main() {
        vec2 centered = vUv * 2.0 - 1.0;
        float radius = length(centered);
        float disc = 1.0 - smoothstep(0.94, 1.0, radius);
        float stripeWidth = mix(0.025, 0.095, vUv.y);
        float stripes = step(stripeWidth, mod(vUv.y + 0.01, 0.14));
        float pulse = 0.92 + 0.08 * sin(uTime * 0.7);
        vec3 color = mix(uMagenta, uOrange, vUv.y) * pulse;
        float alpha = disc * stripes;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const sun = new Mesh(new PlaneGeometry(22, 22), sunMaterial);
  sun.position.set(0, 11, -72);
  sun.renderOrder = -98;
  group.add(sun);

  const starPositions: number[] = [];
  for (let index = 0; index < 120; index += 1) {
    const azimuth = index * 2.399963 + 0.37;
    const elevation = 0.12 + ((index * 47) % 83) / 83;
    const horizontal = Math.cos(elevation);
    starPositions.push(
      Math.cos(azimuth) * horizontal * 82,
      Math.sin(elevation) * 82,
      Math.sin(azimuth) * horizontal * 82,
    );
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(starPositions), 3),
  );
  const starMaterial = new ShaderMaterial({
    name: 'FlickeringSynthwaveStars',
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(PALETTE.neonCyan).multiplyScalar(1.8) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying float vBrightness;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        float seed = position.x * 0.17 + position.z * 0.11;
        vBrightness = 0.55 + 0.45 * sin(uTime * 0.8 + seed);
        gl_PointSize = 1.4 + vBrightness * 1.8;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vBrightness;

      void main() {
        float radius = distance(gl_PointCoord, vec2(0.5));
        float alpha = (1.0 - smoothstep(0.15, 0.5, radius)) * vBrightness;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
    toneMapped: false,
  });
  const stars = new Points(starGeometry, starMaterial);
  stars.renderOrder = -99;
  group.add(stars);

  scene.add(group);
  let elapsedSeconds = 0;

  return {
    update: (deltaSeconds, cameraPosition) => {
      elapsedSeconds += deltaSeconds;
      sunMaterial.uniforms.uTime!.value = elapsedSeconds;
      starMaterial.uniforms.uTime!.value = elapsedSeconds;
      group.position.set(cameraPosition.x, 0, cameraPosition.z);
    },
    setMood: (mood) => {
      skyMaterial.uniforms.uZenith!.value.set(mood.zenith);
      skyMaterial.uniforms.uRose!.value.set(mood.rose);
      skyMaterial.uniforms.uHorizon!.value.set(mood.horizon);
      sunMaterial.uniforms.uOrange!.value
        .set(mood.horizon)
        .multiplyScalar(2.5 * mood.sunIntensity);
      sunMaterial.uniforms.uMagenta!.value
        .set(mood.rose)
        .multiplyScalar(1.8 * mood.sunIntensity);
    },
    dispose: () => {
      scene.remove(group);
      dome.geometry.dispose();
      skyMaterial.dispose();
      sun.geometry.dispose();
      sunMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
    },
  };
}
