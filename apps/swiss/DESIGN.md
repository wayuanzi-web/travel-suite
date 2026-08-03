# swiss（瑞士旅遊通）DESIGN.md
> 版本：v1.5（餐廳三層＋可複用 nearby 模組，39+19 測試＋稽核通過）｜更新：2026-08-03
> 維護規則：Claude 每次交付新版時同步更新本檔，與程式一起 commit。

## 1. 這個 App 是什麼

一次性的單趟旅程現場作戰手冊。服務 2026/07/24–08/08 五人三代家庭的瑞士＋杜拜行程。

- 舊版：repo `wayuanzi-web/st2607`｜v3.12｜密碼閘 7777｜**8/8 封存，旅途中不得改動**
- 新版（本目錄）：travel-suite 沙盒內的 1.0 重建，角色是**旅程模板**——換掉 `data/` 就是下一趟旅行
- 設計語彙：瑞士鐵路風格（SBB 藍白紅 `#1F3864`/`#C8102E`、tabular-nums 時刻表字體、月台看板美學）
- 使用場景：站在月台上、拿著手機、五個人在等你決定 → 單手、大字、高對比、離線可用、maxWidth 520

## 2. 方法論（其他 App 要「一句話參考」的核心資產）

1. **指令而非資訊**。不寫「在 Brig 轉車」，寫「只有8分鐘:下車先看藍色看板找Andermatt月台,5人跟緊不拍照」。每條資訊都可直接執行。
2. **資料驅動**。TRIP 物件＝一次旅行；程式不含旅程知識，換 data 換旅程。
3. **風險上限三條**（RISK3）。太多沒人記得。
4. **逐步導航 NAVSTEP**。key＝行程項目的原文字串，value＝用「→」串連的每一步。全 App 最有價值的資產（104 條）。
5. **餐廳決策最小資料集**：星等＋評論數＋價位帶＋公休＋Google Place ID（一鍵導航）。
6. **中英對照站名**（v3.12 起）：給當地人看、自己認站牌。

## 3. 功能地圖

| 區塊 | 內容 | 資料來源 |
|---|---|---|
| 7 分頁 | today 行程｜nav 導航｜wx 天氣｜eat 餐廳｜tickets 票券｜phrases 會話｜more 更多 | trip / navstep / bk_zones / places |
| 快捷列 | 火車票🎫｜導航🧭｜我在哪📍｜走散🆘 | — |
| more 子頁 | 文件 Docs｜緊急 Sos｜走散 Lost｜說明 Help｜工具卡 | extras_v1(DOCS) / help / tools |
| 工具卡×10 | 💱匯率速算、🧾分帳記帳、🕐三地時鐘、✅行前清單、🚻附近急找、📶網路&WiFi、💰小費&退稅、🏛使館求助、📔一句話日記、🌓深色模式 | tools.raw.js（重建時重新實作，邏輯已完整還原） |

## 4. 資料 1.0（本目錄 `data/`）

| 檔案 | 內容 | 實測統計 | 備註 |
|---|---|---|---|
| trip.json | 16 天主行程 | 16天｜22 nav 點｜5 成員 | ⚠️ webcam 實有 **6**（交接文件寫 16，以資料為準） |
| navstep.json | 逐步導航 | **104 條** | 鎮 App 之寶 |
| guide.json | 逐日防呆 | 15 天 | 無 day16 |
| sights.json | 景點導覽 | 8 天／10 景點 | 含維基圖片連結 |
| bk_zones.json | 備選餐廳庫 | **10** 城市／45 家 | 文件寫九城市，實為 10 |
| places.json | 主要餐廳 | 19 家 | 含 Place ID |
| help.json | 使用說明 | 10 條 | ⚠️ 內文仍提「公告頁」（v3.12 已改天氣頁），1.0 需修字 |
| highlight.json | 亮點標語 | 23 條 | |
| styles.json | 設計系統 | 43 樣式群組 | SBB tokens |
| tools.raw.js | 工具卡壓縮碼原樣 | 10 卡 | 非純資料，重建對照用 |
| extras_v1.json | RISK3／WCRULE／DOCS／PL_TXT | — | 來自 v1 原始碼（v3.12 沿用） |

## 5. localStorage（關鍵）

