import fs from "fs"; import { JSDOM } from "jsdom";
const html = fs.readFileSync("/home/claude/travel-suite/swiss/index.html","utf8");
const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://e.test/travel-suite/swiss/",pretendToBeVisual:true,
 beforeParse(w){w.localStorage.setItem("wang.swiss.gate","1");w.localStorage.setItem("wang.swiss.user","遠志");
 w.SpeechSynthesisUtterance=function(t){this.text=t;};w.speechSynthesis={speak(){},cancel(){}};
 w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>"x";w.navigator.geolocation=undefined;
 w.fetch=()=>Promise.reject(new Error("off"));}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(400);
const doc=dom.window.document, R=()=>doc.getElementById("root").textContent;
const go=d=>{const b=[...doc.querySelectorAll("button")].filter(e=>e.textContent.includes(d)&&!e.disabled).pop();
 if(b)b.dispatchEvent(new doc.defaultView.MouseEvent("click",{bubbles:true}));return !!b;};
let fail=0;const ok=(c,n)=>{c?console.log("  ✓ "+n):(console.log("  ✗ "+n),fail=1);};
// Day15 兩個亮點都要出現
for(let i=0;i<20;i++){if(R().includes("Day 15"))break;if(!go("▶"))break;await wait(140);}
await wait(300);
const t=R();
ok(t.includes("Day 15"),"到達 Day15");
ok(t.includes("世界最大購物中心"),"亮點1:世界最大購物中心");
ok(t.includes("世界最大音樂噴泉"),"亮點2:世界最大音樂噴泉(原本被吃掉)");
// 樣式:黃色藥丸
ok([...doc.querySelectorAll("span")].some(s=>s.style.background.includes("255, 248, 229")||s.getAttribute("style")?.includes("FFF8E5")),"樣式:黃色藥丸標籤");
ok(!/undefined|NaN/.test(t),"無 undefined/NaN");
console.log(fail?"\n失敗":"\n亮點還原驗證通過");process.exit(fail);
