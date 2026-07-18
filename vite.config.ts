import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      three: 'three/src/Three.js',
    },
  },
  plugins: [
    {
      name: 'externalize-rapier-inline-wasm',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('/@dimforge/rapier3d-compat/rapier.mjs')) {
          return undefined;
        }
        const inlineWasm = /Lg\.toByteArray\("[A-Za-z0-9+/=]+"\)/;
        if (!inlineWasm.test(code)) {
          throw new Error(
            'Could not locate Rapier compat inline WASM payload.',
          );
        }
        return {
          code:
            'import __rapierWasmUrl from "./rapier_wasm3d_bg.wasm?url";' +
            code.replace(
              inlineWasm,
              '(yield fetch(__rapierWasmUrl).then((response) => response.arrayBuffer()))',
            ),
          map: null,
        };
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('/node_modules/')) return undefined;
          if (id.includes('/@dimforge/rapier3d-compat/')) {
            return 'vendor-rapier';
          }
          if (id.includes('/three/src/renderers/')) {
            return 'vendor-three-renderer';
          }
          if (id.includes('/three/')) {
            return 'vendor-three';
          }
          return undefined;
        },
      },
    },
  },
});
