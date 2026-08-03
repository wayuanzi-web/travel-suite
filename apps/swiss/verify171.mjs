/* 確認 1.7.1 新增內容真的出現在畫面上(更多→離境→退稅) */
import fs from "fs"; import { JSDOM } from "jsdom";
const html = fs.readFileSync("/home/claude/travel-suite/swiss/index.html","utf8");
const dom = new JSDOM(html,{runScripts:"dangerously",url:"https://example.test/travel-suite/swiss/",pretendToBeVisual:true,
  beforeParse(w){ w.localStorage.setItem("wang.swiss.gate","1"); w.localStorage.setItem("wang.swiss.user","遠志");
    w.SpeechSynthesisUtterance=function(t){this.text=t;}; w.speechSynthesis={speak(){},cancel(){}};
    w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>"x"; w.navigator.geolocation=undefined;
    w.fetch=()=>Promise.reject(new Error("offline")); }});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const click=(doc,t)=>{const m=[...doc.querySelectorAll("button,div,a,span")].filter(x=>x.textContent.trim().startsWith(t));
  if(!m.length) throw new Error("找不到:"+t); m[m.length-1].dispatchEvent(new doc.defaultView.MouseEvent("click",{bubbles:true}));};
await wait(400);
const doc=dom.window.document;
click(doc,"☰"); await wait(300);
click(doc,"🛫離境"); await wait(400);
let t=doc.getElementById("root").textContent;
// 若杜拜段需切換,嘗試點杜拜
if(!t.includes("Planet")){ try{ click(doc,"🇦🇪"); await wait(300); t=doc.getElementById("root").textContent; }catch{} }
let fail=0; const ok=(c,n)=>{c?console.log("  ✓ "+n):(console.log("  ✗ "+n),fail=1);};
ok(t.includes("未滿 18 歲辦不了退稅") && t.includes("熙妍"), "新增:未滿18歲不能開標籤(點名熙妍,顯示於警告區)");
ok(t.includes("結帳時一律用大人的護照"), "新增:結帳改用大人護照");
ok(t.includes("驗證是個人行為"), "新增:驗證不可代辦");
ok(t.includes("AED 250"), "原有:門檻仍在");
ok(t.includes("6 小時"), "原有:6小時規則仍在");
ok(!/undefined|NaN/.test(t), "無 undefined/NaN");
console.log(fail?"\n1.7.1 驗證失敗":"\n1.7.1 內容驗證通過");
process.exit(fail);
