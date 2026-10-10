function drawChart(cv,d,S,now){
const m5=dropForming(d.a,300,now),N=Math.min(90,m5.length),off=m5.length-N,vis=m5.slice(off),cl=m5.map(c=>c.close);
const E=[ema(cl,S.ef),ema(cl,S.em),ema(cl,S.es)].map(a=>a.slice(off)),R=rsi(cl,S.rsiP).slice(off);
const row=evaluate(d.id,d.a,d.h,S,now),mk=marks(d.a,d.h,S,now).filter(m=>m.time>=vis[0].time);
const dpr=(typeof devicePixelRatio!=="undefined"&&devicePixelRatio)||1,W=cv.parentNode.clientWidth||360,H=470;
cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+"px";cv.style.height=H+"px";
const g=cv.getContext("2d");g.scale(dpr,dpr);g.fillStyle="#08090b";g.fillRect(0,0,W,H);
const AX=56,pw=W-AX,PH=330,RY=360,RH=90,GR="#3f9d6a",RD="#d15a52";
let hi=Math.max(...vis.map(c=>c.high)),lo=Math.min(...vis.map(c=>c.low));const rg=hi-lo;
if(row.side){hi=Math.max(hi,row.entry);lo=Math.min(lo,row.entry);if(Math.abs(row.sl-row.entry)<rg*.8){hi=Math.max(hi,row.sl);lo=Math.min(lo,row.sl)}}
const pd=(hi-lo)*.06||1e-9;hi+=pd;lo-=pd;
const X=i=>(i+.5)*pw/N,Y=p=>Math.min(PH-8,Math.max(8,8+(hi-p)/(hi-lo)*(PH-16))),bw=Math.max(2,pw/N*.72);
g.font="10px system-ui";g.textBaseline="middle";g.textAlign="left";
for(let k=0;k<5;k++){const p=lo+(hi-lo)*k/4,y=Y(p);g.strokeStyle="#1c1f26";g.lineWidth=1;g.beginPath();g.moveTo(0,y);g.lineTo(pw,y);g.stroke();g.fillStyle="#8a8f98";g.fillText(p.toFixed(d.dg),pw+4,y)}
vis.forEach((c,i)=>{const up=c.close>=c.open;g.strokeStyle=g.fillStyle=up?GR:RD;g.lineWidth=1;g.beginPath();g.moveTo(X(i),Y(c.high));g.lineTo(X(i),Y(c.low));g.stroke();const t=Y(Math.max(c.open,c.close)),h=Math.max(1,Math.abs(Y(c.open)-Y(c.close)));g.fillRect(X(i)-bw/2,t,bw,h)});
g.save();g.beginPath();g.rect(0,0,pw,PH);g.clip();
["#35e07b","#ff6ec7","#ff3b3b"].forEach((col,k)=>{g.strokeStyle=col;g.lineWidth=1.1;g.beginPath();let on=false;E[k].forEach((v,i)=>{if(v==null){on=false;return}on?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v));on=true});g.stroke()});
g.restore();
const tri=(x,y,up,s,col)=>{g.fillStyle=col;g.beginPath();if(up){g.moveTo(x,y-s);g.lineTo(x-s*.9,y+s*.7);g.lineTo(x+s*.9,y+s*.7)}else{g.moveTo(x,y+s);g.lineTo(x-s*.9,y-s*.7);g.lineTo(x+s*.9,y-s*.7)}g.closePath();g.fill()};
const dash=(a,b,c,e,col)=>{g.strokeStyle=col;g.lineWidth=1;g.setLineDash([4,3]);g.beginPath();g.moveTo(a,b);g.lineTo(c,e);g.stroke();g.setLineDash([])};
mk.forEach(m=>{const i=vis.findIndex(c=>c.time===m.time);if(i<0)return;const j=vis.findIndex(c=>c.time===m.t2),L=m.side==="LONG",col=L?GR:RD;
if(j>=0){const win=L?m.tp>m.entry:m.tp<m.entry;g.fillStyle=win?"#35e07b":"#ff3b3b";g.strokeStyle="#08090b";g.lineWidth=1.5;g.beginPath();g.arc(X(j),Y(m.tp),3.5,0,6.3);g.fill();g.stroke()}
L?tri(X(i),Y(vis[i].low)+9,true,5,col):tri(X(i),Y(vis[i].high)-9,false,5,col)});
if(row.side){const L=row.side==="LONG",col=L?GR:RD,i=N-1;dash(0,Y(row.entry),pw,Y(row.entry),"#e8eaed");dash(0,Y(row.sl),pw,Y(row.sl),RD);
const lab=(p,bg,fg)=>{const y=Y(p);g.fillStyle=bg;g.fillRect(pw+1,y-7,AX-2,14);g.fillStyle=fg;g.fillText(p.toFixed(d.dg),pw+4,y)};lab(row.entry,"#e8eaed","#08090b");lab(row.sl,RD,"#fff");
L?tri(X(i),Y(vis[i].low)+12,true,7,col):tri(X(i),Y(vis[i].high)-12,false,7,col)}
g.strokeStyle="#23262d";g.lineWidth=1;g.strokeRect(0,RY,pw,RH);
const ry=v=>RY+RH-(v/100)*RH;[30,70].forEach(v=>dash(0,ry(v),pw,ry(v),"#2f333b"));
g.strokeStyle="#e8eaed";g.lineWidth=1.2;g.beginPath();let on=false;R.forEach((v,i)=>{if(v==null){on=false;return}on?g.lineTo(X(i),ry(v)):g.moveTo(X(i),ry(v));on=true});g.stroke();
g.fillStyle="#8a8f98";g.fillText("RSI",4,RY+9);const lr=R[R.length-1];if(lr!=null)g.fillText(lr.toFixed(1),pw+4,ry(lr));
return{row,n:mk.length}}
