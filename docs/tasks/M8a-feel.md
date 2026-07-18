# M8a 派工單：AAA 對標——手感與開場（P0）

## GOAL（目標與背景）
依 `docs/AAA-BENCHMARK.md`（先讀）之 M8a 批次，將相機、移動回饋、開場引導提升到
對標薩爾達/原神的設計語言。基線 commit ef48e4b（M7 已簽收，全測試綠）。

實作內容（規格細節以 AAA-BENCHMARK.md M8a 節為準，以下為工程補充）：
1. **相機輔助** `src/systems/camera/`：
   - 跟隨延遲：位置分軸 lerp（水平快、垂直慢），參數入 tuning.ts。
   - 自動回背：玩家持續移動且 2s 無滑鼠輸入 → 相機 yaw 緩慢趨向玩家背後方位
     （速率入 tuning；設定面板新增開關，預設開；存檔）。
   - 衝刺 FOV +6°（0.2s ease），減少動態=0。
   - 落地相機微沉：幅度=f(落地速度)，上限 0.35 單位，減少動態=0。
2. **落地演出**：塵埃粒子環（particles.ts 擴充）+ 模型 squash-stretch scale 動畫
   （0.12s，僅視覺層 group scale，不碰 collider）+ 落地音兩檔（落速閾值入 tuning）。
3. **腳步聲**：AudioSystem 擴充——Run 播放時依 clip 時間相位觸發兩音色交替腳步，
   音量隨水平速度；idle/空中不觸發。
4. **開場演出**：新遊戲首次進入→黑幕 1.5s→字幕「回聲行者，醒來。」（i18n）→
   2s 鏡頭從高仰角 ease 降到追尾位→控制權交還；「繼續」進入無此演出。
   減少動態=直接淡入 0.5s。
5. **情境教學提示**（`src/systems/tutorial/` 純邏輯+測試）：
   提示定義=資料（觸發條件、文案 key、一次性旗標入存檔）。首批：接近首個跳躍缺口
   →「Space 跳躍」；解鎖衝刺後首次移動→「Shift 衝刺」；接近首座碑文→「E 調查」。
   顯示用既有 gameplay-message 樣式，4s 自動淡出。
6. **導引線流動**：廣場→南區導引線加脈衝流動 shader/UV 動畫，減少動態=靜態常亮。

## REDLINES（紅線）
- locomotion 手感參數與物理不准動（相機/演出/音訊為外掛層）。
- 既有測試斷言不准改弱；a11y 不得倒退（每個新演出都接減少動態）。
- 不准新增依賴；不准 git commit / push；不准執行 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. 單元測試新增且通過：教學提示一次性（觸發→標記→不再觸發，round-trip 存檔）；
   相機自動回背的目標 yaw 計算；落地音檔位選擇（速度閾值）；腳步觸發相位邏輯。
3. tuning.ts 新增鍵含：followLagHorizontal/Vertical、autoBehindDelay/Rate、
   sprintFovBoost、landingCamDip、footstepBaseVolume（grep 可證）；減少動態時
   sprintFovBoost 與 landingCamDip 派生值為 0（單元測試斷言）。
4. `e2e/feel.spec.ts`（新）：新遊戲→開場字幕出現→等待控制權（canvas ready + 位移可用）
   →走到跳躍缺口附近（teleport）→教學提示元素出現→按 Space 後提示消失且存檔標記
   →重整→提示不再出現。console 零 error + 截圖。
5. 既有六條 e2e 全綠（主控執行）；art/world 預算斷言不變。
6. 設定面板含「相機自動回背」開關且入存檔（read-back + save 測試）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M8a-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
