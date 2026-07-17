## VERIFY

- 總結論: PASS
- 逐條: [M5#1] PASS — `npm run lint` exit 0（eslint、max-warnings 0）；`npm run typecheck` exit 0（tsc --noEmit）。
  `npm test` exit 0（11 files、38 tests passed）；`npm run build` exit 0（40 modules transformed、built in 166ms；僅 chunk-size warning）。
- 逐條: [M5#2] PASS — key Set 相等與非空值斷言見 `tests/i18n.test.ts:19-25`；缺 key 回傳原 key、僅 warn 一次見 `:28-34`。
  `npm test` exit 0，11 files / 38 tests passed。
- 逐條: [M5#3] PASS — round-trip 與 version 見 `tests/save.test.ts:42-56`；損毀 JSON／未知 version 不拋錯且回預設值見 `:58-67`。
  新遊戲清檔及 storage key 為 null 見 `:69-77`。
- 逐條: [M5#4] PASS — 鍵盤進遊戲、HUD、暫停與設定焦點／切 en 見 `e2e/ui.spec.ts:19-49`；shard 收集與 reload 後 1/40 見 `:51-70`。
  截圖與零 console/page error 見 `:13-17,72-76`；近期 PNG：`test-results/ui-operates-menus-by-keyboard-and-restores-a-saved-shard-chromium/neon-echo-ui.png`（2026-07-18 01:35）。
- 逐條: [M5#5] PASS — `tests/tuning.test.ts:8-13` 開啟 reduced motion 後，FOV kick coefficient 與 camera shake strength 均斷言為 0。
- 逐條: [M5#6] PASS — canvas ready：`e2e/scaffold.spec.ts:12-17`；位移：`movement.spec.ts:39-61`；drawCalls 預算：`art.spec.ts:37-54`。
  world stats：`world.spec.ts:40-51`；dash/shard hooks：`gameplay.spec.ts:63-92`。Git diff 顯示五檔只新增允許的 `openMenu('none')`，原斷言無刪改。
- 逐條: [M5#7] PASS — `rg '選單|繼續|設定' src/ui --glob '!src/ui/i18n/**'` exit 1、零命中。
  `rg "['\"](Main Menu|Continue|Settings|New Game|Resume)['\"]" src/ui --glob '!src/ui/i18n/**'` exit 1、零命中。
- 逐條: [M5b#3] PASS — `src/ui/MenuSystem.ts:93-125` 建立 Continue/New Game 後，依 `canContinue()` 條件呼叫對應按鈕 `.focus()`（`:123-124`）。
- 附註: 依指示未執行 e2e；M5#4 的語言 select 先以 Tab 驗證鍵盤可達，再因 headless Chromium 限制用 `selectOption('en')`（`e2e/ui.spec.ts:38-44`）。build 有 >500 kB chunk 警告但 exit 0。
