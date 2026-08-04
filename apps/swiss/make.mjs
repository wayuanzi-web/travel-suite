import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const ROOT = "/home/claude/travel-suite/apps/swiss";
const DEPLOY = "/home/claude/travel-suite/swiss";
fs.mkdirSync(DEPLOY, { recursive: true });
const V1 = fs.readFileSync("/mnt/user-data/uploads/travel-hub-原始碼_v1.tsx", "utf8").split("\n");
const slice = (a, b) => V1.slice(a - 1, b).join("\n"); // 1-indexed inclusive

/* ---- verbatim slices from v1 ---- */
let A = slice(192, 215);                 // gNav/gPage/Stars/PlaceChip/SS
let B1 = slice(330, 425);                // shim + utils + todayIdx + loaders + TravelHub
let B2 = slice(508, 606);                // Tickets
let C1 = slice(656, 813);                // Navigate + Backups
let C2 = slice(848, 912);                // Lost + More
let D = slice(928, 1007);                // Docs + Sos

const must = (s, from, to, tag) => {
  if (!s.includes(from)) throw new Error("PATCH MISS [" + tag + "]");
  return s.split(from).join(to);
};

/* ---- patches ---- */
// 快捷列標籤對齊 v3.12:火車票
B1 = must(B1, '{[["tickets","🎫","票券"],["nav","🧭","導航"],["loc","📍","我在哪"],["lost","🆘","走散"]].map',
  '{[["tickets","🎫","火車票"],["nav","🧭","導航"],["loc","📍","我在哪"],["lost","🆘","走散"]].map', "quicklabel");
// 票券頁:內建票券區 + 空狀態提示帶入
B2 = must(B2, '<div style={S.secTitle}>🎫 票券QR相簿(全家共享)</div>', '<div style={S.secTitle}>🎫 自行上傳的票券</div>', "tixtitle");
B2 = must(B2, 'return (\n    <div>\n      <div style={S.card}>', 'return (\n    <div>\n      <EmbeddedTickets onOpen={setFull} />\n      <TicketLinks />\n      <OldUploads onOpen={setFull} />\n      <div style={S.card}>', "tixembed");
B2 = must(B2, '{items.length===0 && <div style={{color:"#8A97A6", fontSize:14, padding:20}}>尚無票券,點上方新增</div>}',
  '{items.length===0 && <div style={{color:"#8A97A6", fontSize:14, padding:20}}>尚無自行上傳的票券。舊版存過的照片→「更多→工具→🔁舊版資料帶入」一鍵複製。</div>}', "tixempty");
// 導航頁:插入逐步指令庫
C1 = must(C1, '<div style={{...S.card, fontSize:13, color:"#5A6B7E"}}>\n        💡 用法:出站後點目標',
  '<NavStepsLibrary day={day} />\n      <div style={{...S.card, fontSize:13, color:"#5A6B7E"}}>\n        💡 用法:出站後點目標', "navlib");

// storage namespace: hub: → wang.swiss:
B1 = must(B1, '"hub:"+k', '"wang.swiss:"+k', "ns");
// remove board loaders (Board is replaced by Wx)
B1 = B1.replace(/async function loadBoard[\s\S]*?\n}\n/, "").replace(/async function saveBoard[\s\S]*?\n}\n/, "");
// timezone-correct todayIdx
B1 = must(B1, 'const now = new Date().toISOString().slice(0,10);',
  'const now = new Intl.DateTimeFormat("sv-SE", { timeZone: TRIP.tz }).format(new Date());', "tz");
// board tab → wx tab
B1 = must(B1, '{tab==="board" && <Board />}', '{tab==="wx" && <Wx day={day} dayIdx={dayIdx} />}', "wxrender");
B1 = must(B1, '["board","📌","公告"]', '["wx","🌡","天氣"],["shop","🎁","購物"]', "wxtab");
B1 = must(B1, '{tab==="wx" && <Wx day={day} dayIdx={dayIdx} />}', '{tab==="wx" && <Wx day={day} dayIdx={dayIdx} />}\n        {tab==="shop" && <Shop dayIdx={dayIdx} />}', "shoptabrender");
B1 = must(B1, '<div style={{fontSize:20}}>{ic}</div><div style={{fontSize:11}}>{lb}</div>',
  '<div style={{fontSize:18}}>{ic}</div><div style={{fontSize:10}}>{lb}</div>', "navsize");
