# M10b 派工單：近景立面窗格比例修正（美術審查定向退修）

## GOAL
M10 城市化整體過審，唯一退修項：**近景（可玩結構）立面的窗格過大**——
截圖證據 `test-results/city-*/city-street.png` 與 `city-facade.png`：近牆單扇窗
高度約為角色（≈2 單位）的 4–6 倍，遠景大樓則是細密窗格,比例失調。

修正要求：
1. 近景/可玩結構立面的窗格密度提高：單扇窗目標尺寸 **高 1.2–1.8 單位、寬 0.9–1.4 單位**
   （含窗間隔灰縫）,樓層帶狀感（每層一排窗 + 層間暗帶）。
2. 維持既有雙色調（青/暖橙）與 30–60% 點亮比例;貼圖仍程序化生成,
   既有像素統計測試調整參數後必須仍然通過（比例斷言不變,解析度/格數可改）。
3. 遠景天際線貼圖不動（已合格）。
4. 效能不變：同樣的貼圖數量級（提高單張解析度即可,總貼圖記憶體仍 ≤64MB）,
   draw calls 不增。

## REDLINES
- 只准動 `src/world/cityTextures.ts`、`src/world/CityVisuals.ts` 與其測試;
  其他一律不碰。不准 commit;不准跑 `npm run e2e`。

## ACCEPTANCE
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. 窗格貼圖測試更新後通過（點亮比例/雙色調斷言保留;新增「窗格行列數 ≥ 指定
   密度門檻」斷言,對應 1.2–1.8 單位窗高的換算依據寫在測試註解）。
3. 主控重跑 `e2e/city.spec.ts` 取新截圖複審（最終閘）。

## REPORT（寫入 docs/tasks/M10b-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出/驗證證據/未解決事項: 同前格式
```