- **現行線上 keys（家人旅途資料就在這裡，8/8 前絕不可寫入）**：`hub:*`、`hub_chk`（清單）、`hub_diary`（日記）、`hub_exp`（分帳）、`hub_user`、`hub_wifi`
- swiss 與 family-hub **共用 `hub` 前綴且同網域** → 已證實的碰撞源
- 1.0 規則：一律 `wang.swiss.*`；**8/8 後**才加「唯讀搬遷」模組（只複製、不刪舊）

## 6. 安全註記

- GitHub Pages＝**全公開**，密碼閘只是禮貌不是保護；repo 內任何資料視同公開
- DOCS 的 Google Drive 連結靠 Drive 權限保護（需登入）；護照效期欄留白、訂位代號已遮——1.0 維持此原則，敏感值只進 localStorage 由使用者自填

## 7. 踩過的坑（血淚）

1. `minify:true` 且原始碼未進 repo → **v3.12 原始碼永久遺失**。1.0 鐵則：可讀原始碼與 index.html 一起 commit，minify 可留但必產出對照
2. 打包 entryPoint 指錯檔 → 白屏無錯誤訊息
3. 無 ErrorBoundary → 出錯白屏無法遠端除錯（1.0 必加，含 safe-area、Service Worker、版本浮水印）
4. v3.12 已知 bug（8/2 已診斷）：PlaceChip pk/id 屬性不一致致餐廳卡不顯示；「餐廳用語」按鈕失效；STP QR 圖：實為五人份內建於線上版(z3, 1MB)——1.1 已原樣搬回,另保留自行上傳相簿
5. LINE 內建瀏覽器開啟會失效 → HELP 保留警告

## 8. 1.0 建置紀錄（2026-08-03 完成）

**做法**：v1 骨架切片保留原碼（`make.mjs` 自動組裝）＋ `data/*.json` esbuild 注入 ＋ 新模組 ＋ 單檔輸出 259KB（舊版 1.7MB，因圖片改線上載入）。`node make.mjs` 重建；`node test.mjs` 跑 30 項 jsdom 測試。

**程式位置**（都在 `src/`，組裝後為 `src/app.jsx` 1,037 行）：
- `head.jsx`：資料匯入、NAVSTEP 配對（取最長 key）、StepSheet 逐步面板、重寫的 Itinerary（含景點導覽＋逐步按鈕）
- `tail.jsx`：Wx 天氣頁、Tools 十卡（FxCalc／Ledger／Clocks／CheckList／NearFind／WifiNote／TipTax／Embassy／Diary／DarkMode）、Phrases（含🔊朗讀）、Help（吃 help.json）、Gate 密碼閘、ErrorBoundary
- v1 原樣保留：PlaceChip、Tickets QR 相簿、Navigate 走錯偵測、Backups 餐廳篩選、Lost、More、Docs、Sos

**1.0 修掉的 bug**：①PlaceChip pk/id 屬性不一致（行程卡餐廳不顯示）②`shareMyLocation` v1 有呼叫但**根本沒定義**（我在快捷列點「我在哪」會炸）③todayIdx 用 UTC 日期（瑞士凌晨兩點前會顯示前一天）④無 ErrorBoundary 白屏。

**與線上 v3.12 的已知差異**：景點圖片改線上載入＋SW 快取（原內嵌 6 張無法離線取得）；行前清單為新預設項目；匯率 EUR=35 推定。詳 STATE.md。

## 9. 1.1 差異稽核與補齊（2026-08-03）

**方法**：下載線上 v3.12 原檔(1.77MB),解碼壓縮字串,與 1.0 逐字比對 809 條中文字面值＋結構掃描。

**查獲並補齊的缺漏**：
1. **天氣頁是真預報引擎**,非靜態 SOP——open-meteo 今日/明日(城市＋高山)、14 天內真實預報/超過則抓去年同日實際、體感穿著建議、五個高山日總覽(對調決策用)。已照原邏輯重實作(`WX_CITY`/`WX_MT`/`wxFetch`/`wxWear`)。
2. **五人內建票券 z3(1,027KB)**——出發前就嵌在 App 裡的每人 QR,依登入者排最前。已原樣搬回(`data/tickets_embedded.js`)。
3. **閘門=背景照＋選身分＋密碼**——`hub_user` 之謎解開:進場先選你是誰。已重現(`data/gate_photo.js`,322KB),身分存 `wang.swiss.user`。
4. 行前清單原始 12 項還原(索引與舊 `hub_chk` 相容);分帳資料形狀對齊舊版 `{who,amt,note,t}`;EUR=34.2;快捷列「火車票」;行程亮點標語上列;「🧭怎麼走?」按鈕詞。
5. **逐步指令庫**進導航頁:8 條未綁定行程的路線指南(黃金列車、各景點餐廳怎麼去)從此可達。