// safe-area
B1 = must(B1, '<div style={S.headerSub}>Day {dayIdx+1}・{day.d.slice(5).replace("-","/")}・{day.city}</div>',
  '<div style={S.headerSub}>Day {dayIdx+1}・{fmtDW(day.d)}{isToday(day.d) ? "・今天" : ""}・{day.city}</div>', "headdate");
B1 = must(B1, '<header style={S.header}>', '<header style={{ ...S.header, paddingTop: "calc(14px + env(safe-area-inset-top))" }}>', "safetop");
B1 = must(B1, '<div style={S.headerTitle}>🇨🇭 {TRIP.name}</div>',
  '<div style={S.headerTitle}>🇨🇭 {TRIP.name}</div>\n        <div style={{ position: "absolute", right: 12, top: "calc(12px + env(safe-area-inset-top))", fontSize: 10.5, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{APP_VERSION.split(" · ")[0]}</div>', "verbadge");
B1 = must(B1, '<nav style={S.nav}>', '<nav style={{ ...S.nav, paddingBottom: "env(safe-area-inset-bottom)" }}>', "safebot");
// define shareMyLocation before TravelHub
B1 = must(B1, "export default function TravelHub()", `function shareMyLocation() {
  if (!navigator.geolocation) { alert("此裝置不支援定位"); return; }
  navigator.geolocation.getCurrentPosition(async p => {
    const url = "https://www.google.com/maps?q=" + p.coords.latitude + "," + p.coords.longitude;
    if (navigator.share) { try { await navigator.share({ title: "我的位置", url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); alert("位置連結已複製,貼到LINE"); } catch { prompt("複製:", url); } }
  }, () => alert("定位失敗:請允許位置權限"), { enableHighAccuracy: true, timeout: 8000 });
}

export default function TravelHub()`, "shareloc");
// More: 7 子頁(購物/離境/證件/工具/應變/走散/說明),橫向可捲
C2 = must(C2, '[["docs","📁 證件"],["sos","🛡️ 應變"],["lost","🆘 走散"],["help","📱 說明"]]',
  '[["depart","🛫離境"],["docs","📁證件"],["tools","🧰工具"],["sos","🛡️應變"],["lost","🆘走散"],["help","📱說明"]]', "moretabs");
C2 = must(C2, '{sub==="docs" && <Docs />}', '{sub==="depart" && <Depart />}\n      {sub==="tools" && <Tools />}\n      {sub==="docs" && <Docs />}', "morerender");
C2 = must(C2, 'const [sub, setSub] = useState("docs");', 'const [sub, setSub] = useState("depart");', "moredefault");
C2 = must(C2, '<div style={{display:"flex", gap:6, marginBottom:10}}>', '<div style={{display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:2}}>', "morescroll");
C2 = must(C2, 'function More() {', 'function More({ dayIdx }) {', "moreprop");
C2 = must(C2, 'style={{flex:1, padding:"9px 0", borderRadius:8, border:"1px solid #D5DDE6", fontSize:14, fontWeight:700, cursor:"pointer",',
  'style={{flex:"1 0 auto", whiteSpace:"nowrap", padding:"9px 12px", borderRadius:8, border:"1px solid #D5DDE6", fontSize:13, fontWeight:700, cursor:"pointer",', "morebtn");
B1 = must(B1, '{tab==="more" && <More />}', '{tab==="more" && <More dayIdx={dayIdx} />}', "morecall");
// 應變頁補緊急電話
D = must(D, '<div style={{...S.card, fontSize:13.5, color:"#5A6B7E"}}>{WCRULE}</div>',
  '<EmergencyCard />\n      <div style={{...S.card, fontSize:13.5, color:"#5A6B7E"}}>{WCRULE}</div>', "sosemg");

// 餐廳分頁改用三層 EatHub
B1 = must(B1, '{tab==="eat" && <Backups dayIdx={dayIdx} />}', '{tab==="eat" && <EatHub dayIdx={dayIdx} />}', "eathub");

