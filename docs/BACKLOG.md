# BACKLOG

- [ ] Rapier deprecated init 警告源自上游套件內部（rapier_wasm3d.js:6169，0.19.3 已為最新版，呼叫端無法修）——已於 init 期間窄範圍過濾（src/main.ts），待上游新版釋出時升級並移除過濾
- [ ] 單一 JS chunk 2.8MB（gzip 988KB）超過 Vite 500KB 警告線——M6 效能預算處理（chunk 分割/懶載入）
- [ ] shell 啟動警告 ~/.cargo/env 不存在（環境雜訊，與專案無關，告知 user 即可）
