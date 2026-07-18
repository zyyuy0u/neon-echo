# M9b 派工單：AAA 二期——全螢幕地圖 + 目標追蹤

## GOAL（目標與背景）
User 指令「3A 大作有的網頁版都要有」第二批。基線：M9a 已簽收（最新 main，全測試綠）。

實作內容：
1. **全螢幕地圖畫面 `src/ui/MapScreen.ts`**（M 鍵或手把 Select 開關；暫停選單也有入口）：
   - 俯視 2D 渲染（canvas 2D 或 SVG，不進 WebGL 預算）：以世界資料（WORLD_ZONES）
     繪製各區平台輪廓（俯視投影）＋palette 配色。
   - **戰爭迷霧**：未發現的區域以剪影/降飽和呈現，已發現區域全彩（發現狀態沿用
     M8b 的 discoveredZoneIds）。
   - 圖示：四地標（恆顯）、聖所（發現後；完成打勾）、傳送錨點、碎片**群**
     （以區域聚合計數「x/該區總數」，不逐枚標點——保留探索樂趣）、玩家位置+朝向箭頭。
   - 縮放/平移：滑鼠滾輪+拖曳、鍵盤方向鍵、手把右搖桿；ESC/M 關閉。
   - 開啟時遊戲暫停（沿用暫停凍結路徑）；純鍵盤可完整操作。
   - **座標投影純函式**（世界座標→地圖畫布座標，含縮放平移）單元測試。
2. **目標追蹤器 `src/systems/objectives/`**：
   - 目標鏈資料（純資料+單元測試）：下一目標 = 未完成的最早進程節點
     （聖所①→②→③→核心開啟條件→結局），完成自動推進。
   - HUD 左上顯示當前目標（i18n 文案）；羅盤上追蹤目標的圖示高亮+置頂。
   - 地圖上可點選任一已發現圖示設為「自訂追蹤目標」（覆蓋自動鏈，可取消回自動）。
   - 追蹤狀態入存檔（round-trip 測試）。
3. **Debug 鉤子**：`getObjective()`、`openMap()`（dev 限定）。

## REDLINES（紅線）
- tuning 手感值不准動；世界圖結構不准動（讀取可）；既有測試斷言不准改弱；
- a11y 不倒退（地圖鍵盤可操作、reduced-motion 無平移慣性動畫）；
- 不准新增依賴；不准 commit；不准跑 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. 單元測試新增且通過：座標投影（含縮放/平移邊界）、目標鏈推進（每完成一節點
   next 正確前移；全完成→結局目標）、自訂追蹤覆蓋與取消、追蹤狀態存檔 round-trip。
3. `e2e/map.spec.ts`（新）：進遊戲（跳過開場）→ 按 M → 地圖可見且含玩家標記與
   ≥4 地標圖示 → 未發現區域有迷霧樣式（class/attr 斷言）→ ESC 關閉恢復遊戲 →
   `getObjective()` 斷言初始目標為聖所① → debugCompletePuzzle 後斷言目標自動前移 →
   HUD 目標文字更新 → 截圖 → console 零 error。
4. 既有十條 e2e 全綠（主控執行）；art/world 預算斷言不變（地圖為 DOM/2D canvas，
   不增 WebGL draw calls）。
5. i18n 紀律維持（grep 驗收同前批）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M9b-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
