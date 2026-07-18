# M6 派工單：打磨收尾（最終里程碑）

## GOAL（目標與背景）
在 M5（commit e17e62c）之上完成《NEON ECHO》最終打磨。上游：計畫書 §3.3（音訊）、
§4.3（效能預算）、`docs/BACKLOG.md`（本里程碑須清掉其中的 chunk 警告與天頂漸層兩項）。

建立內容：
1. **音訊 `src/systems/audio/`**（零資產、全程序化 WebAudio，與霓虹美學一致）：
   - SFX 合成器：跳躍、二段跳、衝刺、碎片拾取（隨連續拾取微升音高）、碑文開啟、
     謎題進度/完成、能力解鎖（上行琶音）、結局觸發。每個遊戲事件在對照表中有對應音色。
   - 環境音樂：程序化 synth pad 循環（緩慢和弦墊 + 低通濾波），分區域微調（南暖/東亮/
     西空靈/北深沉，切區 crossfade ≥2s）。
   - 遵守瀏覽器 autoplay 政策：首次使用者手勢後才建立 AudioContext；音量接 M5 設定
     滑桿；靜音時完全不排程節點。
   - `ASSETS.md` 登記：全部音訊為程序化原創，無外部資產。
2. **粒子 `src/render/particles.ts`**：碎片拾取爆點、能力解鎖光環、各區低密度漂浮塵埃
   （instanced，計入三角形預算）、風之井上升流線。減少動態開啟時密度減半（接 M5 設定）。
3. **效能**：
   - Vite `manualChunks` 分割 three / rapier / 遊戲碼——build 輸出不得再有
     chunk size 警告（500KB 線）。
   - 天頂漸層加深（BACKLOG 項）：高仰角時天空回到 `#1a0b2e` 深紫，不再偏橘紅。
4. **結局演出**：兩結局差異化——「喚醒」：全城燈光波次點亮 + 音樂轉明亮；
   「安眠」：燈光柔和熄滅 + 音樂淡出至單音。結局畫面顯示統計（碎片 x/40、碑文 x/12、
   遊玩時間——時間累計入存檔）。
5. **文件**：README 補「操作說明/如何遊玩/雙結局提示」；`docs/BACKLOG.md` 更新
   已解決項的狀態（打勾並註記 commit）。

## REDLINES（紅線）
- 不准新增 dependencies / devDependencies（WebAudio 原生 API）。
- 手感參數值、世界資料、謎題/結局狀態機**判定邏輯**不准改（演出層可接事件）。
- 既有測試斷言不准改弱；不准 git commit / push；不准執行 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. `npm run build` 輸出零 chunk-size 警告（`grep -c 'chunks are larger' build輸出` = 0），
   且產出 ≥3 個 JS chunk（vendor 分割生效）。
3. 音訊單元測試：事件→音色對照表完整性（每個列出的遊戲事件都有 handler）、
   音量 0 時不排程、AudioContext 僅在手勢後建立（以可注入的 context factory 測試）。
4. 粒子單元測試：減少動態開啟時密度參數減半。
5. 遊玩時間：存檔 round-trip 測試含 playtime 欄位且只增不減。
6. `e2e` 既有六條全綠（主控執行）且 art/world 的預算斷言維持（粒子計入後仍
   drawCalls<300、triangles<500000）；gameplay.spec 增加 `getAudioState()` 斷言
   （手勢後 initialized=true、respects volume）。
7. README 含操作說明段落；ASSETS.md 含音訊原創聲明；BACKLOG 更新。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M6-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
