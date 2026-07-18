import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 部署於 /<repo>/ 子路徑，資產一律相對引用。
  base: './',
  resolve: {
    alias: [{ find: /^three$/, replacement: 'three/src/Three.js' }],
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
              // 原始碼在此表達式後緊接 `.buffer`，替換結果必須是 TypedArray
              // 才能讓 `.buffer` 得到合法 ArrayBuffer（否則 undefined 會落入
              // glue 的 URL fallback，於生產建置中因 import.meta.url 被替換而崩潰）。
              'new Uint8Array(yield fetch(__rapierWasmUrl).then((response) => response.arrayBuffer()))',
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
