# M2 派工單：美術管線（合成波霓虹定調）

## GOAL（目標與背景）
在 M1（commit adc45df，移動+灰盒已簽收）之上建立《NEON ECHO》的視覺系統。
上游計畫書 `docs/DEVELOPMENT-PLAN.md` §3.1（色板與手法——嚴格遵循）、§4.3（效能預算）。
目標：打開遊戲的第一眼就是「有設計系統的合成波美學」，不是隨便發光。

建立內容：
1. **材質工廠 `src/render/materials.ts`**：palette 驅動，禁止任何場景物件直接 new 材質。
   至少四種：(a) 結構材質（暗藍基底 `#16213e` + 霓虹描邊——用 EdgesGeometry 線框或
   emissive 邊緣）；(b) 霓虹發光材質（洋紅/青，emissive 強度足以觸發 Bloom）；
   (c) 網格地面（`GridHelper` 不夠格——用 shader 或貼圖式網格，青色線、遠處淡出）；
   (d) 警示/互動高亮材質（黃 `#ffd319`）。
2. **天空 `src/render/sky.ts`**：漸層天空球（地平線日落橙 `#ff6b35`→`#c73866` 漸層
   → 天頂深紫 `#1a0b2e`）+ 低伏合成波太陽（帶橫向切線的經典 synthwave sun，
   shader 實作）+ 稀疏星點。天空緩慢變化（太陽微微脈動或星點閃爍擇一）。
3. **氛圍**：距離霧（與天空色協調，藏繪製距離）；色調映射（ACESFilmic）；
   後製鏈整理為 `src/render/postfx.ts`（Bloom 參數入 tuning.ts：strength/radius/threshold）。
4. **灰盒換裝**：`src/world/graybox.ts` 的所有幾何改用材質工廠（平台=結構材質、
   邊緣霓虹描邊、窄橋用青色、樓梯用洋紅點綴）；角色膠囊代理改為發光體
   （emissive 洋紅膠囊+輕微 Bloom，作為正式角色前的占位）。
5. **效能監測**：
   - dev 調參面板新增 renderer.info 顯示（draw calls / triangles）與 Bloom 參數調整。
   - `window.__NEON_DEBUG__` 新增 `getRenderStats()`（drawCalls, triangles）與
     `getSceneInfo()`（背景色 hex、fog 是否啟用）。
6. **載入畫面**：index.html 的 loading 元素改為霓虹風格（純 CSS，palette 色）。

## REDLINES（紅線）
- 不准新增任何 dependencies / devDependencies。
- 不准修改 `docs/DEVELOPMENT-PLAN.md`、`docs/tasks/` 既有檔案。
- 不准改動 locomotion/CharacterController/InputSystem 的行為邏輯（手感已簽收——
  視覺層不得影響物理層；renderer 設定與場景層可改）。
- 不准 git commit / push；不准執行 `npm run e2e`（e2e 測試檔要寫好，由主控外部執行）。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. `src/render/materials.ts` 存在；`rg 'new THREE\.Mesh(Standard|Basic|Lambert|Phong)Material' src/world src/main.ts` 零命中（材質一律出自工廠）。
3. `src/render/sky.ts` 存在且含 shader 漸層（`rg 'ShaderMaterial|RawShaderMaterial' src/render/sky.ts` 命中）；場景啟用 fog（`rg 'fog' src` 命中於場景設置處）。
4. Bloom 參數（strength/radius/threshold）定義於 `src/core/tuning.ts`（grep 可證），
   後製鏈在 `src/render/postfx.ts`。
5. `e2e/art.spec.ts`：載入 → canvas ready → 以 debug 鉤子斷言 drawCalls < 300 且
   triangles < 500000 → 斷言 fog 啟用且背景/天空生效 → 截圖存檔 → console 零 error。
6. 既有 e2e（scaffold/movement）測試檔未被改弱（canvas ready 與移動斷言保留）。
7. tests/ 中 locomotion 測試未被修改（`git diff --stat tests/locomotion.test.ts` 無 diff）。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M2-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>（每個改動檔一行）
- 驗證證據: 執行過的指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
- 禁止: 貼超過 20 行的程式碼；貼整個檔案；寫「詳見上方」
```