**新增:舊版資料帶入**(工具第一卡)——只複製不刪除:hub_user/chk/diary/exp/wifi＋`hub:`前綴票券相簿→`wang.swiss.*`;不覆蓋既有值;空間不足即停並回報;舊鍵零寫入(自動測試驗證)。

**安全註記**:內建票券與閘門照在 st2607 原本即公開,1.1 維持同等曝險,未新增。

## 10. 1.2 全面稽核與定版（2026-08-03）

**稽核方法**：16 天逐日走訪(標題/景點/防呆/怎麼走/餐廳卡數量核對)＋全分頁每一個連結格式驗證＋10 城市餐廳頁全切換＋資料交叉檢查(plan/eats/tickets/GUIDE/SIGHTS/BK_ZONES 鍵值完整性)。`node audit.mjs` 可重跑。

**補齊的體驗缺漏(對齊 v3.12)**：
1. **左右滑動換日**(閾值60px、方向比1.5、切換吐司顯示日期、滑入動畫)——v1 骨架沒有這功能,1.1 漏了。
2. **今天到底是哪天**:頁首「Day 11・8/3(一)・今天・聖莫里茲」;中央按鈕顯日期+「(今天)」;看別天時出現黃色「你看的是 8/5(三)——點此回到今天」;每日主題色+標籤(💎 Day 11 聖莫里茲)。
3. 查獲並修復**線上版就存在的兩個斷鍵**:Day13 的 spruengli 拼字錯誤與 rheinfels 缺鍵——舊版這兩張餐廳卡其實從未顯示過,新版已修。

## 11. 1.3 票券頁補完（2026-08-03）

線上版票券頁其實是**三區**,1.1 只搬回第一區,故使用者只看得到 STP:
1. **STP 五人份**(z3 內建圖,登入者排最前)— 1.1 已有,標題改回原文「Swiss Travel Pass (STP) — 點人名全螢幕出示」
2. **訂位券/機票連結**(R3,新抽出為 `data/ticket_links.json`):冰河列車訂位券、黃金列車車票、阿聯酋機票(遠志)、機票資料夾(全家)——存 Drive,需登入
3. **自行上傳相簿**

**新增「舊版上傳票券」唯讀區**:新舊 App 同屬 `wayuanzi-web.github.io` 同一網域,localStorage 相通,故新版可**直接讀取**舊版 `hub:tickets:*` 照片顯示,不需複製、不佔額外空間、不寫入舊鍵(自動測試驗證)。避免了照片複製一份導致配額翻倍的風險。

**版本斷言改讀 version.json**,測試不再因改版過期。

## 12. 1.4 — 整合 family-hub（2026-08-03）

**來源**：`family-hub` repo 的 `data/` 資料考古成果（8 模組，v2.3 bundle 還原）。**未動 family-hub 一行**,只取資料。

**新增兩個資料檔**
- `shop.json`(74KB):48 項伴手禮＋48 品牌故事＋15 品牌 TOP3＋4 城市 10 家店家包(含網友情報/招牌品項/現場流程/給店員的英文)＋5 類選購指南＋4 家現場作戰卡＋3 項深度導購＋採購倒數表
- `depart.json`(9KB):瑞士/杜拜退稅包＋台灣入境規定＋出發/回程打包清單＋緊急電話(CH/AE)

**新增兩個子頁**(更多頁擴為 7 子頁,橫向可捲,預設開「購物」)
- **🛍 購物**:⏳倒數(依 EK086 8/6 22:00 動態計算,逾期品項標紅)｜🎁清單(搜尋+分類+熱門度排序,展開看品牌故事與 TOP3)｜🏬店家(依當日城市自動選,含一鍵導航與「複製給店員的英文」)｜📖怎麼選
- **🛫 離境**:💰退稅(CH/AE 切換,含「食品 VAT 僅 2.6%」關鍵提醒與手提/託運兩條動線)｜🇹🇼海關(禁帶清單置頂)｜🧳打包(可勾選,存 `wang.swiss.pack`)｜☎️急難

