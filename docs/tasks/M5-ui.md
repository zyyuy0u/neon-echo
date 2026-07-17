# M5 派工單：UI / 存檔 / i18n / a11y

## GOAL（目標與背景）
在 M4（commit 215e225，玩法已簽收）之上完成《NEON ECHO》的介面外殼與可及性。
上游計畫書 `docs/DEVELOPMENT-PLAN.md` §2.6（UI/UX）、§4.5（a11y 與 i18n）、§3.1（色板）。
UI 一律原生 DOM + CSS 覆蓋於 canvas 上，palette 色系，霓虹風格與遊戲一致。

建立內容：
1. **i18n `src/ui/i18n/`**：`zh.ts` + `en.ts` 字典（含既有 steles 之外的全部 UI 字串）、
   `t(key)` 函式與語言切換事件；碑文顯示改為依當前語言取 zh/en。
   預設語言 zh-TW，記入存檔。
2. **主選單**：進入遊戲前顯示（標題 NEON ECHO、繼續/新遊戲/設定/操作說明、版本號）。
   有存檔時「繼續」為預設焦點；新遊戲需確認覆蓋。背景可為模糊化的遊戲場景或純色板漸層。
3. **暫停選單**：ESC 開啟（pointer lock 釋放時自動開）——繼續/設定/回主選單。
   開啟時遊戲邏輯暫停（GameLoop update 凍結，render 可繼續）。
4. **設定面板**：滑鼠靈敏度滑桿、語言切換、減少動態開關（關閉 FOV kick/相機晃動/
   粒子密度減半——與 tuning 串接）、按鍵重映射（移動四鍵+跳躍+衝刺+互動，點擊後按新鍵，
   衝突時警示）、音量滑桿（先存值，M6 音訊接上）。全部設定入存檔。
5. **HUD**：左下能力圖示（未解鎖灰暗、解鎖點亮並閃爍一次）、右下碎片計數環
   （x/40，收集時短暫放大），靜止無事件 4 秒後淡出、有事件淡入。
6. **存檔 `src/systems/save/`**：localStorage，schema 含 version 欄位與 migration 入口；
   內容：能力、已收集碎片 id、已讀碑文 id、謎題進度、玩家位置、設定、結局旗標。
   自動存檔時機：收集/解鎖/謎題進度/結局後 + 每 30 秒；新遊戲清檔。
7. **a11y**：所有選單純鍵盤可操作（Tab/方向鍵/Enter/ESC，focus ring 可見且非僅顏色差異）；
   選單文字對比達 WCAG AA（暗底亮字）；碑文字幕框字級可調（設定內三檔）。
8. **Debug 鉤子**：`getSaveData()`、`setLanguage(lang)`、`openMenu(name)`（dev 限定）。

## REDLINES（紅線）
- 不准新增 dependencies / devDependencies。
- 不准 git commit / push；不准執行 `npm run e2e`（e2e 檔要寫好）。
- 手感層、世界資料、謎題/結局狀態機邏輯不准改（僅允許接事件/暫停凍結整合）。
- 既有測試斷言不准改弱；`docs/` 不准動。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. i18n 測試：zh/en 字典 key 集合完全相等（Set 比對）、無空字串值、
   `t()` 對缺失 key 的行為有明確斷言（回傳 key 本身並 console.warn 一次）。
3. 存檔測試：round-trip（save→load 深度相等）、schema version 欄位存在、
   壞資料（損毀 JSON/未知 version）load 時安全回退新檔不拋錯、新遊戲清檔。
4. `e2e/ui.spec.ts`：載入 → 主選單可見 → **純鍵盤**（Tab/Enter）進入新遊戲 →
   HUD 出現 → ESC 開暫停選單 → 鍵盤進設定切換語言為 en → 斷言選單文字變英文 →
   回遊戲 → collectNearestShard → 重新整理頁面 → 斷言 shard 計數保留（存檔生效）→
   截圖 → console 零 error。
5. 減少動態開關：單元測試斷言開啟時 FOV kick 係數為 0（tuning 派生值），
   相機晃動參數歸零。
6. 既有 6 條 e2e 檔案未改弱（scaffold/movement/art/world/gameplay 的既有斷言保留；
   若主選單導致自動進遊戲流程變更，准許在既有 spec 前段加「跳過選單」的 debug 步驟，
   不准刪斷言）。
7. 全部 UI 字串不得硬編碼在元件內（`rg '選單|繼續|設定' src/ui --glob '!src/ui/i18n/**'`
   零命中；英文同理抽查）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M5-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
