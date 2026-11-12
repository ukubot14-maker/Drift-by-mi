(() => {
"use strict";
const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const $=id=>document.getElementById(id);
const startPanel=$("startPanel"),settings=$("settings"),status=$("status"),scoreLabel=$("score");
let w=0,h=0,dpr=1;
function resize(){dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
addEventListener("resize",resize);resize();
let running=false,settingsOpen=false;
const keys=new Set(),touch={x:0,y:0,gas:false,brake:false,hand:false};
const car={x:0,y:0,angle:0,speed:0,score:0,name:"Driver"};
function reset(){car.x=0;car.y=0;car.angle=0;car.speed=0}
function start(){if(running)return;running=true;car.name=$("driverName").value.trim()||"Driver";startPanel.classList.add("hidden");settings.classList.add("hidden");status.textContent="Driving offline";reset()}
$("startBtn").addEventListener("click",start);
$("startBtn").addEventListener("touchend",e=>{e.preventDefault();start()},{passive:false});
$("settingsBtn").addEventListener("click",()=>{settings.classList.remove("hidden")});
$("doneBtn").addEventListener("click",()=>settings.classList.add("hidden"));
$("touchToggle").addEventListener("change",()=>{$("touchControls").style.display=$("touchToggle").checked?"block":"none"});
$("touchToggle").checked=true;
addEventListener("keydown",e=>{keys.add(e.key.toLowerCase());if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(e.key.toLowerCase()))e.preventDefault()});
addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
const stick=$("stick"),knob=$("stickKnob");let pointer=null;
function moveStick(e){const r=stick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),lim=r.width*.34,len=Math.hypot(dx,dy),scale=len>lim?lim/len:1;touch.x=dx*scale/lim;touch.y=dy*scale/lim;knob.style.transform=`translate(${dx*scale}px,${dy*scale}px)`}
stick.addEventListener("pointerdown",e=>{pointer=e.pointerId;stick.setPointerCapture(pointer);moveStick(e)});
stick.addEventListener("pointermove",e=>{if(e.pointerId===pointer)moveStick(e)});
function endStick(){pointer=null;touch.x=touch.y=0;knob.style.transform="translate(0,0)"}
stick.addEventListener("pointerup",endStick);stick.addEventListener("pointercancel",endStick);
function hold(id,key){const el=$(id);const on=e=>{e.preventDefault();touch[key]=true;el.classList.add("down")},off=()=>{touch[key]=false;el.classList.remove("down")};el.addEventListener("pointerdown",on);["pointerup","pointercancel","pointerleave","lostpointercapture"].forEach(ev=>el.addEventListener(ev,off))}
hold("gas","gas");hold("brake","brake");hold("hand","hand");
let last=0;
function update(dt){if(!running)return;
const left=keys.has("a")||keys.has("arrowleft"),right=keys.has("d")||keys.has("arrowright");
let steer=(right?1:0)-(left?1:0);steer=Math.max(-1,Math.min(1,steer+touch.x));
const gas=keys.has("w")||keys.has("arrowup")||touch.gas||( $("touchToggle").checked&&touch.y<-.22);
const brake=keys.has("s")||keys.has("arrowdown")||touch.brake||($("touchToggle").checked&&touch.y>.35);
const hand=keys.has(" ")||touch.hand;
car.speed+=((gas?260:0)-(brake?360:0)-car.speed*1.15)*dt;car.speed=Math.max(-90,Math.min(420,car.speed));
car.angle+=steer*dt*(1.1+Math.abs(car.speed)/85)*(hand?2.1:1)*Math.sign(car.speed||1);
car.x+=Math.sin(car.angle)*car.speed*dt;car.y-=Math.cos(car.angle)*car.speed*dt;
if(hand&&Math.abs(car.speed)>40||Math.abs(steer)>.25&&Math.abs(car.speed)>130)car.score+=Math.abs(car.speed)*Math.abs(steer)*dt;
scoreLabel.textContent="Drift: "+Math.floor(car.score);
if(keys.has("r"))reset();
}
function drawCar(x,y,a,color){ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle="#111";ctx.fillRect(-17,-14,7,13);ctx.fillRect(10,-14,7,13);ctx.fillRect(-17,8,7,13);ctx.fillRect(10,8,7,13);ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-12,-23,24,46,6);ctx.fill();ctx.fillStyle="#b8eaff";ctx.fillRect(-8,-12,16,10);ctx.fillStyle="#ffeaa0";ctx.fillRect(-9,-20,5,3);ctx.fillRect(4,-20,5,3);ctx.restore()}
function draw(){ctx.fillStyle="#242a30";ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(w/2-car.x,h/2-car.y);ctx.fillStyle="#30363d";ctx.fillRect(-3000,-3000,6000,6000);ctx.strokeStyle="#3e464f";ctx.lineWidth=2;for(let i=-3000;i<=3000;i+=100){ctx.beginPath();ctx.moveTo(i,-3000);ctx.lineTo(i,3000);ctx.stroke();ctx.beginPath();ctx.moveTo(-3000,i);ctx.lineTo(3000,i);ctx.stroke()}ctx.strokeStyle="#e6e6e6";ctx.lineWidth=5;ctx.setLineDash([28,22]);ctx.beginPath();ctx.arc(0,0,420,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);drawCar(0,0,0,"#ffffff22");drawCar(car.x,car.y,car.angle,"#ffcf32");ctx.restore()}
function frame(t){const dt=Math.min((t-last)/1000||0,.04);last=t;update(dt);draw();requestAnimationFrame(frame)}
status.textContent="Ready • tap Start";
requestAnimationFrame(frame);
})();