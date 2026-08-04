import fs from "fs";
import { JSDOM } from "jsdom";
const html = fs.readFileSync("/home/claude/travel-suite/swiss/index.html", "utf8");
const VER = JSON.parse(fs.readFileSync("/home/claude/travel-suite/swiss/version.json", "utf8")).version;
const TRIP_JSON = JSON.parse(fs.readFileSync("/home/claude/travel-suite/apps/swiss/data/trip.json", "utf8"));
const TRIP_DAYS = TRIP_JSON.days, TRIP_TZ = TRIP_JSON.tz || "Europe/Zurich";
function boot({ gate, seedOld }) {
  return new JSDOM(html, {
    runScripts: "dangerously", url: "https://example.test/travel-suite/swiss/", pretendToBeVisual: true,
    beforeParse(w) {
      if (gate) { w.localStorage.setItem("wang.swiss.gate", "1"); w.localStorage.setItem("wang.swiss.user", "遠志"); }
      if (seedOld) {
        w.localStorage.setItem("hub_diary", "今天冰河列車好美");
        w.localStorage.setItem("hub_chk", '{"0":true}');
        w.localStorage.setItem("hub_exp", '[{"who":"遠志","amt":100,"note":"咖啡","t":1}]');
        w.localStorage.setItem("hub:tickets:index", '[{"id":"t1","name":"測試票-遠志","at":"08-01"}]');
        w.localStorage.setItem("hub:tickets:img:t1", "data:image/png;base64,iVBORw0KGgo=");
      }
      w.SpeechSynthesisUtterance = function (t) { this.text = t; };
      w.speechSynthesis = { speak() {}, cancel() {} };
      w.alert = () => {}; w.confirm = () => true; w.prompt = () => "x";
      w.navigator.geolocation = undefined;
    },
  });
}
// 1.7.3:換日按鈕改為顯示前後日期(如「8/5(三) ▶」),箭頭不在開頭,
// 故改用「包含箭頭且未 disabled」來選,不受日期文字變動影響。
const navBtn = (doc, arrow) => {
  const b = [...doc.querySelectorAll("button")].filter(e => e.textContent.includes(arrow) && !e.disabled).pop();
  if (!b) throw new Error("找不到換日鈕: " + arrow);
  b.dispatchEvent(new doc.defaultView.MouseEvent("click", { bubbles: true }));
};
const click = (doc, txt) => {
  const el = [...doc.querySelectorAll("button,div,a,span,option")].find(e => e.childElementCount === 0 && e.textContent.trim().startsWith(txt))
    || [...doc.querySelectorAll("button,div")].find(e => e.textContent.trim().startsWith(txt));
  if (!el) throw new Error("找不到: " + txt);
  el.dispatchEvent(new (el.ownerDocument.defaultView.MouseEvent)("click", { bubbles: true }));
};
const wait = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, n) => { c ? (pass++, console.log("  ✓ " + n)) : (fail++, console.log("  ✗ " + n)); };

