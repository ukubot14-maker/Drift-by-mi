(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const startPanel=$("startPanel"),settings=$("settings"),status=$("status"),scoreLabel=$("score"),speedControl=$("speedControl"),speedValue=$("speedValue");
let gameSpeed=1;speedControl.addEventListener("input",()=>{gameSpeed=Number(speedControl.value)/100;speedValue.textContent=Number(speedControl.value)+"%"});
let W=innerWidth,H=innerHeight,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,.7);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener("resize",resize);resize();
let running=false,keys=new Set(),touch={x:0,y:0,gas:false,brake:false,hand:false};
let socket=null,myId=null,remotePlayers=[],netTimer=0;
const car={x:0,y:0,a:0,v:0,vx:0,vy:0,score:0,name:"Driver",slip:0,model:0,omega:0,steerAngle:0};
const carModels=[{name:"Coupe",color:"#ffcf32",accent:"#20252b"},{name:"JDM",color:"#e83b48",accent:"#f4f4f4"},{name:"Muscle",color:"#3c9bff",accent:"#f7d34a"},{name:"Rally",color:"#e9e9e9",accent:"#e13b32"}];
const tireMarks=[],smoke=[];
const trackCanvas=document.createElement("canvas");trackCanvas.width=1600;trackCanvas.height=1300;
const trackCtx=trackCanvas.getContext("2d");
function buildTrack(){const g=trackCtx;g.save();g.translate(800,650);
// New venue: floodlit motorsport stadium with a broad oval drift circuit
g.fillStyle="#17251d";g.fillRect(-5000,-5000,10000,10000);
// Stadium perimeter and grandstand sectors
g.fillStyle="#26333b";g.strokeStyle="#596975";g.lineWidth=18;g.beginPath();g.roundRect(-760,-620,1520,1240,180);g.fill();g.stroke();
g.fillStyle="#36434d";g.beginPath();g.roundRect(-700,-560,1400,1120,150);g.fill();
for(let i=0;i<28;i++){const x=-650+i*46;g.fillStyle=i%2?"#9caab4":"#6c7b86";g.fillRect(x,-590,15,40);g.fillRect(x,550,15,40)}
for(let i=0;i<22;i++){const y=-500+i*46;g.fillStyle=i%2?"#8797a2":"#64747f";g.fillRect(-730,y,32,15);g.fillRect(698,y,32,15)}
// Asphalt circuit outer edge + infield
g.fillStyle="#252a30";g.beginPath();g.roundRect(-570,-430,1140,860,130);g.fill();
g.fillStyle="#354b3d";g.beginPath();g.roundRect(-425,-285,850,570,105);g.fill();
// track border curbs (red/white segmented)
g.lineWidth=17;g.setLineDash([32,20]);g.strokeStyle="#f2f2ed";g.beginPath();g.roundRect(-535,-395,1070,790,120);g.stroke();g.strokeStyle="#d84a42";g.lineDash=[32,20];g.lineDashOffset=30;g.stroke();g.setLineDash([]);
// track lane guide and start stripe
g.strokeStyle="#aab1b5";g.lineWidth=3;g.setLineDash([35,28]);g.beginPath();g.roundRect(-485,-345,970,690,95);g.stroke();g.setLineDash([]);
g.fillStyle="#f4f4f4";for(let i=0;i<8;i++){g.fillRect(-18+i*5,-390,4,28)}
// Center skid pad with painted circles and cones
g.fillStyle="#20252b";g.beginPath();g.ellipse(0,0,190,125,0,0,Math.PI*2);g.fill();
g.strokeStyle="#68737c";g.lineWidth=3;g.beginPath();g.ellipse(0,0,165,105,0,0,Math.PI*2);g.stroke();
g.strokeStyle="#d9dce0";g.setLineDash([20,18]);g.beginPath();g.ellipse(0,0,105,65,0,0,Math.PI*2);g.stroke();g.setLineDash([]);
for(const [cx,cy] of [[-235,-190],[235,-190],[-235,190],[235,190],[-450,0],[450,0]]){g.fillStyle="#ff7b22";g.beginPath();g.moveTo(cx,cy-10);g.lineTo(cx-8,cy+8);g.lineTo(cx+8,cy+8);g.closePath();g.fill();g.fillStyle="#fff";g.fillRect(cx-7,cy+3,14,3)}
// Floodlight glow pools
for(const [lx,ly] of [[-650,-500],[650,-500],[-650,500],[650,500]]){const g=g.createRadialGradient(lx,ly,5,lx,ly,190);g.addColorStop(0,"#dcecff18");g.addColorStop(1,"#dcecff00");g.fillStyle=g;g.fillRect(lx-190,ly-190,380,380)}
g.restore()}
buildTrack();

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
addEventListener("keydown",e=>{if(e.key.toLowerCase()==="c"){car.model=(car.model+1)%carModels.length;status.textContent="CAR: "+carModels[car.model].name+" • press C to switch"}});
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
const steerInput=Math.max(-1,Math.min(1,(right?1:0)-(left?1:0)+touch.x));
const gas=keys.has("w")||keys.has("arrowup")||touch.gas||($("touchToggle").checked&&touch.y<-.22);
const brake=keys.has("s")||keys.has("arrowdown")||touch.brake||($("touchToggle").checked&&touch.y>.35);
const hand=keys.has(" ")||touch.hand;
const speed=Math.hypot(car.vx,car.vy),forward=car.vx*Math.sin(car.a)-car.vy*Math.cos(car.a);
const steerMax=.57;car.steerAngle=steerInput*steerMax*(1-Math.min(.72,speed/520));
const fx=Math.sin(car.a),fy=-Math.cos(car.a),sx=Math.cos(car.a),sy=Math.sin(car.a);
const vLong=car.vx*fx+car.vy*fy,vLat=car.vx*sx+car.vy*sy,yawRate=car.omega;
const wheelbase=31.4,frontDist=wheelbase*.56,rearDist=wheelbase*.44;
const frontSlip=Math.atan2(vLat+yawRate*frontDist,Math.max(8,Math.abs(vLong)))-car.steerAngle;
const rearSlip=Math.atan2(vLat-yawRate*rearDist,Math.max(8,Math.abs(vLong)));
const ff=-frontSlip*1450*(hand?1:.95),rf=-rearSlip*1350*(hand?.43:1);
const FyFront=Math.max(-8500,Math.min(8500,ff)),FyRear=Math.max(-9000,Math.min(9000,rf));
const accelLat=(FyFront+FyRear)/1320,yawAccel=(FyFront*frontDist-FyRear*rearDist)/2150;
const drive=(gas?6700:0)-(brake?9900:0)-(hand?Math.sign(vLong||1)*6800:0)-.00042*speed*speed-.018*1320*9.81;
const accelLong=drive/1320;
car.vx+=(fx*accelLong+sx*accelLat)*dt;car.vy+=(fy*accelLong+sy*accelLat)*dt;
car.omega+=yawAccel*dt;car.omega*=Math.max(0,1-dt*(hand?.18:.48));car.a+=car.omega*dt;
car.v=Math.hypot(car.vx,car.vy);const velocityAngle=Math.atan2(car.vx,-car.vy);
car.slip=car.v>1?Math.atan2(Math.sin(car.a-velocityAngle),Math.cos(car.a-velocityAngle)):0;
car.x+=car.vx*dt;car.y+=car.vy*dt;
if(Math.abs(car.x)>560){car.vx*=-.4;car.x=Math.sign(car.x)*560}if(Math.abs(car.y)>420){car.vy*=-.4;car.y=Math.sign(car.y)*420}
const drifting=car.v>75&&Math.abs(car.slip)>.13;
if(drifting){car.score+=car.v*Math.abs(car.slip)*dt*1.25;const rx=car.x-fx*20,ry=car.y-fy*20;for(const side of [-1,1]){if(tireMarks.length<220)tireMarks.push({x:rx+side*sx*10,y:ry+side*sy*10,life:6})}if(smoke.length<18&&Math.random()<.18)smoke.push({x:rx+(Math.random()-.5)*18,y:ry+(Math.random()-.5)*18,vx:car.vx*.05+(Math.random()-.5)*18,vy:car.vy*.05+(Math.random()-.5)*18,life:.7})}
for(let i=tireMarks.length-1;i>=0;i--){tireMarks[i].life-=dt;if(tireMarks[i].life<=0)tireMarks.splice(i,1)}
for(let i=smoke.length-1;i>=0;i--){const p=smoke[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)smoke.splice(i,1)}
if(socket&&socket.readyState===WebSocket.OPEN){netTimer+=dt;if(netTimer>.06){netTimer=0;socket.send(JSON.stringify({type:"state",name:car.name,x:car.x,y:car.y,a:car.a,model:car.model}))}}
scoreLabel.textContent="Drift: "+Math.floor(car.score);
}
function carDraw(x,y,a,modelIndex=0){
const m=carModels[modelIndex%carModels.length];ctx.save();ctx.translate(x,y);ctx.rotate(a);
ctx.shadowColor="#0009";ctx.shadowBlur=8;ctx.shadowOffsetY=3;
// Four chunky tires with sidewalls and tread
ctx.fillStyle="#090b0e";for(const [wx,wy] of [[-16,-25],[16,-25],[-16,22],[16,22]]){ctx.beginPath();ctx.roundRect(wx-4,wy-7,8,14,2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#343a40";ctx.lineWidth=1;for(let t=-4;t<=4;t+=4){ctx.beginPath();ctx.moveTo(wx-3,wy+t);ctx.lineTo(wx+3,wy+t);ctx.stroke()}ctx.shadowBlur=8}
ctx.shadowColor="transparent";ctx.shadowOffsetY=0;
// Sculpted body silhouette
ctx.fillStyle="#080a0d";ctx.beginPath();ctx.moveTo(-10,-31);ctx.quadraticCurveTo(-17,-28,-17,-18);ctx.lineTo(-19,13);ctx.quadraticCurveTo(-17,29,-10,32);ctx.lineTo(10,32);ctx.quadraticCurveTo(17,29,19,13);ctx.lineTo(17,-18);ctx.quadraticCurveTo(17,-28,10,-31);ctx.closePath();ctx.fill();
ctx.fillStyle=m.color;ctx.beginPath();ctx.moveTo(-11,-31);ctx.quadraticCurveTo(-15,-27,-15,-17);ctx.lineTo(-17,12);ctx.quadraticCurveTo(-15,26,-9,29);ctx.lineTo(9,29);ctx.quadraticCurveTo(15,26,17,12);ctx.lineTo(15,-17);ctx.quadraticCurveTo(15,-27,11,-31);ctx.closePath();ctx.fill();
// Hood and trunk highlights
ctx.fillStyle=m.accent;ctx.globalAlpha=.22;ctx.beginPath();ctx.moveTo(-10,-27);ctx.lineTo(10,-27);ctx.lineTo(12,-13);ctx.lineTo(-12,-13);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
ctx.strokeStyle="#ffffff55";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-12,-25);ctx.lineTo(-13,-8);ctx.moveTo(12,-25);ctx.lineTo(13,-8);ctx.stroke();
// Windscreen, roof and rear glass
ctx.fillStyle="#101c27";ctx.beginPath();ctx.moveTo(-12,-12);ctx.lineTo(12,-12);ctx.lineTo(9,-2);ctx.lineTo(-9,-2);ctx.closePath();ctx.fill();
ctx.fillStyle="#8edfff";ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(-10,-11);ctx.lineTo(10,-11);ctx.lineTo(8,-3);ctx.lineTo(-8,-3);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
ctx.fillStyle="#18232d";ctx.beginPath();ctx.moveTo(-9,4);ctx.lineTo(9,4);ctx.lineTo(12,15);ctx.lineTo(-12,15);ctx.closePath();ctx.fill();
ctx.fillStyle="#76c8e9";ctx.globalAlpha=.65;ctx.fill();ctx.globalAlpha=1;
// Roof panel, mirrors, lights and bumper details
ctx.fillStyle="#0d141b";ctx.beginPath();ctx.roundRect(-7,-1,14,5,2);ctx.fill();
ctx.fillStyle="#fff6cf";ctx.fillRect(-12,-28,6,3);ctx.fillRect(6,-28,6,3);
ctx.fillStyle="#ff3a4d";ctx.fillRect(-11,25,5,3);ctx.fillRect(6,25,5,3);
ctx.fillStyle="#161b20";ctx.fillRect(-14,-17,3,7);ctx.fillRect(11,-17,3,7);
ctx.fillStyle="#ffffff55";ctx.fillRect(-8,-31,16,1);ctx.restore()
}
function draw(){
ctx.fillStyle="#252b31";ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W/2-car.x,H/2-car.y);
g.drawImage(trackCanvas,-800,-650);

ctx.globalAlpha=.55;ctx.fillStyle="#111418";ctx.beginPath();for(const m of tireMarks){ctx.moveTo(m.x+3.2,m.y);ctx.arc(m.x,m.y,3.2,0,Math.PI*2)}ctx.fill();ctx.globalAlpha=1;
for(const p of smoke){ctx.globalAlpha=Math.max(0,p.life/.55)*.22;ctx.fillStyle="#d9e0e5";ctx.beginPath();ctx.arc(p.x,p.y,7+(1-p.life/.55)*12,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
carDraw(car.x,car.y,car.a,car.model);for(const p of remotePlayers){if(p.id===myId)continue;carDraw(p.x,p.y,p.a,p.model||1);ctx.fillStyle="#fff";ctx.font="12px system-ui";ctx.textAlign="center";ctx.fillText(p.name||"Player",p.x,p.y-34)}ctx.restore();
if(running&&Math.abs(car.slip)>.12){ctx.fillStyle="#fff";ctx.font="bold 14px system-ui";ctx.fillText("SLIP "+Math.round(Math.abs(car.slip)*57.3)+"°",W-100,82)}
}
function frame(t){const dt=Math.min((t-last)/1000||0,.035);last=t;update(Math.min(dt*gameSpeed,.12));draw();requestAnimationFrame(frame)}
status.textContent="Ready • tap Start";requestAnimationFrame(frame);
})();