import { useState, useEffect, useCallback } from "react";

const ALPHA_KEY = "B79Y1937UOCMMZMS";

const PORTFOLIO = [
  { ticker: "RKLB", name: "Rocket Lab",            sector: "Uzay",              shares: 2.38, avgCost: 84,   analystTarget: 105,  analystHigh: 120,  color: "#00FF87" },
  { ticker: "BWXT", name: "BWX Technologies",       sector: "Nükleer",           shares: 0.49, avgCost: 205,  analystTarget: 234,  analystHigh: 290,  color: "#00D4FF" },
  { ticker: "RTX",  name: "Raytheon Technologies",  sector: "Savunma",           shares: 0.57, avgCost: 175,  analystTarget: 204,  analystHigh: 250,  color: "#FF6B35" },
  { ticker: "AXON", name: "Axon Enterprise",        sector: "Kamu Güvenliği AI", shares: 0.25, avgCost: 400,  analystTarget: 713,  analystHigh: 825,  color: "#FFD700" },
  { ticker: "LMT",  name: "Lockheed Martin",        sector: "Savunma",           shares: 0.19, avgCost: 513,  analystTarget: 603,  analystHigh: 700,  color: "#FF3CAC" },
  { ticker: "GEV",  name: "GE Vernova",             sector: "AI Enerji",         shares: 0.09, avgCost: 1148, analystTarget: 1400, analystHigh: 1600, color: "#B388FF" },
];

const NEWS = {
  RKLB: ["Backlog $2.2 milyara ulaştı — rekor", "Q1 geliri $200.3M beklentiyi geçti", "Neutron ilk uçuş 2026 içinde — takvim tuttu"],
  BWXT: ["$1.4 milyar ABD Donanması kontratı imzalandı", "Uranyum zenginleştirme NRC başvurusu yapıldı", "Q1 EPS $1.12 — beklenti $0.92'yi %22 geçti"],
  RTX:  ["AirAsia 150 A220 — 12 yıllık bakım anlaşması", "$833M + $441M + $335M tek haftada 3 kontrat", "Morningstar adil değer $282 — %37 iskonto"],
  AXON: ["ARR $1.5 milyar (+%35 YoY)", "Dedrone bookings %500, counter-drone konumlandı", "Future contracted bookings $14.3 milyar (+%44)"],
  LMT:  ["Space Force Space-Based Interceptor seçildi", "$1.13 milyar HIMARS kontratı Nisan'da imzalandı", "Q1 nakit akışı negatif — Q2 düzelmesi bekleniyor"],
  GEV:  ["Backlog $135 milyardan $200 milyara çıkıyor", "Microsoft Google Amazon enerji için GEV'e bağımlı", "2025-2028 EBITDA CAGR %54 bekleniyor"],
};

const SIGNALS = {
  RKLB: { signal: "KADEMELI AL", reason: "Earnings mükemmel, Neutron takvimde, $2.2B backlog rekor" },
  BWXT: { signal: "AL",          reason: "Earnings sonrası geri çekilme fırsatı, Donanma monopol" },
  RTX:  { signal: "AL",          reason: "Morningstar %37 iskonto, haftalık 3 büyük kontrat" },
  AXON: { signal: "İZLE",        reason: "Q2 sonrası giriş — $370-380 ideal, coşku soğusun" },
  LMT:  { signal: "BEKLE",       reason: "Ağustos planı — Q2 nakit akışı düzelirse giriş" },
  GEV:  { signal: "İZLE",        reason: "AI enerji altyapısı 10 yıllık tez — fraksiyonel hazırla" },
};

const SIGNAL_COLORS = { "AL": "#00FF87", "KADEMELI AL": "#00D4FF", "İZLE": "#FFD700", "BEKLE": "#FF6B35" };

