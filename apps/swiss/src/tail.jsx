
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
