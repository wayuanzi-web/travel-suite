import React, { useState, useEffect, useRef, useCallback } from "react";

/* ==========================================================================
   遠志家族旅遊通 swiss 1.0 — travel-suite 沙盒重建
   基底:travel-hub v1 骨架 + v3.12 線上版還原資料(data/*.json)
   設計語彙:瑞士鐵路風格 — SBB藍白紅、時刻表字體、月台看板美學
   資料驅動:換 data/ = 換旅程
   鐵則:原始碼與 index.html 同倉 commit;localStorage 一律 wang.swiss.*;
        絕不讀寫舊版 hub* keys(8/8 前家人旅途資料所在)
   ========================================================================== */
export const APP_VERSION = "swiss 1.7.3 · build 2026-08-03";

import TRIP from "../data/trip.json";
import NAVSTEP from "../data/navstep.json";
import GUIDE from "../data/guide.json";
import SIGHTS from "../data/sights.json";
import BK_ZONES from "../data/bk_zones.json";
import PLACES from "../data/places.json";
import HELPDATA from "../data/help.json";
import HIGHLIGHT from "../data/highlight.json";
import S from "../data/styles.json";
import EXTRAS from "../data/extras_v1.json";
import Z3 from "../data/tickets_embedded.js";
import GATE_PHOTO from "../data/gate_photo.js";
import DAY_THEME from "../data/day_theme.json";
import TICKET_LINKS from "../data/ticket_links.json";
import SHOP from "../data/shop.json";
import DEPART from "../data/depart.json";
import FINE from "../data/fine.json";

const RISK3 = EXTRAS.RISK3;
const WCRULE = EXTRAS.WCRULE;
const DOCS = EXTRAS.DOCS;
const PL_TXT = EXTRAS.PL_TXT;
const PL_TXT_AE = { 1: "$ 約AED40-70", 2: "$$ 約AED70-130", 3: "$$$ 約AED130-220", 4: "$$$$ AED220+" };

/* ---------- NAVSTEP 配對:行程項目文字 → 逐步指令(取最長 key) ---------- */
const NAV_KEYS = Object.keys(NAVSTEP).sort((a, b) => b.length - a.length);
const HL_KEYS = Object.keys(HIGHLIGHT).sort((a, b) => b.length - a.length);

/* ---------- 日期工具(v3.12 樣式) ---------- */
const WD = ["日", "一", "二", "三", "四", "五", "六"];
export const fmtDW = d => { const t = new Date(d + "T12:00:00"); return (t.getMonth() + 1) + "/" + t.getDate() + "(" + WD[t.getDay()] + ")"; };
const tzTodayStr = () => new Intl.DateTimeFormat("sv-SE", { timeZone: TRIP.tz }).format(new Date());
export const isToday = d => d === tzTodayStr();
function stepFor(text) {
  if (!text) return null;
  const k = NAV_KEYS.find(k => text.includes(k));
  return k ? { key: k, steps: NAVSTEP[k].split("→") } : null;
}

/* ---------- 逐步指令:就地展開(1.7.3)
   原本點「怎麼走?」會跳出蓋住整個畫面的彈窗,一次只能看一則,
   看完要關掉才能看下一則,也看不到它在當日流程中的前後脈絡。
   改為在該列底下直接展開,可同時開多則對照(v3.12 的做法),
   但保留新版的「編號 + 點一下打勾」優點。 ---------- */
