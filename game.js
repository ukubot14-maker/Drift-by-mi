(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const startPanel=$("startPanel"),settings=$("settings"),status=$("status"),scoreLabel=$("score");
let W=innerWidth,H=innerHeight,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener("resize",resize);resize();
let running=false,keys=new Set(),touch={x:0,y:0,gas:false,brake:false,hand:false};
let socket=null,myId=null,remotePlayers=[],netTimer=0;
const car={x:0,y:0,a:0,v:0,score:0,name:"Driver"};
function reset(){car.x=car.y=car.v=car.score=0;car.a=0}
function start(){if(running)return;running=true;car.name=$("driverName").value.trim()||"Driver";startPanel.classList.add("hidden");settings.classList.add("hidden");status.textContent="FREE ROAM • OFFLINE";reset()}
$("startBtn").addEventListener("click",start);
$("startBtn").addEventListener("touchend",e=>{e.preventDefault();start()},{passive:false});
$("settingsBtn").addEventListener("click",()=>settings.classList.toggle("hidden"));
$("doneBtn").addEventListener("click",()=>settings.classList.add("hidden"));
$("connectBtn").addEventListener("click",connectMultiplayer);
function connectMultiplayer(){const url=$("serverUrl").value.trim();if(!url){status.textContent="Enter your Render WSS URL";return}try{if(socket)socket.close();socket=new WebSocket(url);status.textContent="Connecting…";socket.onopen=()=>{status.textContent="MULTIPLAYER CONNECTED";netTimer=0};socket.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.type==="welcome")myId=m.id;if(m.type==="players")remotePlayers=m.players||[]}catch{}};socket.onerror=()=>status.textContent="Multiplayer connection failed";socket.onclose=()=>{status.textContent="Offline • multiplayer disconnected";myId=null}}catch{status.textContent="Invalid server URL"}}
$("touchToggle").addEventListener("change",()=>{$("touchControls").style.display=$("touchToggle").checked?"block":"none"});
$("touchToggle").checked=true;
addEventListener("keydown",e=>{let k=e.key.toLowerCase();keys.add(k);if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();if(k==="r")reset()});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
const stick=$("stick"),knob=$("stickKnob");let pointer=null;
function stickMove(e){const r=stick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,limit=r.width*.34,len=Math.hypot(dx,dy),s=len>limit?limit/len:1;touch.x=dx*s/limit;touch.y=dy*s/limit;knob.style.transform=`translate(${dx*s}px,${dy*s}px)`}
stick.addEventListener("pointerdown",e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);stickMove(e)});
stick.addEventListener("pointermove",e=>{if(e.pointerId===pointer)stickMove(e)});
function stickEnd(){pointer=null;touch.x=touch.y=0;knob.style.transform="translate(0,0)"}
stick.addEventListener("pointerup",stickEnd);stick.addEventListener("pointercancel",stickEnd);stick.addEventListener("lostpointercapture",stickEnd);
function hold(id,key){const el=$(id);const on=e=>{e.preventDefault();touch[key]=true;el.classList.add("down")},off=()=>{touch[key]=false;el.classList.remove("down")};el.addEventListener("pointerdown",on);["pointerup","pointercancel","pointerleave","lostpointercapture"].forEach(v=>el.addEventListener(v,off))}
hold("gas","gas");hold("brake","brake");hold("hand","hand");
let last=0;
function update(dt){if(!running)return;
const left=keys.has("a")||keys.has("arrowleft"),right=keys.has("d")||keys.has("arrowright");
const steer=Math.max(-1,Math.min(1,(right?1:0)-(left?1:0)+touch.x));
const gas=keys.has("w")||keys.has("arrowup")||touch.gas||($("touchToggle").checked&&touch.y<-.22);
const brake=keys.has("s")||keys.has("arrowdown")||touch.brake||($("touchToggle").checked&&touch.y>.35);
const hand=keys.has(" ")||touch.hand;
car.v+=(gas?260:0)-(brake?390:0)-car.v*(hand?2.3:1.05);car.v*=Math.max(0,1-dt*.18);car.v=Math.max(-100,Math.min(440,car.v));
car.a+=steer*dt*(.8+Math.abs(car.v)/95)*(hand?2.2:1)*Math.sign(car.v||1);
car.x+=Math.sin(car.a)*car.v*dt;car.y-=Math.cos(car.a)*car.v*dt;
if(socket&&socket.readyState===WebSocket.OPEN){netTimer+=dt;if(netTimer>.06){netTimer=0;socket.send(JSON.stringify({type:"state",name:car.name,x:car.x,y:car.y,a:car.a}))}}
if((hand||Math.abs(steer)>.25)&&Math.abs(car.v)>100)car.score+=Math.abs(car.v)*Math.abs(steer)*dt*.5;
scoreLabel.textContent="Drift: "+Math.floor(car.score);
}
function carDraw(x,y,a,color){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle="#090b0e";ctx.fillRect(-18,-15,8,14);ctx.fillRect(10,-15,8,14);ctx.fillRect(-18,9,8,14);ctx.fillRect(10,9,8,14);ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-13,-25,26,50,7);ctx.fill();ctx.fillStyle="#8fdcff";ctx.fillRect(-9,-13,18,12);ctx.fillStyle="#18242e";ctx.fillRect(-9,3,18,10);ctx.fillStyle="#fff5c2";ctx.fillRect(-10,-22,5,3);ctx.fillRect(5,-22,5,3);ctx.restore()}
function draw(){ctx.fillStyle="#252b31";ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-car.x,H/2-car.y);
ctx.fillStyle="#30373e";ctx.fillRect(-5000,-5000,10000,10000);
ctx.strokeStyle="#3a434b";ctx.lineWidth=1;for(let x=-5000;x<=5000;x+=100){ctx.beginPath();ctx.moveTo(x,-5000);ctx.lineTo(x,5000);ctx.stroke()}for(let y=-5000;y<=5000;y+=100){ctx.beginPath();ctx.moveTo(-5000,y);ctx.lineTo(5000,y);ctx.stroke()}
ctx.strokeStyle="#e6e8e9";ctx.lineWidth=5;ctx.setLineDash([32,24]);ctx.beginPath();ctx.arc(0,0,430,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
ctx.strokeStyle="#717b84";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,510,0,Math.PI*2);ctx.stroke();
carDraw(car.x,car.y,car.a,"#ffcf32");for(const p of remotePlayers){if(p.id===myId)continue;carDraw(p.x,p.y,p.a,p.color||"#5be7ff");ctx.fillStyle="#fff";ctx.font="12px system-ui";ctx.textAlign="center";ctx.fillText(p.name||"Player",p.x,p.y-34)}ctx.restore()}
function frame(t){const dt=Math.min((t-last)/1000||0,.035);last=t;update(dt);draw();requestAnimationFrame(frame)}
status.textContent="Ready • tap Start";requestAnimationFrame(frame);
})();