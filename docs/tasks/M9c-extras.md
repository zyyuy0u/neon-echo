# M9c 派工單：AAA 二期收官——成就 + 拍照模式 + 統計

## GOAL（目標與背景）
User 指令「3A 大作有的網頁版都要有」最終批。基線：M9b 已簽收（最新 main，全測試綠）。

實作內容：
1. **成就系統 `src/systems/achievements/`**（純邏輯+資料驅動，本地存檔）：
   - 成就定義資料（id、i18n key、判定條件描述）至少 12 個：首枚碎片、10/25/40 碎片、
     首座碑文、全 12 碑文、聖所①②③各一、首次傳送、雙結局各一、
     全能力解鎖、遊玩滿 30 分鐘。
   - 判定引擎：訂閱既有事件（收集/解鎖/傳送/結局/碑文/時間），達成→解鎖一次、
     toast 演出（金色橫幅+音效 sting，reduced-motion 降級）、入存檔（round-trip）。
   - 暫停/主選單新增「成就」頁：清單顯示已解鎖（金亮）/未解鎖（暗灰+隱藏描述用
     ??? 或提示文案——隱藏規則入資料欄位）、進度計數 x/12。鍵盤可操作。
2. **拍照模式 `src/systems/photo/`**（P 鍵開關，暫停選單有入口）：
   - 進入：遊戲凍結、HUD 全隱藏、自由相機（WASD 平移+滑鼠旋轉+滾輪升降/推拉，
     速度入 tuning；手把左右搖桿對應）。
   - 「拍下」（Enter/A）：以當前 renderer 畫面輸出 PNG 下載（`neon-echo-YYYYMMDD-HHmmss.png`）。
   - 邊界：自由相機位置夾限在世界範圍 ±50 單位、高度 1–200（純函式+測試）。
   - 退出（P/ESC）回到原相機狀態，遊戲恢復。reduced-motion 不影響拍照模式本身。
3. **統計頁**（成就頁同層「統計」分頁）：遊玩時間（formatPlaytime 既有）、碎片 x/40、
   碑文 x/12、傳送次數、拍照張數、達成結局標記。傳送/拍照計數入存檔（migration+測試）。
4. **Debug 鉤子**：`getAchievements()`、`enterPhotoMode()`（dev 限定）。

## REDLINES（紅線）
- tuning 手感值不准動（新增鍵可）；世界資料/圖結構不准動；既有測試斷言不准改弱；
- a11y 不倒退；不准新增依賴；不准 commit；不准跑 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. 單元測試新增且通過：成就判定（每類條件至少一例：計數閾值、一次性事件、時間累計；
   重複事件不重複解鎖）、成就存檔 round-trip、自由相機位置夾限邊界值、統計計數遞增與
   migration。
3. `e2e/extras.spec.ts`（新）：進遊戲（跳過開場）→ collectNearestShard → 成就 toast
   出現（首枚碎片）→ `getAchievements()` 斷言解鎖含該 id → 開成就頁斷言金亮項與
   x/12 計數 → 關閉 → enterPhotoMode → HUD 隱藏斷言 → 模擬拍照 → 斷言下載觸發
   （Playwright download 事件）→ 退出拍照模式 HUD 恢復 → 重整 → 成就保留。
   截圖 + console 零 error。
4. 既有十一條 e2e 全綠（主控執行）；art/world 預算斷言不變。
5. i18n 紀律維持（grep 驗收同前批）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M9c-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
