# M0 派工單：專案骨架

## GOAL（目標與背景）
為《NEON ECHO》（瀏覽器第三人稱 3D 探索遊戲）建立可持續開發的專案骨架。
這是里程碑 M0；上游計畫書在 `docs/DEVELOPMENT-PLAN.md`（先讀 §4 技術架構與 §3.1 色板）。
工作目錄即本 repo 根目錄（`Site-Project/`）。

建立內容：
1. **工具鏈**：Vite + TypeScript（strict 全開，含 noUncheckedIndexedAccess）+ ESLint（flat config，typescript-eslint）+ Prettier + Vitest + Playwright（僅 chromium）。
2. **依賴**：three、@dimforge/rapier3d-compat、postprocessing（版本用當前穩定版；lockfile 必須提交）。
3. **目錄結構**：依計畫書 §4.2 建立 `src/core`、`src/systems`、`src/world`、`src/render`、`src/ui`、`tests/`、`e2e/`、`public/assets/`（空目錄放 .gitkeep）。
4. **最小可玩場景**（驗證整條渲染管線）：
   - `src/render/palette.ts`：計畫書 §3.1 的六色色板常數。
   - 全螢幕 canvas；深紫夜空背景 `#1a0b2e`；霓虹網格地面；一顆洋紅自發光旋轉方塊；postprocessing Bloom 生效（方塊有泛光）。
   - `src/core/`：最小 GameLoop（requestAnimationFrame，固定時步 accumulator 模式，update/render 分離）。
   - Rapier 以 async init 成功載入，並在場景中用一顆受重力落下、落在地面上的小球證明物理運作（視覺可見）。
5. **npm scripts**：`dev` / `build` / `preview` / `lint` / `typecheck` / `test` / `e2e`。
6. **測試**：
   - Vitest：至少 GameLoop 固定時步邏輯 1 個真實測試（非 placeholder）。
   - Playwright e2e：啟動 dev server → 頁面載入 → canvas 存在且尺寸 >0 → 等待 3 秒無未捕捉 console error → 截圖存 `test-results/`。
7. **文件**：`docs/ASSETS.md`（資產授權登記表，先建表頭）；`README.md`（專案一句話介紹 + 指令說明）。

## REDLINES（紅線）
- 只准在本 repo 根目錄內寫檔；不准碰 `~/.claude/`、repo 外任何路徑。
- 不准修改 `docs/DEVELOPMENT-PLAN.md` 與 `docs/tasks/`。
- 不准 git commit / push（由主控收貨後執行）。
- 不准引入計畫書未列的執行期框架（React 等）；devDependencies 之外不加計畫外依賴。

## ACCEPTANCE（驗收條件——每條可由指令或 Read 驗證）
1. `npm run lint` exit 0。
2. `npm run typecheck` exit 0，且 `tsconfig.json` 含 `"strict": true` 與 `"noUncheckedIndexedAccess": true`。
3. `npm test` exit 0，且輸出顯示 ≥1 passed；測試檔中無 `test.todo`/空斷言。
4. `npm run build` exit 0。
5. `npm run e2e` exit 0，且 `test-results/` 產生截圖檔。
6. `src/render/palette.ts` 含 `#1a0b2e`、`#ff2ec4`、`#00e5ff` 三色常數（grep 可證）。
7. `package.json` 的 dependencies 恰為 three、@dimforge/rapier3d-compat、postprocessing 三項。
8. 計畫書 §4.2 列出的每個 src 子目錄皆存在。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M0-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>（每個改動檔一行；無改動寫「無」）
- 驗證證據: 執行過的指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
- 禁止: 貼超過 20 行的程式碼；貼整個檔案；寫「詳見上方」
```
