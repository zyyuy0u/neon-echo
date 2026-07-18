## VERIFY
- 總結論: PASS
- 逐條: [#1] PASS — `npm run lint` exit 0（eslint）；`npm run typecheck` exit 0（`tsc --noEmit`）；`npm test` exit 0（16 files / 59 tests passed）；`npm run build` exit 0（435 modules, `✓ built`）。
- 逐條: [#2] PASS — 教學 one-shot + save round-trip：`tests/tutorial.test.ts:35-57`；相機 yaw：`tests/camera.test.ts:5-13`。
  落地音 tier：`tests/audio.test.ts:74-79`；腳步相位：`tests/audio.test.ts:81-87`；`npm test` exit 0（59/59）。
- 逐條: [#3] PASS — 七鍵宣告於 `src/core/tuning.ts:31-42`，調校值於 `src/core/tuning.ts:92-103`。
  reduced-motion 派生歸零於 `src/core/tuning.ts:123-131`，斷言於 `tests/tuning.test.ts:8-15`。
- 逐條: [#4] PASS — 字幕/控制權+位移：`e2e/feel.spec.ts:26-54`；teleport、提示出現/消失與存檔標記：`e2e/feel.spec.ts:56-73`。
  reload 後不再出現、截圖、零 console/page error：`e2e/feel.spec.ts:75-93`；passing 記錄 `test-results/.last-run.json:2-3` 且 feel PNG 存在（2026-07-18 11:39:52 +0800）。
- 逐條: [#5] PASS — 六支既有 spec（art/gameplay/movement/scaffold/ui/world）對 HEAD 的 `git diff --exit-code` = 0、diff 0 bytes；原斷言（含 art/world budget）未被修改。
- 逐條: [#6] PASS — Menu toggle 讀值/更新：`src/ui/MenuSystem.ts:197-210,319-322`；callback 寫存檔：`src/main.ts:186-189,462-465`。
  save schema/default/migration：`src/systems/save/SaveSystem.ts:21-28,57-66,185-198`；false round-trip 與 legacy true 測試：`tests/save.test.ts:43-78`。
- 附註: 依指示未執行 e2e；#4 依現有 Playwright passed 狀態與 1280×720 PNG 產物驗證。命令的 zsh 啟動有缺少 `~/.cargo/env` 警告，不影響四項 exit 0。
