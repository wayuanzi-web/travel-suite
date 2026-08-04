/* 驗證 1.7.3 兩項 UI 還原:①前後日期顯示 ②逐步指令就地展開(可同時多則) */
import fs from "fs"; import { JSDOM } from "jsdom";
const html=fs.readFileSync("/home/claude/travel-suite/swiss/index.html","utf8");
const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://e.test/travel-suite/swiss/",pretendToBeVisual:true,
 beforeParse(w){w.localStorage.setItem("wang.swiss.gate","1");w.localStorage.setItem("wang.swiss.user","遠志");
 w.SpeechSynthesisUtterance=function(t){this.text=t;};w.speechSynthesis={speak(){},cancel(){}};
 w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>"x";w.navigator.geolocation=undefined;
 w.fetch=()=>Promise.reject(new Error("off"));}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(400);
const doc=dom.window.document, R=()=>doc.getElementById("root").textContent;
const B=()=>[...doc.querySelectorAll("button")];
const nav=a=>{const b=B().filter(e=>e.textContent.includes(a)&&!e.disabled).pop(); if(b)b.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); return !!b;};
let fail=0; const ok=(c,n)=>{c?console.log("  ✓ "+n):(console.log("  ✗ "+n),fail=1);};

// 走到 Day12(8/4,截圖那天)
for(let i=0;i<20;i++){ if(R().includes("Day 12")) break; if(!nav("▶")) break; await wait(140); }
await wait(250);

// ① 前後日期
const prev=B().find(b=>b.textContent.trim().startsWith("◀"));
const next=B().find(b=>b.textContent.trim().endsWith("▶"));
ok(/◀\s*\d{1,2}\/\d{1,2}\([一二三四五六日]\)/.test(prev?.textContent||""), "前一天鈕顯示日期:"+prev?.textContent.trim());
ok(/\d{1,2}\/\d{1,2}\([一二三四五六日]\)\s*▶/.test(next?.textContent||""), "後一天鈕顯示日期:"+next?.textContent.trim());

// ② 就地展開,且可同時開兩則
const steps=B().filter(b=>b.textContent.includes("🧭怎麼走?"));
ok(steps.length>=2, `本日有 ${steps.length} 個怎麼走按鈕`);
steps[0].dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); await wait(120);
ok(!doc.querySelector('[style*="position: fixed"][style*="rgba(0,0,0"]'), "沒有蓋住畫面的彈窗");
const open1=B().filter(b=>b.textContent.includes("關閉導航")).length;
steps[1].dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true})); await wait(120);
const open2=B().filter(b=>b.textContent.includes("關閉導航")).length;
ok(open1===1&&open2===2, `可同時展開多則(開1則=${open1},開2則=${open2})`);
ok(R().includes("✕ 收起"), "展開後按鈕變「✕ 收起」");
// 打勾功能仍在
const t=R();
ok(/[1-9]/.test(t), "步驟有編號");
ok(!/undefined|NaN/.test(t), "無 undefined/NaN");
console.log(fail?"\n1.7.3 UI 驗證失敗":"\n1.7.3 UI 還原驗證通過"); process.exit(fail);
