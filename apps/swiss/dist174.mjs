/* 驗證 1.7.4:遠距離不再出現荒謬的步行時間 */
import fs from "fs"; import { JSDOM } from "jsdom";
const html=fs.readFileSync("/home/claude/travel-suite/swiss/index.html","utf8");
// 模擬「人在聖莫里茲」(截圖當下的實際情況)
const ST_MORITZ={latitude:46.4908,longitude:9.8355,accuracy:20};
const dom=new JSDOM(html,{runScripts:"dangerously",url:"https://e.test/travel-suite/swiss/",pretendToBeVisual:true,
 beforeParse(w){w.localStorage.setItem("wang.swiss.gate","1");w.localStorage.setItem("wang.swiss.user","遠志");
  w.SpeechSynthesisUtterance=function(t){this.text=t;};w.speechSynthesis={speak(){},cancel(){}};
  w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>"x";
  w.navigator.geolocation={ watchPosition:(cb)=>{ setTimeout(()=>cb({coords:ST_MORITZ}),30); return 1; },
    clearWatch(){}, getCurrentPosition:(cb)=>cb({coords:ST_MORITZ}) };
  w.fetch=()=>Promise.reject(new Error("off"));}});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(500);
const doc=dom.window.document, R=()=>doc.getElementById("root").textContent;
const tab=ic=>{const b=[...doc.querySelectorAll("button")].filter(e=>e.textContent.trim().startsWith(ic)).pop();
 if(b)b.dispatchEvent(new dom.window.MouseEvent("click",{bubbles:true}));};
let fail=0;const ok=(c,n)=>{c?console.log("  ✓ "+n):(console.log("  ✗ "+n),fail=1);};
tab("🍽"); await wait(600);
const t=R();
ok(!/步行~\d{3,}分/.test(t), "不再出現三位數以上的步行分鐘(如1600分)");
ok(!t.includes("步行~1600分"), "具體:無「步行~1600分」");
ok(/尚未抵達此區|需搭車/.test(t), "遠距離改顯示「需搭車/尚未抵達此區」");
ok(t.includes("你還沒到這一區"), "有明確提示:你還沒到這一區");
ok(/128\s*km|1[23]\d\s*km/.test(t), "距離數字仍保留(供判斷)");
ok(!/undefined|NaN/.test(t), "無 undefined/NaN");
// 近距離仍要給步行時間:切到聖莫里茲那一區
const sel=[...doc.querySelectorAll("select")].find(s=>[...s.options].some(o=>o.textContent.includes("聖莫里茲")));
if(sel){ const i=[...sel.options].findIndex(o=>o.textContent.includes("聖莫里茲"));
  sel.value=sel.options[i].value; sel.dispatchEvent(new dom.window.Event("change",{bubbles:true})); await wait(400);
  const t2=R();
  ok(/步行~\d{1,2}分/.test(t2), "近距離仍正常顯示步行時間(聖莫里茲區)");
}
console.log(fail?"\n失敗":"\n1.7.4 距離顯示驗證通過"); process.exit(fail);
