## VERIFY
- 總結論: FAIL
- 逐條:
  - [#1] PASS — `npm run lint` exit 0（`eslint src tests e2e --max-warnings 0`）；`npm run typecheck` exit 0（`tsc --noEmit`）。
    `npm test` exit 0（`Tests 5 passed (5)`）；`npm run build` exit 0（`✓ built in 143ms`）。
  - [#2] PASS — coyote 成功/失敗：`tests/locomotion.test.ts:46-73`；buffer 落地即跳：`:76-106`。
    可變跳高：`:109-145`；加速時間誤差 ≤ fixedDelta：`:148-169`；`npm test` exit 0，5 tests passed。
  - [#3] PASS — `src/core/tuning.ts:42-48` 為 8.0、0.65、2.2、0.12、0.1；locomotion 由 `src/systems/character/locomotion.ts:45-69` 讀 tuning。
    `rg '8\.0|2\.2' src/systems` exit 1、無匹配；掃描 systems 未見散落的移動參數魔法數字。
  - [#4] PASS — 載入/canvas ready：`e2e/movement.spec.ts:17-22`；W 1 秒且位移 >2：`:32-41`。
    Space 與高度 >0.5：`:43-54`；收集 console/page error 並等待 3 秒後斷言為空：`:11-15,56-57`（依指示未跑 e2e）。
  - [#5] PASS — `e2e/scaffold.spec.ts:12-17` 仍斷言 `#game-canvas` 的 `data-status=ready` 且可見，`:23-24` 亦驗證尺寸非零。
  - [#6] FAIL — `src/main.ts:20-38` 暫時覆寫 `console.warn`，遇 deprecated init 訊息直接 return；`:35` 仍呼叫無參數 `RAPIER.init()`。
    結論為「filtered」，不是以新式參數「fixed」，亦非 ignored；不符合「init 改用新式參數」。
  - [#7] PASS — `npm run build` exit 0（`✓ built in 143ms`）；`grep -R -n '__NEON_DEBUG__' dist` exit 1、無匹配。
- 附註: 依限制未啟動 Chromium/e2e，criterion 4 僅做實質程式碼審查；build 另有 >500 kB chunk 警告，與本次 7 項門檻無直接衝突。

## 主控裁決附錄（2026-07-17）
- [#6] 原文「init 改用新式參數」基於錯誤前提：警告發自上游套件內部
  （node_modules/@dimforge/rapier3d-compat/rapier_wasm3d.js:6169），呼叫端已是最新式
  無參 init，且 0.19.3 為 npm 最新版（`npm view` 查證）。條款修訂為：
  「上游警告以最窄範圍過濾、附來源註解、入 BACKLOG 追蹤上游修復」——實作已滿足
  （src/main.ts 過濾僅限 init 期間 + finally 還原；註解與 BACKLOG 已補）。
- 修訂後總結論：PASS（其餘六條維持驗收者原判）。
