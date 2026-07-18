import {
  Color,
  LineBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three';

import { PALETTE } from './palette';

export type NeonColor = typeof PALETTE.neonCyan | typeof PALETTE.neonMagenta;

export function createStructureMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: PALETTE.structureBlue,
    emissive: PALETTE.structureBlue,
    emissiveIntensity: 0.35,
    metalness: 0.35,
    roughness: 0.62,
  });
}

export function createNeonMaterial(
  color: NeonColor,
  intensity = 3.5,
): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: 0.15,
    roughness: 0.28,
  });
}

/**
 * Character materials deliberately keep the same standard-material pipeline as
 * the world. Three enables skinning automatically when these are rendered by a
 * SkinnedMesh, so no shader or material flag is required.
 */
export function createSkinnedStructureMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    name: 'CharacterStructure',
    color: PALETTE.structureBlue,
    emissive: PALETTE.structureBlue,
    emissiveIntensity: 0.18,
    metalness: 0.48,
    roughness: 0.5,
  });
}

export function createSkinnedNeonMaterial(
  color: NeonColor,
  intensity = 3.2,
): MeshStandardMaterial {
  const material = createNeonMaterial(color, intensity);
  material.name =
    color === PALETTE.neonCyan ? 'CharacterCyan' : 'CharacterMagenta';
  return material;
}

export function createHighlightMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: PALETTE.warningYellow,
    emissive: PALETTE.warningYellow,
    emissiveIntensity: 3.8,
    metalness: 0.1,
    roughness: 0.32,
  });
}

export function createEdgeMaterial(
  color: NeonColor | typeof PALETTE.warningYellow,
): LineBasicMaterial {
  return new LineBasicMaterial({
    color: new Color(color).multiplyScalar(2.2),
    toneMapped: false,
  });
}

export function createGridMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    name: 'NeonGridMaterial',
    // fog: true 的 ShaderMaterial 必須自帶 UniformsLib.fog，否則 three 的
    // refreshFogUniforms 會讀 undefined uniforms 而崩潰。
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uBaseColor: { value: new Color(PALETTE.structureBlue) },
        uLineColor: {
          value: new Color(PALETTE.neonCyan).multiplyScalar(2.4),
        },
        uFadeNear: { value: 16 },
        uFadeFar: { value: 58 },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vWorldPosition;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vec4 mvPosition = viewMatrix * worldPosition;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 uBaseColor;
      uniform vec3 uLineColor;
      uniform float uFadeNear;
      uniform float uFadeFar;
      varying vec3 vWorldPosition;

      float gridLine(vec2 coordinate, float scale) {
        vec2 cell = abs(fract(coordinate / scale - 0.5) - 0.5) /
          fwidth(coordinate / scale);
        return 1.0 - min(min(cell.x, cell.y), 1.0);
      }

      void main() {
        float minor = gridLine(vWorldPosition.xz, 1.0);
        float major = gridLine(vWorldPosition.xz, 5.0);
        float line = max(minor * 0.52, major);
        float distanceFromCamera = distance(cameraPosition.xz, vWorldPosition.xz);
        float distanceFade = 1.0 - smoothstep(uFadeNear, uFadeFar, distanceFromCamera);
        vec3 color = mix(uBaseColor * 0.22, uLineColor, line * distanceFade);
        gl_FragColor = vec4(color, 0.18 + line * distanceFade * 0.82);
        #include <fog_fragment>
      }
    `,
    fog: true,
    transparent: true,
    depthWrite: false,
  });
}
