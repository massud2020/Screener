// Port of src/lib/strategy/engine.ts (pullback + 3+1 pattern)
const DEF={mode:"pullback",ef:21,em:50,es:200,rsiP:14,minRatio:.5,lookback:5,atrP:14,m15:true,h1:true,h1Strict:false};
function ema(v,p){const o=Array(v.length).fill(null);if(v.length<p)return o;const k=2/(p+1);let s=0;for(let i=0;i<p;i++)s+=v[i];let pr=s/p;o[p-1]=pr;for(let i=p;i<v.length;i++){pr=v[i]*k+pr*(1-k);o[i]=pr}return o}
function rsi(c,p){const o=Array(c.length).fill(null);if(c.length<=p)return o;let g=0,l=0;for(let i=1;i<=p;i++){const d=c[i]-c[i-1];d>=0?g+=d:l-=d}let ag=g/p,al=l/p;o[p]=al===0?100:100-100/(1+ag/al);for(let i=p+1;i<c.length;i++){const d=c[i]-c[i-1];ag=(ag*(p-1)+(d>0?d:0))/p;al=(al*(p-1)+(d<0?-d:0))/p;o[i]=al===0?100:100-100/(1+ag/al)}return o}
function atr(cs,p){const o=Array(cs.length).fill(null);if(cs.length<=p)return o;const tr=cs.map((c,i)=>i?Math.max(c.high-c.low,Math.abs(c.high-cs[i-1].close),Math.abs(c.low-cs[i-1].close)):c.high-c.low);let s=0;for(let i=0;i<p;i++)s+=tr[i];let pr=s/p;o[p-1]=pr;for(let i=p;i<tr.length;i++){pr=(pr*(p-1)+tr[i])/p;o[i]=pr}return o}
const last=(a,n=0)=>{const v=a[a.length-1-n];return v==null||!isFinite(v)?null:v};
function dropForming(c,sec,now){return c.length&&now<c[c.length-1].time+sec?c.slice(0,-1):c}
function resample(c,min){const sz=min*60,m=new Map();for(const x of c){const b=Math.floor(x.time/sz)*sz;(m.get(b)||m.set(b,[]).get(b)).push(x)}return[...m.entries()].sort((a,b)=>a[0]-b[0]).map(([time,a])=>({time,open:a[0].open,high:Math.max(...a.map(x=>x.high)),low:Math.min(...a.map(x=>x.low)),close:a[a.length-1].close,volume:a.reduce((z,x)=>z+(x.volume||0),0)}))}
function checkPattern(l4,dir,minRatio){let g=0,r=0,gs=0,rs=0;for(const c of l4){const body=Math.abs(c.close-c.open);if(c.close>c.open){g++;gs+=body}else if(c.close<c.open){r++;rs+=body}else return{ok:false,ratio:0}}
if(dir==="LONG"){if(g!==1||r!==3||!(l4[0].close>l4[0].open)||rs<=0)return{ok:false,ratio:0};const q=gs/rs;return{ok:q>=minRatio,ratio:q}}
if(r!==1||g!==3||!(l4[0].close<l4[0].open)||gs<=0)return{ok:false,ratio:0};const q=rs/gs;return{ok:q>=minRatio,ratio:q}}
function checkPullback(m5,efA,dir,lb){const i=m5.length-1;if(i<1)return{ok:false,swing:0};const b=m5[i],ef=efA[i];if(ef==null)return{ok:false,swing:0};let t=false,lo=b.low,hi=b.high;for(let j=Math.max(0,i-lb);j<i;j++){const c=m5[j],e=efA[j];if(e==null)continue;lo=Math.min(lo,c.low);hi=Math.max(hi,c.high);if(dir==="LONG"&&c.low<=e)t=true;if(dir==="SHORT"&&c.high>=e)t=true}
return dir==="LONG"?{ok:t&&b.close>ef&&b.close>=b.open,swing:lo}:{ok:t&&b.close<ef&&b.close<=b.open,swing:hi}}
function evaluate(id,raw5,rawH1,S,now=Date.now()/1000){S={...DEF,...S};const m5=dropForming(raw5,300,now),h1=dropForming(rawH1,3600,now);const price=raw5.length?raw5[raw5.length-1].close:0;const row=(x={})=>({id,side:null,price,fail:null,...x});
if(S.mode==="fvg")return evalFvg(id,raw5,m5,h1,S,now);
if(S.mode==="mtf")return evalMtf(id,raw5,m5,h1,S,now);
if(m5.length<S.es+3)return row({fail:"تاریخچه M5 کافی نیست"});
const cl=m5.map(c=>c.close),efA=ema(cl,S.ef),emA=ema(cl,S.em),esA=ema(cl,S.es),rA=rsi(cl,S.rsiP),aA=atr(m5,S.atrP);
const ef=last(efA),em=last(emA),es=last(esA),r=last(rA),a=last(aA),efp=last(efA,1),emp=last(emA,1);
if([ef,em,es,r,a,efp,emp].some(x=>x==null))return row({fail:"اندیکاتورها آماده نیست"});
const sc=m5[m5.length-1].close,pat=m5.slice(-4).reverse(),pl=checkPattern(pat,"LONG",S.minRatio),ps=checkPattern(pat,"SHORT",S.minRatio);
const bl=checkPullback(m5,efA,"LONG",S.lookback),bs=checkPullback(m5,efA,"SHORT",S.lookback);
const ab=sc>es,be=sc<es,slope=(ef-efp)!==0&&(em-emp)!==0,pb=S.mode==="pullback";
const nc=ef!==em&&efp!==emp&&((ef>em&&efp>emp)||(ef<em&&efp<emp));
const L=pb?ab&&slope&&bl.ok:ab&&nc&&slope&&pl.ok,Sh=pb?be&&slope&&bs.ok:be&&nc&&slope&&ps.ok;
let m15L=true,m15S=true;if(S.m15){const m=dropForming(resample(m5,15),900,now);if(m.length<S.em+2)return row({rsi:r,fail:"تاریخچه M15 کافی نیست"});const mc=m.map(c=>c.close),f=last(ema(mc,S.ef)),mm=last(ema(mc,S.em));m15L=f>mm;m15S=f<mm}
let h1L=true,h1S=true;if(S.h1){if(h1.length<S.es+2)return row({rsi:r,fail:"تاریخچه H1 کافی نیست"});const hc=h1.map(c=>c.close),hs=last(ema(hc,S.es)),c=hc[hc.length-1];if(S.h1Strict){const f=last(ema(hc,S.ef)),m=last(ema(hc,S.em));h1L=c>hs&&f>m&&m>hs;h1S=c<hs&&f<m&&m<hs}else{h1L=c>hs;h1S=c<hs}}
let side=null;if(L&&m15L&&h1L)side="LONG";if(Sh&&m15S&&h1S)side="SHORT";
let sl=null;if(side){const sz=m5[m5.length-1].high-m5[m5.length-1].low;let d=pb?Math.abs(sc-(side==="LONG"?bl.swing:bs.swing)):sz*2;if(d<=0)d=sz*2;if(d>0)sl=side==="LONG"?sc-d:sc+d}
let fail=null;if(!side){fail=(!ab&&!be)?"قیمت روی EMA200":!slope?"شیب EMA":pb&&!bl.ok&&!bs.ok?"پولبک EMA":!pb&&!nc?"تقاطع EMA21/50":!pb&&!pl.ok&&!ps.ok?"الگوی ۳+۱":(L?!m15L:Sh?!m15S:!m15L&&!m15S)?"فیلتر M15":"فیلتر H1"}
return row({side,rsi:r,atr:a,entry:side?sc:null,sl,fail,ef,em,es})}

