import React, { useState, useEffect, useRef, useCallback } from "react";

/* ==========================================================================
   遠志家族旅遊通 swiss 1.0 — travel-suite 沙盒重建
   基底:travel-hub v1 骨架 + v3.12 線上版還原資料(data/*.json)
   設計語彙:瑞士鐵路風格 — SBB藍白紅、時刻表字體、月台看板美學
   資料驅動:換 data/ = 換旅程
   鐵則:原始碼與 index.html 同倉 commit;localStorage 一律 wang.swiss.*;
        絕不讀寫舊版 hub* keys(8/8 前家人旅途資料所在)
   ========================================================================== */
export const APP_VERSION = "swiss 1.5.1 · build 2026-08-03";

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

/* ---------- 逐步指令面板 ---------- */
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
  const [sheet, setSheet] = useState(null);
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
      {sheet && <StepSheet title={sheet.key} steps={sheet.steps} onClose={() => setSheet(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: theme.accent }}>{theme.tag}</div>
        <div style={{ fontSize: 11, color: "#8A97A6" }}>← 左右滑動換日 →</div>
      </div>
      <div style={S.dayNav}>
        <button style={S.arrowBtn} disabled={dayIdx === 0} onClick={() => goto(dayIdx - 1, "left")}>◀ 前一天</button>
        <button style={{ ...S.todayBtn, background: theme.accent }} onClick={() => goto(todayIdx(), "right")}>{fmtDW(day.d)}{isToday(day.d) ? "(今天)" : ""}</button>
        <button style={S.arrowBtn} disabled={dayIdx === TRIP.days.length - 1} onClick={() => goto(dayIdx + 1, "right")}>後一天 ▶</button>
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
                    {st && <button onClick={() => setSheet(st)} style={{ ...S.chipBtn, border: "none", cursor: "pointer", marginLeft: 6, background: "#1F3864" }}>🧭怎麼走?</button>}
                    {(() => { const h = HL_KEYS.find(k => a.includes(k)); return h ? <div style={{ fontSize: 12, color: "#C8102E", fontWeight: 700, marginTop: 2 }}>{HIGHLIGHT[h]}</div> : null; })()}
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
