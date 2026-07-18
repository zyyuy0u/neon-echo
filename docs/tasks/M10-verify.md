## VERIFY
- 總結論: FAIL
- 逐條: [M10#1／M10b#1] PASS — `npm run lint` exit 0（eslint `--max-warnings 0`）；`npm run typecheck` exit 0（`tsc --noEmit`）；`npm test` exit 0（29 files／112 tests passed）；`npm run build` exit 0（454 modules，`✓ built`）。
- 逐條: [M10#2] PASS — `tests/city.test.ts:37-61` 以格心像素抽樣斷言點亮率 0.3–0.6 且暖橙、青色皆存在；`:89-95` 對 8 seeds 做 pixel hash 並要求 8 種；`:97-104` 斷言指定道路列的中心線像素。`npm test` exit 0。
- 逐條: [M10#3] FAIL — 數量斷言存在於 `tests/city.test.ts:118-125`（sign 40、streetlight 60、signal 10、skyline 30、flight 3–5），但 signal 統計是獨立寫死 `12`（`src/world/CityVisuals.ts:148,155`），實際建構另讀區域 `positions.length`（`:637-670`），不是實際輸出的單一來源。
- 逐條: [M10#4] PASS — `e2e/city.spec.ts:48-59` 有 drawCalls/triangles 預算與世界門檻；`:61-76` 有三個 teleport 視角及截圖；`:21-25,78` 收集 console/page error 並斷言零錯誤。未跑 e2e；`test-results/city-*/` 內三張 PNG 皆存在，時間為 2026-07-18 18:20:42–45。
- 逐條: [M10#5] PASS — `git diff -- e2e` 僅變更既有 12 specs 中的 `e2e/world.spec.ts`；原 assertions 保留，只有格式化與 world stats 型別／期望物件新增 8 欄，符合 additions-only 例外；其餘 11 specs 無 diff。
- 逐條: [M10 工程約束] PASS — `WorldBuilder.ts` diff 對 collider/createCollider/ColliderDesc 無增刪，現路徑仍見 `src/world/WorldBuilder.ts:189-252,280-290,424-437`；`src/core/tuning.ts:68,72,77` 仍為 32/33/80 且該檔無 diff；dependency/lockfile diff 為空（exit 0）。
- 逐條: [M10b#2] PASS — `tests/city.test.ts:64-79` 從最大可玩立面換算 ≥16 columns、≥35 rows，註解記載 0.9–1.4 寬及 1.2–1.8 高依據；`:81-86` 同時斷言密度門檻與實際 unit-size 上下界；原點亮率／雙色調斷言仍在 `:37-61`。
- 附註: 依指示未執行 e2e；三張既有截圖只確認檔案與最近時間，未用本輪執行重產。M10#3 的 signal 統計耦合缺口使總結論為 FAIL。

## 主控裁決附錄（2026-07-18）
- [M10#3] 驗收者抓到的號誌計數雙真相已修：座標陣列提升為模組級
  `CITY_TRAFFIC_SIGNAL_POSITIONS`（單一來源），`CITY_TRAFFIC_SIGNAL_COUNT` 由其
  `.length` 導出，`buildTrafficSignals` 消費同一份。lint/typecheck/112 單元測試/
  city e2e 重跑全綠（主 transcript 有輸出）。
- 修訂後總結論：PASS（其餘各條維持驗收者原判；美術多視角複審已由主控通過，
  含 M10b 近景窗格密度修正後的街景複審）。
