# M3 派工單：世界構建

## GOAL（目標與背景）
在 M2（commit dc8d557，美術管線已簽收）之上建立《NEON ECHO》的完整遊戲世界。
上游計畫書 `docs/DEVELOPMENT-PLAN.md` §2.2（地圖結構——嚴格遵循）、§2.4（能力門鎖）、
§2.5（收集配置）、§4.3（效能預算）。
本里程碑交付「世界的形體與資料」；能力解鎖/收集互動邏輯屬 M4，不要實作。

建立內容：
1. **資料驅動地圖 `src/world/map/`**：
   - `types.ts`：Zone / Landmark / Platform / ShardPlacement / StelePlacement /
     SanctuaryEntrance / GraphEdge 型別；能力列舉 `Ability = 'dash' | 'doubleJump' | 'glide'`。
   - 每區一個資料檔（`plaza.ts`、`skylift.ts`（南）、`spire.ts`（東）、`ring.ts`（西）、
     `chasm.ts`（北））：幾何佈局（平台/坡道/結構，資料陣列）、碎片/碑文/聖所入口座標、
     區域邊界。世界尺度：整體約 800×800 單位，中央廣場出生。
   - `graph.ts`：**可達性圖資料**——節點（各區域/聖所/碎片群/地標頂）+ 邊
     （`requires: Ability[]`），必須從各區資料檔 import 組合，禁止手抄座標成第二份真相。
2. **世界建造器 `src/world/WorldBuilder.ts`**：消費地圖資料生成場景與 Rapier collider；
   重複幾何用 `InstancedMesh`（效能紅線：drawCalls < 300）。`main.ts` 改載世界
   （graybox.ts 保留檔案供回歸測試參考，不再被 main 載入）。
3. **四大地標**（§2.2 表）：南・斷裂天空電梯（垂直結構+斷索）、東・霓虹巨塔（全圖最高，
   可攀爬平台環繞）、西・倒懸巨環（懸浮傾斜巨環）、北・深谷燈海（下沉谷+核心剪影）。
   **遠視性**：地標主體用 `fog: false` 的自發光材質（或等效手法），在廣場抬頭必可見剪影。
4. **配置物視覺**（僅視覺與資料，無互動邏輯）：40 枚碎片（小型青色發光體，緩慢旋轉浮動）、
   12 座碑文（洋紅全息柱）、3 個聖所入口（黃色 `#ffd319` 門框）。數量與分區遵循 §2.5。
5. **教學動線**：廣場→南區的路徑用地面霓虹導引線 + 前 60 秒內玩家沿主動線每 30–45 秒
   視野內必有一個配置物或地標（以配置座標密度滿足，不需程式偵測）。
6. **Debug 鉤子擴充**：`__NEON_DEBUG__` 新增 `getWorldStats()`：
   `{ zones, landmarks, shards, steles, sanctuaries }` 各數量 + `teleport(x,y,z)`（dev 限定，
   供 e2e 抽查遠區）。

## REDLINES（紅線）
- 不准新增 dependencies / devDependencies。
- 不准修改：`docs/DEVELOPMENT-PLAN.md`、`docs/tasks/` 既有檔、`src/systems/character/locomotion.ts`、
  `tests/locomotion.test.ts`、既有 e2e 三檔（scaffold/movement/art——movement 若因場景變更
  導致起點不同而需調整**起跳平台假設**，只准調整常數，不准刪弱斷言）。
- `src/core/tuning.ts` 只准新增鍵（如霧距離因世界尺度調整），不准改動手感參數值。
- 不准 git commit / push；不准執行 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. `tests/reachability.test.ts` 存在，**從 `src/world/map/graph.ts` import 實際資料**（非複本），
   且至少斷言：(a) 無能力時南區可達、東/西/北不可達；(b) 東區需 dash；(c) 西區需
   doubleJump；(d) 北區核心需 dash+doubleJump+glide；(e) 全能力時 40 碎片節點全部可達；
   (f) 3 聖所入口的前置能力與 §2.4 進程一致。
3. 配置數量斷言入測試：shards=40、steles=12、sanctuaries=3、zones=5、landmarks=4。
4. `e2e/world.spec.ts`：載入 → canvas ready → `getWorldStats()` 斷言上述數量 →
   drawCalls < 300 且 triangles < 500000 → teleport 到東區地標附近再斷言 drawCalls < 300 →
   截圖 → console 零 error。
5. `rg 'fog:\s*false' src/world` 命中（地標遠視性手法存在），且 main.ts 不再 import graybox。
6. `git diff --quiet -- src/systems/character/locomotion.ts tests/locomotion.test.ts` exit 0。
7. 世界資料檔中無 `Math.random`（世界是手工設計的，不是隨機生成——grep 零命中
   `src/world/map`）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M3-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>（每個改動檔一行）
- 驗證證據: 執行過的指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
- 禁止: 貼超過 20 行的程式碼；貼整個檔案；寫「詳見上方」
```
