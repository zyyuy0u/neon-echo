## VERIFY
- 總結論: PASS
- 逐條:
  - [#1] PASS — `npm run lint` exit 0（eslint、0 warnings）；`npm run typecheck` exit 0（`tsc --noEmit`）。
    `npm test` exit 0（21 files／84 tests passed）；`npm run build` exit 0（442 modules，`✓ built in 101ms`）。
  - [#2] PASS — 相位 0/0.5 的實值分別含 `#1a0b2e/#c73866/#ff6b35` 與 `#080518/#4f1b68/#16213e`，並掃描 0..720 各 RGB 上下界（`tests/mood.test.ts:18-55`）；存檔相位 `0.375` round-trip（`tests/save.test.ts:43-64`）。
    逐字排程為 0ms→0、17ms→0、18ms→1、54ms→3，skip→全文（`tests/typewriter.test.ts:8-23`）；波次邊界 24.999→0、25→1、49.999→1、50→2、74.999→2、75→3，且 awaken/rest 反向（`tests/ending-waves.test.ts:9-29`）。`npm test` exit 0。
  - [#3] PASS — 未執行 e2e；靜態確認跳過開場及 `setDayPhase(0.5)`、天空/地平線/霧變色斷言（`e2e/mood.spec.ts:29-51`），teleport、E 開碑、partial、任意鍵 skip→全文、E 關閉（`e2e/mood.spec.ts:53-74`）。
    截圖與零 console/page error 斷言在 `e2e/mood.spec.ts:22-26,76-80`；既有 `test-results/mood-*/neon-echo-mood.png`，mtime `2026-07-18 12:17:14 +0800`、287522 bytes。
  - [#4] PASS — `git ls-tree` 得 8 個既有 spec（art/feel/gameplay/movement/qol/scaffold/ui/world），`git diff --quiet HEAD -- e2e` exit 0；故原斷言未變。
    art 的 `<300` draw calls／`<500000` triangles（`e2e/art.spec.ts:51-54`）及 world 同預算（`e2e/world.spec.ts:68-69,82-83`）與 HEAD 無差異（diff exit 0）。
  - [#5] PASS — 選單在系統 reduced-motion 與 `.reduced-motion` 下把 transition 降至 0.01ms，並停用選單背景動畫（`src/style.css:819-850`）。
    結局由 4 波/4s 降至 2 波/1.5s（`tests/ending-waves.test.ts:31-39`），實際渲染讀取此設定（`src/render/particles.ts:400-426`）。
  - [#6] PASS — 對 `src/ui`（排除 `i18n/**`）執行 `rg` 搜尋直接賦值的硬編碼 UI literals；僅命中 `GameplayOverlay.ts:140` 數字計數格式與 `MenuSystem.ts:419` 的兩個 `t(...)` 組合，無新增硬編碼語意字串。
    本次新增碑文文字取自內容資料，標題/提示仍經 `t('stele.*')`（`src/ui/GameplayOverlay.ts:367-375`）；新增行 diff 未出現直接語意字串。
- 附註: 依指示未執行 e2e；criterion 3 以 spec read-back 與近期 PNG 佐證。工作樹原有其他修改未動；四個 npm 指令皆出現使用者 shell 的缺失 `~/.cargo/env` 提示，但不影響 exit 0。
