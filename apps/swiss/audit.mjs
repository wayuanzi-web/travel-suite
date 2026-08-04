import fs from "fs";
import { JSDOM } from "jsdom";
const html = fs.readFileSync("/home/claude/travel-suite/swiss/index.html", "utf8");
const P = JSON.parse(fs.readFileSync("data/places.json"));
const TRIPJ = JSON.parse(fs.readFileSync("data/trip.json"));
const BK = JSON.parse(fs.readFileSync("data/bk_zones.json"));
const GU = JSON.parse(fs.readFileSync("data/guide.json"));
const SG = JSON.parse(fs.readFileSync("data/sights.json"));
const issues = [];

/* ---- 靜態資料稽核 ---- */
TRIPJ.days.forEach((d, i) => {
  (d.plan || []).forEach(p => { if (p[2] && !P[p[2]]) issues.push(`Day${i + 1} plan「${p[1].slice(0, 18)}」引用不存在的餐廳鍵 ${p[2]}`); });
  (d.eats || []).forEach(id => { if (!P[id]) issues.push(`Day${i + 1} eats 引用不存在的餐廳鍵 ${id}`); });
  (d.tickets || []).forEach(t => { if (!TRIPJ.ticketMeta[t]) issues.push(`Day${i + 1} tickets 引用不存在的 ticketMeta ${t}`); });
  if (d.webcam && !/^https:\/\//.test(d.webcam)) issues.push(`Day${i + 1} webcam 非 https: ${d.webcam}`);
});
Object.keys(GU).forEach(k => { if (+k < 0 || +k > 15) issues.push("GUIDE 越界鍵 " + k); });
Object.keys(SG).forEach(k => { if (+k < 0 || +k > 15) issues.push("SIGHTS 越界鍵 " + k); });
BK.forEach(z => z.days.forEach(dd => { if (dd < 0 || dd > 15) issues.push("BK_ZONES 越界日 " + z.z + ":" + dd); }));
SG && Object.values(SG).flat().forEach(sg => { if (sg.img && !/^https:\/\//.test(sg.img)) issues.push("SIGHTS 圖非 https:" + sg.n); });

/* ---- 動態點擊稽核 ---- */
const dom = new JSDOM(html, {
  runScripts: "dangerously", url: "https://example.test/travel-suite/swiss/", pretendToBeVisual: true,
  beforeParse(w) {
    w.localStorage.setItem("wang.swiss.gate", "1"); w.localStorage.setItem("wang.swiss.user", "遠志");
    w.alert = () => {}; w.confirm = () => true; w.prompt = () => "x";
    w.SpeechSynthesisUtterance = function (t) { this.text = t; }; w.speechSynthesis = { speak() {}, cancel() {} };
    w.navigator.geolocation = undefined;
    w.addEventListener("error", e => issues.push("window error: " + e.message));
  },
});
const wait = ms => new Promise(r => setTimeout(r, ms));
await wait(150);
const doc = dom.window.document, W = dom.window;
const clickEl = el => el.dispatchEvent(new W.MouseEvent("click", { bubbles: true }));
const byText = t => [...doc.querySelectorAll("button")].find(b => b.textContent.trim().startsWith(t));
const navBtn = arrow => [...doc.querySelectorAll("button")].filter(b => b.textContent.includes(arrow) && !b.disabled).pop();
const rootText = () => doc.getElementById("root").textContent;
const boundaryTripped = () => rootText().includes("App 發生錯誤");
const checkLinks = where => {
  [...doc.querySelectorAll("a[href]")].forEach(a => {
    const h = a.getAttribute("href");
    if (!/^(https:\/\/|tel:|#)/.test(h)) issues.push(where + " 異常連結: " + h.slice(0, 60));
    if (/undefined|NaN|null,/.test(h)) issues.push(where + " 連結含 undefined/NaN: " + h.slice(0, 80));
  });
};

/* 16 天逐日走訪 */
// 先回到 Day 1
for (let i = 0; i < 20; i++) { const b = navBtn("◀"); if (!b) break; clickEl(b); await wait(15); }
for (let i = 0; i < 16; i++) {
  const t = rootText();
  if (!t.includes(TRIPJ.days[i].title)) issues.push(`Day${i + 1} 標題未渲染(期望「${TRIPJ.days[i].title}」)`);
  // 每一天:展開景點/防呆(若有)
  const sg = byText("🏞️"); if (sg) { clickEl(sg); await wait(20); clickEl(sg); }
  const gd = byText("🛡️"); if (gd) { clickEl(gd); await wait(20); }
  // 第一個怎麼走
  const st = [...doc.querySelectorAll("button")].find(b => b.textContent.includes("🧭怎麼走?"));
  // 1.7.3:逐步指令改為「就地展開」而非彈窗。驗證:展開後應出現第1步內容與關閉鈕,
  // 且關閉後內容消失(確認 toggle 正常,不會殘留擋住行程表)。
  if (st) {
    const closeBtn = () => [...doc.querySelectorAll("button")].find(b => b.textContent.includes("關閉導航"));
    if (closeBtn()) issues.push(`Day${i + 1} 逐步指令未點就已展開`);
    clickEl(st); await wait(25);
    const cl = closeBtn();
    if (!cl) issues.push(`Day${i + 1} 逐步指令未就地展開`);
    else {
      // 展開後應有編號步驟(至少一個圓形序號「1」)
      if (!/1/.test(cl.parentElement.textContent)) issues.push(`Day${i + 1} 逐步指令展開後無步驟`);
      clickEl(cl); await wait(20);
      if (closeBtn()) issues.push(`Day${i + 1} 逐步指令關閉後仍殘留`);
    }
    await wait(15);
  }
  // PlaceChip 應渲染數 = plan 帶鍵數 + eats 數
  const expChips = (TRIPJ.days[i].plan || []).filter(p => p[2]).length + (TRIPJ.days[i].eats || []).length;
  const gotChips = [...doc.querySelectorAll("a")].filter(a => a.textContent === "🧭導航").length;
  if (gotChips !== expChips) issues.push(`Day${i + 1} 餐廳卡數量 ${gotChips}≠期望 ${expChips}`);
  checkLinks(`Day${i + 1}`);
  if (boundaryTripped()) { issues.push(`Day${i + 1} 觸發錯誤邊界`); break; }
  if (i < 15) { const nx = navBtn("▶"); if (nx) clickEl(nx); await wait(20); }
}
/* 各分頁連結 */
for (const [ic, name] of [["🌡", "天氣"], ["🍽️", "餐廳"], ["🎫", "票券"], ["🗣️", "會話"], ["🧭", "導航"], ["☰", "更多"]]) {
  const b = [...doc.querySelectorAll("nav button, div button")].find(x => x.textContent.includes(ic));
  if (b) { clickEl(b); await wait(60); checkLinks(name + "頁"); if (boundaryTripped()) issues.push(name + "頁觸發錯誤邊界"); }
}
/* 餐廳頁:切換全部 10 城市 */
const sel = doc.querySelector("select");
if (sel) for (let i = 0; i < sel.options.length; i++) {
  sel.value = String(i);
  sel.dispatchEvent(new W.Event("change", { bubbles: true })); await wait(20);
  checkLinks("餐廳頁-" + i);
  if (boundaryTripped()) issues.push("餐廳頁城市 " + i + " 觸發錯誤邊界");
}
console.log(issues.length ? "發現問題 " + issues.length + " 項:\n" + issues.map(x => " ✗ " + x).join("\n") : "✅ 稽核全數通過(16天×互動+全連結+資料交叉檢查)");