function lci(b,sec,asOf){let lo=0,hi=b.length-1,a=-1;while(lo<=hi){const m=(lo+hi)>>1;if(b[m].time+sec<=asOf){a=m;lo=m+1}else hi=m-1}return a}
function divExit(c,rA,from,isLong){const H=[],L=[];for(let i=Math.max(from+2,1);i<c.length-1;i++){const r=rA[i];if(r==null)continue;if(c[i].high>=c[i-1].high&&c[i].high>=c[i+1].high)H.push({i,p:c[i].high,r});if(c[i].low<=c[i-1].low&&c[i].low<=c[i+1].low)L.push({i,p:c[i].low,r})}
const A=isLong?H:L;for(let k=1;k<A.length;k++){const a=A[k-1],b=A[k];if(a.i<=from)continue;if(isLong?(b.p>a.p&&b.r<a.r):(b.p<a.p&&b.r>a.r))return{i:b.i,p:c[b.i].close}}return null}
function marks(raw5,rawH1,S,now=Date.now()/1000){S={...DEF,...S};const m5=dropForming(raw5,300,now),h1=dropForming(rawH1,3600,now);if(S.mode==="fvg")return marksFvg(m5,h1);
if(S.mode==="mtf")return marksMtf(m5,h1,S);
if(m5.length<S.es+4)return[];
const cl=m5.map(c=>c.close),efA=ema(cl,S.ef),emA=ema(cl,S.em),esA=ema(cl,S.es),rA=rsi(cl,S.rsiP),aA=atr(m5,S.atrP),pb=S.mode==="pullback";
const m15=S.m15?resample(m5,15):[],mc=m15.map(c=>c.close),mf=S.m15?ema(mc,S.ef):[],mm=S.m15?ema(mc,S.em):[];
const hc=h1.map(c=>c.close),hf=S.h1?ema(hc,S.ef):[],hm=S.h1?ema(hc,S.em):[],hs=S.h1?ema(hc,S.es):[];const out=[];let free=0;
for(let i=Math.max(m5.length-180,S.es+1,3);i<m5.length;i++){const ef=efA[i],em=emA[i],es=esA[i],efp=efA[i-1],emp=emA[i-1],r=rA[i],a=aA[i];if([ef,em,es,efp,emp,r,a].some(x=>x==null)||a<=0)continue;
if(m5[i].time<=free)continue;
const b=m5[i],l4=[b,m5[i-1],m5[i-2],m5[i-3]],pl=checkPattern(l4,"LONG",S.minRatio),ps=checkPattern(l4,"SHORT",S.minRatio),sl_=m5.slice(0,i+1),efs=efA.slice(0,i+1),bl=checkPullback(sl_,efs,"LONG",S.lookback),bs=checkPullback(sl_,efs,"SHORT",S.lookback);
const slope=(ef-efp)!==0&&(em-emp)!==0,nc=ef!==em&&efp!==emp&&((ef>em&&efp>emp)||(ef<em&&efp<emp)),ab=b.close>es,be=b.close<es;
const L=pb?ab&&slope&&bl.ok:ab&&nc&&slope&&pl.ok,Sh=pb?be&&slope&&bs.ok:be&&nc&&slope&&ps.ok;if(!L&&!Sh)continue;
let m15L=true,m15S=true;if(S.m15){const k=lci(m15,900,b.time+300),f=k>=0?mf[k]:null,m=k>=0?mm[k]:null;if(f==null||m==null)continue;m15L=f>m;m15S=f<m}
let h1L=true,h1S=true;if(S.h1){const k=lci(h1,3600,b.time+300),s=k>=0?hs[k]:null;if(s==null)continue;const c=h1[k].close;if(S.h1Strict){const f=hf[k],m=hm[k];if(f==null||m==null)continue;h1L=c>s&&f>m&&m>s;h1S=c<s&&f<m&&m<s}else{h1L=c>s;h1S=c<s}}
let side=null;if(L&&m15L&&h1L)side="LONG";if(Sh&&m15S&&h1S)side="SHORT";if(!side)continue;
const sz=b.high-b.low;let d=pb?Math.abs(b.close-(side==="LONG"?bl.swing:bs.swing)):sz*2;if(d<=0)d=sz*2;if(d<=0)continue;
const ex=divExit(m5,rA,i,side==="LONG");if(!ex)continue;free=m5[ex.i].time;out.push({time:b.time,side,entry:b.close,sl:side==="LONG"?b.close-d:b.close+d,tp:ex.p,t2:m5[ex.i].time})}
return out}



