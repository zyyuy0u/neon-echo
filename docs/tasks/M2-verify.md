## VERIFY
- 總結論: PASS
- 逐條: [#1] PASS — `npm run lint` exit 0（eslint `--max-warnings 0`）；`npm run typecheck` exit 0（`tsc --noEmit`）；`npm test` exit 0（2 files / 5 tests passed）；`npm run build` exit 0（21 modules transformed, built in 148ms）。
- 逐條: [#2] PASS — `test -f src/render/materials.ts` exit 0；工廠實作見 `src/render/materials.ts:14-21,24-34`；`rg 'new THREE\.Mesh(Standard|Basic|Lambert|Phong)Material' src/world src/main.ts` exit 1（零命中）。
- 逐條: [#3] PASS — shader 漸層材質見 `src/render/sky.ts:33-45`；場景背景、fog 與 sky 設置見 `src/main.ts:48-52`。
- 逐條: [#4] PASS — Bloom strength/radius/threshold 定義與值見 `src/core/tuning.ts:28-30,71-73`；後製 composer、RenderPass、BloomEffect、EffectPass 見 `src/render/postfx.ts:22-42`。
- 逐條: [#5] PASS — canvas ready `e2e/art.spec.ts:23-28`；drawCalls/triangles 上限 `e2e/art.spec.ts:41-47`；fog/sky/background `e2e/art.spec.ts:49-54`；截圖與零 error `e2e/art.spec.ts:56-60`。近期 PNG：`test-results/art-renders-the-synthwave-art-direction-within-budget-chromium/neon-echo-art.png`（2026-07-18 00:06:31 +0800）。
- 逐條: [#6] PASS — scaffold canvas ready 保留於 `e2e/scaffold.spec.ts:12-17`；movement canvas ready 與移動斷言保留於 `e2e/movement.spec.ts:17-22,32-41`；`git diff --quiet -- e2e/scaffold.spec.ts e2e/movement.spec.ts` exit 0。
- 逐條: [#7] PASS — `git diff --stat -- tests/locomotion.test.ts` 無輸出，且 `git diff --quiet -- tests/locomotion.test.ts` exit 0。
- 附註: 依限制未執行 e2e；#5 為測試內容靜態驗證加近期 PNG 存在性確認。build 成功但回報單一 JS chunk 2,839.73 kB（gzip 993.40 kB）的大小警告。
