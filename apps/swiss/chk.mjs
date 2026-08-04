import fs from "fs"; import { JSDOM } from "jsdom";
const html = fs.readFileSync("/home/claude/travel-suite/swiss/index.html","utf8");
const dom = new JSDOM(html,{runScripts:"dangerously",url:"https://e.test/travel-suite/swiss/",pretendToBeVisual:true,
  beforeParse(w){ w.localStorage.setItem("wang.swiss.gate","1"); w.localStorage.setItem("wang.swiss.user","遠志");
    w.SpeechSynthesisUtterance=function(t){this.text=t;}; w.speechSynthesis={speak(){},cancel(){}};
    w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>"x"; w.navigator.geolocation=undefined;
    w.fetch=()=>Promise.reject(new Error("off")); }});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(400);
const doc=dom.window.document;
const R=()=>doc.getElementById("root").textContent;
const nav=(dir)=>{const b=[...doc.querySelectorAll("button")].filter(e=>e.textContent.includes(dir)&&!e.disabled).pop();
  if(b) b.dispatchEvent(new doc.defaultView.MouseEvent("click",{bubbles:true})); return !!b;};
// 走到 Day12
for(let i=0;i<20;i++){ if(R().includes("Day 12")) break; if(!nav("▶")) break; await wait(150); }
await wait(300);
const t=R();
console.log("目前:", t.match(/Day \d+・[^\s]+/)?.[0]);
for(const [n,s] of [["Haus Hiltl 餐廳卡","Haus Hiltl"],["Zeughauskeller 餐廳卡","Zeughauskeller"],
  ["Hiltl 星等","4.6"],["Hiltl 評論數","10,084"],["亮點標語","1898"],["導航鈕","怎麼走"]])
  console.log((t.includes(s)?"  ✓ 有 ":"  ✗ 無 ")+n);
console.log("\n今日餐廳區塊:", t.includes("今日餐廳")?"有":"無");
// 數一下畫面上出現幾次 Hiltl
console.log("Hiltl 出現次數:", (t.match(/Hiltl/g)||[]).length);
console.log("Zeughauskeller 出現次數:", (t.match(/Zeughauskeller/g)||[]).length);
process.exit(0);