// Forex_Crypto_MTF_LongShort v3 chart strategy port. Signals use closed candles.
const MTF={minScore:5,rsiLongMin:40,rsiLongMax:75,rsiShortMin:25,rsiShortMax:60,ratio:.5,atrPeriod:14,atrSL:1.5,rr:2.5,minAtrPct:.02,maxAtrPct:2,minSep:.10};
function mtfAt(m5,h1,S,i){
 if(i<205||h1.length<205)return null;
 const c=m5.slice(0,i+1),cl=c.map(x=>x.close),efA=ema(cl,21),emA=ema(cl,50),esA=ema(cl,200),rA=rsi(cl,14),aA=atr(c,14);
 const ef=last(efA),em=last(emA),es=last(esA),r=last(rA),a=last(aA),efp=last(efA,1),price=c[c.length-1].close;
 if([ef,em,es,r,a,efp].some(x=>x==null)||a<=0)return null;
 const rates=[c[c.length-1],c[c.length-2],c[c.length-3],c[c.length-4]],pl=checkPattern(rates,"LONG",.5),ps=checkPattern(rates,"SHORT",.5);
 const coreL=ef>em&&em>es&&pl.ok,coreS=ef<em&&em<es&&ps.ok;if(!coreL&&!coreS)return null;
 const pct=a/price*100;if(pct<MTF.minAtrPct||pct>MTF.maxAtrPct)return null;
 if(Math.abs(ef-em)<MTF.minSep*a||Math.abs(em-es)<MTF.minSep*a)return null;
 const m15=resample(c,15),k15=lci(m15,900,c[c.length-1].time+300),h1k=lci(h1,3600,c[c.length-1].time+300);
 if(k15<50||h1k<200)return null;
 const m15c=m15.slice(0,k15+1).map(x=>x.close),m15f=last(ema(m15c,21)),m15m=last(ema(m15c,50));
 const hc=h1.slice(0,h1k+1).map(x=>x.close),hf=last(ema(hc,21)),hm=last(ema(hc,50)),hs=last(ema(hc,200)),hprice=hc[hc.length-1];
 if([m15f,m15m,hf,hm,hs].some(x=>x==null))return null;
 const m15L=m15f>m15m,m15S=m15f<m15m,h1L=hprice>hs&&hf>hm&&hm>hs,h1S=hprice<hs&&hf<hm&&hm<hs;
 const day=Math.floor(c[c.length-1].time/86400),today=c.filter(x=>Math.floor(x.time/86400)===day&&x.time+300<=c[c.length-1].time+300);let pv=0,vv=0;
 for(const x of today){const v=x.volume||0;if(v>0){pv+=((x.high+x.low+x.close)/3)*v;vv+=v}}
 // Volume-weighted daily VWAP is required by the source strategy; no signal if provider lacks usable volume.
 if(vv<=0)return null;const vwap=pv/vv,vwapL=price>vwap,vwapS=price<vwap;
 const slopeL=ef>efp,slopeS=ef<efp,rsiL=r>=MTF.rsiLongMin&&r<=MTF.rsiLongMax,rsiS=r>=MTF.rsiShortMin&&r<=MTF.rsiShortMax;
 const scoreL=(rsiL?1:0)+(m15L?2:0)+(h1L?2:0)+(vwapL?1:0)+(slopeL?1:0)+1;
 const scoreS=(rsiS?1:0)+(m15S?2:0)+(h1S?2:0)+(vwapS?1:0)+(slopeS?1:0)+1;
 let side=null,score=0,ratio=0;if(coreL&&scoreL>=MTF.minScore){side="LONG";score=scoreL;ratio=pl.ratio}else if(coreS&&scoreS>=MTF.minScore){side="SHORT";score=scoreS;ratio=ps.ratio}else return null;
 const sl=side==="LONG"?price-a*MTF.atrSL:price+a*MTF.atrSL,tp=side==="LONG"?price+(price-sl)*MTF.rr:price-(sl-price)*MTF.rr;
 return{time:c[c.length-1].time,side,entry:price,sl,tp,rr:MTF.rr,score,maxScore:8,rsi:r,atr:a,atrPct:pct,vwap,ratio,ef,em,es};
}
function evalMtf(id,raw5,m5,h1,S,now){const price=raw5.length?raw5[raw5.length-1].close:0,row=(x={})=>({id,side:null,price,fail:null,...x});if(m5.length<210||h1.length<205)return row({fail:"تاریخچه M5/H1 کافی نیست"});const sig=mtfAt(m5,h1,S,m5.length-1);if(!sig)return row({fail:"شرایط کامل استراتژی یا حجم VWAP برقرار نیست"});return row({...sig,id,price,fail:null});}
function marksMtf(m5,h1,S){if(m5.length<210||h1.length<205)return[];const out=[];let free=0;for(let i=Math.max(205,m5.length-180);i<m5.length;i++){if(m5[i].time<=free)continue;const st=mtfAt(m5,h1,S,i);if(!st)continue;let t2,px,done=false;for(let q=i+1;q<m5.length;q++){const c=m5[q],hitSL=st.side==="LONG"?c.low<=st.sl:c.high>=st.sl,hitTP=st.side==="LONG"?c.high>=st.tp:c.low<=st.tp;if(hitSL||hitTP){t2=c.time;px=hitSL?st.sl:st.tp;done=true;break}}out.push({...st,tp:done?px:st.tp,t2:done?t2:undefined});free=done?t2:Infinity;}return out}

