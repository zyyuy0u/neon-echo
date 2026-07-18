# BACKLOG

- [ ] Rapier deprecated init 警告源自上游套件內部（rapier_wasm3d.js:6169，0.19.3 已為最新版，呼叫端無法修）——已於 init 期間窄範圍過濾（src/main.ts），待上游新版釋出時升級並移除過濾
- [x] 單一 JS chunk 2.8MB（gzip 988KB）超過 Vite 500KB 警告線——M6 已以 manualChunks 分割 three / rapier / 遊戲碼（commit 由主控提交）
- [ ] shell 啟動警告 ~/.cargo/env 不存在（環境雜訊，與專案無關，告知 user 即可）
- [x] M6 打磨：天頂紫色漸層加深——M6 已將高仰角提早過渡至 `#1a0b2e` 深紫（commit 由主控提交）；暈影維持 M2 定調
