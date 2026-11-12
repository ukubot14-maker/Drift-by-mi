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
const car={x:0,y:0,a:0,v:0,vx:0,vy:0,score:0,name:"Driver",slip:0};
const tireMarks=[],smoke=[];
function reset(){car.x=car.y=car.v=car.vx=car.vy=car.score=0;car.a=car.slip=0;tireMarks.length=0;smoke.length=0}
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
function update(dt){
if(!running)return;
const left=keys.has("a")||keys.has("arrowleft"),right=keys.has("d")||keys.has("arrowright");
const steer=Math.max(-1,Math.min(1,(right?1:0)-(left?1:0)+touch.x));
const gas=keys.has("w")||keys.has("arrowup")||touch.gas||($("touchToggle").checked&&touch.y<-.22);
const brake=keys.has("s")||keys.has("arrowdown")||touch.brake||($("touchToggle").checked&&touch.y>.35);
const hand=keys.has(" ")||touch.hand;
const forwardX=Math.sin(car.a),forwardY=-Math.cos(car.a);
const speed=Math.hypot(car.vx,car.vy);
const forwardSpeed=car.vx*forwardX+car.vy*forwardY;
car.a+=steer*dt*(.45+Math.abs(forwardSpeed)/115)*(hand?2.45:1)*Math.sign(forwardSpeed||1);
const fx=Math.sin(car.a),fy=-Math.cos(car.a);
car.vx+=fx*((gas?300:0)-(brake?420:0))*dt;
car.vy+=fy*((gas?300:0)-(brake?420:0))*dt;
const sideX=Math.cos(car.a),sideY=Math.sin(car.a);
const lateral=car.vx*sideX+car.vy*sideY;
const grip=hand?1.15:8.5;
car.vx-=sideX*lateral*Math.min(1,grip*dt);
car.vy-=sideY*lateral*Math.min(1,grip*dt);
car.vx*=Math.max(0,1-dt*(hand?.42:.85));car.vy*=Math.max(0,1-dt*(hand?.42:.85));
car.v=Math.hypot(car.vx,car.vy);car.v=Math.min(car.v,hand?390:470);
if(car.v>0){const velocityAngle=Math.atan2(car.vx,-car.vy);car.slip=Math.atan2(Math.sin(car.a-velocityAngle),Math.cos(car.a-velocityAngle))}
else car.slip=0;
car.x+=car.vx*dt;car.y+=car.vy*dt;
const drifting=car.v>95&&Math.abs(car.slip)>.16;
if(drifting){
car.score+=car.v*Math.abs(car.slip)*dt*1.35;
const rearX=car.x-fx*20,rearY=car.y-fy*20;
for(const side of [-1,1])tireMarks.push({x:rearX+side*sideX*10,y:rearY+side*sideY*10,life:5});
if(Math.random()<.8)smoke.push({x:rearX+(Math.random()-.5)*22,y:rearY+(Math.random()-.5)*22,vx:(Math.random()-.5)*35,vy:(Math.random()-.5)*35,life:.55});
}
for(let i=tireMarks.length-1;i>=0;i--){tireMarks[i].life-=dt;if(tireMarks[i].life<=0)tireMarks.splice(i,1)}
for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)smoke.splice(i,1)}
if(socket&&socket.readyState===WebSocket.OPEN){netTimer+=dt;if(netTimer>.06){netTimer=0;socket.send(JSON.stringify({type:"state",name:car.name,x:car.x,y:car.y,a:car.a}))}}
scoreLabel.textContent="Drift: "+Math.floor(car.score);
}
function carDraw(x,y,a,color){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle="#090b0e";ctx.fillRect(-18,-15,8,14);ctx.fillRect(10,-15,8,14);ctx.fillRect(-18,9,8,14);ctx.fillRect(10,9,8,14);ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-13,-25,26,50,7);ctx.fill();ctx.fillStyle="#8fdcff";ctx.fillRect(-9,-13,18,12);ctx.fillStyle="#18242e";ctx.fillRect(-9,3,18,10);ctx.fillStyle="#fff5c2";ctx.fillRect(-10,-22,5,3);ctx.fillRect(5,-22,5,3);ctx.restore()}
function draw(){
ctx.fillStyle="#252b31";ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-car.x,H/2-car.y);
ctx.fillStyle="#30373e";ctx.fillRect(-5000,-5000,10000,10000);
ctx.strokeStyle="#3a434b";ctx.lineWidth=1;for(let x=-5000;x<=5000;x+=100){ctx.beginPath();ctx.moveTo(x,-5000);ctx.lineTo(x,5000);ctx.stroke()}for(let y=-5000;y<=5000;y+=100){ctx.beginPath();ctx.moveTo(-5000,y);ctx.lineTo(5000,y);ctx.stroke()}
ctx.strokeStyle="#e6e8e9";ctx.lineWidth=5;ctx.setLineDash([32,24]);ctx.beginPath();ctx.arc(0,0,430,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
ctx.strokeStyle="#717b84";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,510,0,Math.PI*2);ctx.stroke();
for(const m of tireMarks){ctx.globalAlpha=Math.min(.7,m.life/2);ctx.fillStyle="#111418";ctx.beginPath();ctx.arc(m.x,m.y,3.2,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
for(const p of smoke){ctx.globalAlpha=Math.max(0,p.life/.55)*.22;ctx.fillStyle="#d9e0e5";ctx.beginPath();ctx.arc(p.x,p.y,7+(1-p.life/.55)*12,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
carDraw(car.x,car.y,car.a,"#ffcf32");for(const p of remotePlayers){if(p.id===myId)continue;carDraw(p.x,p.y,p.a,p.color||"#5be7ff");ctx.fillStyle="#fff";ctx.font="12px system-ui";ctx.textAlign="center";ctx.fillText(p.name||"Player",p.x,p.y-34)}ctx.restore();
if(running&&Math.abs(car.slip)>.12){ctx.fillStyle="#fff";ctx.font="bold 14px system-ui";ctx.fillText("SLIP "+Math.round(Math.abs(car.slip)*57.3)+"°",W-100,82)}
}
function frame(t){const dt=Math.min((t-last)/1000||0,.035);last=t;update(dt);draw();requestAnimationFrame(frame)}
status.textContent="Ready • tap Start";requestAnimationFrame(frame);
})();