**安全補強**:緊急電話(REGA 空中救援 1414、112/117/144)同時併入「應變」頁——原本 swiss 只有代表處號碼。
**行程提醒**:8/6、8/8 兩天加入紅色 warn(資料驅動)。

## 13. 1.5 — 餐廳雷達與可複用 `nearby` 模組（2026-08-03）

### 餐廳頁改為三層（分頁切換，原功能完整保留）
| 層 | 內容 | 座標 | 距離 |
|---|---|---|---|
| 🍽 沿線精選 | 10 城市 45 家備選（原 Backups） | 有 | ✅ 依位置排序 |
| ⭐ 名店 | 米其林/必比登 **152 家**（瑞士 127＋杜拜 25），依城市自動選，可篩星等/菜系/價位 | **無** | ❌ 誠實顯示「同城・未定位」，不假造 |
| 📍 即時附近 | Google Places 即時查詢現在位置周邊，半徑 500m–3km，可打關鍵字 | 有 | ✅ 依距離排序 |

### `src/nearby.jsx` — 跨 App 複用模組（本次重點）
引擎 `nb` 為純函式，與 UI 分離：`dist / walkMin / fmt / withDist / filter / sort / mapsNav / mapsInfo / live`。
UI：`NearbyCard`（單一卡片，三層共用）、`FilterBar`、`FineList`、`LiveNearby`、`EatHub`。

**資料契約 Place**：`{ id, n, en?, lat?, lon?, r?, ct?, pl?, cuisine?, badge?, note?, pid?, city?, area?, openNow?, src }`
`src` = `pack`（沿線）｜`fine`（權威名單）｜`live`（即時）。**lat/lon 可缺席**——缺席即不算距離，這是刻意設計，讓沒有座標的權威名單也能共用同一套 UI。

**其他 App 接法**（例：主任 App 在基隆找餐廳）
1. 複製 `src/nearby.jsx`
2. 改 `NEARBY_KEY_LS` 常數為該 App 的命名空間（如 `wang.chief.gkey`）
3. 提供自己的 pack/fine JSON（符合上面契約即可）；沒有也行——📍即時附近層不需任何預建資料，落地即用
4. 米其林台灣 176 家已備妥於 `data/fine_tw_jp.json`（台北 106／台南 22／台中 18／高雄 17…，**基隆 0 家**，故基隆場景主要靠即時層）

### Google Places 金鑰
內建一組，可在「更多→工具→🔑 附近搜尋金鑰」替換或清除（存 `wang.swiss.gkey`）。
🔴 **金鑰在公開網頁等同公開**：務必到 Google Cloud 設定 HTTP 參照網址限制（只允許 `wayuanzi-web.github.io`）並設每日用量上限。family-hub 線上版另有兩把未受限的金鑰，一併建議處理。

## 14. 1.5.1 — 金鑰下架（2026-08-03，GitHub 秘密掃描告警後）

**問題**：1.5 把 Google API 金鑰寫死在 `nearby.jsx` 內建常數，隨 build 進入公開 repo 的 `swiss/index.html`，GitHub secret scanning 告警。

**處置**
1. `NEARBY_KEY_DEFAULT` 改為空字串,程式碼**永不內建金鑰**；金鑰只存使用者本機 `localStorage: wang.swiss.gkey`
2. 「更多→工具→🔑 附近搜尋金鑰」改為必填入口(密碼欄位遮蔽)，未設定時「📍即時附近」顯示引導而非報錯
3. 刪除 build 中間產物 `apps/swiss/app.js`(內含同一份 bundle)
4. **Git 歷史清除**：以無父節點的新 commit 強制覆蓋 main，舊 commit 連同金鑰一併消失

**規則(適用所有 App)**：任何憑證一律只存使用者裝置端；repo 內不得出現任何金鑰、token、密碼。

**⚠️ 仍待使用者處理**
- 這把金鑰已公開過 → **必須到 Google Cloud 刪除/重新產生**；清除 repo 不等於撤銷洩漏
- `family-hub` 線上版 `index.html` 另有 **2 把**內嵌金鑰(非本次這把)，仍在公開狀態
