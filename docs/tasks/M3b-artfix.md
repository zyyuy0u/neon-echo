# M3b 派工單：世界視覺修正（美術收貨退件，attempt 2）

## GOAL（目標與背景）
M3 世界構建的資料/邏輯/測試已合格，但**視覺被主控美術審查退件**。證據截圖：
- `test-results/world-*/neon-echo-world-spire.png`：東區巨塔是無結構的洋紅實心發光量體，
  幾乎淹沒整個畫面。
- `test-results/art-*/neon-echo-art.png`：廣場地面為滿版純青發光面，M2 的
  「深色基底+青色網格線」地面（參考 M2 簽收畫面：暗底、細青線、遠處淡出）被覆蓋。

《NEON ECHO》美術鐵則（違反即退件，本次必須全數落實）：
1. **暗底亮線**：任何大面積表面（地面、平台頂、地標主體）一律深色
   （`nightSky #1a0b2e` / `structureBlue #16213e`），發光只准出現在**線、邊、點綴**
   （描邊、網格線、條紋、信標）。全畫面高飽和發光面積佔比必須是「點綴級」。
2. **地面**：所有區域的可行走大面一律使用 M2 的網格材質（NeonGridMaterial 系）或
   結構材質+描邊；禁止用 neon 發光材質鋪面。
3. **地標**：暗色剪影結構 + 霓虹描邊/條紋/頂部信標。`fog: false` 只准用於
   細部發光元素（邊線、信標、條紋），不准用於大面體。東塔參考：暗色塔身 +
   青色橫紋層線 + 塔頂洋紅信標。
4. **配置物**（碎片/碑文/聖所門框）維持小型發光體——它們是「點綴級」的正確示範。

## 修正範圍
- `src/world/WorldBuilder.ts` 與 `src/world/map/*.ts` 中材質指派與地標構成。
- `e2e/world.spec.ts` 的 teleport 取景：改為在地標**外 40–60 單位、高於地面**的
  視點取景（能看到塔的整體剪影與層次），不得在幾何體內部。
- 不足以表現層次時，可在材質工廠**新增**變體（維持 palette 驅動），不准改既有材質的
  既定參數簽名。

## REDLINES（紅線）
- 不准動：`src/world/map/graph.ts` 的圖結構、`tests/`、`docs/`、手感層、既有 e2e 的
  非 teleport 斷言。配置數量與座標資料不准變（只准改視覺表現）。
- 不准新增依賴；不准 git commit / push；不准執行 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. `rg 'createNeon(Glow|Emissive)?Material|neonMaterial' src/world/WorldBuilder.ts` 中，
   發光材質不得指派給 ground/platform/landmark-body 類幾何（以程式碼審讀驗證，
   實作時在材質指派處以清楚的命名/註解自證用途）。
3. 地面幾何使用網格或結構材質（read-back 驗證 WorldBuilder 中 ground 類指派）。
4. `e2e/world.spec.ts` teleport 座標更新為外部取景點（read-back 驗證非地標內部座標）。
5. 主控外部執行 e2e 4 條全綠後，**截圖複審由主控執行**（本單最終閘）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M3b-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
