# M7 派工單：主角人形化

## GOAL（目標與背景）
User 指出主角是「一顆藥丸」——那是 M1 的物理占位膠囊，正式角色在里程碑拆解時漏排。
本單補齊：CC0 人形模型 + 霓虹重製 + 動畫狀態機。上游計畫書 §3.2。

**資產已由主控驗證並放入 `public/assets/character.glb`**（850KB，Quaternius Cyberpunk
Character，CC0，來源鏈：quaternius.com Cyberpunk Pack，經 github.com/trebeljahr/
quaternius-showcase 鏡像取得；GLB 含 4 meshes/4 skins/22 動畫，主控已解析驗證）。
可用動畫（`CharacterArmature|` 前綴）：Idle_Neutral、Run、Walk、Roll、Interact、Wave
等；**無跳躍/滑翔動畫**——處理方式見下。

建立內容：
1. **Avatar 模組 `src/systems/character/CharacterAvatar.ts`**：
   - three GLTFLoader 載入 `assets/character.glb`（懶載入不阻塞首屏；載入前沿用現有
     發光膠囊，載入完成後替換——膠囊 mesh 移除，Rapier 膠囊 collider 照舊）。
   - AnimationMixer + **純邏輯狀態機**（可單元測試的 mapping 函式）：
     `idle→Idle_Neutral`、`run→Run`（播放速率隨水平速度微調）、`dash→Roll`、
     `interact→Interact`（E 互動時單次播放）、
     `jumpRise/fall→Idle_Neutral 凍結幀 + 全身前傾程序化 tilt`（rise 後仰 8°、fall 前傾 12°）、
     `glide→Idle_Neutral + 前傾 25° 展臂緩降姿態（tilt 即可，不逐骨骼）`。
     clip 切換一律 crossfade 0.15s。
   - 模型朝向 = 移動方向（水平速度向量，平滑轉向），非相機朝向。
2. **霓虹重製**：模型材質換為材質工廠產物——身體暗色系（structureBlue 基底）+
   自發光點綴（頭部/胸口/邊緣件用 neonCyan 或 neonMagenta emissive，觸發 Bloom）。
   在 materials.ts 新增 skinned 變體（`skinning` 由 three 自動處理，僅需保 emissive 參數）。
   視覺量級遵守「暗底亮線」鐵則：發光為點綴不是整身。
3. **Debug 鉤子**：`getCharacterInfo()` → `{ avatarLoaded, animationCount, currentClip }`。
4. **ASSETS.md**：登記 character.glb（作者 Quaternius、CC0、來源鏈如上）。

## REDLINES（紅線）
- 不准動 locomotion/物理/手感層與既有測試斷言；膠囊 collider 尺寸不准改。
- 不准新增 dependencies（GLTFLoader 走 `three/examples/jsm/loaders/GLTFLoader.js`）。
- 不准 git commit / push；不准執行 `npm run e2e`。

## ACCEPTANCE（驗收條件）
1. `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` 全部 exit 0。
2. `tests/avatar.test.ts`：狀態機 mapping 全表斷言（每個 locomotion 狀態 → 預期 clip
   名稱與 tilt 角度），含 dash→`CharacterArmature|Roll`、glide tilt=25°。
3. `public/assets/character.glb` 存在且 ASSETS.md 有對應條目（含 CC0 與來源鏈）。
4. 主場景不再渲染占位膠囊（grep 舊膠囊 mesh 建立處已移除/僅作載入 fallback）。
5. `e2e/gameplay.spec.ts` 增：等待 `getCharacterInfo().avatarLoaded === true`（poll）→
   `animationCount >= 20` → 靜止時 currentClip 含 `Idle` → 按住 W 1 秒後 currentClip 含
   `Run` → 既有 dash/shard/audio 斷言保留。
6. art/world e2e 預算斷言不變並仍須通過（skinned mesh 計入後 drawCalls<300、
   triangles<500000）。
7. 既有測試檔 diff 僅允許 gameplay.spec 的新增段。

## REPORT（回報格式——完成後照填，寫入 docs/tasks/M7-report.md）
```
## REPORT
- 結論: PASS / FAIL / BLOCKED + 一句話
- 產出: <絕對路徑>:<行號或行號範圍>
- 驗證證據: 指令 + 關鍵輸出行（每項 ≤5 行）
- 未解決事項與風險: 「無」或條列
```
