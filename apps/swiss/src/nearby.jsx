
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
  // 1.7.4:原本一律用步行 80m/分換算,128km 會算出「步行~1600分」(走26小時)這種
  // 憑空捏造又危險的建議。改為依距離給合理的移動方式,超出市區範圍就不再給分鐘數。
  travel(m) {
    if (m == null) return null;
    if (m <= 1500) return { txt: `步行~${Math.max(1, Math.round(m / 80))}分`, far: false };
    if (m <= 6000) return { txt: `電車/公車~${Math.max(3, Math.round(m / 400))}分`, far: false };
    if (m <= 30000) return { txt: "需搭車", far: true };
    return { txt: "尚未抵達此區", far: true };
  },
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
          {p.d != null ? (() => { const tv = nb.travel(p.d); return (
              <>{nb.fmt(p.d)}<span style={{ fontSize: 11.5, color: tv.far ? "#8A97A6" : "#5A6B7E", fontWeight: 400 }}> {tv.txt}</span></>
            ); })()
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
