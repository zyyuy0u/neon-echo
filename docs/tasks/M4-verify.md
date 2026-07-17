## VERIFY
- 總結論: FAIL
- 逐條: [#1] PASS — `npm run lint` exit 0（`eslint src tests e2e --max-warnings 0`）；`npm run typecheck` exit 0（`tsc --noEmit`）；`npm test` exit 0（8 files / 29 tests passed）；`npm run build` exit 0（34 modules transformed, built in 154ms）。
- 逐條: [#2] PASS — dash 20/0.18/冷卻否決 `tests/abilities.test.ts:38-69`（實值 `src/core/tuning.ts:60-62`）；二段跳一次+落地重置 `tests/abilities.test.ts:72-101`；glide 2.5 `tests/abilities.test.ts:104-121` / `src/core/tuning.ts:64`；三能力 locked 負向斷言 `tests/abilities.test.ts:124-136`。
- 逐條: [#3] PASS — 錯序重置+正序完成 `tests/puzzles.test.ts:12-18`；脈衝時序可通過 `tests/puzzles.test.ts:21-27`；到頂觸發 `tests/puzzles.test.ts:30-33`；三種 unlock payload 分別斷言 dash/doubleJump/glide `tests/puzzles.test.ts:36-49`。
- 逐條: [#4] PASS — shards=29 與缺能力均 false `tests/ending.test.ts:8-15`；達標互動為 true `tests/ending.test.ts:18-22`；awaken/rest 均可達且二次選另分支為 false `tests/ending.test.ts:25-34`。
- 逐條: [#5] PASS — 12 條、id Set size=12、zh/en trim 非空皆有真實斷言 `tests/content.test.ts:6-13`；`npm test` 顯示該測試通過。
- 逐條: [#6] PASS — baseline 對 dash 位移比較 `e2e/gameplay.spec.ts:29-72`；shard count +1 `e2e/gameplay.spec.ts:74-85`；截圖+零 console/page error `e2e/gameplay.spec.ts:17-21,87-91`；近期 PNG：`test-results/gameplay-uses-the-dash-and-shard-collection-debug-hooks-chromium/neon-echo-gameplay.png`（2026-07-18 00:48:08 +0800）。
- 逐條: [#7] FAIL — `git diff --quiet -- tests/reachability.test.ts` exit 0；但 `tests/locomotion.test.ts:46,76,109,148` 僅有 4 個 baseline test 名稱，verbose `npm test` 也僅列出這 4 個通過，未達要求的 5 個。
- 附註: 依指示未執行 e2e；#6 僅由規格源碼與現存截圖驗證。build 成功但有 >500 kB chunk 警告；shell 另顯示缺少 `~/.cargo/env` 的非致命警告。

## 主控裁決附錄（2026-07-18）
- [#7] 派工單寫「既有 5 個測試」為主控筆誤：M1 簽收基線 tests/locomotion.test.ts 即為
  4 個測試（第 5 個 passed 屬 tests/GameLoop.test.ts）。git 查證：
  `git diff --stat adc45df..HEAD -- tests/locomotion.test.ts` 無輸出——基線自 M1 簽收後
  一行未動，條款意圖（既有測試不得改弱）完全滿足，總測試數 5→29 只增不減。
- 修訂後總結論：PASS（其餘六條維持驗收者原判）。
