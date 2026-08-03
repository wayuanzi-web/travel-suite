# travel-suite（沙盒）

旅遊 App 家族的新家。**平行部署:舊 repo(st2607、family-hub)全程不動=隨時可回頭。**

```
swiss/          ← 部署層(GitHub Pages)
  index.html      單檔 App｜sw.js 離線快取｜icon.png｜version.json
apps/swiss/     ← 原始層
  src/            可讀原始碼(head/tail/app/entry)
  data/           資料 1.0(換掉=換旅程)
  DESIGN.md       App 自我介紹書(跨 App 參考入口)
  make.mjs        重建:node make.mjs｜test.mjs 測試:node test.mjs
CLAUDE.md · STATE.md
```

網址:https://wayuanzi-web.github.io/travel-suite/swiss/(密碼在家庭群組)
規則:可讀原始碼必進 repo｜localStorage 一律 `wang.<app>.*`｜單檔 >1,500 行拆檔｜每次部署更新 DESIGN.md