function StepInline({ st }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState({});
  return (
    <>
      <button onClick={() => setOpen(!open)}
        style={{ ...S.chipBtn, border: "none", cursor: "pointer", marginLeft: 6, background: open ? "#0F2340" : "#1F3864" }}>
        {open ? "✕ 收起" : "🧭怎麼走?"}
      </button>
      {open && (
        <div style={{ marginTop: 6, background: "#F7F9FC", borderLeft: "3px solid #1F3864", borderRadius: 8, padding: "8px 10px" }}>
          {st.steps.map((s, i) => (
            <div key={i} onClick={() => setDone(d => ({ ...d, [i]: !d[i] }))}
              style={{ display: "flex", gap: 8, padding: "6px 2px", borderBottom: i < st.steps.length - 1 ? "1px dashed #E1E8F0" : "none", cursor: "pointer", opacity: done[i] ? 0.45 : 1 }}>
              <div style={{ minWidth: 22, height: 22, borderRadius: 11, background: done[i] ? "#2E7D32" : "#C8102E", color: "#fff", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>{done[i] ? "✓" : i + 1}</div>
              <div style={{ fontSize: 14, lineHeight: 1.55, textDecoration: done[i] ? "line-through" : "none" }}>{s}</div>
            </div>
          ))}
          <button onClick={() => setOpen(false)}
            style={{ marginTop: 7, border: "none", background: "#D5DDE6", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#333" }}>✕ 關閉導航</button>
        </div>
      )}
    </>
  );
}

/* ---------- 逐步指令面板(導航分頁的指令庫仍用彈窗) ---------- */
function StepSheet({ title, steps, onClose }) {
  const [done, setDone] = useState({});
  return (
    <div style={S.fullscreen} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "18px 16px", maxWidth: 480, width: "100%", maxHeight: "82vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1F3864", marginBottom: 10 }}>🧭 {title} — 逐步指令</div>
        {steps.map((s, i) => (
          <div key={i} onClick={() => setDone(d => ({ ...d, [i]: !d[i] }))}
            style={{ display: "flex", gap: 10, padding: "9px 4px", borderBottom: "1px dashed #E8EDF3", cursor: "pointer", opacity: done[i] ? 0.45 : 1 }}>
            <div style={{ minWidth: 26, height: 26, borderRadius: 13, background: done[i] ? "#2E7D32" : "#C8102E", color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{done[i] ? "✓" : i + 1}</div>
            <div style={{ fontSize: 15, lineHeight: 1.55, textDecoration: done[i] ? "line-through" : "none" }}>{s}</div>
          </div>
        ))}
        <button onClick={onClose} style={{ ...S.primaryBtn, width: "100%", marginTop: 12 }}>關閉(點步驟可打勾)</button>
      </div>
    </div>
  );
}

/* ---------- 行程(v3.12 對齊:左右滑動換日+每日主題色+今天標示) ---------- */
function Itinerary({ dayIdx, setDayIdx }) {
  const day = TRIP.days[dayIdx];
  const g = GUIDE[dayIdx];
  const sights = SIGHTS[dayIdx];
  const theme = DAY_THEME[dayIdx] || DAY_THEME[0];
  const [showGuide, setShowGuide] = useState(false);
  const [showSights, setShowSights] = useState(false);
  const [dir, setDir] = useState("right");
  const [toast, setToast] = useState("");
  const touch = useRef(null);
  const goto = (idx, d2) => {
    if (idx < 0 || idx > TRIP.days.length - 1) return;
    setDir(d2); setDayIdx(idx); setShowGuide(false); setShowSights(false);
    setToast((d2 === "right" ? "→ " : "← ") + fmtDW(TRIP.days[idx].d));
    setTimeout(() => setToast(""), 800);
  };
  const onTS = e => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTE = e => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x, dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goto(dayIdx + 1, "right"); else goto(dayIdx - 1, "left");
    }
  };
  return (
    <div key={dayIdx} onTouchStart={onTS} onTouchEnd={onTE}
      style={{ background: theme.bg, margin: "-12px -12px -90px", padding: "12px 12px 90px", minHeight: "calc(100vh - 190px)", animation: (dir === "left" ? "slideInLeft" : "slideIn") + " 0.4s ease-out" }}>
      {toast && <div style={{ position: "fixed", top: "45%", left: "50%", transform: "translateX(-50%)", background: "rgba(20,35,70,0.9)", color: "#fff", padding: "8px 18px", borderRadius: 20, fontSize: 16, fontWeight: 800, zIndex: 60, fontVariantNumeric: "tabular-nums" }}>{toast}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: theme.accent }}>{theme.tag}</div>
        <div style={{ fontSize: 11, color: "#8A97A6" }}>← 左右滑動換日 →</div>
      </div>
      <div style={S.dayNav}>
        <button style={S.arrowBtn} disabled={dayIdx === 0} onClick={() => goto(dayIdx - 1, "left")}>◀ {dayIdx > 0 ? fmtDW(TRIP.days[dayIdx - 1].d) : "前一天"}</button>
        <button style={{ ...S.todayBtn, background: theme.accent }} onClick={() => goto(todayIdx(), "right")}>{fmtDW(day.d)}{isToday(day.d) ? "(今天)" : ""}</button>
        <button style={S.arrowBtn} disabled={dayIdx === TRIP.days.length - 1} onClick={() => goto(dayIdx + 1, "right")}>{dayIdx < TRIP.days.length - 1 ? fmtDW(TRIP.days[dayIdx + 1].d) : "後一天"} ▶</button>
      </div>
      {!isToday(day.d) && todayIdx() !== dayIdx && <button onClick={() => goto(todayIdx(), "right")} style={{ width: "100%", border: "none", background: "#FFF3CD", color: "#7A5C00", borderRadius: 8, padding: "8px", fontSize: 13, fontWeight: 700, marginBottom: 8, cursor: "pointer" }}>你看的是 {fmtDW(day.d)} — 點此回到今天({fmtDW(TRIP.days[todayIdx()].d)})</button>}
      <div style={S.card}>
        <div style={S.dayTitle}>{day.title}</div>
        <div style={S.hotel}>🏨 {day.hotel}</div>
        {day.warn && <div style={S.warnBox}>{day.warn}</div>}
        {day.webcam && <a href={day.webcam} target="_blank" rel="noreferrer" style={S.webcamLink}>🌤️ 開啟山頂即時攝影機(上山前必看)</a>}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <tbody>
            {day.plan.map(([t, a, pk], i) => {
              const st = stepFor(a);
              return (
                <tr key={i} style={{ borderBottom: "1px solid #E8EDF3" }}>
                  <td style={S.timeCell}>{t}</td>
                  <td style={S.planCell}>
                    {a}
                    {st && <StepInline st={st} />}
                    {(() => {
                      // v1.7.2:還原 v3.12 做法——顯示「全部」命中的亮點(原本 find 只取第一個,
                      // 例如 8/7 Dubai Mall 會漏掉「世界最大音樂噴泉」),並改回黃色藥丸標籤
                      // (原本紅色純文字在整列文字裡不夠顯眼,與行程內文混在一起)。
                      const hits = [...new Set(HL_KEYS.filter(k => a.includes(k)).map(k => HIGHLIGHT[k]))];
                      return hits.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                          {hits.map((h, j) => (
                            <span key={j} style={{ fontSize: 11.5, background: "#FFF8E5", color: "#8A6D1F", borderRadius: 6, padding: "2px 7px", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    {pk && <PlaceChip id={pk} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {day.eats?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>🍽️ 今日餐廳(實查星等,點按導航/看評論)</div>
            {day.eats.map(id => <PlaceChip key={id} id={id} />)}
          </div>
        )}
        {day.nav?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>📍 今日路點快速導航</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {day.nav.map((w, i) => (
                <a key={i} href={"https://www.google.com/maps/dir/?api=1&destination=" + w.lat + "," + w.lon + "&travelmode=walking"}
                  target="_blank" rel="noreferrer"
                  style={{ background: "#E7F0FA", color: "#1F3864", borderRadius: 16, padding: "6px 12px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  🧭 {w.name}
                </a>
              ))}
            </div>
          </div>
        )}
        {sights?.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setShowSights(!showSights)}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: showSights ? "#1F3864" : "#E7F0FA", color: showSights ? "#fff" : "#1F3864", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              🏞️ 今日景點導覽 {showSights ? "▲收起" : "▼展開(" + sights.length + "個景點:典故+看點)"}
            </button>
            {showSights && sights.map((sg, i) => {
              const hl = Object.keys(HIGHLIGHT).find(h => sg.n.includes(h));
              return (
                <div key={i} style={{ border: "1px solid #D5DDE6", borderRadius: 8, marginTop: 6, overflow: "hidden", background: "#FBFDFF" }}>
                  {sg.img && <img src={sg.img} alt={sg.n} loading="lazy" style={{ width: "100%", height: 150, objectFit: "cover", background: "#E8EDF3" }} />}
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#1F3864" }}>{sg.n}</div>
                    {hl && <div style={{ fontSize: 12.5, color: "#C8102E", fontWeight: 700, marginTop: 2 }}>{HIGHLIGHT[hl]}</div>}
                    <div style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 5 }}>{sg.intro}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {sg.wiki && <a href={sg.wiki} target="_blank" rel="noreferrer" style={{ ...S.chipBtn, background: "#1F3864" }}>📖 維基</a>}
                      {sg.q && <a href={"https://www.google.com/search?q=" + encodeURIComponent(sg.q)} target="_blank" rel="noreferrer" style={S.chipBtn}>🔍 搜尋</a>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {g && (
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setShowGuide(!showGuide)}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: showGuide ? "#1F3864" : "#E7F0FA", color: showGuide ? "#fff" : "#1F3864", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
              🛡️ 今日防呆指南 {showGuide ? "▲收起" : "▼展開(交通/餐食備選/天氣備案)"}
            </button>
            {showGuide && (
              <div style={{ border: "1px solid #D5DDE6", borderRadius: 8, padding: 12, marginTop: 6, background: "#FBFDFF" }}>
                {g.transit && (<div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>🚉 交通防呆</div>
                  {g.transit.map((t, i) => (<div key={i} style={{ fontSize: 13.5, lineHeight: 1.6, padding: "3px 0", borderBottom: "1px dashed #E8EDF3", color: t.indexOf("⚠️") === 0 ? "#C8102E" : "#333" }}>• {t}</div>))}
                </div>)}
                {g.foodBak && (<div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#2E7D32" }}>🍽️ 餐食備選</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{g.foodBak}</div>
                </div>)}
                {g.wx && (<div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#7A5C00" }}>🌧️ 天氣不佳改案</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, background: "#FFF8E5", padding: "6px 8px", borderRadius: 6 }}>{g.wx}</div>
                </div>)}
                {g.wc && (<div style={{ fontSize: 12.5, color: "#5A6B7E" }}>🚻 {g.wc}</div>)}
              </div>
            )}
          </div>
        )}
        {day.tickets?.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#5A6B7E" }}>
            🎫 今日票券:{day.tickets.map(t => (TRIP.ticketMeta[t] || { name: t }).name).join("、")}(至票券頁出示)
          </div>
        )}
      </div>
    </div>
  );
}


const gNav = (p) => "https://www.google.com/maps/dir/?api=1&destination=" + p.lat + "," + p.lon + "&travelmode=walking";
const gPage = (p) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.n) + "&query_place_id=" + p.pid;
const Stars = ({r}) => <span style={{color:"#E8A400", fontWeight:800}}>★{r.toFixed(1)}</span>;
function PlaceChip({ id }) {
  const p = PLACES[id];
  if (!p) return null;
  return (
    <div style={{border:"1px solid #E0E7EF", borderRadius:8, padding:"8px 10px", marginTop:6, background:"#FAFCFF"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:4}}>
        <div style={{fontWeight:700, fontSize:14}}>{p.n} <Stars r={p.r}/> <span style={{color:"#8A97A6", fontSize:12}}>({p.ct.toLocaleString()}則)</span></div>
        <div style={{display:"flex", gap:6}}>
          <a href={gNav(p)} target="_blank" rel="noreferrer" style={SS.chipBtn}>🧭導航</a>
          <a href={gPage(p)} target="_blank" rel="noreferrer" style={{...SS.chipBtn, background:"#1F3864"}}>⭐評論</a>
        </div>
      </div>
      {p.note && <div style={{fontSize:12, color: p.note.indexOf("⚠️")===0 ? "#C8102E" : "#5A6B7E", marginTop:3}}>{p.note}</div>}
    </div>
  );
}
const SS = { chipBtn: { background:"#C8102E", color:"#fff", borderRadius:6, padding:"5px 10px", fontSize:12, fontWeight:700, textDecoration:"none", whiteSpace:"nowrap" } };





const IS_STANDALONE = typeof window !== "undefined" && !window.storage;
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (k) => { const v = localStorage.getItem("wang.swiss:"+k); if (v == null) throw new Error("nokey"); return { value: v }; },
    set: async (k, v) => { localStorage.setItem("wang.swiss:"+k, v); return {}; },
    delete: async (k) => { localStorage.removeItem("wang.swiss:"+k); return {}; },
    list: async () => ({ keys: [] }),
  };
}

/* ---------- utilities ---------- */
const dist = (a, b) => { // haversine meters
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const bearing = (a, b) => {
  const r = Math.PI/180;
  const y = Math.sin((b.lon-a.lon)*r)*Math.cos(b.lat*r);
  const x = Math.cos(a.lat*r)*Math.sin(b.lat*r)-Math.sin(a.lat*r)*Math.cos(b.lat*r)*Math.cos((b.lon-a.lon)*r);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
};
const fmtDist = (m) => m > 1000 ? (m/1000).toFixed(1)+" km" : Math.round(m)+" m";
const compass = (deg) => "北北東東東南南南西西西北北"[Math.round(deg/45)%8] ? ["北","東北","東","東南","南","西南","西","西北"][Math.round(deg/45)%8] : "北";

function todayIdx() {
  const now = new Intl.DateTimeFormat("sv-SE", { timeZone: TRIP.tz }).format(new Date());
  const i = TRIP.days.findIndex(d => d.d === now);
  return i >= 0 ? i : 0;
}

/* ---------- shared storage helpers ---------- */
async function loadTickets() {
  try { const r = await window.storage.get("tickets:index", true); return JSON.parse(r.value); }
  catch { return []; }
}

/* ========================================================================== */
function shareMyLocation() {
  if (!navigator.geolocation) { alert("此裝置不支援定位"); return; }
  navigator.geolocation.getCurrentPosition(async p => {
    const url = "https://www.google.com/maps?q=" + p.coords.latitude + "," + p.coords.longitude;
    if (navigator.share) { try { await navigator.share({ title: "我的位置", url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); alert("位置連結已複製,貼到LINE"); } catch { prompt("複製:", url); } }
  }, () => alert("定位失敗:請允許位置權限"), { enableHighAccuracy: true, timeout: 8000 });
}

export default function TravelHub() {
  const [tab, setTab] = useState("today");
  const [dayIdx, setDayIdx] = useState(todayIdx());
  const day = TRIP.days[dayIdx];
  const inLine = typeof navigator !== "undefined" && /Line\//i.test(navigator.userAgent);

  return (
    <div style={S.app}>
      <header style={{ ...S.header, paddingTop: "calc(14px + env(safe-area-inset-top))" }}>
        <div style={S.headerTitle}>🇨🇭 {TRIP.name}</div>
        <div style={{ position: "absolute", right: 12, top: "calc(12px + env(safe-area-inset-top))", fontSize: 10.5, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{APP_VERSION.split(" · ")[0]}</div>
        <div style={S.headerSub}>Day {dayIdx+1}・{fmtDW(day.d)}{isToday(day.d) ? "・今天" : ""}・{day.city}</div>
      </header>
      {inLine && (
        <div style={S.lineBanner}>
          ⚠️ 您正用LINE內建瀏覽器開啟——定位、票券儲存可能失效。請點右下角「⋯」→「用預設瀏覽器開啟(Safari)」,再加入主畫面。
        </div>
      )}
      <div style={S.quickBar}>
        {[["tickets","🎫","火車票"],["nav","🧭","導航"],["loc","📍","我在哪"],["lost","🆘","走散"]].map(([k,ic,lb])=>(
          <button key={k} style={S.quickBtn} onClick={()=>{
            if(k==="loc"){ shareMyLocation(); }
            else if(k==="lost"){ setTab("more"); setTimeout(()=>{ const ev=new CustomEvent("gotoLost"); window.dispatchEvent(ev); },50); }
            else { setTab(k); }
          }}>
            <div style={{fontSize:22}}>{ic}</div>
            <div style={{fontSize:12,fontWeight:800,marginTop:2}}>{lb}</div>
          </button>
        ))}
      </div>
      <main style={S.main}>
        {tab==="today" && <Itinerary dayIdx={dayIdx} setDayIdx={setDayIdx} />}
        {tab==="tickets" && <Tickets />}
        {tab==="wx" && <Wx day={day} dayIdx={dayIdx} />}
        {tab==="shop" && <Shop dayIdx={dayIdx} />}
        {tab==="nav" && <Navigate day={day} />}
        {tab==="eat" && <EatHub dayIdx={dayIdx} />}
        {tab==="phrases" && <Phrases />}
        {tab==="more" && <More dayIdx={dayIdx} />}
      </main>
      <nav style={{ ...S.nav, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {[["today","🗓️","行程"],["nav","🧭","導航"],["eat","🍽️","餐廳"],["tickets","🎫","票券"],["wx","🌡","天氣"],["shop","🎁","購物"],["phrases","🗣️","會話"],["more","☰","更多"]].map(([k,ic,lb]) => (
          <button key={k} onClick={()=>setTab(k)} style={{...S.navBtn, ...(tab===k?S.navActive:{})}}>
            <div style={{fontSize:18}}>{ic}</div><div style={{fontSize:10}}>{lb}</div>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ---------- 行程 ---------- */

function Tickets() {
  const [items, setItems] = useState([]);
  const [full, setFull] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const refresh = useCallback(async () => {
    const idx = await loadTickets();
    const loaded = [];
    for (const it of idx) {
      try { const r = await window.storage.get("tickets:img:"+it.id, true); loaded.push({...it, img: r.value}); }
      catch {}
    }
    setItems(loaded);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const addPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const c = document.createElement("canvas");
        const max = 1200, sc = Math.min(1, max/Math.max(img.width, img.height));
        c.width = img.width*sc; c.height = img.height*sc;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        const data = c.toDataURL("image/jpeg", 0.85);
        const name = prompt("票券名稱?(例:少女峰QR-遠志)") || "未命名票券";
        const id = Date.now().toString(36);
        try {
          await window.storage.set("tickets:img:"+id, data, true);
          const idx = await loadTickets();
          idx.push({ id, name, at: new Date().toISOString().slice(5,10) });
          await window.storage.set("tickets:index", JSON.stringify(idx), true);
          await refresh();
        } catch(err) { alert("儲存失敗,照片可能過大,請截圖後再試"); }
        setBusy(false);
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
    e.target.value = "";
  };

  const remove = async (id) => {
    if (!confirm("刪除此票券照片?")) return;
    try {
      await window.storage.delete("tickets:img:"+id, true);
      const idx = (await loadTickets()).filter(x=>x.id!==id);
      await window.storage.set("tickets:index", JSON.stringify(idx), true);
      await refresh();
    } catch(e){ console.error(e); }
  };

  if (full) return (
    <div style={S.fullscreen} onClick={()=>setFull(null)}>
      <img src={full} alt="ticket" style={{maxWidth:"100%", maxHeight:"85vh", background:"#fff", padding:12, borderRadius:8}} />
      <div style={{color:"#fff", marginTop:10, fontSize:14}}>點任意處返回・已調至最大亮度出示</div>
    </div>
  );

  return (
    <div>
      <EmbeddedTickets onOpen={setFull} />
      <TicketLinks />
      <OldUploads onOpen={setFull} />
      <div style={S.card}>
        <div style={S.secTitle}>🎫 自行上傳的票券</div>
        <div style={{fontSize:13, color:"#5A6B7E", marginBottom:10}}>
          拍下或截圖每張票的QR碼上傳{IS_STANDALONE ? "(存在自己手機裡,更私密;每人上傳自己需要的票)" : ",全家人都能開啟出示"}。⚠️正式閘門若拒收照片,備援:官方App或PDF原檔。
        </div>
        <button style={S.primaryBtn} disabled={busy} onClick={()=>fileRef.current.click()}>
          {busy ? "處理中..." : "＋ 新增票券照片"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={addPhoto} />
      </div>
      <div style={S.ticketGrid}>
        {items.map(it => (
          <div key={it.id} style={S.ticketCard}>
            <img src={it.img} alt={it.name} style={S.ticketImg} onClick={()=>setFull(it.img)} />
            <div style={{fontSize:13, fontWeight:600, marginTop:4}}>{it.name}</div>
            <button style={S.delBtn} onClick={()=>remove(it.id)}>刪除</button>
          </div>
        ))}
        {items.length===0 && <div style={{color:"#8A97A6", fontSize:14, padding:20}}>尚無自行上傳的票券。舊版存過的照片→「更多→工具→🔁舊版資料帶入」一鍵複製。</div>}
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>📋 訂位資訊速查</div>
        {Object.values(TRIP.ticketMeta).map((t,i)=>(
          <div key={i} style={{padding:"6px 0", borderBottom:"1px solid #E8EDF3", fontSize:14}}>
            <b>{t.name}</b> — {t.note}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 公告留言板 ---------- */

function Navigate({ day }) {
  const [pos, setPos] = useState(null);
  const [target, setTarget] = useState(null);
  const [trend, setTrend] = useState([]); // recent distances for wrong-way detection
  const [err, setErr] = useState(null);
  const watchRef = useRef(null);

  const waypoints = day.nav || [];

  useEffect(() => {
    if (!navigator.geolocation) { setErr("此裝置不支援定位"); return; }
    watchRef.current = navigator.geolocation.watchPosition(
      p => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      e => setErr("定位失敗:請允許位置權限(" + e.message + ")"),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => watchRef.current && navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  useEffect(() => {
    if (!pos || !target) return;
    const d = dist(pos, target);
    setTrend(t => [...t.slice(-5), d]);
  }, [pos, target]);

  const d = pos && target ? dist(pos, target) : null;
  const brg = pos && target ? bearing(pos, target) : null;
  const wrongWay = trend.length >= 4 && trend[trend.length-1] > trend[0] + 30; // 越走越遠30m+

  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>🧭 今日路點(點選設為目標)</div>
        {waypoints.length===0 && <div style={{color:"#8A97A6", fontSize:14}}>今日無預設路點(移動少或全靠訂位班次)</div>}
        {waypoints.map((w,i)=>(
          <div key={i} style={{...S.wpCard, ...(target?.name===w.name?S.wpActive:{})}}>
            <div onClick={()=>{setTarget(w); setTrend([]);}}>
              <div style={{fontWeight:700, fontSize:15}}>{i+1}. {w.name}</div>
              <div style={{fontSize:13, color:"#5A6B7E"}}>{w.hint}</div>
              {pos && <div style={{fontSize:12, color:"#8A97A6"}}>直線 {fmtDist(dist(pos,w))}</div>}
            </div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${w.lat},${w.lon}&travelmode=walking`}
              target="_blank" rel="noreferrer" style={{...S.chipBtn, marginTop:6, display:"inline-block"}}>🧭 Google Maps導航</a>
          </div>
        ))}
      </div>
      {target && (
        <div style={{...S.card, textAlign:"center"}}>
          <div style={{fontSize:14, color:"#5A6B7E"}}>目標:{target.name}</div>
          {pos ? (<>
            <div style={{fontSize:42, fontWeight:800, color:"#C8102E", margin:"6px 0"}}>{fmtDist(d)}</div>
            <div style={{fontSize:16}}>方向:{compass(brg)}({Math.round(brg)}°)</div>
            <div style={{fontSize:12, color:"#8A97A6"}}>定位精度±{Math.round(pos.acc)}m・直線距離,實際路程依道路</div>
            {wrongWay && <div style={S.wrongWay}>⚠️ 越走越遠了!停下確認方向或開Google Maps</div>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lon}&travelmode=walking`}
              target="_blank" rel="noreferrer" style={S.mapsBtn}>開Google Maps步行導航</a>
          </>) : <div style={{color:"#C8102E", padding:10}}>{err || "等待定位..."}</div>}
        </div>
      )}
      <div style={S.card}>
        <div style={S.secTitle}>📍 我在哪?</div>
        <div style={{display:"flex", gap:8}}>
          <a href="https://www.google.com/maps" target="_blank" rel="noreferrer" style={{...S.mapsBtn, flex:1, textAlign:"center", marginTop:0}}>開地圖看位置</a>
          <button style={{...S.primaryBtn, flex:1}} onClick={async()=>{
            if(!pos){ alert("等待定位中"); return; }
            const url = "https://www.google.com/maps?q=" + pos.lat + "," + pos.lon;
            if(navigator.share){ try{ await navigator.share({title:"我的位置", url}); }catch(e){} }
            else { try{ await navigator.clipboard.writeText(url); alert("位置連結已複製,貼到LINE"); }catch(e){ prompt("複製:",url); } }
          }}>分享位置到LINE</button>
        </div>
      </div>
      <NavStepsLibrary day={day} />
      <div style={{...S.card, fontSize:13, color:"#5A6B7E"}}>
        💡 用法:出站後點目標→跟著方向與距離走→距離變小=走對。轉乘趕時間直接開Google Maps。山區隧道內無定位屬正常。
      </div>
    </div>
  );
}


/* ---------- 備選餐廳頁:即時距離+篩選 ---------- */
function Backups({ dayIdx }) {
  const defZone = BK_ZONES.findIndex(z => z.days.includes(dayIdx));
  const [zi, setZi] = useState(defZone >= 0 ? defZone : 0);
  const [pos, setPos] = useState(null);
  const [f4, setF4] = useState(false);   // ★4.4+
  const [f500, setF500] = useState(false); // 500+評論
  const [fCheap, setFCheap] = useState(false); // $$以下
  const watchRef = useRef(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    watchRef.current = navigator.geolocation.watchPosition(
      p => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
    return () => watchRef.current && navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  const zone = BK_ZONES[zi];
  const isDXB = zone.z.indexOf("杜拜") === 0;
  let list = zone.list.map(p => ({...p, d: pos ? dist(pos, p) : dist({lat:zone.lat,lon:zone.lon}, p)}));
  if (f4) list = list.filter(p => p.r >= 4.4);
  if (f500) list = list.filter(p => p.ct >= 500);
  if (fCheap) list = list.filter(p => p.pl <= 2);
  list.sort((a,b) => a.d - b.d);

  const Toggle = ({on, set, label}) => (
    <button onClick={()=>set(!on)} style={{padding:"6px 10px", borderRadius:14, fontSize:12.5, fontWeight:700, cursor:"pointer",
      border: on ? "none" : "1px solid #D5DDE6", background: on ? "#1F3864" : "#fff", color: on ? "#fff" : "#5A6B7E"}}>{label}</button>
  );

  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>🍽️ 備選餐廳(路線上實查@7/20)</div>
        <select value={zi} onChange={e=>setZi(+e.target.value)}
          style={{...S.select, width:"100%", marginBottom:8, fontSize:15, fontWeight:700}}>
          {BK_ZONES.map((z,i)=><option key={i} value={i}>{z.z}{z.days.includes(dayIdx)?"(今日)":""}</option>)}
        </select>
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          <Toggle on={f4} set={setF4} label="★4.4以上" />
          <Toggle on={f500} set={setF500} label="500+評論" />
          <Toggle on={fCheap} set={setFCheap} label="$$以下" />
        </div>
        <div style={{fontSize:12, color:"#8A97A6", marginTop:6}}>
          {pos ? "📍依你目前位置排序(直線距離,步行約80m/分)" : "📍未定位:依市中心排序;允許位置權限可看即時距離"}
        </div>
      </div>
      {list.map((p,i)=>{
        const walkMin = Math.round(p.d/80);
        return (
        <div key={i} style={{...S.card, padding:"11px 13px", marginBottom:8}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:6}}>
            <div style={{fontWeight:800, fontSize:15.5}}>{p.n}</div>
            <div style={{fontSize:14, fontWeight:800, color:"#C8102E", whiteSpace:"nowrap"}}>{fmtDist(p.d)}<span style={{fontSize:11.5, color:"#8A97A6", fontWeight:400}}> 步行~{walkMin}分</span></div>
          </div>
          <div style={{fontSize:13, marginTop:3}}>
            <span style={{color:"#E8A400", fontWeight:800}}>★{p.r}</span>
            <span style={{color:"#8A97A6"}}> ({p.ct.toLocaleString()}則)</span>
            <span style={{marginLeft:8, color:"#2E7D32", fontWeight:700}}>{(isDXB?PL_TXT_AE:PL_TXT)[p.pl]}/人</span>
          </div>
          {p.note && <div style={{fontSize:12.5, color: p.note.indexOf("⚠️")>=0 ? "#C8102E" : "#5A6B7E", marginTop:3}}>{p.note}</div>}
          <div style={{display:"flex", gap:8, marginTop:7}}>
            <a href={"https://www.google.com/maps/dir/?api=1&destination="+p.lat+","+p.lon+(p.pid?"&destination_place_id="+p.pid:"")+"&travelmode=walking"}
              target="_blank" rel="noreferrer" style={{...S.chipBtn, flex:1, textAlign:"center", padding:"8px 0"}}>🧭 導航</a>
            <a href={p.pid?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.n)+"&query_place_id="+p.pid:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.n+" "+zone.z)}
              target="_blank" rel="noreferrer" style={{...S.chipBtn, flex:1, textAlign:"center", padding:"8px 0", background:"#1F3864"}}>💬 評論/營業時間</a>
          </div>
        </div>);
      })}
      {list.length===0 && <div style={{color:"#8A97A6", textAlign:"center", padding:20, fontSize:14}}>沒有符合篩選的餐廳,放寬條件試試</div>}
      <div style={{...S.card, fontSize:12.5, color:"#5A6B7E"}}>
        💡 距離為直線,實際路程略遠;人均為主菜+飲料估算;⭐星等為出發前查核值,點「評論」看最新。臨時想換餐廳:開篩選「★4.4以上」+看距離,3秒決定。
      </div>
    </div>
  );
}

/* ---------- 外語會話對照 ---------- */

function Lost() {
  return (
    <div>
      <div style={{...S.card, background:"#FFF3F3", border:"2px solid #C8102E"}}>
        <div style={{...S.secTitle, color:"#C8102E"}}>🆘 走散SOP(全家背起來)</div>
        <div style={{fontSize:16, fontWeight:700, lineHeight:1.8}}>{TRIP.lost.rule}</div>
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>📍 各城市固定集合點</div>
        {TRIP.lost.points.map(([c,p],i)=>(
          <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #E8EDF3", fontSize:15}}>
            <b>{c}</b><span>{p}</span>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>📞 緊急電話(點擊撥打)</div>
        {TRIP.lost.emergency.map(([n,t],i)=>(
          <a key={i} href={"tel:"+t.replace(/\s/g,"")} style={S.callRow}>
            <span>{n}</span><b style={{color:"#C8102E"}}>{t}</b>
          </a>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>📱 家人即時位置</div>
        <div style={{fontSize:14, color:"#5A6B7E", marginBottom:8}}>
          使用手機內建功能最省電可靠(出發前設定完成):
        </div>
        <div style={{fontSize:14, lineHeight:1.8}}>
          iPhone:「尋找」App → 家人共享位置<br/>
          Android:Google Maps → 位置資訊分享<br/>
          走散時先開這個,再照上方SOP。
        </div>
      </div>
    </div>
  );
}


/* ---------- 更多:證件/走散/使用說明 ---------- */
function More({ dayIdx }) {
  const [sub, setSub] = useState("depart");
  useEffect(()=>{
    const h = ()=> setSub("lost");
    window.addEventListener("gotoLost", h);
    return ()=> window.removeEventListener("gotoLost", h);
  }, []);
  return (
    <div>
      <div style={{display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:2}}>
        {[["depart","🛫離境"],["docs","📁證件"],["tools","🧰工具"],["sos","🛡️應變"],["lost","🆘走散"],["help","📱說明"]].map(([k,lb])=>(
          <button key={k} onClick={()=>setSub(k)}
            style={{flex:"1 0 auto", whiteSpace:"nowrap", padding:"9px 12px", borderRadius:8, border:"1px solid #D5DDE6", fontSize:13, fontWeight:700, cursor:"pointer",
              background: sub===k ? "#1F3864" : "#fff", color: sub===k ? "#fff" : "#5A6B7E"}}>{lb}</button>
        ))}
      </div>
      {sub==="depart" && <Depart />}
      {sub==="tools" && <Tools />}
      {sub==="docs" && <Docs />}
      {sub==="sos" && <Sos />}
      {sub==="lost" && <Lost />}
      {sub==="help" && <Help />}
    </div>
  );
}

/* ---------- 證件索引(本體在Drive,App只放索引與連結) ---------- */

function Docs() {
  const open = (url) => url ? window.open(url, "_blank") : alert("連結尚未設定:請遠志把Drive檔案連結填入App後重新發布");
  return (
    <div>
      <div style={{...S.card, background:"#EAF3EA", fontSize:13, color:"#2E5A2E"}}>
        🔐 本頁只放「索引」——證件本體存在Google Drive「00瑞士」(僅家人帳號可開)。點連結需登入自己的Google帳號,這是保護不是麻煩。出發前每人到Drive把重要檔案「設為離線可用」。
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>🛂 護照效期速查</div>
        {DOCS.passports.map((p,i)=>(
          <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #E8EDF3", fontSize:15}}>
            <b>{p.who}</b><span>{p.exp}</span>
          </div>
        ))}
        <div style={{...S.warnBox, marginTop:10}}>
          遺失SOP:①就近警局報案取報案單 ②聯絡駐瑞士代表處急難 +41 79 345 2919 ③申請入國證明書 ④影本在Drive可佐證身分
        </div>
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>📁 檔案一鍵開啟</div>
        {DOCS.driveRoot ? (
          <button style={{...S.primaryBtn, width:"100%", marginBottom:8}} onClick={()=>open(DOCS.driveRoot)}>開啟「00瑞士」總資料夾</button>
        ) : (
          <div style={{fontSize:13, color:"#8A97A6", marginBottom:8}}>（總資料夾連結待填入）</div>
        )}
        {DOCS.files.map((f,i)=>(
          <div key={i} onClick={()=>open(f.url)} style={{...S.wpCard, cursor:"pointer"}}>
            <div style={{fontWeight:700, fontSize:15}}>{f.name}</div>
            <div style={{fontSize:13, color:"#5A6B7E"}}>{f.note}{!f.url && "・(連結待填)"}</div>
          </div>
        ))}
      </div>
      <div style={{...S.card, fontSize:13, color:"#5A6B7E"}}>
        💳 支付備忘:主卡尾號0612。🔐 資安設計:本App為公開網頁,機票PNR與票號皆已遮罩(✱)——完整代號在紙本文件與Drive確認信內,線上報到時對照使用。完整卡號、護照號碼永不放進任何App。
      </div>
    </div>
  );
}


/* ---------- 應變:天氣SOP/三大風險/訂票時間軸/廁所口訣 ---------- */
function Sos() {
  const timeline = [
    ["7/22 23:50","⏰去程線上報到開放(兩組PNR都要辦,選相鄰座)"],
    ["7/22-23","取消聖莫里茲未付款重複訂單/處理Grindellodge/Ruby Mimi付款"],
    ["7/23","致電策馬特公寓:8/2早退房+早餐盒;哈里發塔訂時段"],
    ["7/28晚","二次確認7/29行李快遞預約成立"],
    ["8/3","聖莫里茲櫃台約8/4行李接駁到站"],
    ["8/4 22:00","⏰回程線上報到開放(蘇黎世時間,兩組PNR)"],
    ["8/7晚","杜拜櫃台:①約05:15大型車拿確認單②早餐盒③Express Checkout"],
  ];
  return (
    <div>
      <div style={{...S.card, background:"#FFF3F3", border:"2px solid #C8102E"}}>
        <div style={{...S.secTitle, color:"#C8102E"}}>⚠️ 全程三大風險轉乘(背起來)</div>
        {RISK3.map((r,i)=>(<div key={i} style={{fontSize:14.5, lineHeight:1.7, padding:"4px 0"}}>{r}</div>))}
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>🌤️ 上山前一晚2分鐘SOP</div>
        <div style={{fontSize:14, lineHeight:1.8}}>
          ①看山頂即時攝影機(行程頁有連結)——<b>比預報準</b>,白牆就別上<br/>
          ②MeteoSwiss App查山頂站小時預報:雲量&lt;50%+無雨=上;雷雨=改案<br/>
          ③半天雨→上下午對調;整天雨→用當日「防呆指南」的改案,別整天放棄
        </div>
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>🎫 旅途中提醒時間軸</div>
        {timeline.map(([t,a],i)=>(
          <div key={i} style={{display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid #E8EDF3"}}>
            <b style={{color:"#C8102E", fontSize:13.5, whiteSpace:"nowrap"}}>{t}</b>
            <span style={{fontSize:13.5}}>{a}</span>
          </div>
        ))}
      </div>
      <EmergencyCard />
      <div style={{...S.card, fontSize:13.5, color:"#5A6B7E"}}>{WCRULE}</div>
    </div>
  );
}

/* ---------- 使用說明:LINE分享/加主畫面/疑難排解 ---------- */


/* ---------- 天氣引擎(依 v3.12 還原:open-meteo 預報+去年同日) ---------- */
const WX_CITY = { 琉森: [47.0502, 8.3103], 因特拉肯: [46.6863, 7.8632], 格林德瓦: [46.6244, 8.0411], 策馬特: [46.0207, 7.7491], 聖莫里茲: [46.4908, 9.8355], 蘇黎世: [47.3769, 8.5417], 杜拜: [25.2048, 55.2708], 台北: [25.033, 121.5654] };
const WX_MT = {
  "2026-07-26": { name: "皮拉圖斯山頂 Pilatus", elev: 2132, lat: 46.979, lon: 8.2554 },
  "2026-07-28": { name: "少女峰 Jungfraujoch", elev: 3454, lat: 46.5474, lon: 7.9854 },
  "2026-07-29": { name: "First 山頂", elev: 2168, lat: 46.6592, lon: 8.0536 },
  "2026-08-01": { name: "Gornergrat(馬特洪觀景)", elev: 3089, lat: 45.9833, lon: 7.7833 },
  "2026-08-02": { name: "冰河列車沿線(Oberalp)", elev: 2044, lat: 46.6592, lon: 8.6714 },
};
const RESORT_CAMS = [["少女峰", "https://www.jungfrau.ch/en-gb/live/webcams/"], ["Gornergrat", "https://www.gornergrat.ch/en/pages/webcam.aspx"], ["冰川天堂", "https://www.matterhornparadise.ch/en/Live-Info/Webcams"], ["恩加丁/聖莫里茲", "https://www.engadin.ch/en/webcams/"]];
const wxCityOf = c => { for (const k of Object.keys(WX_CITY)) if (c.includes(k)) return k; return null; };
const wxIcon = c => c === 0 ? "☀️" : c <= 2 ? "🌤" : c === 3 ? "☁️" : c <= 48 ? "🌫" : c <= 67 ? "🌧" : c <= 77 ? "🌨" : c <= 82 ? "🌦" : "⛈";
const wxWear = (lo, hi, mt) => hi >= 30 ? "☀️ 炎熱:短袖+防曬+帽子+多喝水" + (mt ? "(山上另備薄外套)" : "") : hi >= 24 ? "🌤 溫暖:短袖為主,備薄長袖" : hi >= 18 ? "🍂 舒適:長袖或短袖+薄外套,早晚涼" : hi >= 12 ? "🧥 微涼:長袖+外套,建議洋蔥式穿搭" : hi >= 5 ? "🧣 冷:保暖外套+圍巾,洋蔥式必備" : "🧊 很冷:羽絨/厚外套+毛帽手套,注意保暖";
const fmtMD = d => (+d.slice(5, 7)) + "/" + (+d.slice(8, 10));
async function wxFetch(lat, lon, date) {
  const target = new Date(date + "T12:00:00");
  const diff = Math.floor((target - new Date()) / 86400000);
  if (diff >= -1 && diff <= 14) try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=auto&start_date=${date}&end_date=${date}`;
    const dd = (await (await fetch(u)).json()).daily;
    if (dd && dd.temperature_2m_max && dd.temperature_2m_max[0] != null)
      return { hi: Math.round(dd.temperature_2m_max[0]), lo: Math.round(dd.temperature_2m_min[0]), rain: dd.precipitation_probability_max ? dd.precipitation_probability_max[0] : null, code: dd.weathercode[0], kind: "forecast" };
  } catch {}
  try {
    const y = target.getFullYear(), ref = y - 1, rd = date.replace(String(y), String(ref));
    const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${rd}&end_date=${rd}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto`;
    const dd = (await (await fetch(u)).json()).daily;
    if (dd && dd.temperature_2m_max && dd.temperature_2m_max[0] != null)
      return { hi: Math.round(dd.temperature_2m_max[0]), lo: Math.round(dd.temperature_2m_min[0]), rain: null, precip: dd.precipitation_sum ? Math.round(dd.precipitation_sum[0]) : null, code: dd.weathercode[0], kind: "historical", refYear: ref };
  } catch {}
  return null;
}
function WxBadge({ w, date }) {
  if (!w) return null;
  const f = w.kind === "forecast";
  return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 10, marginTop: 2, background: f ? "#E8F5E9" : "#FFF3E0", color: f ? "#2E7D32" : "#E65100" }}>{f ? `🎯 ${fmtMD(date)} 真實預報` : `📊 ${w.refYear}年同日實際`}</span>;
}
function WxLine({ w }) {
  return <span>{wxIcon(w.code)} {w.lo}°~{w.hi}°C{w.rain != null && ` ・降雨${w.rain}%`}{w.precip != null && ` ・雨量${w.precip}mm`}</span>;
}
function Wx({ day, dayIdx }) {
  const g = GUIDE[dayIdx];
  const nextDay = TRIP.days[dayIdx + 1];
  const [cw, setCw] = useState(null); const [mw, setMw] = useState(null);
  const [nw, setNw] = useState(null); const [nmw, setNmw] = useState(null);
  const [mtx, setMtx] = useState(null); const [err, setErr] = useState(false);
  const [done, setDone] = useState(false); // 抓取流程已跑完(不論成功失敗)
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const c = wxCityOf(day.city.split("→").pop()) || wxCityOf(day.city);
        if (c) { const w = await wxFetch(WX_CITY[c][0], WX_CITY[c][1], day.d); if (live) setCw(w && { ...w, city: c }); }
        const m = WX_MT[day.d];
        if (m) { const w = await wxFetch(m.lat, m.lon, day.d); if (live) setMw(w && { ...w, ...m }); }
        if (nextDay) {
          const c2 = wxCityOf(nextDay.city.split("→").pop()) || wxCityOf(nextDay.city);
          if (c2) { const w = await wxFetch(WX_CITY[c2][0], WX_CITY[c2][1], nextDay.d); if (live) setNw(w && { ...w, city: c2 }); }
          const m2 = WX_MT[nextDay.d];
          if (m2) { const w = await wxFetch(m2.lat, m2.lon, nextDay.d); if (live) setNmw(w && { ...w, ...m2 }); }
        }
        const rows = [];
        for (const [dt, m3] of Object.entries(WX_MT)) {
          const w = await wxFetch(m3.lat, m3.lon, dt);
          rows.push({ dt, ...m3, w });
        }
        if (live) setMtx(rows);
        if (live) setDone(true);
      } catch { if (live) { setErr(true); setDone(true); } }
    })();
    return () => { live = false; };
  }, [day.d]);
  if (err) return <div style={{ ...S.card, fontSize: 13, color: "#8A97A6" }}>🌡 天氣載入失敗(可能沒網路),請看離線天氣SOP</div>;
  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>🌡 天氣與穿著</div>
        {cw ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{cw.city}:<WxLine w={cw} /></div>
            <WxBadge w={cw} date={day.d} />
            <div style={{ fontSize: 13.5, color: "#333", marginTop: 4 }}>{wxWear(cw.lo, cw.hi, false)}</div>
          </div>
        ) : done ? (
          <div style={{ fontSize: 13.5, color: "#7A5C00", background: "#FFF8E5", borderRadius: 8, padding: "9px 11px", lineHeight: 1.7 }}>
            🌡 <b>天氣取不到</b>(沒網路,多半在隧道、山區或飛機上)。<b style={{ color: "#C8102E" }}>請勿依此判斷穿著</b>——
            改看下方「上山前一晚 2 分鐘 SOP」;有訊號時回到這頁會自動重抓。
          </div>
        ) : <div style={{ fontSize: 13, color: "#8A97A6" }}>載入天氣中…(需網路;沒網路請看下方離線SOP)</div>}
        {mw && (
          <div style={{ background: "#EDF3FB", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1F3864" }}>⛰ 高山:{mw.name}({mw.elev}m)</div>
            <div style={{ fontSize: 14 }}><WxLine w={mw} /></div>
            <WxBadge w={mw} date={day.d} />
            <div style={{ fontSize: 13, marginTop: 3 }}>{wxWear(mw.lo, mw.hi, true)}</div>
          </div>
        )}
        {(nw || nmw) && (
          <div style={{ borderTop: "1px dashed #E8EDF3", paddingTop: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#5A6B7E" }}>明日{nextDay && "(" + fmtMD(nextDay.d) + " " + nextDay.title + ")"}</div>
            {nw && <div style={{ fontSize: 13.5 }}>{nw.city}:<WxLine w={nw} /></div>}
            {nmw && <div style={{ fontSize: 13.5 }}>⛰ {nmw.name}:<WxLine w={nmw} /></div>}
          </div>
        )}
      </div>
      {g?.wx && (
        <div style={{ ...S.card, background: "#FFF8E5" }}>
          <div style={{ ...S.secTitle, color: "#7A5C00" }}>🌧️ 今日天氣改案</div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>{g.wx}</div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.secTitle}>⛰ 高山日總覽(要不要對調,看這裡)</div>
        <div style={{ fontSize: 11.5, color: "#8A97A6", marginBottom: 6 }}>🟢真實預報(14天內)・🟠去年同日參考(超過14天)</div>
        {!mtx && <div style={{ fontSize: 13, color: "#8A97A6" }}>載入中…</div>}
        {mtx && mtx.every(r => !r.w) && (
          <div style={{ fontSize: 13, color: "#7A5C00", background: "#FFF8E5", borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
            目前沒網路,全部顯示「—」。有訊號時重開此頁即可比較各高山日。
          </div>
        )}
        {mtx && mtx.map(r => (
          <div key={r.dt} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderBottom: "1px solid #E8EDF3", fontSize: 13.5, background: r.dt === day.d ? "#FFF7F7" : "transparent" }}>
            <div><b style={{ color: "#C8102E", fontVariantNumeric: "tabular-nums" }}>{fmtMD(r.dt)}</b> {r.name}</div>
            <div style={{ whiteSpace: "nowrap" }}>{r.w ? <><span>{r.w.kind === "forecast" ? "🟢" : "🟠"}</span> <WxLine w={r.w} /></> : "—"}</div>
          </div>
        ))}
        <div style={{ fontSize: 12.5, color: "#5A6B7E", marginTop: 6 }}>💡 若某天特別差(降雨高/氣溫低),可跟行程表對調到天氣較好的那天,善用住宿期間彈性。</div>
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>🌤️ 上山前一晚 2 分鐘 SOP(離線也看得到)</div>
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          ①看山頂即時攝影機——<b>比預報準</b>,白牆就別上(票貴)<br />
          ②MeteoSwiss App 查山頂站小時預報:雲量&lt;50%+無雨=上;雷雨=改案<br />
          ③半天雨→上下午對調;整天雨→開當日「防呆指南」改案,別整天放棄
        </div>
        {day.webcam && <a href={day.webcam} target="_blank" rel="noreferrer" style={{ ...S.webcamLink, marginTop: 8 }}>📷 今日山頂攝影機</a>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {RESORT_CAMS.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noreferrer" style={{ background: "#E7F0FA", color: "#1F3864", borderRadius: 14, padding: "6px 10px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>📷 {n}</a>)}
          <a href="https://www.meteoswiss.admin.ch/" target="_blank" rel="noreferrer" style={{ background: "#E7F0FA", color: "#1F3864", borderRadius: 14, padding: "6px 10px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>🇨🇭 MeteoSwiss</a>
        </div>
      </div>
      <div style={{ ...S.card, fontSize: 13, color: "#5A6B7E" }}>{WCRULE}</div>
    </div>
  );
}

/* ---------- 票券連結(v3.12 R3:Drive 上的冰河/黃金/機票) ---------- */
function TicketLinks() {
  return (
    <div style={S.card}>
      <div style={S.secTitle}>🎟 訂位券/機票(存 Drive,需登入Google)</div>
      {TICKET_LINKS.map(t => (
        <a key={t.n} href={t.url} target="_blank" rel="noreferrer" style={{ ...S.wpCard, display: "block", textDecoration: "none", color: "#1F3864", fontWeight: 700, fontSize: 15 }}>{t.n} →</a>
      ))}
      <div style={{ fontSize: 12.5, color: "#5A6B7E", marginTop: 4 }}>⚠️ 山區無訊號打不開:出發前先在 Drive 把這幾份設為「可離線使用」,或截圖後用下方「＋新增」存進本機。</div>
    </div>
  );
}

/* ---------- 舊版上傳票券(同網域,唯讀直讀,不佔額外空間) ---------- */
function OldUploads({ onOpen }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    try {
      const idx = JSON.parse(localStorage.getItem("hub:tickets:index") || "[]");
      const out = [];
      for (const it of idx) {
        const img = localStorage.getItem("hub:tickets:img:" + it.id);
        if (img) out.push({ ...it, img });
      }
      setItems(out);
    } catch {}
  }, []);
  if (!items.length) return null;
  return (
    <div style={S.card}>
      <div style={S.secTitle}>📥 舊版 App 上傳的票券({items.length})</div>
      <div style={{ fontSize: 12.5, color: "#5A6B7E", marginBottom: 8 }}>直接讀取這支手機舊版存的照片(唯讀,不佔額外空間,舊版不受影響)。點圖全螢幕出示。</div>
      <div style={S.ticketGrid}>
        {items.map(it => (
          <div key={it.id} style={S.ticketCard}>
            <img src={it.img} alt={it.name} style={S.ticketImg} onClick={() => onOpen(it.img)} />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 內建票券(v3.12 z3 原樣搬移) ---------- */
function EmbeddedTickets({ onOpen }) {
  const me = (() => { try { return (localStorage.getItem("wang.swiss.user") || "").replace(/\(.*\)/, ""); } catch { return ""; } })();
  const list = [...Z3].sort((a, b) => (a.who === me ? -1 : b.who === me ? 1 : 0));
  return (
    <div style={S.card}>
      <div style={S.secTitle}>🚂 Swiss Travel Pass (STP) — 點人名全螢幕出示</div>
      <div style={S.ticketGrid}>
        {list.map(t => (
          <div key={t.who} style={S.ticketCard}>
            <img src={t.img} alt={t.who} style={S.ticketImg} onClick={() => onOpen(t.img)} />
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{t.who}{t.who === me ? "(我)" : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 舊版資料帶入(只複製,絕不動舊版) ---------- */
function migrateFromOld() {
  const rep = [];
  const copy = (ok, msg) => rep.push((ok ? "✓ " : "⚠ ") + msg);
  const setRaw = (k, v) => localStorage.setItem(k, v);
  try {
    const pairs = [["hub_user", "wang.swiss.user", "raw"], ["hub_diary", "wang.swiss.diary", "json"], ["hub_wifi", "wang.swiss.wifi", "json"], ["hub_chk", "wang.swiss.chk", "passthrough"], ["hub_exp", "wang.swiss.exp", "passthrough"]];
    for (const [ok_, nk, mode] of pairs) {
      const v = localStorage.getItem(ok_);
      if (v == null) continue;
      if (localStorage.getItem(nk) != null) { copy(true, nk.replace("wang.swiss.", "") + ":新版已有資料,略過(不覆蓋)"); continue; }
      try {
        if (mode === "raw") setRaw(nk, v);
        else if (mode === "json") { let out; try { JSON.parse(v); out = v; } catch { out = JSON.stringify(v); } setRaw(nk, out); }
        else setRaw(nk, v);
        copy(true, "帶入 " + ok_.replace("hub_", ""));
      } catch (e) { copy(false, ok_ + " 失敗:" + (e && e.name)); }
    }
    let tix = 0, tfail = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf("hub:") === 0) {
        const nk = "wang.swiss:" + k.slice(4);
        if (localStorage.getItem(nk) != null) continue;
        try { setRaw(nk, localStorage.getItem(k)); tix++; }
        catch (e) { tfail++; if (e && (e.name === "QuotaExceededError" || e.code === 22)) { copy(false, "空間不足:已帶入 " + tix + " 筆票券資料,其餘請刪些照片後再按一次(或票券續用舊版)"); break; } }
      }
    }
    if (tix) copy(true, "帶入票券相簿資料 " + tix + " 筆");
    if (!rep.length) copy(true, "此手機的舊版沒有存過個人資料(或已全部帶入)");
    rep.push("舊版資料原封未動 ✓");
  } catch (e) { copy(false, "帶入中斷:" + e); }
  return rep;
}
function MigrateCard() {
  const [rep, setRep] = useState(null);
  return (
    <div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>把<b>這支手機</b>舊版 App 存的資料(身分/清單/日記/分帳/WiFi備忘/自行上傳的票券照片)複製一份進新版。<b>只複製、不刪除</b>,舊版完全不受影響,可重複按。</div>
      <button style={{ ...S.primaryBtn, width: "100%", marginTop: 8 }} onClick={() => { const r = migrateFromOld(); setRep(r); }}>🔁 開始帶入</button>
      {rep && <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.8, background: "#F7F9FC", borderRadius: 8, padding: "8px 10px" }}>{rep.map((x, i) => <div key={i}>{x}</div>)}<div style={{ fontSize: 12, color: "#8A97A6", marginTop: 4 }}>帶入後重新整理一次,各頁即可看到。</div></div>}
    </div>
  );
}

/* ---------- 逐步指令庫(含未綁定行程的路線指南) ---------- */
function NavStepsLibrary({ day }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(null);
  const todayTexts = [...(day.plan || []).map(p => p[1]), ...(day.nav || []).map(w => w.name)].join("|");
  const todays = NAV_KEYS.filter(k => todayTexts.includes(k));
  const others = NAV_KEYS.filter(k => !todays.includes(k)).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const Item = ({ k }) => (
    <div onClick={() => setSheet({ key: k, steps: NAVSTEP[k].split("→") })} style={{ padding: "8px 4px", borderBottom: "1px solid #F0F3F7", fontSize: 14, cursor: "pointer", color: "#1F3864", fontWeight: 600 }}>🧭 {k}</div>
  );
  return (
    <div style={S.card}>
      {sheet && <StepSheet title={sheet.key} steps={sheet.steps} onClose={() => setSheet(null)} />}
      <div style={S.secTitle}>📖 逐步指令庫({NAV_KEYS.length}條)</div>
      {todays.length > 0 && <div style={{ fontSize: 12.5, fontWeight: 800, color: "#C8102E" }}>今日相關</div>}
      {todays.map(k => <Item key={k} k={k} />)}
      <button onClick={() => setOpen(!open)} style={{ ...S.ghostBtn, width: "100%", marginTop: 8 }}>{open ? "▲ 收起全部" : "▼ 展開全部(含各景點/餐廳怎麼去)"}</button>
      {open && others.map(k => <Item key={k} k={k} />)}
    </div>
  );
}

/* ---------- 工具卡×10(依 v3.12 還原邏輯重實作) ---------- */
const T_RATES = { CHF: 36.5, AED: 8.6, EUR: 34.2 };
const lsGet = (k, d) => { try { const v = localStorage.getItem("wang.swiss." + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem("wang.swiss." + k, JSON.stringify(v)); } catch {} };

function Tools() {
  const [open, setOpen] = useState(0);
  const cards = [
    ["🔁 舊版資料帶入", <MigrateCard key="mg" />],
    ["🔑 附近搜尋金鑰", <GKeySetting key="gk" />],
    ["💱 匯率速算", <FxCalc key="fx" />],
    ["🧾 分帳記帳", <Ledger key="lg" />],
    ["🕐 三地時鐘", <Clocks key="ck" />],
    ["✅ 行前檢查清單", <CheckList key="cl" />],
    ["🚻 附近急找", <NearFind key="nf" />],
    ["📶 網路&WiFi", <WifiNote key="wf" />],
    ["💰 小費&退稅", <TipTax key="tt" />],
    ["🏛 使館求助", <Embassy key="em" />],
    ["📔 旅行一句話日記", <Diary key="dy" />],
    ["🌓 深色模式", <DarkMode key="dm" />],
  ];
  return (
    <div>
      {cards.map(([t, body], i) => (
        <div key={i} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div onClick={() => setOpen(open === i ? -1 : i)} style={{ padding: "12px 14px", fontSize: 15, fontWeight: 800, color: "#1F3864", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
            <span>{t}</span><span style={{ color: "#8A97A6" }}>{open === i ? "▲" : "▼"}</span>
          </div>
          {open === i && <div style={{ padding: "0 14px 14px" }}>{body}</div>}
        </div>
      ))}
    </div>
  );
}
function FxCalc() {
  const [v, setV] = useState("100");
  const [cur, setCur] = useState("CHF");
  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input style={S.input} value={v} onChange={e => setV(e.target.value)} inputMode="decimal" />
        <select style={S.select} value={cur} onChange={e => setCur(e.target.value)}>
          <option>CHF</option><option>AED</option><option>EUR</option>
        </select>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8, color: "#1F3864" }}>≈ NT$ {Math.round((parseFloat(v) || 0) * T_RATES[cur]).toLocaleString()}</div>
      <table style={{ width: "100%", marginTop: 8, fontSize: 13.5, borderCollapse: "collapse" }}>
        <thead><tr style={{ color: "#8A97A6", fontSize: 12 }}><th style={{ textAlign: "left" }}>外幣</th><th style={{ textAlign: "right" }}>CHF→台幣</th><th style={{ textAlign: "right" }}>AED→台幣</th></tr></thead>
        <tbody>{[1, 5, 10, 20, 50, 100, 200].map(n => (
          <tr key={n} style={{ borderBottom: "1px solid #F0F3F7" }}>
            <td style={{ padding: "4px 0", fontWeight: 700 }}>{n}</td>
            <td style={{ textAlign: "right" }}>{Math.round(n * T_RATES.CHF).toLocaleString()}</td>
            <td style={{ textAlign: "right" }}>{Math.round(n * T_RATES.AED).toLocaleString()}</td>
          </tr>))}</tbody>
      </table>
      <div style={{ fontSize: 11.5, color: "#8A97A6", marginTop: 4 }}>速記:CHF價格×36.5・AED×8.6(出發前參考價)</div>
    </div>
  );
}
function Ledger() {
  const [rows, setRows] = useState(() => lsGet("exp", []));
  const [who, setWho] = useState(TRIP.members[0]);
  const [amt, setAmt] = useState("");
  const [item, setItem] = useState("");
  const add = () => {
    if (!amt) return;
    const r = [...rows, { who, amt: parseFloat(amt) || 0, note: item, t: Date.now() }];
    setRows(r); lsSet("exp", r); setAmt(""); setItem("");
  };
  const sum = {};
  rows.forEach(r => { sum[r.who] = (sum[r.who] || 0) + r.amt; });
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <select style={S.select} value={who} onChange={e => setWho(e.target.value)}>{TRIP.members.map(m => <option key={m}>{m}</option>)}</select>
        <input style={{ ...S.input, width: 80, flex: "none" }} placeholder="金額" value={amt} onChange={e => setAmt(e.target.value)} inputMode="decimal" />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input style={S.input} placeholder="項目(如:午餐)" value={item} onChange={e => setItem(e.target.value)} />
        <button style={S.primaryBtn} onClick={add}>記一筆</button>
      </div>
      {Object.keys(sum).length > 0 && (
        <div style={{ marginTop: 8, fontSize: 13.5 }}>
          {Object.entries(sum).map(([w, v]) => <div key={w}>{w} 共墊 <b>{v.toLocaleString()}</b></div>)}
          <div style={{ fontSize: 11.5, color: "#8A97A6", marginTop: 4 }}>記在此手機・幣別自理・長按可截圖傳群組</div>
          <button style={{ ...S.ghostBtn, marginTop: 6 }} onClick={() => { if (confirm("清空所有記帳?")) { setRows([]); lsSet("exp", []); } }}>清空</button>
        </div>
      )}
    </div>
  );
}
function Clocks() {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(t); }, []);
  const at = tz => new Date().toLocaleTimeString("zh-TW", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{ fontSize: 15, lineHeight: 2 }}>
      <div>🇹🇼 台北(GMT+8):<b style={{ fontVariantNumeric: "tabular-nums" }}>{at("Asia/Taipei")}</b></div>
      <div>🇨🇭 瑞士(GMT+2,慢台灣6hr):<b style={{ fontVariantNumeric: "tabular-nums" }}>{at("Europe/Zurich")}</b></div>
      <div>🇦🇪 杜拜(GMT+4,慢台灣4hr):<b style={{ fontVariantNumeric: "tabular-nums" }}>{at("Asia/Dubai")}</b></div>
      <div style={{ fontSize: 12, color: "#8A97A6", lineHeight: 1.6 }}>瑞士下午2點=台灣晚8點→可打 / 瑞士晚9點=台灣凌晨3點→別打</div>
    </div>
  );
}
const CHK_DEFAULT = ["護照(效期6個月+)", "STP車票紙本", "歐規轉接頭×2", "行動電源", "常備藥+高血壓藥", "防曬乳+太陽眼鏡", "薄羽絨(高山用)", "雨傘/雨衣", "泳衣(飯店)", "杜拜長袖(清真寺)", "信用卡×2+現金CHF", "eSIM已設定"];
function CheckList() {
  const [chk, setChk] = useState(() => lsGet("chk", {}));
  const toggle = i => { const c = { ...chk, [i]: !chk[i] }; setChk(c); lsSet("chk", c); };
  return (
    <div>
      {CHK_DEFAULT.map((t, i) => (
        <div key={i} onClick={() => toggle(i)} style={{ padding: "7px 4px", fontSize: 14, cursor: "pointer", textDecoration: chk[i] ? "line-through" : "none", color: chk[i] ? "#8A97A6" : "#222", borderBottom: "1px solid #F0F3F7" }}>
          {chk[i] ? "☑" : "☐"} {t}
        </div>
      ))}
    </div>
  );
}
function NearFind() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {[["🚻 廁所", "toilets near me"], ["💊 藥局", "pharmacy near me"], ["🛒 超市", "supermarket near me"], ["🏧 ATM", "atm near me"], ["☕ 咖啡", "coffee near me"], ["🚕 計程車", "taxi stand near me"]].map(([t, q]) => (
        <a key={t} style={{ ...S.primaryBtn, textDecoration: "none", background: "#1F3864" }} href={"https://www.google.com/maps/search/" + encodeURIComponent(q)} target="_blank" rel="noreferrer">{t}</a>
      ))}
    </div>
  );
}
function WifiNote() {
  const [v, setV] = useState(() => lsGet("wifi", ""));
  return (
    <div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>eSIM沒訊號:設定→行動服務→確認數據漫遊開啟、選對方案線路。瑞士火車山區訊號會斷,正常。</div>
      <textarea style={{ ...S.input, width: "100%", minHeight: 60, marginTop: 6, boxSizing: "border-box" }} placeholder="記下各飯店WiFi密碼…" value={v} onChange={e => { setV(e.target.value); lsSet("wifi", e.target.value); }} />
    </div>
  );
}
function TipTax() {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
      <b>瑞士</b>:帳單已含服務費,不強制小費;滿意可湊整數(如47→50)。<br />
      <b>杜拜</b>:餐廳約10%;行李員AED5-10;計程車湊整。<br />
      <b>退稅</b>:瑞士單店滿CHF300可辦;機場先蓋海關章再托運。杜拜商場Planet系統,登機口前刷護照退。
    </div>
  );
}
function Embassy() {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>
      <b>駐瑞士代表處</b>(伯恩)<br />
      +41 31 382 2927・急難 +41 79 227 7503<br />
      <a href="tel:+41792277503" style={{ color: "#C8102E", fontWeight: 800 }}>📞 一鍵撥急難專線</a><br />
      <span style={{ fontSize: 12, color: "#8A97A6" }}>撥不通改撥:+41 79 345 2919(證件頁所列)</span><br />
      <b>駐杜拜辦事處</b><br />
      +971 4 397 7777・急難 +971 50 651 5747<br />
      <a href="tel:+971506515747" style={{ color: "#C8102E", fontWeight: 800 }}>📞 一鍵撥杜拜急難</a><br />
      <span style={{ fontSize: 12, color: "#8A97A6" }}>護照遺失:先報警拿報案單→聯絡代表處補發入國證明</span>
    </div>
  );
}
function Diary() {
  const [v, setV] = useState(() => lsGet("diary", ""));
  return <textarea style={{ ...S.input, width: "100%", minHeight: 80, boxSizing: "border-box" }} placeholder="7/24 出發!全家在機場好興奮…(存在此手機)" value={v} onChange={e => { setV(e.target.value); lsSet("diary", e.target.value); }} />;
}
function DarkMode() {
  return (
    <div>
      <button style={S.primaryBtn} onClick={() => {
        const on = document.body.style.filter === "";
        document.body.style.filter = on ? "invert(1) hue-rotate(180deg)" : "";
        document.body.style.background = on ? "#111" : "#EEF2F6";
      }}>切換深色/亮色</button>
      <div style={{ fontSize: 12, color: "#8A97A6", marginTop: 4 }}>夜間或省電時用(簡易反色,照片顏色會變)</div>
    </div>
  );
}

/* ---------- 會話(TRIP.phrases + phrasesAdv,含放大與朗讀) ---------- */
function Phrases() {
  const [big, setBig] = useState(null);
  const groups = [...(TRIP.phrases || []), ...(TRIP.phrasesAdv || [])];
  const speak = (txt, lang) => {
    try { const u = new SpeechSynthesisUtterance(txt); u.lang = lang; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch {}
  };
  if (big) return (
    <div style={S.fullscreen} onClick={() => setBig(null)}>
      <div style={S.bigPhrase} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 20, color: "#5A6B7E", marginBottom: 12 }}>{big[0]}</div>
        <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.3 }}>{big[1]}</div>
        <div style={{ fontSize: 22, color: "#5A6B7E", marginTop: 12 }}>{big[2]}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
          <button style={S.ttsBtn || S.primaryBtn} onClick={() => speak(big[1], "de-DE")}>🔊 唸德文</button>
          <button style={{ ...(S.ttsBtn || S.primaryBtn), background: "#1F3864" }} onClick={() => speak(big[2], "en-US")}>🔊 唸英文</button>
        </div>
      </div>
      <div style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>放大顯示中・直接拿給對方看・點外圍返回</div>
    </div>
  );
  return (
    <div>
      <div style={{ ...S.card, fontSize: 13, color: "#5A6B7E" }}>
        點任一句 → 全螢幕放大(德文+英文),直接拿給店員/站務員看,可按🔊朗讀。瑞士德語區英文普及,英文欄同樣好用。
      </div>
      {groups.map((g, gi) => (
        <div key={gi} style={S.card}>
          <div style={S.secTitle}>{g.cat}</div>
          {g.items.map((p, pi) => (
            <div key={pi} style={S.phraseRow} onClick={() => setBig(p)}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p[0]}</div>
              <div style={{ fontSize: 13, color: "#1F3864" }}>{p[1]}</div>
              <div style={{ fontSize: 12, color: "#8A97A6" }}>{p[2]}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- 使用說明(資料驅動:help.json) ---------- */
function Help() {
  const share = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: TRIP.name, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); alert("連結已複製!貼到LINE群組即可"); } catch { prompt("手動複製此連結:", url); } }
  };
  const [openIdx, setOpenIdx] = useState(-1);
  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>📖 使用手冊(點標題展開)</div>
        {HELPDATA.map(([t, body], i) => (
          <div key={i} style={{ borderBottom: "1px solid #E8EDF3" }}>
            <div onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
              style={{ padding: "10px 2px", fontSize: 14.5, fontWeight: 800, color: "#1F3864", cursor: "pointer", display: "flex", justifyContent: "space-between" }}>
              <span>{t}</span><span style={{ color: "#8A97A6" }}>{openIdx === i ? "▲" : "▼"}</span>
            </div>
            {openIdx === i && <div style={{ fontSize: 13.5, lineHeight: 1.7, padding: "0 2px 10px", color: "#333" }}>{body}</div>}
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>📤 用LINE分享給家人(3步驟)</div>
        <div style={{ fontSize: 14, lineHeight: 1.9 }}>
          ① 點下方按鈕分享/複製連結,貼到家庭LINE群組<br />
          ② 家人在LINE點開後,<b style={{ color: "#C8102E" }}>點右下「⋯」→「用預設瀏覽器開啟」</b>(⚠️留在LINE內建瀏覽器,定位與票券功能會失效!)<br />
          ③ Safari:「分享⬆︎」→「加入主畫面」;Chrome:右上「⋯」→「加入主畫面」→ 桌面出現App圖示,完成!
        </div>
        <button style={{ ...S.primaryBtn, width: "100%", marginTop: 10 }} onClick={share}>📤 分享此App連結</button>
      </div>
      <div style={{ ...S.card, fontSize: 13, color: "#5A6B7E" }}>
        🔄 模板說明:本App所有旅程內容都在 data/ 資料夾——下次旅行換掉資料檔即是全新旅程,程式不動。<br />
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{APP_VERSION}</span>
      </div>
    </div>
  );
}

/* ---------- 入口閘門(v3.12 樣式:背景照+選身分+密碼) ---------- */
export function Gate({ children }) {
  const [ok, setOk] = useState(() => { try { return localStorage.getItem("wang.swiss.gate") === "1"; } catch { return false; } });
  const [who, setWho] = useState(() => { try { return localStorage.getItem("wang.swiss.user") || TRIP.members[0]; } catch { return TRIP.members[0]; } });
  const [v, setV] = useState("");
  if (ok) return children;
  const go = () => {
    if (v === "7777") {
      try { localStorage.setItem("wang.swiss.gate", "1"); localStorage.setItem("wang.swiss.user", who.replace(/\(.*\)/, "")); } catch {}
      setOk(true);
    } else alert("密碼不對,再試一次(家庭群組有)");
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0A142D", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" }}>
      <img src={GATE_PHOTO} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "18px 22px calc(26px + env(safe-area-inset-bottom))", background: "linear-gradient(transparent, rgba(10,20,45,0.92) 30%)", boxSizing: "border-box", textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>🇨🇭 {TRIP.name}</div>
        <div style={{ fontSize: 13, color: "#C9D4E5", margin: "4px 0 10px" }}>選擇你是誰後進入</div>
        <select value={who} onChange={e => setWho(e.target.value)} style={{ ...S.select, width: "100%", fontSize: 16, fontWeight: 700, padding: "10px" }}>
          {TRIP.members.map(m => <option key={m}>{m}</option>)}
        </select>
        <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && go()}
          inputMode="numeric" type="password" placeholder="家庭密碼" style={{ ...S.input, width: "100%", textAlign: "center", fontSize: 18, letterSpacing: 6, marginTop: 8, boxSizing: "border-box" }} />
        <button style={{ ...S.primaryBtn, width: "100%", marginTop: 10 }} onClick={go}>進入</button>
        <div style={{ fontSize: 11, color: "#8A97A6", marginTop: 12, fontVariantNumeric: "tabular-nums" }}>{APP_VERSION}</div>
      </div>
    </div>
  );
}

/* ---------- 錯誤邊界(出錯不再白屏) ---------- */
export class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#C8102E" }}>⚠️ App 發生錯誤</div>
        <div style={{ fontSize: 13, marginTop: 8, color: "#5A6B7E" }}>請截圖此畫面傳給遠志。重新整理通常可恢復。</div>
        <pre style={{ fontSize: 11, background: "#F5F5F5", padding: 10, borderRadius: 8, overflowX: "auto", marginTop: 10 }}>{String(this.state.err && (this.state.err.stack || this.state.err))}</pre>
        <div style={{ fontSize: 11, color: "#8A97A6", marginTop: 8 }}>{APP_VERSION}</div>
      </div>
    );
    return this.props.children;
  }
}



/* ========== 購物 / 離境（自 family-hub v2.3 資料整合） ========== */

/* markdown-lite:**粗體**、<br/> */
function MD({ t, style }) {
  if (t == null) return null;
  const parts = String(t).split(/<br\s*\/?>/i);
  return (
    <span style={style}>
      {parts.map((line, li) => (
        <React.Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/\*\*(.+?)\*\*/g).map((seg, i) => i % 2 ? <b key={i}>{seg}</b> : <React.Fragment key={i}>{seg}</React.Fragment>)}
        </React.Fragment>
      ))}
    </span>
  );
}
function Acc({ title, sub, children, tint, open: o0 }) {
  const [open, setOpen] = useState(!!o0);
  return (
    <div style={{ ...S.card, padding: 0, overflow: "hidden", ...(tint ? { borderLeft: "4px solid " + tint } : {}) }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#1F3864" }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: "#8A97A6", marginTop: 2 }}>{sub}</div>}
        </div>
        <span style={{ color: "#8A97A6" }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  );
}

/* ---------- 離境倒數(以 EK086 8/6 22:00 蘇黎世為準) ---------- */
const DEPART_AT = "2026-08-06T22:00:00+02:00";
function daysToDepart() {
  return Math.ceil((new Date(DEPART_AT) - new Date()) / 86400000);
}


/* ---------- 我的購買清單（wang.swiss.buy） ---------- */
const BUY_LS = "buy";
const getBuy = () => lsGet(BUY_LS, {});
const setBuy = (id, v) => { const b = getBuy(); if (v) b[id] = v; else delete b[id]; lsSet(BUY_LS, b); return b; };

/* ---------- 交叉索引：把一個伴手禮相關的所有資料聚合起來 ---------- */
const CITY_ZH = { zurich: "蘇黎世", zermatt: "策馬特", stmoritz: "聖莫里茲", dubai: "杜拜", luzern: "琉森", grindelwald: "格林德瓦", all: "各地都有" };
function giftDossier(g) {
  const { brands, top3, buyGuide, fieldGuide, flavor, stores, deadlines, itemMap } = SHOP;
  const br = brands[g.id], t3 = top3[g.id], fg = fieldGuide[g.id];
  const bg = Object.entries(buyGuide).filter(([k]) => k.split("_")[0] === g.id).map(([, v]) => v);
  const fl = flavor[g.cat];
  const dl = (deadlines.byId || {})[g.id] || (deadlines.byCat || {})[g.cat];
  const nameKeys = [g.id, g.n.split(" ")[0], (br && br.brand) || ""].filter(Boolean).map(x => x.toLowerCase());
  const hit = txt => { const t = String(txt || "").toLowerCase(); return nameKeys.some(k => k.length > 2 && t.includes(k)); };
  const shops = [], avoid = [], intel = [];
  Object.entries(stores).forEach(([ck, z]) => {
    (z.shops || []).forEach(sp => {
      const byMap = (itemMap[sp.id] || []).some(it => it.id.split("_")[0] === g.id);
      if (byMap || hit(sp.brand) || hit(sp.name)) {
        shops.push({ ...sp, city: z.name, cityKey: ck });
        (sp.intel || []).forEach(x => intel.push({ from: sp.name, t: x }));
        (sp.warns || []).forEach(x => avoid.push({ from: sp.name, t: x, kind: "warn" }));
      }
    });
    (z.skip || []).forEach(sk => { if (hit(sk.n) || hit(sk.why)) avoid.push({ from: z.name + "・" + sk.n, t: sk.why, kind: "skip" }); });
  });
  return { br, t3, fg, bg, fl, dl, shops, avoid, intel };
}

/* ---------- 品項詳情（全螢幕，一頁看完） ---------- */
function GiftDetail({ g, onClose, onBuyChange }) {
  const d = giftDossier(g);
  const [buy, setBuyState] = useState(() => getBuy()[g.id] || null);
  const left = daysToDepart();
  const urgent = d.dl && left <= d.dl.dLeft;
  const mark = v => { const nv = buy === v ? null : v; setBuy(g.id, nv); setBuyState(nv); onBuyChange && onBuyChange(); };
  const copy = async t => { try { await navigator.clipboard.writeText(t); alert("已複製"); } catch { prompt("複製:", t); } };
  const Sec = ({ t, color, children }) => (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: color || "#1F3864", marginBottom: 6 }}>{t}</div>
      {children}
    </div>
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "#EEF2F6", zIndex: 120, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#1F3864", color: "#fff", padding: "calc(12px + env(safe-area-inset-top)) 14px 12px", borderBottom: "3px solid #C8102E", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900 }}>{SHOP.giftCats[g.cat] ? SHOP.giftCats[g.cat].icon : "🎁"} {g.n}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>熱門 {g.pop}・{d.br ? d.br.price : ""}・{CITY_ZH[d.br && d.br.avail] || (d.br && d.br.avail) || ""}</div>
        </div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>✕ 關閉</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px calc(20px + env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["want", "🛒 想買", "#C8102E"], ["done", "✅ 已買", "#2E7D32"]].map(([v, lb, c]) => (
            <button key={v} onClick={() => mark(v)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", border: buy === v ? "none" : "1px solid #D5DDE6", background: buy === v ? c : "#fff", color: buy === v ? "#fff" : "#5A6B7E" }}>{lb}</button>
          ))}
        </div>
        <div style={{ ...S.card, marginTop: 10, background: urgent ? "#FFF3F3" : "#fff", border: urgent ? "1px solid #C8102E" : "none" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: urgent ? "#C8102E" : "#1F3864" }}>🕐 {urgent ? "🔴 該買了：" : ""}{g.when}</div>
          {d.dl && <div style={{ fontSize: 13, color: "#5A6B7E", marginTop: 2 }}>需提前 {d.dl.dLeft} 天（{d.dl.why}）・離開歐洲剩 {left} 天</div>}
          <div style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 6 }}>{g.note}</div>
        </div>

        {d.t3 && (
          <Sec t="✅ 買哪一款（TOP3）" color="#C8102E">
            {d.t3.map((t, i) => (
              <div key={i} style={{ ...S.card, padding: "11px 13px", marginBottom: 8, borderLeft: "4px solid #C8102E" }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>TOP{i + 1} {t.n} <span style={{ color: "#2E7D32", fontSize: 13 }}>{t.price}</span></div>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 3 }}><MD t={t.why} /></div>
                <div style={{ fontSize: 12.5, color: "#5A6B7E", marginTop: 3 }}>👤 適合：{t.who}</div>
              </div>
            ))}
          </Sec>
        )}

        {d.avoid.length > 0 && (
          <Sec t="🚫 不要買 / 避雷" color="#C8102E">
            {d.avoid.map((a, i) => (
              <div key={i} style={{ ...S.card, padding: "10px 12px", marginBottom: 8, background: "#FFF3F3", border: "1px solid #C8102E" }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#C8102E" }}>{a.kind === "skip" ? "別去這家" : "注意"}・{a.from}</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 3 }}><MD t={a.t} /></div>
              </div>
            ))}
          </Sec>
        )}

        {d.br && (
          <Sec t="💡 怎麼挑（關鍵知識）">
            <div style={{ ...S.card, padding: "11px 13px" }}>
              <div style={{ fontSize: 12.5, color: "#2E7D32", fontWeight: 800 }}>{(d.br.why || []).join("・")}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 6, background: "#FFF8E5", padding: "8px 10px", borderRadius: 6 }}><MD t={d.br.howto} /></div>
              <div style={{ fontSize: 13, lineHeight: 1.65, marginTop: 8, color: "#5A6B7E" }}><MD t={d.br.story} /></div>
            </div>
          </Sec>
        )}

        {d.intel.length > 0 && (
          <Sec t={"💬 網友怎麼說（" + d.intel.length + " 則）"}>
            <div style={{ ...S.card, padding: "11px 13px" }}>
              {d.intel.map((x, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: i < d.intel.length - 1 ? "1px dashed #E8EDF3" : "none" }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.7 }}><MD t={x.t} /></div>
                  <div style={{ fontSize: 11.5, color: "#8A97A6", marginTop: 2 }}>— {x.from}</div>
                </div>
              ))}
            </div>
          </Sec>
        )}

        {d.shops.length > 0 && (
          <Sec t={"🏬 去哪買（" + d.shops.length + " 家）"}>
            {d.shops.map(sp => (
              <div key={sp.id} style={{ ...S.card, padding: "11px 13px", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{sp.verdict ? sp.verdict + " " : ""}{sp.name}</div>
                <div style={{ fontSize: 12.5, color: "#5A6B7E", marginTop: 2 }}>📍 {sp.city}・{sp.addr}</div>
                <div style={{ fontSize: 12.5, color: "#5A6B7E" }}>🕐 <MD t={sp.hours} /></div>
                <div style={{ fontSize: 12.5, color: "#5A6B7E" }}>★{sp.rating}（{sp.reviews}）・{sp.price}</div>
                {sp.tiers && (
                  <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, background: "#F7F9FC", borderRadius: 6, padding: "6px 8px" }}>
                    {[["boss", "送長官/長輩"], ["mate", "分送同事"], ["kin", "自家人"]].map(([k, lb]) => sp.tiers[k] && (
                      <div key={k}><b>{lb}</b>：<MD t={sp.tiers[k].i} />（{sp.tiers[k].q}・{sp.tiers[k].p}）</div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <a href={"https://www.google.com/maps/dir/?api=1&destination=" + sp.lat + "," + sp.lon + "&travelmode=walking"} target="_blank" rel="noreferrer" style={{ ...S.chipBtn, flex: 1, textAlign: "center", padding: "8px 0" }}>🧭 導航</a>
                  {sp.phone && <a href={"tel:" + sp.phone.replace(/\s/g, "")} style={{ ...S.chipBtn, flex: 1, textAlign: "center", padding: "8px 0", background: "#1F3864" }}>📞 電話</a>}
                </div>
                {sp.script && <button style={{ ...S.ghostBtn, width: "100%", marginTop: 6 }} onClick={() => copy(sp.script)}>📋 複製給店員看的英文</button>}
              </div>
            ))}
          </Sec>
        )}

        {d.fg && (
          <Sec t="🛒 現場怎麼買（步驟）">
            <div style={{ ...S.card, padding: "11px 13px" }}>
              {(d.fg.flow || []).map((f, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.8, padding: "3px 0" }}><MD t={f} /></div>)}
              {(d.fg.flavors || []).length > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864", marginTop: 8 }}>😋 口味</div>}
              {(d.fg.flavors || []).map((fv, i) => <div key={i} style={{ fontSize: 13, padding: "3px 0" }}>・<b>{fv.n}</b> — <MD t={fv.note} /></div>)}
            </div>
          </Sec>
        )}

        {d.bg.map((v, i) => (
          <Sec key={i} t={"⭐ 深度比價：" + v.name}>
            <div style={{ ...S.card, padding: "11px 13px" }}>
              {v.tagline && <div style={{ fontSize: 13, color: "#5A6B7E" }}>{v.tagline}</div>}
              {v.price && <div style={{ fontSize: 14, fontWeight: 800, color: "#2E7D32", marginTop: 4 }}><MD t={v.price.list} /></div>}
              {(v.where || []).map((w, j) => <div key={j} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px dashed #E8EDF3" }}><b>{w.s}</b> {w.p} <span style={{ color: "#C8102E" }}>{w.tag}</span></div>)}
              {(v.list || []).map((it, j) => (
                <div key={j} style={{ fontSize: 13, padding: "5px 0", borderBottom: "1px dashed #E8EDF3", lineHeight: 1.6 }}>
                  <b>{it.n || it.name}</b> {it.price && <span style={{ color: "#2E7D32" }}>{it.price}</span>}
                  {it.why && <div><MD t={it.why} /></div>}
                  {it.note && <div style={{ color: "#5A6B7E" }}><MD t={it.note} /></div>}
                </div>
              ))}
            </div>
          </Sec>
        ))}

        {d.fl && (
          <Sec t={d.fl.t}>
            <div style={{ ...S.card, padding: "11px 13px" }}>
              {d.fl.b.map((line, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.75, padding: "2px 0" }}><MD t={line} /></div>)}
            </div>
          </Sec>
        )}
      </div>
    </div>
  );
}

/* ---------- 我的購買清單 ---------- */
function BuyList({ onOpen }) {
  const [buy, setB] = useState(() => getBuy());
  const refresh = () => setB(getBuy());
  const { gifts } = SHOP;
  const want = gifts.filter(g => buy[g.id] === "want");
  const done = gifts.filter(g => buy[g.id] === "done");
  const left = daysToDepart();
  const Row = ({ g, tone }) => {
    const dl = (SHOP.deadlines.byId || {})[g.id] || (SHOP.deadlines.byCat || {})[g.cat];
    const urgent = tone === "want" && dl && left <= dl.dLeft;
    return (
      <div onClick={() => onOpen(g)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: tone === "done" ? "#8A97A6" : (urgent ? "#C8102E" : "#1F3864"), textDecoration: tone === "done" ? "line-through" : "none" }}>
            {urgent ? "🔴 " : ""}{SHOP.giftCats[g.cat] ? SHOP.giftCats[g.cat].icon : "🎁"} {g.n}
          </div>
          <div style={{ fontSize: 12, color: "#8A97A6" }}>{g.when}{dl ? "・需提前" + dl.dLeft + "天" : ""}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); setBuy(g.id, tone === "want" ? "done" : null); refresh(); }}
          style={{ border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", background: tone === "want" ? "#2E7D32" : "#EEF2F6", color: tone === "want" ? "#fff" : "#5A6B7E" }}>
          {tone === "want" ? "✅ 買到了" : "↩︎ 還原"}
        </button>
      </div>
    );
  };
  return (
    <div>
      <div style={{ ...S.card, background: "linear-gradient(135deg,#1F3864,#2E5C8A)", color: "#fff" }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>離開歐洲還有 {left} 天</div>
        <div style={{ fontSize: 22, fontWeight: 900 }}>待買 {want.length}・已買 {done.length}</div>
        <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>在「🎁全部」點任一項 →「🛒想買」即可加入</div>
      </div>
      {want.length > 0 && (
        <div style={S.card}>
          <div style={S.secTitle}>🛒 待買（點名稱看完整買法）</div>
          {want.map(g => <Row key={g.id} g={g} tone="want" />)}
        </div>
      )}
      {done.length > 0 && (
        <div style={S.card}>
          <div style={S.secTitle}>✅ 已買</div>
          {done.map(g => <Row key={g.id} g={g} tone="done" />)}
        </div>
      )}
      {want.length === 0 && done.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", color: "#8A97A6", fontSize: 14, padding: 20 }}>
          清單還是空的。到「🎁全部」挑幾項按「🛒想買」，這裡就會變成你的採購作戰表。
        </div>
      )}
    </div>
  );
}

/* ---------- 採購倒數 ---------- */
function BuyCountdown({ onOpen }) {
  const left = daysToDepart();
  const { deadlines, gifts, giftCats } = SHOP;
  const rows = [];
  for (const [id, d] of Object.entries(deadlines.byId || {})) {
    const g = gifts.find(x => x.id === id);
    rows.push({ id, n: g ? g.n : id, dLeft: d.dLeft, why: d.why, where: d.where || [], cat: g && g.cat });
  }
  rows.sort((a, b) => b.dLeft - a.dLeft);
  const CITY = { zurich: "蘇黎世", zermatt: "策馬特", stmoritz: "聖莫里茲", dubai: "杜拜" };
  return (
    <div style={S.card}>
      <div style={S.secTitle}>⏳ 採購倒數 — 離開歐洲還有 {left} 天</div>
      <div style={{ fontSize: 12.5, color: "#8A97A6", marginBottom: 8 }}>EK086 8/6(四) 22:00 蘇黎世起飛。下列品項有「最晚購買日」,逾期就買不到或帶不走。</div>
      {rows.map(r => {
        const urgent = left <= r.dLeft;
        const gi = gifts.find(x => x.id === r.id);
        return (
          <div key={r.id} onClick={() => gi && onOpen && onOpen(gi)} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid #F0F3F7", cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: urgent ? "#C8102E" : "#1F3864" }}>{urgent ? "🔴 " : ""}{r.n}</div>
              <div style={{ fontSize: 12.5, color: "#5A6B7E" }}>{r.why}・只在 {r.where.map(w => CITY[w] || w).join("/")}</div>
            </div>
            <div style={{ whiteSpace: "nowrap", fontSize: 12.5, fontWeight: 800, color: urgent ? "#C8102E" : "#8A97A6" }}>需提前{r.dLeft}天</div>
          </div>
        );
      })}
      <div style={{ fontSize: 12.5, color: "#7A5C00", background: "#FFF8E5", padding: "8px 10px", borderRadius: 8, marginTop: 8 }}>
        <MD t={"分類通則:" + Object.entries(deadlines.byCat || {}).map(([c, v]) => (giftCats[c] ? giftCats[c].icon + giftCats[c].label : c) + "提前" + v.dLeft + "天(" + v.why + ")").join("・")} />
      </div>
    </div>
  );
}

/* ---------- 48 項伴手禮 ---------- */
function GiftList({ onOpen }) {
  const { gifts, giftCats, top3, brands } = SHOP;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [buyMap, setBuyMap] = useState(() => getBuy());
  const cats = ["all", ...Object.keys(giftCats).filter(c => gifts.some(g => g.cat === c))];
  let list = gifts.filter(g => (cat === "all" || g.cat === cat) && (!q || g.n.includes(q) || (g.note || "").includes(q)));
  list = [...list].sort((a, b) => (b.pop || 0) - (a.pop || 0));
  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>🎁 伴手禮清單({gifts.length}項,依熱門度)</div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋品名/備註…" style={{ ...S.input, width: "100%", boxSizing: "border-box", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding: "5px 10px", borderRadius: 14, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: cat === c ? "none" : "1px solid #D5DDE6", background: cat === c ? "#1F3864" : "#fff", color: cat === c ? "#fff" : "#5A6B7E" }}>
              {c === "all" ? "全部" : (giftCats[c].icon + giftCats[c].label)}
            </button>
          ))}
        </div>
      </div>
      {list.map(g => (
        <div key={g.id} style={{ ...S.card, padding: "11px 13px", marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{giftCats[g.cat] ? giftCats[g.cat].icon : "🎁"} {g.n}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: g.pop >= 90 ? "#C8102E" : "#8A97A6", whiteSpace: "nowrap" }}>熱門 {g.pop}</div>
          </div>
          <div style={{ fontSize: 13, color: "#5A6B7E", marginTop: 3 }}>{g.note}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, background: "#EEF2F6", color: "#5A6B7E", borderRadius: 10, padding: "3px 9px", fontWeight: 700 }}>🕐 {g.when}</span>
            <button onClick={() => onOpen(g)} style={{ ...S.chipBtn, border: "none", cursor: "pointer", background: "#1F3864" }}>📖 完整買法</button>
            <button onClick={() => { setBuy(g.id, buyMap[g.id] === "want" ? null : "want"); setBuyMap({ ...getBuy() }); }}
              style={{ ...S.chipBtn, border: "none", cursor: "pointer", background: buyMap[g.id] === "want" ? "#2E7D32" : "#EEF2F6", color: buyMap[g.id] === "want" ? "#fff" : "#5A6B7E" }}>
              {buyMap[g.id] === "want" ? "✅ 已加入" : "🛒 想買"}</button>
          </div>
        </div>
      ))}
      {list.length === 0 && <div style={{ ...S.card, color: "#8A97A6", textAlign: "center" }}>沒有符合的品項</div>}
    </div>
  );
}

/* ---------- 店家包 ---------- */
const CITY_BY_DAY = { 6: "zermatt", 7: "zermatt", 8: "zermatt", 9: "stmoritz", 10: "stmoritz", 11: "zurich", 12: "zurich", 13: "zurich", 14: "dubai" };
function StoreList({ dayIdx }) {
  const { stores } = SHOP;
  const keys = Object.keys(stores);
  const [city, setCity] = useState(CITY_BY_DAY[dayIdx] || "zurich");
  const z = stores[city];
  const copy = async txt => { try { await navigator.clipboard.writeText(txt); alert("已複製,可貼給店員看"); } catch { prompt("複製:", txt); } };
  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>🏬 店家情報</div>
        <select value={city} onChange={e => setCity(e.target.value)} style={{ ...S.select, width: "100%", fontSize: 15, fontWeight: 700 }}>
          {keys.map(k => <option key={k} value={k}>{stores[k].name}({stores[k].shops.length}家){CITY_BY_DAY[dayIdx] === k ? " ・今日" : ""}</option>)}
        </select>
        <div style={{ fontSize: 13, color: "#5A6B7E", marginTop: 6 }}><MD t={z.note} /></div>
      </div>
      {z.shops.map(sp => (
        <Acc key={sp.id} title={(sp.verdict ? sp.verdict + " " : "") + sp.name} sub={sp.cat + "・★" + sp.rating + "(" + sp.reviews + ")・" + sp.price} tint="#C8102E">
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>📍 {sp.addr}</div>
            <div>🕐 <MD t={sp.hours} /></div>
            {sp.phone && <div>📞 <a href={"tel:" + sp.phone.replace(/\s/g, "")} style={{ color: "#C8102E", fontWeight: 700 }}>{sp.phone}</a></div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <a href={"https://www.google.com/maps/dir/?api=1&destination=" + sp.lat + "," + sp.lon + "&travelmode=walking"} target="_blank" rel="noreferrer" style={{ ...S.chipBtn, flex: 1, textAlign: "center", padding: "8px 0" }}>🧭 導航</a>
            {sp.url && <a href={sp.url} target="_blank" rel="noreferrer" style={{ ...S.chipBtn, flex: 1, textAlign: "center", padding: "8px 0", background: "#1F3864" }}>🔗 官網</a>}
          </div>
          {(sp.warns || []).map((w, i) => <div key={i} style={{ ...S.warnBox, background: "#FFF3F3", color: "#C8102E" }}><MD t={w} /></div>)}
          {sp.tiers && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>🎯 送誰買什麼</div>
              {[["boss", "送長官/長輩"], ["mate", "分送同事"], ["kin", "自家人"]].map(([k, lb]) => sp.tiers[k] && (
                <div key={k} style={{ fontSize: 13, padding: "5px 0", borderBottom: "1px dashed #E8EDF3" }}>
                  <b>{lb}</b>:<MD t={sp.tiers[k].i} />（{sp.tiers[k].q}・{sp.tiers[k].p}）
                </div>
              ))}
            </div>
          )}
          {(sp.items || []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>🛒 招牌品項</div>
              {sp.items.map((it, i) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: "1px dashed #E8EDF3", fontSize: 13, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700 }}>{it.n} <span style={{ color: "#2E7D32" }}>{it.price}</span></div>
                  {it.look && <div style={{ color: "#8A97A6", fontSize: 12.5 }}>👀 {it.look}</div>}
                  {it.why && <div><MD t={it.why} /></div>}
                  {it.value && <div style={{ color: "#5A6B7E" }}><MD t={it.value} /></div>}
                </div>
              ))}
            </div>
          )}
          {(sp.flavors || []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>😋 口味推薦</div>
              {sp.flavors.map((fv, i) => <div key={i} style={{ fontSize: 13, padding: "4px 0" }}>・<b>{fv.n}</b> — <MD t={fv.note} /></div>)}
            </div>
          )}
          {(sp.flow || []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>🚶 現場流程</div>
              {sp.flow.map((f, i) => <div key={i} style={{ fontSize: 13, lineHeight: 1.7, padding: "3px 0" }}><MD t={f} /></div>)}
            </div>
          )}
          {(sp.intel || []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>💬 網友情報</div>
              {sp.intel.map((x, i) => <div key={i} style={{ fontSize: 12.5, color: "#5A6B7E", lineHeight: 1.6, padding: "2px 0" }}><MD t={x} /></div>)}
            </div>
          )}
          {sp.script && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1F3864" }}>🗣 給店員看的英文</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#F7F9FC", borderRadius: 8, padding: "8px 10px", lineHeight: 1.6 }}>{sp.script}</div>
              <button style={{ ...S.ghostBtn, width: "100%", marginTop: 6 }} onClick={() => copy(sp.script)}>📋 複製這段</button>
            </div>
          )}
        </Acc>
      ))}
    </div>
  );
}

/* ---------- 怎麼選 + 現場作戰卡 + 深度導購 ---------- */
function BuyGuides() {
  const { flavor, fieldGuide, buyGuide } = SHOP;
  return (
    <div>
      <div style={{ ...S.card, fontSize: 13, color: "#5A6B7E" }}>選不出來看這裡:五大類怎麼挑、四家店現場怎麼買、三個明星品項深度比價。</div>
      {Object.entries(flavor).map(([k, v]) => (
        <Acc key={k} title={v.t} tint="#2E7D32">
          {v.b.map((line, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.75, padding: "2px 0" }}><MD t={line} /></div>)}
        </Acc>
      ))}
      {Object.entries(fieldGuide).map(([k, v]) => (
        <Acc key={k} title={"🛒 現場作戰卡:" + (v.store || k)} tint="#1F3864">
          {(v.flow || []).map((f, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.75, padding: "3px 0" }}><MD t={f} /></div>)}
          {(v.flavors || []).length > 0 && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: "#1F3864" }}>😋 口味</div>}
          {(v.flavors || []).map((fv, i) => <div key={i} style={{ fontSize: 13, padding: "3px 0" }}>・<b>{fv.n}</b> — <MD t={fv.note} /></div>)}
          {v.tiers && Object.entries(v.tiers).map(([tk, tv]) => (
            <div key={tk} style={{ fontSize: 13, padding: "4px 0", borderTop: "1px dashed #E8EDF3" }}><b>{tk}</b>:<MD t={typeof tv === "string" ? tv : JSON.stringify(tv)} /></div>
          ))}
        </Acc>
      ))}
      {Object.entries(buyGuide).map(([k, v]) => (
        <Acc key={k} title={"⭐ 深度導購:" + v.brand + " " + v.name} sub={v.tagline} tint="#E8A400">
          {v.price && <div style={{ fontSize: 13.5, fontWeight: 800, color: "#2E7D32" }}><MD t={v.price.list} />{v.price.note && <span style={{ color: "#8A97A6", fontWeight: 400, fontSize: 12 }}>（{v.price.note}）</span>}</div>}
          {(v.where || []).length > 0 && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: "#1F3864" }}>🏬 哪裡買</div>}
          {(v.where || []).map((w, i) => <div key={i} style={{ fontSize: 13, padding: "4px 0", borderBottom: "1px dashed #E8EDF3" }}><b>{w.s}</b> {w.p} <span style={{ color: "#C8102E" }}>{w.tag}</span></div>)}
          {(v.list || []).length > 0 && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: "#1F3864" }}>📋 品項</div>}
          {(v.list || []).map((it, i) => (
            <div key={i} style={{ fontSize: 13, padding: "5px 0", borderBottom: "1px dashed #E8EDF3", lineHeight: 1.6 }}>
              <b>{it.n || it.name}</b> {it.price && <span style={{ color: "#2E7D32" }}>{it.price}</span>}
              {it.why && <div><MD t={it.why} /></div>}
              {it.note && <div style={{ color: "#5A6B7E" }}><MD t={it.note} /></div>}
            </div>
          ))}
        </Acc>
      ))}
    </div>
  );
}

function Shop({ dayIdx }) {
  const [sub, setSub] = useState("mine");
  const [detail, setDetail] = useState(null);
  const tabs = [["mine", "🛒我的清單"], ["gift", "🎁全部"], ["count", "⏳倒數"], ["store", "🏬店家"], ["how", "📖怎麼選"]];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {tabs.map(([k, lb]) => (
          <button key={k} onClick={() => setSub(k)} style={{ flex: "1 0 auto", padding: "9px 12px", borderRadius: 8, border: "1px solid #D5DDE6", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: sub === k ? "#C8102E" : "#fff", color: sub === k ? "#fff" : "#5A6B7E" }}>{lb}</button>
        ))}
      </div>
      {detail && <GiftDetail g={detail} onClose={() => setDetail(null)} />}
      {sub === "mine" && <BuyList onOpen={setDetail} />}
      {sub === "count" && <BuyCountdown onOpen={setDetail} />}
      {sub === "gift" && <GiftList onOpen={setDetail} />}
      {sub === "store" && <StoreList dayIdx={dayIdx} />}
      {sub === "how" && <BuyGuides />}
    </div>
  );
}

/* ---------- 緊急電話(可獨立用於應變頁) ---------- */
function EmergencyCard() {
  const [c, setC] = useState("CH");
  const e = DEPART.emergency[c];
  return (
    <div style={{ ...S.card, border: "2px solid #C8102E" }}>
      <div style={{ ...S.secTitle, color: "#C8102E" }}>☎️ 緊急電話(點擊直撥)</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {Object.keys(DEPART.emergency).map(k => (
          <button key={k} onClick={() => setC(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: c === k ? "none" : "1px solid #D5DDE6", background: c === k ? "#1F3864" : "#fff", color: c === k ? "#fff" : "#5A6B7E", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}>{DEPART.emergency[k].name}</button>
        ))}
      </div>
      {e.local.map((x, i) => (
        <a key={i} href={"tel:" + x.tel.replace(/[\s-]/g, "")} style={{ ...S.callRow, alignItems: "center" }}>
          <span>{x.n}{x.note && <div style={{ fontSize: 11.5, color: "#8A97A6" }}>{x.note}</div>}</span>
          <b style={{ color: "#C8102E", fontSize: 17 }}>{x.tel}</b>
        </a>
      ))}
      {e.office.map((o, i) => (
        <div key={i} style={{ marginTop: 8, background: "#F7F9FC", borderRadius: 8, padding: "8px 10px", fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 800, color: "#1F3864" }}>{o.n}</div>
          {o.addr && <div style={{ color: "#5A6B7E" }}>{o.addr}</div>}
          {o.hours && <div style={{ color: "#5A6B7E" }}>🕐 {o.hours}</div>}
          {o.tel && o.tel !== "—" && <div>總機 <a href={"tel:" + o.tel.replace(/[\s-]/g, "")} style={{ color: "#1F3864", fontWeight: 700 }}>{o.tel}</a></div>}
          {o.emg && <div>急難 {/^[+\d]/.test(o.emg) ? <a href={"tel:" + o.emg.replace(/[\s-]/g, "")} style={{ color: "#C8102E", fontWeight: 800 }}>{o.emg}</a> : <span style={{ color: "#7A5C00" }}>{o.emg}</span>}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- 退稅 ---------- */
function TaxRefund() {
  const [c, setC] = useState("CH");
  const t = DEPART.tax[c], r = t.refund;
  const Step = ({ x }) => <div style={{ fontSize: 13.5, lineHeight: 1.75, padding: "3px 0" }}><MD t={x} /></div>;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {Object.keys(DEPART.tax).map(k => (
          <button key={k} onClick={() => setC(k)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: c === k ? "none" : "1px solid #D5DDE6", background: c === k ? "#1F3864" : "#fff", color: c === k ? "#fff" : "#5A6B7E", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{DEPART.tax[k].flag} {DEPART.tax[k].name}</button>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>💰 {t.name}退稅門檻</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#C8102E" }}>{r.threshold}</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.7, marginTop: 4 }}><MD t={r.rule} /></div>
        <div style={{ fontSize: 13.5, marginTop: 6 }}>VAT {t.vat.std}{t.vat.low !== "—" && `・減免 ${t.vat.low}(${t.vat.lowFor})`}</div>
        <div style={{ fontSize: 13.5, marginTop: 4 }}><MD t={r.actual} /></div>
        {r.foodWarn && <div style={{ ...S.warnBox, background: "#FFF3F3", color: "#C8102E", fontSize: 13.5, lineHeight: 1.7 }}><MD t={r.foodWarn} /></div>}
        {r.deadline && <div style={{ fontSize: 12.5, color: "#5A6B7E", marginTop: 6 }}>⏳ <MD t={r.deadline} /></div>}
      </div>
      {r.cond && <Acc title="✅ 資格條件" tint="#2E7D32">{r.cond.map((x, i) => <Step key={i} x={"・" + x} />)}</Acc>}
      {r.inStore && <Acc title="🏬 店裡怎麼辦(結帳當下)" tint="#1F3864" open>{r.inStore.map((x, i) => <Step key={i} x={x} />)}</Acc>}
      {r.airportHand && <Acc title={r.airportHand.title} tint="#2E7D32">{r.airportHand.steps.map((x, i) => <Step key={i} x={x} />)}</Acc>}
      {r.airportChecked && <Acc title={r.airportChecked.title} tint="#C8102E" open>{r.airportChecked.steps.map((x, i) => <Step key={i} x={x} />)}</Acc>}
      {r.ops && <Acc title="🏦 退稅業者/領錢" tint="#E8A400">{(Array.isArray(r.ops) ? r.ops : [r.ops]).map((x, i) => <Step key={i} x={typeof x === "string" ? x : (x.n + ":" + (x.note || ""))} />)}</Acc>}
      {r.warns && <div style={{ ...S.card, background: "#FFF3F3", border: "1px solid #C8102E" }}>{(Array.isArray(r.warns) ? r.warns : [r.warns]).map((x, i) => <Step key={i} x={x} />)}</div>}
      {t.shop && <Acc title="🛍 這裡買才划算" tint="#8A97A6">{(Array.isArray(t.shop) ? t.shop : [t.shop]).map((x, i) => <Step key={i} x={typeof x === "string" ? x : JSON.stringify(x)} />)}</Acc>}
    </div>
  );
}

/* ---------- 台灣海關 ---------- */
function Customs() {
  const c = DEPART.customs;
  const Row = ({ k, v, note, why, danger }) => (
    <div style={{ padding: "8px 0", borderBottom: "1px solid #F0F3F7" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: danger ? "#C8102E" : "#1F3864" }}>{k}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6 }}><MD t={v} /></div>
      {(note || why) && <div style={{ fontSize: 12.5, color: "#5A6B7E" }}><MD t={note || why} /></div>}
    </div>
  );
  return (
    <div>
      <div style={{ ...S.card, background: "#FFF3F3", border: "2px solid #C8102E" }}>
        <div style={{ ...S.secTitle, color: "#C8102E" }}>🚫 千萬別帶回台灣</div>
        {c.banned.map((x, i) => <Row key={i} {...x} danger />)}
      </div>
      <div style={S.card}>
        <div style={S.secTitle}>🇹🇼 免稅額度</div>
        {c.free.map((x, i) => <Row key={i} {...x} />)}
      </div>
      {c.limits && <Acc title="📦 數量限制" tint="#E8A400">{c.limits.map((x, i) => <Row key={i} {...x} />)}</Acc>}
      {c.flow && <Acc title="🚶 入境動線" tint="#1F3864" open>{c.flow.map((x, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.75, padding: "3px 0" }}><MD t={x} /></div>)}</Acc>}
      {c.warns && <div style={{ ...S.card, background: "#FFF8E5" }}>{c.warns.map((x, i) => <div key={i} style={{ fontSize: 13.5, lineHeight: 1.75, padding: "3px 0", color: "#7A5C00" }}><MD t={x} /></div>)}</div>}
    </div>
  );
}

/* ---------- 打包清單(可勾選) ---------- */
function Packing() {
  const [which, setWhich] = useState("home");
  const [done, setDone] = useState(() => lsGet("pack", {}));
  const p = DEPART.packing[which];
  const toggle = key => { const n = { ...done, [key]: !done[key] }; setDone(n); lsSet("pack", n); };
  const total = p.items.reduce((s, g) => s + g.x.length, 0);
  const okCount = p.items.reduce((s, g) => s + g.x.filter(x => done[which + "|" + x]).length, 0);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {Object.entries(DEPART.packing).map(([k, v]) => (
          <button key={k} onClick={() => setWhich(k)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: which === k ? "none" : "1px solid #D5DDE6", background: which === k ? "#1F3864" : "#fff", color: which === k ? "#fff" : "#5A6B7E", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>{v.ic} {v.n}</button>
        ))}
      </div>
      <div style={{ ...S.card, padding: "10px 14px", fontSize: 13.5, fontWeight: 800, color: okCount === total ? "#2E7D32" : "#1F3864" }}>進度 {okCount}/{total} {okCount === total ? "✅ 全部完成" : ""}</div>
      {p.items.map((grp, gi) => (
        <div key={gi} style={S.card}>
          <div style={{ ...S.secTitle, color: grp.c.indexOf("⚠️") >= 0 ? "#C8102E" : "#1F3864" }}>{grp.c}</div>
          {grp.x.map((x, i) => {
            const key = which + "|" + x, on = !!done[key];
            return (
              <div key={i} onClick={() => toggle(key)} style={{ padding: "8px 2px", fontSize: 14.5, cursor: "pointer", borderBottom: "1px solid #F0F3F7", textDecoration: on ? "line-through" : "none", color: on ? "#8A97A6" : "#222" }}>
                {on ? "☑" : "☐"} {x}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Depart() {
  const [sub, setSub] = useState("tax");
  const left = daysToDepart();
  const tabs = [["tax", "💰退稅"], ["customs", "🇹🇼海關"], ["pack", "🧳打包"], ["sos", "☎️急難"]];
  return (
    <div>
      <div style={{ ...S.card, background: "linear-gradient(135deg,#1F3864,#2E5C8A)", color: "#fff", padding: "12px 14px" }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>EK086 蘇黎世起飛 8/6(四) 22:00</div>
        <div style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{left > 0 ? `還有 ${left} 天離開歐洲` : "今日離境"}</div>
        <div style={{ fontSize: 12.5, opacity: 0.9, marginTop: 2 }}>🔴 先退稅蓋章,再托運行李——海關要查驗商品</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {tabs.map(([k, lb]) => (
          <button key={k} onClick={() => setSub(k)} style={{ flex: "1 0 auto", padding: "9px 12px", borderRadius: 8, border: "1px solid #D5DDE6", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: sub === k ? "#C8102E" : "#fff", color: sub === k ? "#fff" : "#5A6B7E" }}>{lb}</button>
        ))}
      </div>
      {sub === "tax" && <TaxRefund />}
      {sub === "customs" && <Customs />}
      {sub === "pack" && <Packing />}
      {sub === "sos" && <EmergencyCard />}
    </div>
  );
}



/* ==========================================================================
   📍 nearby — 附近地點雷達（可跨 App 複用模組）
   --------------------------------------------------------------------------
   複用方式：其他 App（如主任 App）只需提供自己的「地點包」，UI 與引擎不動。

   資料契約 Place：
     { id, n, en?, lat?, lon?, r?, ct?, pl?, cuisine?, badge?, note?, pid?,
       city?, area?, openNow?, src }            // src: pack | fine | live
     lat/lon 缺席 = 只能同城顯示，不算距離（誠實標示，不假造）

   三層資料：
     L1 pack  沿線精選（離線，有座標）  ← 各 App 自備
     L2 fine  權威名單（離線，多半無座標）← 各 App 自備
     L3 live  即時搜尋（Google Places）  ← 需金鑰，任何地點都能用
   ========================================================================== */

const NEARBY_KEY_LS = "wang.swiss.gkey";
const NEARBY_KEY_DEFAULT = "";   // 🔴 絕不內建金鑰:公開網頁=公開金鑰。金鑰只存使用者本機 localStorage
const getGKey = () => { try { return (localStorage.getItem(NEARBY_KEY_LS) || NEARBY_KEY_DEFAULT).trim(); } catch { return NEARBY_KEY_DEFAULT; } };
const hasGKey = () => !!getGKey();

/* ---- 引擎：純函式，無 UI 相依 ---- */
const nb = {
  dist,                                   // 沿用 v1 haversine(公尺)
  walkMin: m => Math.max(1, Math.round(m / 80)),
  fmt: m => m > 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m",
  withDist(list, pos) {
    return list.map(p => ({ ...p, d: (pos && p.lat != null) ? dist(pos, p) : null }));
  },
  filter(list, f) {
    return list.filter(p => {
      if (f.minR && !(p.r >= f.minR)) return false;
      if (f.minCt && !(p.ct >= f.minCt)) return false;
      if (f.maxPl && !(p.pl && p.pl <= f.maxPl)) return false;
      if (f.openNow && p.openNow !== true) return false;
      if (f.cuisine && f.cuisine !== "all" && p.cuisine !== f.cuisine) return false;
      if (f.badge && f.badge !== "all" && !(p.badge || []).includes(f.badge)) return false;
      if (f.q) { const q = f.q.toLowerCase(); if (!((p.n + " " + (p.en || "") + " " + (p.note || "") + " " + (p.cuisine || "")).toLowerCase().includes(q))) return false; }
      return true;
    });
  },
  sort(list, by) {
    const a = [...list];
    if (by === "rating") a.sort((x, y) => (y.r || 0) - (x.r || 0) || (y.ct || 0) - (x.ct || 0));
    else a.sort((x, y) => (x.d == null ? 1 : y.d == null ? -1 : x.d - y.d));  // 無座標排最後
    return a;
  },
  mapsNav: p => p.lat != null
    ? "https://www.google.com/maps/dir/?api=1&destination=" + p.lat + "," + p.lon + (p.pid ? "&destination_place_id=" + p.pid : "") + "&travelmode=walking"
    : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.n + " " + (p.city || "")),
  mapsInfo: p => p.pid
    ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.n) + "&query_place_id=" + p.pid
    : "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.n + " " + (p.city || p.area || "")),
  /* L3 即時搜尋：Google Places API (New) */
  async live(pos, { radius = 1500, max = 20, keyword = "" } = {}) {
    const key = getGKey();
    if (!key) throw new Error("尚未設定金鑰——請到「更多→工具→🔑 附近搜尋金鑰」貼上你的 Google API 金鑰(只存這支手機,不會上傳)");
    const fields = "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours.openNow,places.primaryTypeDisplayName";
    const useText = !!keyword;
    const url = "https://places.googleapis.com/v1/places:" + (useText ? "searchText" : "searchNearby");
    const body = useText
      ? { textQuery: keyword, maxResultCount: max, languageCode: "zh-TW",
          locationBias: { circle: { center: { latitude: pos.lat, longitude: pos.lon }, radius } } }
      : { includedTypes: ["restaurant"], maxResultCount: max, rankPreference: "DISTANCE", languageCode: "zh-TW",
          locationRestriction: { circle: { center: { latitude: pos.lat, longitude: pos.lon }, radius } } };
    const res = await fetch(url, { method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fields },
      body: JSON.stringify(body) });
    if (!res.ok) { const t = await res.text(); throw new Error("Places API " + res.status + ": " + t.slice(0, 160)); }
    const j = await res.json();
    const PLMAP = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
    return (j.places || []).map(p => ({
      id: "live_" + p.id, pid: p.id, src: "live",
      n: (p.displayName && p.displayName.text) || "(無名)",
      area: p.formattedAddress, cuisine: p.primaryTypeDisplayName && p.primaryTypeDisplayName.text,
      lat: p.location && p.location.latitude, lon: p.location && p.location.longitude,
      r: p.rating, ct: p.userRatingCount, pl: PLMAP[p.priceLevel] || null,
      openNow: p.currentOpeningHours ? p.currentOpeningHours.openNow : undefined,
    }));
  },
};

/* ---- 共用卡片 ---- */
const BADGE_TXT = { "3": "⭐⭐⭐ 三星", "2": "⭐⭐ 二星", "1": "⭐ 一星", "p": "🍽 必比登/推薦" };
function NearbyCard({ p, isDXB }) {
  const PL = isDXB ? PL_TXT_AE : PL_TXT;
  return (
    <div style={{ ...S.card, padding: "11px 13px", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 15.5 }}>{p.n}{p.en && p.en !== p.n && <span style={{ fontSize: 12, color: "#8A97A6", fontWeight: 400 }}> {p.en}</span>}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#C8102E", whiteSpace: "nowrap" }}>
          {p.d != null ? <>{nb.fmt(p.d)}<span style={{ fontSize: 11.5, color: "#8A97A6", fontWeight: 400 }}> 步行~{nb.walkMin(p.d)}分</span></>
            : <span style={{ fontSize: 11.5, color: "#8A97A6", fontWeight: 600 }}>同城・未定位</span>}
        </div>
      </div>
      <div style={{ fontSize: 13, marginTop: 3, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {p.r != null && <span><span style={{ color: "#E8A400", fontWeight: 800 }}>★{p.r}</span>{p.ct != null && <span style={{ color: "#8A97A6" }}> ({p.ct.toLocaleString()})</span>}</span>}
        {p.pl && <span style={{ color: "#2E7D32", fontWeight: 700 }}>{PL[p.pl]}/人</span>}
        {p.cuisine && <span style={{ background: "#EEF2F6", color: "#5A6B7E", borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{p.cuisine}</span>}
        {(p.badge || []).map(b => <span key={b} style={{ background: "#FFF3F3", color: "#C8102E", borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 800 }}>{BADGE_TXT[b] || b}</span>)}
        {p.openNow === true && <span style={{ color: "#2E7D32", fontWeight: 800, fontSize: 12 }}>🟢 營業中</span>}
        {p.openNow === false && <span style={{ color: "#C8102E", fontWeight: 800, fontSize: 12 }}>🔴 休息中</span>}
      </div>
      {(p.note || p.area) && <div style={{ fontSize: 12.5, color: (p.note || "").indexOf("⚠️") >= 0 ? "#C8102E" : "#5A6B7E", marginTop: 3 }}>{p.note || p.area}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 7 }}>
        <a href={nb.mapsNav(p)} target="_blank" rel="noreferrer" style={{ ...S.chipBtn, flex: 1, textAlign: "center", padding: "8px 0" }}>🧭 導航</a>
        <a href={nb.mapsInfo(p)} target="_blank" rel="noreferrer" style={{ ...S.chipBtn, flex: 1, textAlign: "center", padding: "8px 0", background: "#1F3864" }}>💬 評論/營業時間</a>
      </div>
    </div>
  );
}

/* ---- 篩選列 ---- */
function FilterBar({ f, setF, cuisines, badges }) {
  const T = ({ on, k, v, label }) => (
    <button onClick={() => setF({ ...f, [k]: on ? undefined : v })}
      style={{ padding: "6px 10px", borderRadius: 14, fontSize: 12.5, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: on ? "none" : "1px solid #D5DDE6", background: on ? "#1F3864" : "#fff", color: on ? "#fff" : "#5A6B7E" }}>{label}</button>
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
        <T on={f.minR === 4.4} k="minR" v={4.4} label="★4.4以上" />
        <T on={f.minCt === 500} k="minCt" v={500} label="500+評論" />
        <T on={f.maxPl === 2} k="maxPl" v={2} label="$$以下" />
        <T on={f.openNow} k="openNow" v={true} label="🟢營業中" />
      </div>
      {(badges && badges.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          {["all", ...badges].map(b => (
            <button key={b} onClick={() => setF({ ...f, badge: b })}
              style={{ padding: "5px 10px", borderRadius: 14, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: (f.badge || "all") === b ? "none" : "1px solid #D5DDE6", background: (f.badge || "all") === b ? "#C8102E" : "#fff", color: (f.badge || "all") === b ? "#fff" : "#5A6B7E" }}>
              {b === "all" ? "全部" : (BADGE_TXT[b] || b)}
            </button>
          ))}
        </div>
      )}
      {(cuisines && cuisines.length > 1) && (
        <select value={f.cuisine || "all"} onChange={e => setF({ ...f, cuisine: e.target.value })} style={{ ...S.select, width: "100%", marginTop: 6 }}>
          <option value="all">全部菜系（{cuisines.length}）</option>
          {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
    </div>
  );
}

/* ---- L2：權威名店（依城市） ---- */
const FINE_CITY_BY_DAY = { 1: "Zürich", 2: "Luzern", 3: "Luzern", 4: "Interlaken", 5: "Interlaken", 6: "Grindelwald", 7: "Zermatt", 8: "Zermatt", 9: "Zermatt", 10: "St. Moritz", 11: "St. Moritz", 12: "Zürich", 13: "Zürich", 14: "Zürich", 15: "杜拜" };
function FineList({ dayIdx, pos }) {
  const all = [...FINE.ch.map(x => ({ ...x, src: "fine", region: "ch" })), ...FINE.ae.map(x => ({ ...x, src: "fine", region: "ae" }))];
  const cities = [...new Set(all.map(x => x.city))].sort();
  const [city, setCity] = useState(FINE_CITY_BY_DAY[dayIdx] || "Zürich");
  const [f, setF] = useState({});
  const inCity = all.filter(x => x.city === city);
  const cuisines = [...new Set(inCity.map(x => x.cuisine))].sort();
  const badges = [...new Set(inCity.flatMap(x => x.badge))];
  const list = nb.sort(nb.filter(nb.withDist(inCity, pos), f), "rating");
  const isDXB = city === "杜拜";
  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>⭐ 權威名店（米其林／必比登 {all.length} 家）</div>
        <select value={city} onChange={e => { setCity(e.target.value); setF({}); }} style={{ ...S.select, width: "100%", fontSize: 15, fontWeight: 700 }}>
          {cities.map(c => <option key={c} value={c}>{c}（{all.filter(x => x.city === c).length}）{FINE_CITY_BY_DAY[dayIdx] === c ? " ・今日" : ""}</option>)}
        </select>
        <FilterBar f={f} setF={setF} cuisines={cuisines} badges={badges} />
        <div style={{ fontSize: 12, color: "#8A97A6", marginTop: 6 }}>此名單為米其林指南資料，沒有座標，故不顯示距離；點「評論」直接開 Google 地圖看實際位置與營業時間。高價位餐廳務必先訂位。</div>
      </div>
      {list.map(p => <NearbyCard key={p.id} p={p} isDXB={isDXB} />)}
      {list.length === 0 && <div style={{ ...S.card, color: "#8A97A6", textAlign: "center" }}>此城市沒有符合篩選的名店</div>}
    </div>
  );
}

/* ---- L3：即時搜尋我現在附近 ---- */
function LiveNearby({ pos, err }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [radius, setRadius] = useState(1500);
  const [kw, setKw] = useState("");
  const [f, setF] = useState({});
  const go = async () => {
    if (!pos) { setMsg("尚未取得定位：請允許位置權限後再試"); return; }
    setBusy(true); setMsg("");
    try {
      const r = await nb.live(pos, { radius, keyword: kw.trim() });
      setItems(r);
      if (!r.length) setMsg("這個範圍內沒有找到餐廳，試著放大範圍");
    } catch (e) { setMsg("查詢失敗：" + e.message); }
    setBusy(false);
  };
  const list = items ? nb.sort(nb.filter(nb.withDist(items, pos), f), "dist") : [];
  return (
    <div>
      <div style={S.card}>
        <div style={S.secTitle}>📍 搜我現在位置附近</div>
        <div style={{ fontSize: 12.5, color: "#5A6B7E", marginBottom: 8 }}>不必事先建檔，任何地點都能用（Google 即時資料，需網路）。</div>
        {!hasGKey() && <div style={{ ...S.warnBox, background: "#FFF3F3", color: "#C8102E", marginBottom: 8 }}>🔑 尚未設定金鑰。到「更多 → 工具 → 🔑 附近搜尋金鑰」貼上你的 Google API 金鑰即可使用。金鑰只存在這支手機，不會進入網頁原始碼。</div>}
        <input value={kw} onChange={e => setKw(e.target.value)} data-kw="1" placeholder="想吃什麼？留空=所有餐廳（例：pizza、素食、拉麵）" style={{ ...S.input, width: "100%", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[500, 1000, 1500, 3000].map(r => (
            <button key={r} onClick={() => setRadius(r)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer", border: radius === r ? "none" : "1px solid #D5DDE6", background: radius === r ? "#1F3864" : "#fff", color: radius === r ? "#fff" : "#5A6B7E" }}>{r < 1000 ? r + "m" : (r / 1000) + "km"}</button>
          ))}
        </div>
        <button style={{ ...S.primaryBtn, width: "100%", marginTop: 8 }} disabled={busy} onClick={go}>{busy ? "查詢中…" : "🔍 搜尋附近餐廳"}</button>
        <div style={{ fontSize: 12, color: pos ? "#8A97A6" : "#C8102E", marginTop: 6 }}>{pos ? `📍 已定位（精度±${Math.round(pos.acc || 0)}m）` : (err || "定位中…請允許位置權限")}</div>
        {items && <FilterBar f={f} setF={setF} />}
        {msg && <div style={{ ...S.warnBox }}>{msg}</div>}
      </div>
      {list.map(p => <NearbyCard key={p.id} p={p} />)}
      {items && list.length > 0 && <div style={{ ...S.card, fontSize: 12.5, color: "#5A6B7E" }}>依直線距離排序。星等與營業狀態為 Google 即時資料；小店評論數少不代表不好吃。</div>}
    </div>
  );
}

/* ---- 餐廳總頁：三層合一 ---- */
function EatHub({ dayIdx }) {
  const [sub, setSub] = useState("pack");
  const [pos, setPos] = useState(null);
  const [err, setErr] = useState(null);
  const watch = useRef(null);
  useEffect(() => {
    if (!navigator.geolocation) { setErr("此裝置不支援定位"); return; }
    watch.current = navigator.geolocation.watchPosition(
      p => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      e => setErr("定位失敗：請允許位置權限（" + e.message + "）"),
      { enableHighAccuracy: true, maximumAge: 10000 });
    return () => watch.current && navigator.geolocation.clearWatch(watch.current);
  }, []);
  const tabs = [["pack", "🍽沿線精選"], ["fine", "⭐名店"], ["live", "📍即時附近"]];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {tabs.map(([k, lb]) => (
          <button key={k} onClick={() => setSub(k)} style={{ flex: "1 0 auto", whiteSpace: "nowrap", padding: "9px 12px", borderRadius: 8, border: "1px solid #D5DDE6", fontSize: 13, fontWeight: 700, cursor: "pointer", background: sub === k ? "#C8102E" : "#fff", color: sub === k ? "#fff" : "#5A6B7E" }}>{lb}</button>
        ))}
      </div>
      {sub === "pack" && <Backups dayIdx={dayIdx} />}
      {sub === "fine" && <FineList dayIdx={dayIdx} pos={pos} />}
      {sub === "live" && <LiveNearby pos={pos} err={err} />}
    </div>
  );
}

/* ---- 金鑰設定（工具卡用；其他 App 沿用時只需改 NEARBY_KEY_LS） ---- */
function GKeySetting() {
  const [v, setV] = useState(() => { try { return localStorage.getItem(NEARBY_KEY_LS) || ""; } catch { return ""; } });
  const [msg, setMsg] = useState("");
  return (
    <div>
      <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>「餐廳→📍即時附近」用 Google Places 查詢現在位置周邊，需要一把 Google API 金鑰。<b>金鑰只存在這支手機</b>（localStorage），不會寫進網頁原始碼、不會上傳 GitHub。每支要用的手機各貼一次。</div>
      <input value={v} onChange={e => setV(e.target.value)} type="password" placeholder="貼上金鑰（AIza…）" style={{ ...S.input, width: "100%", boxSizing: "border-box", marginTop: 8 }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button style={{ ...S.primaryBtn, flex: 1 }} onClick={() => { try { v.trim() ? localStorage.setItem(NEARBY_KEY_LS, v.trim()) : localStorage.removeItem(NEARBY_KEY_LS); setMsg(v.trim() ? "已儲存於本機" : "已清除"); } catch { setMsg("儲存失敗"); } }}>儲存</button>
        <button style={{ ...S.ghostBtn, flex: 1, marginTop: 0 }} onClick={() => { try { localStorage.removeItem(NEARBY_KEY_LS); } catch {} setV(""); setMsg("已從本機清除"); }}>清除</button>
      </div>
      {msg && <div style={{ fontSize: 12.5, color: "#2E7D32", marginTop: 6 }}>{msg}</div>}
      <div style={{ fontSize: 12.5, color: "#5A6B7E", marginTop: 6 }}>{hasGKey() ? "✅ 本機已設定金鑰" : "⚠️ 尚未設定，即時附近功能無法使用"}</div>
      <div style={{ ...S.warnBox, marginTop: 8 }}>⚠️ 即使只存本機，仍建議到 Google Cloud 後台為金鑰設定「HTTP 參照網址限制」(只允許 wayuanzi-web.github.io) 並設每日用量上限——手機被撿到時才有第二道防線。</div>
    </div>
  );
}
