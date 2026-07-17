# M4 派工單：玩法系統內容

## GOAL（目標與背景）
在 M3（commit 71221c1，世界已簽收）之上實作《NEON ECHO》的玩法核心。
上游計畫書 `docs/DEVELOPMENT-PLAN.md` §2.3（能力參數——照抄 tuning 既有值或按表新增）、
§2.4（解鎖進程）、§2.5（聖所與收集）、§2.1（敘事）。

建立內容：
1. **能力系統 `src/systems/abilities/`**：
   - `AbilityState`：已解鎖集合 + 事件（unlock 時發事件供 UI/音效用）。
   - locomotion 擴充（維持純邏輯可測）：
     - 衝刺 Dash（Shift）：20 m/s × 0.18s，冷卻 0.8s，空中可用（參數入 tuning）。
     - 二段跳：高度 1.8m，每次離地僅一次，落地重置；起跳重置空中衝刺。
     - 滑翔 Glide（空中長按 Space）：下降夾限 2.5 m/s、前進 10 m/s；
       上升氣流區（updraft volume）內爬升。
   - **閘控**：未解鎖的能力輸入完全無效果。
2. **收集系統 `src/systems/collectibles/`**：碎片近距自動拾取（半徑入 tuning）、
   計數事件；碑文近距 + E 鍵互動 → 觸發文本顯示事件（顯示層用現有極簡 DOM overlay，
   完整 UI 屬 M5——本里程碑做可用即可：半透明字幕框 + E 關閉）。
3. **聖所謎題 `src/systems/puzzles/`**（狀態機一律純邏輯 + 單元測試；場景元件消費狀態）：
   - ① 脈衝軌道（南）：3–4 段定時脈衝平台（kinematic 移動/顯隱），走完到達祭壇 → 解鎖 dash。
   - ② 光橋迴路（東）：3 個踩踏開關依正確順序觸發（錯序重置），全對 → 光橋實體化
     （collider 開啟）→ 祭壇解鎖 doubleJump。
   - ③ 風之井（西）：進入井區有上升氣流柱，抵達頂部祭壇 → 解鎖 glide。
   - 祭壇互動（E）完成解鎖，未完成謎題時祭壇不可互動。
4. **敘事碑文資料 `src/content/steles.ts`**：12 條，`{ id, zh, en }` 結構（M5 i18n 直接吃）。
   內容依 §2.1 世界觀撰寫：AURORA 封存居民 → 風暴 → 玩家是回聲行者，
   分區遞進揭露（南：日常告別 → 東：上傳抉擇 → 西：異議者 → 北：AURORA 自白）。
   文字品質要求：每條 40–90 字（zh），有具體人物視角，不准空泛口號。
5. **核心與結局 `src/systems/ending/`**：北區核心在 shards ≥ 30 且三能力齊 → 可互動；
   互動後出現二選一（喚醒城市 / 讓殘響安眠），各自觸發不同的全螢幕結局 overlay
   （標題 + 3–4 句結語 + 收集統計 + 「繼續探索」按鈕）。狀態機純邏輯 + 測試。
6. **Debug 鉤子擴充**：`grantAbility(name)`、`getAbilities()`、`getShardCount()`、
   `collectNearestShard()`、`getPuzzleState(id)`（皆 dev 限定）。

## REDLINES（紅線）
- 不准新增 dependencies / devDependencies。
- 不准修改 `docs/`（steles 內容放 src/content/）、不准 git commit / push、不准執行 `npm run e2e`。
- `tests/locomotion.test.ts` 既有 5 個測試的斷言不准改弱/刪除（新增測試不限）；
  `tests/reachability.test.ts` 不准動。
- tuning.ts 既有手感參數值不准改，只准新增鍵。
- 世界圖結構（graph.ts 節點/邊/requires）不准變。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. 能力單元測試（新檔或併入 locomotion 測試）至少涵蓋：dash 期間速度≈20 且 0.18s 後結束、
   冷卻期內再按無效；二段跳僅一次且落地重置；glide 下降速度被夾在 2.5；
   **未解鎖時上述輸入全部無效果**（各能力至少一條閘控負向斷言）。
3. 謎題狀態機測試：②錯序重置、正序完成；①脈衝時序可通過性；③到頂觸發；
   三者完成後各自 emit 對應 unlock 事件（斷言事件 payload）。
4. 結局狀態機測試：shards=29 或缺任一能力時核心不可互動；達標可互動；兩結局分支
   各自可達且互斥。
5. `src/content/steles.ts`：測試斷言 12 條、zh/en 皆非空、id 唯一。
6. `e2e/gameplay.spec.ts`：載入 → 以 debug 鉤子 grant dash → 模擬 Shift 衝刺，
   斷言短時間位移顯著大於跑速基線 → collectNearestShard 後 getShardCount 增加 →
   截圖 → console 零 error。
7. `git diff --quiet -- tests/reachability.test.ts` exit 0；locomotion 既有 5 測試名稱仍存在
   且通過（`npm test` 輸出可證，測試總數只增不減）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M4-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