const PLAN = [
  { month: "MAYIS 2026",   ticker: "BWXT", amount: 50,  note: "Earnings sonrası geri çekilme",  color: "#00D4FF" },
  { month: "MAYIS 2026",   ticker: "RTX",  amount: 50,  note: "Morningstar %37 iskonto",         color: "#FF6B35" },
  { month: "HAZİRAN 2026", ticker: "BWXT", amount: 50,  note: "DCA — ikinci alım",               color: "#00D4FF" },
  { month: "HAZİRAN 2026", ticker: "RTX",  amount: 50,  note: "DCA — ikinci alım",               color: "#FF6B35" },
  { month: "TEMMUZ 2026",  ticker: "AXON", amount: 100, note: "Q2 sonrası giriş",                color: "#FFD700" },
  { month: "AĞUSTOS 2026", ticker: "LMT",  amount: 100, note: "Q2 nakit akışı düzelirse gir",    color: "#FF3CAC" },
  { month: "EYLÜL 2026",   ticker: "RKLB", amount: 100, note: "Neutron gelişmelerine göre",      color: "#00FF87" },
  { month: "EKİM 2026",    ticker: "GEV",  amount: 100, note: "AI enerji teması — fraksiyonel",  color: "#B388FF" },
];

export default function AladdinRobot() {
  const [prices, setPrices]     = useState({});
  const [loading, setLoading]   = useState({});
  const [priceLoad, setPriceLoad] = useState(true);
  const [priceErr, setPriceErr]  = useState(false);
  const [analysis, setAnalysis] = useState({});
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("portfolio");
  const [fetchIdx, setFetchIdx] = useState(0);

  // Alpha Vantage ücretsiz: dakikada 5 istek — hisseleri sırayla çek
  useEffect(() => {
    const tickers = PORTFOLIO.map(p => p.ticker);
    if (fetchIdx >= tickers.length) { setPriceLoad(false); return; }

    const ticker = tickers[fetchIdx];
    fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_KEY}`)
      .then(r => r.json())
      .then(data => {
        const q = data["Global Quote"];
        if (q && q["05. price"]) {
          setPrices(prev => ({
            ...prev,
            [ticker]: {
              price:   parseFloat(q["05. price"]),
              change:  parseFloat(q["09. change"]),
              changeP: parseFloat(q["10. change percent"]),
            }
          }));
        }
        // 13 saniye bekle — dakikada 5 istek limiti için güvenli aralık
        setTimeout(() => setFetchIdx(i => i + 1), 13000);
      })
      .catch(() => {
        setPriceErr(true);
        setPriceLoad(false);
      });
  }, [fetchIdx]);

  const getPrice = (ticker) => prices[ticker] || { price: PORTFOLIO.find(p=>p.ticker===ticker)?.avgCost, change: 0, changeP: 0 };

  const totalCost  = PORTFOLIO.reduce((s,x) => s + x.shares * x.avgCost, 0);
  const totalValue = PORTFOLIO.reduce((s,x) => s + x.shares * (prices[x.ticker]?.price || x.avgCost), 0);
  const totalPnl   = totalValue - totalCost;
  const totalPnlP  = ((totalPnl / totalCost) * 100).toFixed(2);

  const getAnalysis = useCallback(async (ticker) => {
    if (analysis[ticker] || loading[ticker]) return;
    setLoading(prev => ({ ...prev, [ticker]: true }));
    const stock  = PORTFOLIO.find(s => s.ticker === ticker);
    const p      = getPrice(ticker);
    const signal = SIGNALS[ticker];
    const pnlP   = (((p.price - stock.avgCost) / stock.avgCost) * 100).toFixed(1);
    const toTgt  = (((stock.analystTarget - p.price) / p.price) * 100).toFixed(1);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `Sen BlackRock Aladdin sisteminin Türkçe konuşan yapay zeka yatırım stratejistisin. Kısa, net, veri odaklı yaz. SADECE JSON döndür: {"boga":"...","ayi":"...","eylem":"...","ozet":"..."} Her alan max 2 cümle.`,
          messages: [{ role: "user", content: `${stock.name} (${ticker}) analiz:\nFiyat: $${p.price} | Günlük: %${p.changeP}\nMaliyet: $${stock.avgCost} | PnL: %${pnlP}\nHedef: $${stock.analystTarget} (uzaklık: %${toTgt})\nSektör: ${stock.sector}\nHaberler: ${NEWS[ticker].join(" | ")}\nSinyal: ${signal.signal} — ${signal.reason}` }]
        })
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
      setAnalysis(prev => ({ ...prev, [ticker]: parsed }));
    } catch {
      setAnalysis(prev => ({ ...prev, [ticker]: { boga: "Güçlü backlog ve kontrat büyümesi.", ayi: "Değerleme ve makro riskler izlenmeli.", eylem: signal.reason, ozet: `${ticker} — ${signal.signal}` }}));
    }
    setLoading(prev => ({ ...prev, [ticker]: false }));
  }, [analysis, loading, prices]);

  const S = {
    app: { minHeight:"100vh", background:"#030303", fontFamily:"'IBM Plex Mono',monospace", color:"#d0d0d0", position:"relative" },
    grid: { position:"fixed", inset:0, pointerEvents:"none", backgroundImage:"linear-gradient(rgba(0,255,135,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,135,0.025) 1px,transparent 1px)", backgroundSize:"44px 44px" },
    wrap: { position:"relative", zIndex:2, maxWidth:"860px", margin:"0 auto", padding:"20px 14px 40px" },
    header: { textAlign:"center", marginBottom:"24px" },
    htag: { fontSize:"9px", letterSpacing:"0.45em", color:"#00FF87", opacity:0.55, marginBottom:"6px" },
    htitle: { fontSize:"clamp(20px,5vw,28px)", fontWeight:700, background:"linear-gradient(135deg,#00FF87,#00D4FF)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:"4px" },
    hsub: { fontSize:"9px", color:"#222", letterSpacing:"0.2em" },
    summGrid: { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"20px" },
    summCard: { background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:"4px", padding:"12px 10px", textAlign:"center" },
    summLabel: { fontSize:"8px", letterSpacing:"0.3em", color:"#333", marginBottom:"5px", display:"block" },
    summVal: { fontSize:"clamp(14px,4vw,19px)", fontWeight:700 },
    tabs: { display:"flex", marginBottom:"16px", borderBottom:"1px solid rgba(255,255,255,0.05)" },
    tab: (a) => ({ padding:"8px 14px", fontSize:"9px", letterSpacing:"0.2em", cursor:"pointer", border:"none", background:"transparent", color:a?"#00FF87":"#333", borderBottom:a?"2px solid #00FF87":"2px solid transparent", fontFamily:"inherit", transition:"all 0.15s" }),
    card: (a,c) => ({ background:a?`rgba(${hRgb(c)},0.04)`:"rgba(255,255,255,0.018)", border:`1px solid ${a?c+"44":"rgba(255,255,255,0.055)"}`, borderLeft:`3px solid ${c}`, borderRadius:"4px", padding:"14px", marginBottom:"10px", cursor:"pointer", transition:"all 0.18s" }),
    cardRow: { display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" },
    bar: { height:"3px", background:"rgba(255,255,255,0.04)", borderRadius:"2px", marginTop:"10px", overflow:"hidden" },
    detail: { background:"rgba(0,255,135,0.015)", border:"1px solid rgba(0,255,135,0.1)", borderRadius:"4px", padding:"14px", marginTop:"8px" },
    aiGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginTop:"10px" },
    aiBox: (c,f) => ({ background:"rgba(255,255,255,0.018)", borderLeft:`2px solid ${c}`, borderRadius:"4px", padding:"10px", ...(f?{gridColumn:"1/-1"}:{}) }),
    planCard: { background:"rgba(255,255,255,0.018)", border:"1px solid rgba(255,255,255,0.055)", borderRadius:"4px", padding:"12px 14px", marginBottom:"8px", display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" },
    loadBanner: { textAlign:"center", padding:"12px", background:"rgba(0,255,135,0.05)", border:"1px solid rgba(0,255,135,0.15)", borderRadius:"4px", marginBottom:"16px", fontSize:"11px", color:"#00FF87", letterSpacing:"0.15em" },
  };

  function hRgb(hex) {
    return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
  }

  const loaded = Object.keys(prices).length;
  const total  = PORTFOLIO.length;

  return (
    <div style={S.app}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap'); @keyframes blink{0%,100%{opacity:1}50%{opacity:0}} *{box-sizing:border-box;margin:0;padding:0} body{background:#030303}`}</style>
      <div style={S.grid}/>
      <div style={S.wrap}>

        {/* HEADER */}
        <div style={S.header}>
          <p style={S.htag}>BLACKROCK ALADDIN — KİŞİSEL</p>
          <h1 style={S.htitle}>PORTFOLIO INTELLIGENCE</h1>
          <p style={S.hsub}>CANLI FİYAT — ALPHA VANTAGE — v2.0</p>
        </div>

        {/* FİYAT YÜKLEME BANNER */}
        {priceLoad && (
          <div style={S.loadBanner}>
            <span style={{animation:"blink 1s infinite"}}>●</span>
            {" "} CANLI FİYATLAR YÜKLENİYOR... {loaded}/{total} hisse
            <div style={{fontSize:"9px", color:"#00FF8788", marginTop:"4px"}}>
              API limiti nedeniyle ~{(total-loaded)*13} saniye kaldı
            </div>
          </div>
        )}
        {priceErr && (
          <div style={{...S.loadBanner, background:"rgba(255,60,60,0.05)", borderColor:"rgba(255,60,60,0.2)", color:"#FF6B6B"}}>
            ⚠ Fiyat yüklenemedi — son bilinen değerler gösteriliyor
          </div>
        )}

        {/* ÖZET */}
        <div style={S.summGrid}>
          <div style={S.summCard}>
            <span style={S.summLabel}>TOPLAM MALİYET</span>
            <div style={{...S.summVal, color:"#555"}}>${totalCost.toFixed(0)}</div>
          </div>
          <div style={S.summCard}>
            <span style={S.summLabel}>GÜNCEL DEĞER</span>
            <div style={{...S.summVal, color:"#00FF87"}}>${totalValue.toFixed(0)}</div>
          </div>
          <div style={S.summCard}>
            <span style={S.summLabel}>KAR / ZARAR</span>
            <div style={{...S.summVal, color:totalPnl>=0?"#00FF87":"#FF3CAC"}}>
              {totalPnl>=0?"+":""}{totalPnl.toFixed(0)}$
            </div>
            <div style={{fontSize:"10px", color:"#444", marginTop:"2px"}}>{totalPnlP}%</div>
          </div>
        </div>

        {/* TABS */}
        <div style={S.tabs}>
          {[["portfolio","📊 PORTFÖY"],["plan","📅 PLAN"],["info","ℹ BİLGİ"]].map(([t,l])=>(
            <button key={t} style={S.tab(activeTab===t)} onClick={()=>setActiveTab(t)}>{l}</button>
          ))}
        </div>

        {/* PORTFÖY */}
        {activeTab==="portfolio" && PORTFOLIO.map(stock => {
          const p      = getPrice(stock.ticker);
          const sig    = SIGNALS[stock.ticker];
          const isOpen = selected === stock.ticker;
          const pnl    = (p.price - stock.avgCost) * stock.shares;
          const pnlP   = ((p.price - stock.avgCost) / stock.avgCost * 100).toFixed(1);
          const prog   = (p.price / stock.analystTarget) * 100;
          const isPos  = p.changeP >= 0;
          const isPnlP = pnl >= 0;
          const hasLive = !!prices[stock.ticker];

          return (
            <div key={stock.ticker}>
              <div style={S.card(isOpen, stock.color)} onClick={()=>{ setSelected(isOpen?null:stock.ticker); if(!isOpen) getAnalysis(stock.ticker); }}>
                <div style={S.cardRow}>
                  <div style={{flex:1, minWidth:"120px"}}>
                    <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap", marginBottom:"2px"}}>
                      <span style={{fontSize:"16px", fontWeight:700, color:stock.color, letterSpacing:"0.08em"}}>{stock.ticker}</span>
                      <span style={{fontSize:"8px", color:stock.color, opacity:0.6, border:`1px solid ${stock.color}33`, padding:"1px 5px", borderRadius:"2px"}}>{stock.sector}</span>
                      {hasLive && <span style={{fontSize:"8px", color:"#00FF87", opacity:0.5}}>● CANLI</span>}
                    </div>
                    <div style={{fontSize:"10px", color:"#444"}}>{stock.name}</div>
                  </div>
                  <span style={{fontSize:"8px", fontWeight:700, letterSpacing:"0.12em", padding:"3px 8px", borderRadius:"2px", background:`${SIGNAL_COLORS[sig.signal]}18`, color:SIGNAL_COLORS[sig.signal], border:`1px solid ${SIGNAL_COLORS[sig.signal]}40`}}>
                    {sig.signal}
                  </span>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"16px", fontWeight:600, color:stock.color}}>${p.price.toLocaleString()}</div>
                    <div style={{fontSize:"10px", color:isPos?"#00FF87":"#FF3CAC", marginTop:"1px"}}>{isPos?"▲":"▼"} %{Math.abs(p.changeP).toFixed(2)}</div>
                  </div>
                </div>
                <div style={S.bar}>
                  <div style={{height:"100%", width:`${Math.min(prog,100)}%`, background:`linear-gradient(90deg,${stock.color}55,${stock.color})`, borderRadius:"2px", transition:"width 0.6s"}}/>
                </div>
                <div style={{display:"flex", justifyContent:"space-between", marginTop:"7px", fontSize:"9px", color:"#333", flexWrap:"wrap", gap:"4px"}}>
                  <span>${p.price} → Hedef ${stock.analystTarget.toLocaleString()}</span>
                  <span style={{color:isPnlP?"#00FF87":"#FF3CAC"}}>{isPnlP?"+":""}{pnl.toFixed(1)}$ (%{pnlP})</span>
                </div>
              </div>

              {isOpen && (
                <div style={S.detail}>
                  <p style={{fontSize:"8px", letterSpacing:"0.35em", color:"#00FF87", marginBottom:"12px", opacity:0.65}}>▸ ALADDIN ANALİZ — {stock.ticker}</p>
                  <div style={{marginBottom:"12px"}}>
                    <div style={{fontSize:"8px", color:"#2a2a2a", letterSpacing:"0.2em", marginBottom:"6px"}}>SON HABERLER</div>
                    {NEWS[stock.ticker].map((n,i)=>(
                      <div key={i} style={{fontSize:"11px", color:"#555", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.025)", lineHeight:"1.45"}}>› {n}</div>
                    ))}
                  </div>
                  {loading[stock.ticker] ? (
                    <div style={{textAlign:"center", padding:"20px", fontSize:"11px", color:"#00FF87", letterSpacing:"0.2em"}}>
                      <span style={{animation:"blink 1s infinite"}}>●</span> ALADDIN ANALİZ YAPIYOR...
                    </div>
                  ) : analysis[stock.ticker] ? (
                    <div style={S.aiGrid}>
                      {[["#00FF87","🟢 BOĞA","boga",false],["#FF3CAC","🔴 AYI","ayi",false],["#FFD700","⚡ EYLEM","eylem",true],["#00D4FF","💡 ÖZET","ozet",true]].map(([c,l,k,f])=>(
                        <div key={k} style={S.aiBox(c,f)}>
                          <span style={{fontSize:"8px", letterSpacing:"0.2em", color:c, display:"block", marginBottom:"4px"}}>{l}</span>
                          <div style={{fontSize:"11px", color:"#aaa", lineHeight:"1.55", fontStyle:k==="ozet"?"italic":"normal"}}>{analysis[stock.ticker][k]}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button style={{width:"100%", padding:"10px", background:"transparent", border:"1px solid rgba(0,255,135,0.25)", color:"#00FF87", fontSize:"9px", letterSpacing:"0.3em", cursor:"pointer", borderRadius:"4px", fontFamily:"inherit"}} onClick={()=>getAnalysis(stock.ticker)}>
                      ▸ ALADDIN ANALİZİ BAŞLAT
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* PLAN */}
        {activeTab==="plan" && (
          <div>
            <div style={{fontSize:"9px", color:"#2a2a2a", letterSpacing:"0.25em", marginBottom:"14px"}}>AYLIK $100 DCA PLANI — MAYIS 2026</div>
            {PLAN.map((item,i)=>(
              <div key={i} style={{...S.planCard, borderLeft:`3px solid ${item.color}`}}>
                <div style={{fontSize:"9px", letterSpacing:"0.12em", color:"#333", minWidth:"100px"}}>{item.month}</div>
                <div>
                  <div style={{fontSize:"15px", fontWeight:700, color:item.color}}>{item.ticker}</div>
                  <div style={{fontSize:"10px", color:"#444", marginTop:"2px"}}>{item.note}</div>
                </div>
                <div style={{fontSize:"18px", fontWeight:700, color:"#00FF87", marginLeft:"auto"}}>${item.amount}</div>
              </div>
            ))}
            <div style={{marginTop:"14px", padding:"14px", background:"rgba(255,107,53,0.03)", border:"1px solid rgba(255,107,53,0.1)", borderRadius:"4px"}}>
              <div style={{fontSize:"8px", color:"#FF6B35", letterSpacing:"0.3em", marginBottom:"6px", opacity:0.7}}>PLTR GERİ DÖNÜŞ KOŞULU</div>
              <div style={{fontSize:"11px", color:"#444", lineHeight:"1.7"}}>En erken <strong style={{color:"#666"}}>Kasım 2026</strong> — Q3 earnings sonrası forward F/K 80x altına inerse değerlendir.</div>
            </div>
          </div>
        )}

        {/* BİLGİ */}
        {activeTab==="info" && (
          <div>
            {[["VERİ KAYNAĞI","Alpha Vantage API — canlı fiyat (ücretsiz, dakikada 5 istek)"],["AI MOTORU","Claude Sonnet — her tıklamada canlı Aladdin analizi"],["FİYAT GÜNCELLEME","Otomatik — sayfa her açılışta canlı fiyat çeker"],["STRATEJİ","Aylık $100 DCA, 5-10 yıl, 6 hisse odaklı sepet"],["LİMİT","Ücretsiz API: dakikada 5 istek — 6 hisse ~78 saniyede yüklenir"],["UYARI","Eğitim amaçlıdır. Yatırım tavsiyesi değildir."]].map(([k,v],i)=>(
              <div key={i} style={{display:"flex", gap:"14px", padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.025)", flexWrap:"wrap"}}>
                <span style={{minWidth:"120px", color:"#222", fontSize:"8px", letterSpacing:"0.15em"}}>{k}</span>
                <span style={{fontSize:"11px", color:"#555", flex:1}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{textAlign:"center", marginTop:"28px", fontSize:"8px", color:"#1a1a1a", letterSpacing:"0.2em"}}>
          ALADDIN v2.0 — EĞİTİM AMAÇLIDIR
        </div>
      </div>
    </div>
  );
}
