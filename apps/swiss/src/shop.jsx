
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

/* ---------- 採購倒數 ---------- */
function BuyCountdown() {
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
        return (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: "1px solid #F0F3F7" }}>
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
function GiftList() {
  const { gifts, giftCats, top3, brands } = SHOP;
  const [cat, setCat] = useState("all");
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState("");
  const cats = ["all", ...Object.keys(giftCats).filter(c => gifts.some(g => g.cat === c))];
  let list = gifts.filter(g => (cat === "all" || g.cat === cat) && (!q || g.n.includes(q) || (g.note || "").includes(q)));
  list = [...list].sort((a, b) => (b.pop || 0) - (a.pop || 0));
  const detail = sel && { t3: top3[sel.id], br: brands[sel.id] };
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
            {(top3[g.id] || brands[g.id]) && <button onClick={() => setSel(sel && sel.id === g.id ? null : g)} style={{ ...S.chipBtn, border: "none", cursor: "pointer", background: "#1F3864" }}>{sel && sel.id === g.id ? "收起" : "買什麼款?"}</button>}
          </div>
          {sel && sel.id === g.id && (
            <div style={{ marginTop: 8, background: "#FBFDFF", border: "1px solid #E0E7EF", borderRadius: 8, padding: "10px 12px" }}>
              {detail.br && (
                <>
                  <div style={{ fontSize: 12.5, color: "#2E7D32", fontWeight: 800 }}>{(detail.br.why || []).join("・")}・{detail.br.price}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, marginTop: 4 }}><MD t={detail.br.story} /></div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, marginTop: 6, background: "#FFF8E5", padding: "6px 8px", borderRadius: 6 }}><MD t={detail.br.howto} /></div>
                </>
              )}
              {detail.t3 && detail.t3.map((t, i) => (
                <div key={i} style={{ marginTop: 8, borderTop: "1px dashed #E8EDF3", paddingTop: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#C8102E" }}>TOP{i + 1} {t.n} <span style={{ color: "#2E7D32", fontSize: 12.5 }}>{t.price}</span></div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}><MD t={t.why} /></div>
                  <div style={{ fontSize: 12.5, color: "#5A6B7E" }}>👤 {t.who}</div>
                </div>
              ))}
            </div>
          )}
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
  const [sub, setSub] = useState("count");
  const tabs = [["count", "⏳倒數"], ["gift", "🎁清單"], ["store", "🏬店家"], ["how", "📖怎麼選"]];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {tabs.map(([k, lb]) => (
          <button key={k} onClick={() => setSub(k)} style={{ flex: "1 0 auto", padding: "9px 12px", borderRadius: 8, border: "1px solid #D5DDE6", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", background: sub === k ? "#C8102E" : "#fff", color: sub === k ? "#fff" : "#5A6B7E" }}>{lb}</button>
        ))}
      </div>
      {sub === "count" && <BuyCountdown />}
      {sub === "gift" && <GiftList />}
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