// --- 1: 閘門(照片+選身分) ---
{
  const dom = boot({}); await wait(130);
  const doc = dom.window.document, t = doc.body.textContent;
  ok(t.includes("選擇你是誰後進入"), "閘門:選身分");
  ok(!!doc.querySelector('select'), "閘門:成員下拉");
  ok(!!doc.querySelector('img[src^="data:image/jpeg"]'), "閘門:背景照片");
  ok(t.includes("swiss " + VER), "閘門:版本一致");
  dom.window.close();
}
// --- 2: 主程式 ---
{
  const dom = boot({ gate: true, seedOld: true }); await wait(160);
  const doc = dom.window.document, W = dom.window;
  const body = () => doc.body.textContent;
  ok(body().includes("遠志家族旅遊通"), "主畫面");
  ok([...doc.querySelectorAll("button")].some(b => b.textContent.includes("火車票")), "快捷列:火車票");
  ok([...doc.querySelectorAll("button")].some(b => b.textContent.includes("🧭怎麼走?")), "行程:怎麼走按鈕");
  const root = () => doc.getElementById("root").textContent;
  ok(root().includes("(今天)"), "行程:今天標示");
  ok(root().includes("・今天・"), "頁首:今天+日期");
  // 1.7.2:改為日期無關——原本寫死「8/3(一)」「Day 11 聖莫里茲」,
  // 隔天就會全部誤報(8/4 當天實際發生過 3 項假警報)。
  ok(/\d{1,2}\/\d{1,2}\([一二三四五六日]\)/.test(root()), "頁首:星期顯示(格式)");
  ok(root().includes("左右滑動換日"), "行程:滑動提示");
  {
    const todayStr = new Intl.DateTimeFormat("sv-SE", { timeZone: TRIP_TZ }).format(new Date());
    let idx = TRIP_DAYS.findIndex(d => d.d === todayStr); if (idx < 0) idx = 0;
    ok(root().includes("Day " + (idx + 1)), "行程:每日主題標籤(當天)");
    ok(root().includes(TRIP_DAYS[idx].city.split(" ")[0].split("→")[0]), "行程:主題標籤城市相符");
    // 明確走到 Day13 驗證斷鍵餐廳卡,不再依賴「今天+2」
    const step = 12 - idx;
    for (let i = 0; i < Math.abs(step); i++) { navBtn(doc, step > 0 ? "▶" : "◀"); await wait(60); }
    ok(root().includes("Day 13"), "導到 Day13");
    ok(root().includes("Rheinfels"), "Day13:斷鍵餐廳卡修復(Rheinfels)");
  }
  ok(root().includes("你看的是"), "非今天:回到今天提示");
  click(doc, "你看的是"); await wait(50);
  ok(root().includes("(今天)"), "回到今天正常");
  click(doc, "🌡"); await wait(120);
  ok(body().includes("天氣與穿著"), "天氣頁:主卡");
  ok(body().includes("高山日總覽"), "天氣頁:高山總覽");
  ok(body().includes("上山前一晚"), "天氣頁:離線SOP");
  click(doc, "🎫"); await wait(100);
  ok(body().includes("Swiss Travel Pass"), "票券:STP五人區");
  ok(body().includes("遠志(我)"), "票券:本人排最前");
  ok(body().includes("奶奶"), "票券:五人齊");
  ok(body().includes("自行上傳的票券"), "票券:上傳區改名");
  ok(body().includes("冰河列車 訂位券") && body().includes("阿聯酋機票"), "票券:Drive訂位券/機票連結");
  click(doc, "🧭"); await wait(80);
  ok(body().includes("逐步指令庫(104條)"), "導航:指令庫");
  click(doc, "▼ 展開全部"); await wait(60);
  ok(body().includes("黃金列車"), "導航:孤兒指令可達");
  click(doc, "☰"); await wait(80);
  click(doc, "🧰工具"); await wait(80);
  ok(body().includes("🔁 舊版資料帶入"), "工具:帶入卡置頂(預設展開)");
  click(doc, "🔁 開始帶入"); await wait(80);
  ok(body().includes("帶入票券相簿資料 2 筆"), "帶入:票券2筆");
  ok(W.localStorage.getItem("wang.swiss:tickets:index") !== null, "帶入:新鍵已寫");
  ok(W.localStorage.getItem("hub:tickets:index") === '[{"id":"t1","name":"測試票-遠志","at":"08-01"}]', "帶入:舊鍵未動");
  ok(W.localStorage.getItem("hub_diary") === "今天冰河列車好美", "帶入:舊日記未動");
  click(doc, "📔 旅行一句話日記"); await wait(60);
  ok(!!doc.querySelector("textarea") && [...doc.querySelectorAll("textarea")].some(t => t.value.includes("冰河列車好美")), "日記:遷移內容可見");
  click(doc, "🧾 分帳記帳"); await wait(60);
  ok(body().includes("遠志 共墊") && body().includes("100"), "分帳:舊紀錄相容");
  click(doc, "✅ 行前檢查清單"); await wait(60);
  ok(body().includes("護照(效期6個月+)") && body().includes("☑"), "清單:原始12項+舊勾選相容");
  click(doc, "📱說明"); await wait(60);
  ok(body().includes("swiss " + VER), "說明:版本浮水印");
  dom.window.close();
}
// --- 3: bundle 靜態 ---
{
  ok(html.includes("api.open-meteo.com"), "bundle:天氣引擎");
  ok(html.includes("歐洲最古老木廊橋"), "bundle:亮點標語");
  ok((html.match(/data:image\/(png|jpeg);base64,/g) || []).length >= 6, "bundle:6張內嵌圖回歸");
  ok(!/localStorage\.setItem\(\s*["']hub/.test(html), "bundle:全檔零寫入 hub 鍵");
  ok(fs.readFileSync("/home/claude/travel-suite/swiss/sw.js","utf8").includes("wang-swiss-v" + VER), "sw.js:快取版本同步");
}
// --- 4: 天氣離線/連線狀態(1.7 新增回歸) ---
{
  // 4a 離線:必須明確告知取不到,不可永遠停在「載入天氣中」
  const dom = new JSDOM(html, {
    runScripts: "dangerously", url: "https://example.test/travel-suite/swiss/", pretendToBeVisual: true,
    beforeParse(w) {
      w.localStorage.setItem("wang.swiss.gate", "1"); w.localStorage.setItem("wang.swiss.user", "遠志");
      w.SpeechSynthesisUtterance = function (t) { this.text = t; }; w.speechSynthesis = { speak() {}, cancel() {} };
      w.alert = () => {}; w.confirm = () => true; w.prompt = () => "x"; w.navigator.geolocation = undefined;
      w.fetch = () => Promise.reject(new Error("offline"));
    },
  });
  await wait(300);
  const doc = dom.window.document;
  click(doc, "\u{1F321}"); await wait(1200);
  const t = doc.getElementById("root").textContent;
  ok(t.includes("天氣取不到"), "天氣離線:明確告知取不到");
  ok(!t.includes("載入天氣中"), "天氣離線:不再永遠顯示載入中");
  ok(t.includes("請勿依此判斷穿著"), "天氣離線:警告勿據此穿著");
  ok(!/undefined|NaN/.test(t), "天氣離線:無 undefined/NaN");
  dom.window.close();
}
{
  // 4b 連線:假 API 回 9~22 度,必須正常顯示且不誤報失敗
  const dom = new JSDOM(html, {
    runScripts: "dangerously", url: "https://example.test/travel-suite/swiss/", pretendToBeVisual: true,
    beforeParse(w) {
      w.localStorage.setItem("wang.swiss.gate", "1"); w.localStorage.setItem("wang.swiss.user", "遠志");
      w.SpeechSynthesisUtterance = function (t) { this.text = t; }; w.speechSynthesis = { speak() {}, cancel() {} };
      w.alert = () => {}; w.confirm = () => true; w.prompt = () => "x"; w.navigator.geolocation = undefined;
      w.fetch = (u) => {
        const f = String(u).includes("/v1/forecast");
        return Promise.resolve({ json: async () => ({ daily: {
          time: ["2026-08-03"], temperature_2m_max: [f ? 22 : 19], temperature_2m_min: [f ? 9 : 7],
          precipitation_probability_max: [f ? 10 : null], precipitation_sum: [f ? null : 3], weathercode: [0] } }) });
      };
    },
  });
  await wait(300);
  const doc = dom.window.document;
  click(doc, "\u{1F321}"); await wait(1200);
  const t = doc.getElementById("root").textContent;
  ok(t.includes("9\u00B0~22\u00B0C"), "天氣連線:溫度正確");
  ok(!t.includes("天氣取不到"), "天氣連線:未誤報取不到");
  ok(!t.includes("\u76EE\u524D\u6C92\u7DB2\u8DEF"), "天氣連線:高山總覽未誤報離線");
  dom.window.close();
}
console.log("\n結果: " + pass + " 通過 / " + fail + " 失敗");
process.exit(fail ? 1 : 0);
