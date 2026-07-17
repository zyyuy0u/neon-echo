# M5b 派工單：主選單鍵盤啟動修正（e2e 實跑退回，attempt 2）

## GOAL（目標與背景）
M5 交付在主控外部實跑 e2e 時，`e2e/ui.spec.ts` 失敗、其餘 5 條全綠。失敗證據：
- 流程：頁面載入 → 主選單標題可見 → `Tab` → `Enter` → 斷言 `.hud` 可見。
- 實際：`.hud` 5 秒內始終 hidden（Playwright log：`<div class="hud">` resolved 10 次
  皆 hidden；期間 4 秒後被加上 `is-idle`，代表 `showHudEvent` 有跑，但 overlay root
  的 `hidden` 從未解除）。
- 推論：`Tab`+`Enter` 沒有觸發 `onNewGame`/`startSession`（`overlay.setActive(true)`
  未發生）——主選單的初始焦點/焦點順序與 Enter 觸發路徑有缺陷。
  錯誤上下文：`test-results/ui-operates-menus-by-keyboard-and-restores-a-saved-shard-chromium/error-context.md`。

## 修正要求
1. **主選單初始焦點**依 M5 規格：選單開啟時焦點**直接落在主要動作按鈕上**
   （有存檔→「繼續」，無存檔→「新遊戲」），不需先按 Tab；Tab/方向鍵可在項目間循環
   （含 wrap-around），Enter 觸發當前焦點。無存檔時「繼續」不出現或明確 disabled
   且不可聚焦（擇一，需一致）。
2. **診斷根因**：先靜態追出 Tab+Enter 為何沒觸發（初始焦點落在何處、Enter 由誰處理、
   是否被 keydown handler 攔截），在 REPORT 寫明根因，不准只改測試繞過。
3. `e2e/ui.spec.ts` 對齊修正後的焦點模型（開啟即聚焦主要動作 → 直接 Enter），
   其餘斷言（暫停選單、設定切語言、收碎片、重整保留、零 console error）不准刪弱。
4. 若診斷發現 HUD 顯示邏輯另有問題（例如 setActive 與 root.hidden 的時序），一併修正。

## REDLINES（紅線）
- 只准動：`src/ui/MenuSystem.ts`、`src/ui/GameplayOverlay.ts`、`src/main.ts` 的選單接線、
  `e2e/ui.spec.ts`、必要的 CSS。其他一律不碰。
- 不准新增依賴；不准 git commit / push；不准執行 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. REPORT 中含根因說明（指出原始碼 path:line 的具體缺陷）。
3. MenuSystem 開啟主選單時以程式設定初始焦點到主要動作（read-back 可證：focus() 呼叫
   與條件邏輯）。
4. 主控外部實跑 `npm run e2e` 六條全綠（本單最終閘，由主控執行）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M5b-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 根因: <path:line + 一句話機制說明>
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
