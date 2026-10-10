// Background scanner for GitHub Actions: scans all symbols, sends ntfy.sh push alerts.
const fs=require("fs"),{evaluate,dropForming}=require("./engine.js"),{U}=require("./symbols.js");
const TOPIC=process.env.NTFY_TOPIC,TOK=process.env.OANDA_TOKEN,ENV=process.env.OANDA_ENV||"practice";
const F15=process.env.M15!=="0",FH1=process.env.H1!=="0",STRICT=process.env.H1_STRICT==="1";
const MODES=(process.env.MODES||"pullback,pattern").split(",");
const NAME={pullback:"پولبک EMA",pattern:"الگوی ۳+۱"},MAXAGE=1200,SF=".state/sent.json";
async function J(url,o={}){const r=await fetch(url,{...o,signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}
const okx=async(id,bar)=>{const j=await J(`https://www.okx.com/api/v5/market/candles?instId=${id}&bar=${bar}&limit=300`);if(j.code!=="0")return[];return j.data.map(r=>({time:+r[0]/1000,open:+r[1],high:+r[2],low:+r[3],close:+r[4]})).sort((a,b)=>a.time-b.time)};
const oanda=async(i,g)=>{const h=ENV==="live"?"api-fxtrade":"api-fxpractice",j=await J(`https://${h}.oanda.com/v3/instruments/${i}/candles?granularity=${g}&count=300&price=M`,{headers:{Authorization:"Bearer "+TOK}});return j.candles.map(c=>({time:Date.parse(c.time)/1000,open:+c.mid.o,high:+c.mid.h,low:+c.mid.l,close:+c.mid.c})).filter(c=>isFinite(c.close))};
const yh=async(s,iv,rg)=>{const j=await J(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=${iv}&range=${rg}`,{headers:{"User-Agent":"Mozilla/5.0"}}),r=j.chart.result[0],q=r.indicators.quote[0],o=[];(r.timestamp||[]).forEach((t,i)=>{if([q.open[i],q.high[i],q.low[i],q.close[i]].every(v=>v!=null))o.push({time:t,open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i]})});return o};
async function load(u){let a=[],h=[];
if(u[1]){try{[a,h]=await Promise.all([okx(u[1],"5m"),okx(u[1],"1H")])}catch(e){}}
else if(u[4]&&TOK){try{[a,h]=await Promise.all([oanda(u[4],"M5"),oanda(u[4],"H1")])}catch(e){}}
if((a.length<210||h.length<210)&&u[2]){try{const[x,y]=await Promise.all([yh(u[2],"5m","5d"),yh(u[2],"1h","6mo")]);if(x.length>a.length)a=x;if(y.length>h.length)h=y}catch(e){}}
return[a,h]}
async function notify(title,message,priority=5,tags=["chart_with_upwards_trend"]){const r=await fetch("https://ntfy.sh/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic:TOPIC,title,message,priority,tags}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error("ntfy "+r.status)}
const LOOP=+(process.env.LOOP_SECONDS||0),IV=+(process.env.INTERVAL||60)*1000,sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function once(sent){
const now=Date.now()/1000;for(const k of Object.keys(sent))if(now-sent[k]>86400)delete sent[k];
const found=[];let i=0,errs=0;
await Promise.all(Array.from({length:6},async()=>{while(i<U.length){const u=U[i++];try{const[a,h]=await load(u);if(a.length<50){errs++;continue}
const cl=dropForming(a,300,now);if(!cl.length)continue;const bt=cl[cl.length-1].time,age=now-(bt+300);if(age>MAXAGE)continue;
for(const mode of MODES){const r=evaluate(u[0],a,h,{mode,m15:F15,h1:FH1,h1Strict:STRICT},now);if(r.side)found.push({u,mode,r,bt,age,key:`${u[0]}|${mode}|${r.side}|${bt}`})}}catch(e){errs++}}}));
const fresh=found.filter(f=>!sent[f.key]).sort((a,b)=>a.u[0].localeCompare(b.u[0]));
console.log(`${new Date().toISOString()} symbols ${U.length}, errors ${errs}, signals ${found.length}, new ${fresh.length}`);
let n=0;for(const f of fresh){if(n>=10)break;const{u,mode,r}=f,L=r.side==="LONG",d=u[3];
try{await notify(`${L?"🟢 LONG":"🔴 SHORT"} ${u[0]}`,`${NAME[mode]}\nEntry ${r.entry.toFixed(d)} | SL ${r.sl.toFixed(d)}\nRSI ${r.rsi.toFixed(1)} | کندل ${Math.max(0,Math.round(f.age/60))} دقیقه پیش بسته شد\nخروج: اولین واگرایی RSI`,5,[L?"green_circle":"red_circle","chart_with_upwards_trend"]);sent[f.key]=now;n++}catch(e){console.error("notify failed",e.message)}}
if(fresh.length>10){try{await notify("سیگنال‌های بیشتر",`${fresh.length-10} سیگنال دیگر هم هست؛ اپ را باز کنید.`,3,["information_source"]);for(const f of fresh.slice(10))sent[f.key]=now}catch(e){}}
fs.mkdirSync(".state",{recursive:true});fs.writeFileSync(SF,JSON.stringify(sent))}
(async()=>{
if(!TOPIC){console.error("NTFY_TOPIC is not set");process.exit(1)}
if(process.env.TEST==="1"){await notify("تست اسکرینر","اعلان‌ها درست کار می‌کنند ✅",3,["white_check_mark"]);console.log("test sent");return}
let sent={};try{sent=JSON.parse(fs.readFileSync(SF,"utf8"))}catch(e){}
const t0=Date.now();let k=0;
for(;;){try{await once(sent)}catch(e){console.error("scan failed",e.message)}
if(!LOOP)break;k++;const next=t0+k*IV;if(next-t0>LOOP*1000)break;const w=next-Date.now();if(w>0)await sleep(w)}
})().catch(e=>{console.error(e);process.exit(1)});