/* ---- concat ---- */
const head = fs.readFileSync(path.join(ROOT, "src/head.jsx"), "utf8");
const tail = fs.readFileSync(path.join(ROOT, "src/tail.jsx"), "utf8");
const shop = fs.readFileSync(path.join(ROOT, "src/shop.jsx"), "utf8");
const nearby = fs.readFileSync(path.join(ROOT, "src/nearby.jsx"), "utf8");
const app = [head, A, B1, B2, C1, C2, D, tail, shop, nearby].join("\n\n");
fs.writeFileSync(path.join(ROOT, "src/app.jsx"), app);
console.log("app.jsx assembled:", app.split("\n").length, "lines");

/* ---- entry ---- */
fs.writeFileSync(path.join(ROOT, "src/entry.jsx"), `import React from "react";
import { createRoot } from "react-dom/client";
import App, { Gate, ErrorBoundary } from "./app.jsx";
createRoot(document.getElementById("root")).render(
  <ErrorBoundary><Gate><App /></Gate></ErrorBoundary>
);
`);

/* ---- bundle ---- */
await esbuild.build({
  entryPoints: [path.join(ROOT, "src/entry.jsx")],
  bundle: true,
  minify: true,
  format: "iife",
  loader: { ".jsx": "jsx" },
  jsx: "automatic",
  outfile: path.join(ROOT, "app.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  nodePaths: [path.resolve("/home/claude/travel-suite/apps/swiss/node_modules")],
  charset: "utf8",
});
let js = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
js = js.replace(/<\/script/gi, "<\\/script");

/* ---- inline into index.html ---- */
const shell = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
<meta name="theme-color" content="#1F3864"/>
<link rel="apple-touch-icon" href="icon.png"/>
<title>遠志家族旅遊通 — swiss 1.0</title>
<style>
html,body{margin:0;background:#EEF2F6;-webkit-text-size-adjust:100%}
@keyframes pulse{0%{opacity:1}50%{opacity:.55}100%{opacity:1}}
@keyframes slideIn{0%{opacity:0;transform:translateX(60px) scale(0.98)}60%{opacity:1;transform:translateX(-4px) scale(1.01)}100%{opacity:1;transform:translateX(0) scale(1)}}
@keyframes slideInLeft{0%{opacity:0;transform:translateX(-60px) scale(0.98)}60%{opacity:1;transform:translateX(4px) scale(1.01)}100%{opacity:1;transform:translateX(0) scale(1)}}
textarea,input,select,button{font-family:inherit}
</style>
</head>
<body>
<div id="root"></div>
<script>
__APP_JS__
</script>
<script>
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  navigator.serviceWorker.register("sw.js").catch(function(){});
}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(DEPLOY, "index.html"), shell.replace("__APP_JS__", () => js));
const sz = fs.statSync(path.join(DEPLOY, "index.html")).size;
console.log("index.html:", (sz / 1024).toFixed(0), "KB");

/* ---- sw.js ---- */
fs.writeFileSync(path.join(DEPLOY, "sw.js"), `var C = "wang-swiss-v1.7.3";
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(["./"]); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (r) {
      var cp = r.clone();
      caches.open(C).then(function (c) { c.put(e.request, cp); });
      return r;
    }).catch(function () {
      return caches.match(e.request).then(function (m) { return m || caches.match("./"); });
    })
  );
});
`);
console.log("sw.js written");

/* ---- version.json ---- */
fs.writeFileSync(path.join(DEPLOY, "version.json"), JSON.stringify({
  app: "swiss", version: "1.7.3", dataVersion: "1.1",
  build: new Date().toISOString().slice(0, 10),
  base: "travel-hub v1 skeleton + v3.12 restored data",
  changes: "1.7 天氣離線狀態明確化;1.7.1 杜拜退稅:未滿18歲限制實務化+驗證不可代辦(查核FTA/Planet)",
  storage: "wang.swiss.*", note: "st2607 未動;8/8 後才加唯讀搬遷"
}, null, 1));
console.log("DONE");
