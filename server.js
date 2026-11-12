const http = require("http");
const WebSocket = require("ws");
const server = http.createServer((req,res)=>{res.writeHead(200,{"content-type":"text/plain"});res.end("Drift multiplayer server is running.");});
const wss = new WebSocket.Server({server});
const players = new Map();
function sendAll(){const payload=JSON.stringify({type:"players",players:[...players.values()]});for(const client of wss.clients)if(client.readyState===WebSocket.OPEN)client.send(payload);}
wss.on("connection",ws=>{
 const id=Math.random().toString(36).slice(2,10);
 players.set(id,{id,name:"Driver",x:0,y:0,a:0,color:"#"+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,"0")});
 ws.send(JSON.stringify({type:"welcome",id}));
 sendAll();
 ws.on("message",raw=>{try{const m=JSON.parse(raw);if(m.type!=="state")return;const p=players.get(id);if(!p)return;p.name=String(m.name||"Driver").slice(0,16);p.x=Number(m.x)||0;p.y=Number(m.y)||0;p.a=Number(m.a)||0;sendAll()}catch{}});
 ws.on("close",()=>{players.delete(id);sendAll()});
});
const port=process.env.PORT||3000;server.listen(port,"0.0.0.0",()=>console.log("Drift server listening on "+port));
