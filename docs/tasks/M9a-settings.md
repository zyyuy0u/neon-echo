# M9a 派工單：AAA 第二期——設定深度 + 手把支援

## GOAL（目標與背景）
User 指令：「3A 大作有的，網頁版都要有」。本批補齊 3A 標配的設定深度與手把支援。
基線：最新 main（M8 全簽收+手感數值 user 特調：跑 32/跳 33/衝刺 80——**不准動這些值**）。

實作內容：
1. **圖形設定**（設定面板新增「圖形」區）：
   - 解析度縮放：50%/75%/100%（renderer.setPixelRatio 係數，預設 100%）。
   - Bloom：開/關 + 強度滑桿（0.5x–1.5x，乘在 tuning 基準上）。
   - FOV 滑桿：60–100（基準 FOV，衝刺 boost 疊加其上）。
   - FPS 顯示開關（生產版也可用的輕量 HUD 角標，非 dev 面板）。
   - 全部入存檔；套用即時生效。
2. **音量分軌**：主音量拆為 音樂/音效 兩滑桿（AudioSystem 已有 music/sfx bus，接上即可）；
   既有存檔的單一 volume 遷移為兩軌初始值（save migration + 測試）。
3. **手把支援 `src/systems/input/GamepadSystem.ts`**（Gamepad API，標準映射）：
   - 左搖桿=移動（含類比幅度→移動向量縮放）、右搖桿=相機、A/✕=跳、X/□=衝刺、
     B/○=互動、Start=暫停選單。
   - 選單導航：十字鍵/左搖桿上下 + A 確認 + B 返回（走既有鍵盤導航路徑）。
   - 死區處理（0.15，入 tuning）；連接/斷線 toast 提示（i18n）。
   - **輸入來源偵測**：最後使用的裝置決定教學提示顯示鍵盤鍵名或手把鈕名
     （tutorial 文案 key 拆 keyboard/gamepad 變體）。
   - 純邏輯（軸→向量、死區、按鈕邊緣偵測）獨立模組並單元測試；
     瀏覽器 Gamepad API 以可注入的 poller 包裝（測試注入假手把狀態）。

## REDLINES（紅線）
- tuning 手感值（runSpeed 32/jumpHeight 33/dashSpeed 80 等）不准動；新增鍵可。
- 既有測試斷言不准改弱；a11y 不倒退；不准新增依賴；不准 commit；不准跑 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. 單元測試新增且通過：手把軸死區與向量映射（軸 0.1→0、0.5→縮放值）、按鈕邊緣偵測
   （pressed 持續只觸發一次）、音量遷移（舊 schema 單 volume→雙軌）、解析度縮放
   係數套用計算。
3. `e2e/settings.spec.ts`（新）：進設定 → 圖形區存在 → 切解析度 75% → debug 鉤子
   `getRenderInfo()` 斷言 pixelRatio 變化 → 關 Bloom → `getSceneInfo()` 斷言後製鏈
   bloom 停用 → 調音樂音量 → `getAudioState()` 斷言分軌值 → 重整全部保留。
4. 手把邏輯以注入假 poller 的單元測試覆蓋（e2e 無法模擬實體手把——在 REPORT 註明
   此限制與手動驗證路徑）。
5. 既有九條 e2e 全綠（主控執行）；art/world 預算斷言不變。
6. i18n 紀律維持（新字串全走字典，grep 驗收同前批）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M9a-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
