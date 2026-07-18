## VERIFY
- 總結論: PASS
- 逐條: [#1] PASS — `npm run lint` exit 0；`npm run typecheck` exit 0；`npm test` exit 0（14 files／50 tests passed）；`npm run build` exit 0（434 modules transformed，built in 100ms）。
- 逐條: [#2] PASS — `tests/avatar.test.ts:9-17` 逐列斷言 idle/run/dash/interact/jumpRise/fall/glide；dash→Roll 在 `:12`、glide tilt=25° 在 `:16`；`npm test` exit 0。
- 逐條: [#3] PASS — `test -f public/assets/character.glb` exit 0；`docs/ASSETS.md:5` 登錄 local path、CC0 1.0，並列 Quaternius→GitHub mirror 的 source chain。
- 逐條: [#4] PASS — `src/systems/character/CharacterAvatar.ts:136-148` 膠囊只作 loading fallback，`:267-275` 載入後移除/釋放並換模型；Rapier capsule collider 保留於 `CharacterController.ts:55-57`。
- 逐條: [#5] PASS — `e2e/gameplay.spec.ts:46-61` poll avatarLoaded、animationCount≥20、Idle；`:63-75` W/Run；audio `:77-91`、dash `:93-136`、shard `:138-149` 均保留。
- 逐條: [#6] PASS — `e2e/art.spec.ts:51-54`、`e2e/world.spec.ts:68-83` 仍斷言 drawCalls<300、triangles<500000；兩檔 `git diff` 為空，近期 art/world PNG 為 2026-07-18 11:21。
- 逐條: [#7] PASS — `git diff --name-only -- tests e2e` 僅 `e2e/gameplay.spec.ts`；其 diff 僅新增 character info 與 avatar/clip 驗證，近期 gameplay PNG 為 2026-07-18 11:21:41 +0800。
- 附註: 依指示未執行 e2e；第 6、7 條的「仍須通過」以未變更預算斷言及 `test-results/` 近期 passing PNG 佐證。GLB 與新 avatar unit test 目前為 untracked，仍納入本次檔案/測試驗證。