// ---- Daily Open + Liquidity Sweep + MSS + FVG (Charttora) ----
const FP={maxAge:60,disp:.5,minGap:.1,firstTap:true,needDO:true};
function mir(c){return{time:c.time,open:-c.open,high:-c.low,low:-c.high,close:-c.close}}
function piv(a,n,hi){const o=Array(a.length).fill(false);for(let j=n;j<a.length-n;j++){let ok=true;for(let k=1;k<=n&&ok;k++)ok=hi?(a[j].high>=a[j-k].high&&a[j].high>a[j+k].high):(a[j].low<=a[j-k].low&&a[j].low<a[j+k].low);o[j]=ok}return o}
function fvgPrep(m5,h1,mirror){const f=mirror?mir:(c=>c),c=m5.map(f),H=h1.map(f);let cur=-1,dv=0;const DO=c.map(x=>{const d=Math.floor(x.time/86400);if(d!==cur){cur=d;dv=x.open}return dv});
return{c,h1:H,atr:atr(c,14),PH3:piv(c,3,true),PH2:piv(c,2,true),PL3:piv(c,3,false),DO,PHh:piv(H,2,true),PLh:piv(H,2,false),hs:ema(H.map(x=>x.close),200)}}
function biasAt(X,k){const h=X.h1,hs=[],ls=[];for(let j=k-2;j>=2&&j>k-150&&(hs.length<2||ls.length<2);j--){if(X.PHh[j]&&hs.length<2)hs.push(h[j].high);if(X.PLh[j]&&ls.length<2)ls.push(h[j].low)}
if(hs.length===2&&ls.length===2){if(hs[0]>hs[1]&&ls[0]>ls[1])return 1;if(hs[0]<hs[1]&&ls[0]<ls[1])return -1}
const s=X.hs[k];return s==null?0:h[k].close>s?1:-1}
function fvgAt(X,i,P){const c=X.c;if(i<30||i>=c.length)return null;
const k=lci(X.h1,3600,c[i].time+300);if(k<10||biasAt(X,k)!==1)return null;const aI=X.atr[i];if(aI==null)return null;
for(let s=i-2;s>=Math.max(4,i-P.maxAge);s--){const cs=c[s];if(P.needDO&&!(cs.low<X.DO[s]))continue;
let L=null;for(let p=s-4;p>=Math.max(3,s-60);p--)if(X.PL3[p]&&c[p].low>cs.low&&c[p].low<cs.close){L=c[p].low;break}if(L==null)continue;
let lower=false;for(let q=s+1;q<=i;q++)if(c[q].low<=cs.low){lower=true;break}if(lower)continue;
let M=null;for(let p=s-2;p>=Math.max(2,s-40);p--)if(X.PH2[p]){M=c[p].high;break}if(M==null)continue;
let m=-1;for(let q=s+1;q<=i-1;q++){const cq=c[q],a=X.atr[q];if(a==null)continue;if(cq.close>M&&cq.close>cq.open&&cq.close-cq.open>=P.disp*a){m=q;break}}if(m<0)continue;
let f=-1,lo=0,hi=0;for(let j=m;j>=s+1;j--){if(j+2>i)continue;const c1=c[j-1],c2=c[j],c3=c[j+1];if(c3.low>c1.high&&c2.close>c2.open&&c3.low-c1.high>=P.minGap*aI){f=j;lo=c1.high;hi=c3.low;break}}if(f<0)continue;
let bad=false;for(let q=f+2;q<i;q++)if(c[q].close<lo||(P.firstTap&&c[q].low<=hi)){bad=true;break}if(bad)continue;
const ci=c[i];if(!(ci.low<=hi&&ci.close>=lo&&ci.close>ci.open))continue;
const entry=ci.close,sl=cs.low-.1*aI;if(entry<=sl)continue;const risk=entry-sl;
let tp=null;for(let p=i-3;p>=Math.max(3,i-300);p--)if(X.PH3[p]&&c[p].high>entry&&(c[p].high-entry)/risk>=1.5&&(tp==null||c[p].high<tp))tp=c[p].high;
if(tp==null)tp=entry+2.5*risk;
return{entry,sl,tp,rr:(tp-entry)/risk,do:X.DO[i],lvl:L,sweepT:cs.time,sweepExt:cs.low,mssLvl:M,mssT:c[m].time,fvg:{t0:c[f-1].time,lo,hi}}}
return null}
function evalFvg(id,raw5,m5,h1,S,now){const price=raw5.length?raw5[raw5.length-1].close:0,row=(x={})=>({id,side:null,price,fail:null,...x});
if(m5.length<260||h1.length<210)return row({fail:"تاریخچه کافی نیست"});
const i=m5.length-1,r=last(rsi(m5.map(c=>c.close),S.rsiP));
for(const mirror of[false,true]){const X=fvgPrep(m5,h1,mirror),st=fvgAt(X,i,FP);if(!st)continue;
const g=mirror?-1:1,cx={do:g*st.do,lvl:g*st.lvl,sweepT:st.sweepT,sweepExt:g*st.sweepExt,mssLvl:g*st.mssLvl,mssT:st.mssT,fvg:mirror?{t0:st.fvg.t0,lo:-st.fvg.hi,hi:-st.fvg.lo}:st.fvg};
return row({side:mirror?"SHORT":"LONG",entry:g*st.entry,sl:g*st.sl,tp:g*st.tp,rr:st.rr,rsi:r,ctx:cx})}
const X=fvgPrep(m5,h1,false),k=lci(X.h1,3600,m5[i].time+300),b=k>=10?biasAt(X,k):0;
return row({rsi:r,ctx:{do:X.DO[i]},fail:"بایاس "+(b===1?"صعودی":b===-1?"نزولی":"-")+"؛ بدون ستاپ Sweep→MSS→FVG"})}
function marksFvg(m5,h1){if(m5.length<260||h1.length<210)return[];const out=[],XS=[fvgPrep(m5,h1,false),fvgPrep(m5,h1,true)];let free=0;
for(let i=Math.max(m5.length-180,40);i<m5.length;i++){if(m5[i].time<=free)continue;
for(let d=0;d<2;d++){const st=fvgAt(XS[d],i,FP);if(!st)continue;const g=d?-1:1,entry=g*st.entry,sl=g*st.sl,tp=g*st.tp;let t2,px,done=false;
for(let q=i+1;q<m5.length;q++){const c=m5[q],hs=d?c.high>=sl:c.low<=sl,ht=d?c.low<=tp:c.high>=tp;if(hs||ht){t2=c.time;px=hs?sl:tp;done=true;break}}
out.push({time:m5[i].time,side:d?"SHORT":"LONG",entry,sl,tp:done?px:tp,t2:done?t2:undefined});free=done?t2:Infinity;break}}
return out}

if(typeof module!=="undefined")module.exports={dropForming,marks,fvgPrep,fvgAt,divExit,evaluate,ema,rsi,atr,resample,checkPattern,checkPullback,mtfAt,evalMtf,marksMtf};
