# CLAUDE.md — travel-suite 工作規則

1. **沙盒鐵則**:舊 repo(st2607、family-hub)永不改動;8/8 前不得讀寫任何 `hub*` localStorage key。
2. **原始碼同倉**:每次交付,可讀原始碼(src/)與 index.html 一起 commit。絕不只留壓縮檔。
3. **資料驅動**:旅程內容只存在 `apps/<app>/data/`;程式不寫死旅程知識。換 data = 換旅程。
4. **storage 命名空間**:一律 `wang.<app>.*`。
5. **DESIGN.md 隨版更新**:每次交付順手更新該 App 的 DESIGN.md(功能、資料、坑)。跨 App 參考先讀對方 DESIGN.md。
6. **單檔上限**:任何原始檔 >1,500 行就拆。
7. **對話結束更新 STATE.md**。
