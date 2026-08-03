/* 對抗性巡檢:離線情境 + 16天逐日 + 各分頁,找出渲染缺陷
   不修改任何檔案,只回報。 */
import fs from "fs";
import { JSDOM } from "jsdom";
const html = fs.readFileSync("/home/claude/travel-suite/swiss/index.html", "utf8");

function boot({ offline = true } = {}) {
  return new JSDOM(html, {
    runScripts: "dangerously", url: "https://example.test/travel-suite/swiss/", pretendToBeVisual: true,
    beforeParse(w) {
      w.localStorage.setItem("wang.swiss.gate", "1");
      w.localStorage.setItem("wang.swiss.user", "遠志");
      w.SpeechSynthesisUtterance = function (t) { this.text = t; };
      w.speechSynthesis = { speak() {}, cancel() {} };
      w.alert = () => {}; w.confirm = () => true; w.prompt = () => "x";
      w.navigator.geolocation = undefined;
      if (offline) w.fetch = () => Promise.reject(new Error("offline"));
    },
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const click = (doc, txt) => {
  const el = [...doc.querySelectorAll("button,div,a,span")].filter(e => e.textContent.trim().startsWith(txt)).pop();
  if (!el) throw new Error("找不到: " + txt);
  el.dispatchEvent(new (doc.defaultView.MouseEvent)("click", { bubbles: true }));
};
// 翻頁鈕文字是「8/4 ▶」,▶ 在結尾;且需未 disabled
const nextDay = (doc) => {
  const el = [...doc.querySelectorAll("button")].filter(e => e.textContent.includes("▶") && !e.disabled).pop();
  if (!el) return false;
  el.dispatchEvent(new (doc.defaultView.MouseEvent)("click", { bubbles: true }));
  return true;
};
const prevDay = (doc) => {
  const el = [...doc.querySelectorAll("button")].filter(e => e.textContent.includes("◀") && !e.disabled).pop();
  if (!el) return false;
  el.dispatchEvent(new (doc.defaultView.MouseEvent)("click", { bubbles: true }));
  return true;
};
const findings = [];
const flag = (where, what) => { findings.push(`[${where}] ${what}`); };

// 通用缺陷偵測
function scan(where, text) {
  if (/undefined/.test(text)) flag(where, "畫面出現 undefined");
  if (/NaN/.test(text)) flag(where, "畫面出現 NaN");
  if (/:°~°C|\s°~\s?°C/.test(text)) flag(where, "空溫度 °~°C");
  if (/\[object Object\]/.test(text)) flag(where, "出現 [object Object]");
  if (/年同日實際/.test(text) && /undefined年/.test(text)) flag(where, "去年年份 undefined");
}

console.log("=== A. 離線情境:16天逐日巡檢(行程頁) ===");
{
  const dom = boot({ offline: true }); await wait(400);
  const doc = dom.window.document;
  // 先退到 Day1
  for (let i = 0; i < 20; i++) if (!prevDay(doc)) break; else await wait(90);
  await wait(200);
  const seen = [];
  for (let i = 0; i < 16; i++) {
    await wait(200);
    const t = doc.getElementById("root").textContent;
    const day = (t.match(/Day (\d+)/) || [])[1] || "?";
    seen.push(day);
    scan(`離線 Day${day} 行程`, t);
    // 每天都展開防呆指南與逐步導航,測互動後的渲染
    try { click(doc, "🛡️ 今日防呆指南"); await wait(140); scan(`離線 Day${day} 防呆`, doc.getElementById("root").textContent); } catch {}
    try { click(doc, "🧭 怎麼走"); await wait(140); scan(`離線 Day${day} 導航`, doc.getElementById("root").textContent); } catch {}
    if (i < 15 && !nextDay(doc)) { flag("行程", "Day" + day + " 之後無法翻頁"); break; }
  }
  console.log("  巡檢天數:", seen.join(","));
}

console.log("=== B. 離線情境:天氣頁行為 ===");
{
  const dom = boot({ offline: true }); await wait(400);
  const doc = dom.window.document;
  click(doc, "🌡"); await wait(1500);
  const t = doc.getElementById("root").textContent;
  scan("離線 天氣頁", t);
  const stuckLoading = t.includes("載入天氣中");
  const stuckMt = t.includes("載入中…");
  const saysFail = /取不到|載入失敗|無法取得/.test(t);
  console.log("  仍顯示「載入天氣中」:", stuckLoading);
  console.log("  高山總覽仍「載入中…」:", stuckMt);
  console.log("  有明確失敗訊息:", saysFail);
  if (stuckLoading && !saysFail) flag("天氣頁", "離線時永遠停在「載入天氣中…」,不會告訴使用者失敗(飛機/隧道內會一直轉)");
  if (stuckMt) flag("天氣頁", "高山日總覽離線時永遠停在「載入中…」");
}

console.log("=== C. 離線:各分頁可達性 ===");
{
  const dom = boot({ offline: true }); await wait(400);
  const doc = dom.window.document;
  for (const [icon, name] of [["🧭", "導航"], ["🌡", "天氣"], ["🍽", "餐廳"], ["🎁", "購物"], ["🎫", "票券"], ["🗣", "會話"], ["☰", "更多"]]) {
    try { click(doc, icon); await wait(400); scan("離線 " + name, doc.getElementById("root").textContent); }
    catch (e) { flag(name, "分頁點不開: " + e.message); }
  }
  console.log("  七分頁巡檢完成");
}

console.log("=== D. 更多→六子頁 ===");
{
  const dom = boot({ offline: true }); await wait(400);
  const doc = dom.window.document;
  click(doc, "☰"); await wait(300);
  for (const s of ["🛫離境", "📁證件", "🧰工具", "🛡️應變", "🆘走散", "📱說明"]) {
    try { click(doc, s); await wait(300); scan("更多→" + s, doc.getElementById("root").textContent); }
    catch (e) { flag("更多", s + " 點不開"); }
  }
  console.log("  六子頁巡檢完成");
}

console.log("\n=== 結果 ===");
if (!findings.length) console.log("未發現缺陷");
else findings.forEach(f => console.log("  ⚠️ " + f));
