# M1 派工單：移動手感垂直切片

## GOAL（目標與背景）
在 M0 骨架（已全綠簽收，commit 122f26d）之上，實作《NEON ECHO》的核心：第三人稱移動手感。
上游計畫書 `docs/DEVELOPMENT-PLAN.md` §2.3（手感參數表——照抄初始值）、§1.2 支柱 1。
這是整個遊戲的地基，之後所有里程碑都建立在這套控制器上。

建立內容：
1. **調參中樞 `src/core/tuning.ts`**：計畫書 §2.3 全部參數集中此檔（跑速/加速/止滑/跳高/
   coyote/緩衝/空中控制/相機距離與靈敏度……），任何系統不得散落硬編碼移動參數。
2. **純邏輯運動模組 `src/systems/character/locomotion.ts`**：
   不依賴 Three/Rapier 的純狀態機+數學（地面判定輸入→速度輸出、coyote 計時、跳躍緩衝、
   可變跳高、加速/止滑曲線、空中控制係數）——這層必須可單元測試。
3. **角色控制器 `src/systems/character/CharacterController.ts`**：
   Rapier KinematicCharacterController 包裝，膠囊體代理（正式模型 M2 之後才進），
   消費 locomotion 輸出、處理碰撞/斜坡/貼地。修掉 M0 遺留的 Rapier deprecated init 警告
   （見 docs/BACKLOG.md 第一項）。
4. **輸入系統 `src/systems/input/`**：鍵盤（WASD+Space）+ 滑鼠 pointer lock；
   可查詢按住/剛按下/剛放開；ESC 釋放滑鼠。
5. **第三人稱相機 `src/systems/camera/`**：追尾軌道相機（滑鼠控制 yaw/pitch，pitch 夾限），
   相機碰撞探測（射線防穿牆拉近）、位置平滑；移動方向以相機朝向為基準。
6. **灰盒試煉場 `src/world/graybox.ts`**：資料驅動（陣列定義幾何），含平地、
   2–3 種高度平台（驗證跳高）、斜坡、窄橋、牆、一個小樓梯——全部霓虹線框材質即可。
7. **開發調參面板**：dev 模式按 ` （backquote）開關；手寫極簡 DOM 面板（不加新依賴），
   綁定 tuning.ts 數值即時生效；含 FPS 顯示。
8. **Debug 鉤子**：dev 模式暴露 `window.__NEON_DEBUG__ = { getPlayerPosition(), isGrounded() }`
   供 e2e 斷言（production build 不含）。

## REDLINES（紅線）
- 不准新增任何 dependencies / devDependencies（現有白名單之外一律禁止）。
- 不准修改 `docs/DEVELOPMENT-PLAN.md`、`docs/tasks/`、`docs/M0-*`。
- 不准 git commit / push。
- 不准執行 `npm run e2e`（本 sandbox 無法啟動 Chromium，由主控在外部執行）——
  但 e2e 測試檔要寫好。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. `tests/locomotion.test.ts` 存在且至少覆蓋：
   (a) coyote time：離地 <120ms 內跳躍成功、>120ms 失敗；
   (b) 跳躍緩衝：落地前 <100ms 按跳、落地即起跳；
   (c) 可變跳高：提早放開跳躍鍵的峰值高度低於按滿；
   (d) 地面加速：靜止到全速耗時 ≈ tuning 設定值（誤差 ≤1 個固定時步）。
3. `src/core/tuning.ts` 含計畫書 §2.3 表中全部 M1 適用參數（跑速 8、跳高 2.2、
   coyote 0.12、緩衝 0.1、空中控制 0.65——grep 可證），且 `rg '8\.0|2\.2' src/systems` 不得
   出現散落的移動魔法數字（參數只准 import 自 tuning.ts）。
4. `e2e/movement.spec.ts`：載入頁面 → canvas ready → 鍵盤按住 W 1 秒 → 以 debug 鉤子
   斷言位置位移 >2 單位 → 按 Space → 斷言 y 高度曾 >0.5 → 3 秒內 console 零 error。
5. M0 既有 e2e（scaffold.spec.ts）不得被破壞（檔案仍在且未被改弱：canvas ready 斷言保留）。
6. `rg 'deprecated' 開發伺服器 console` 之 Rapier init 警告已消除（init 改用新式參數）。
7. production build（`npm run build` 產物）中 grep 不到 `__NEON_DEBUG__`。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M1-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>（每個改動檔一行）
- 驗證證據: 執行過的指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
- 禁止: 貼超過 20 行的程式碼；貼整個檔案；寫「詳見上方」
```
