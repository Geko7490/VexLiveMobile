import {WebSocketServer} from "ws";
import {TikTokLiveConnection,WebcastEvent} from "tiktok-live-connector";
import {createServer} from "node:http";
const server=createServer((req,res)=>{res.writeHead(200);res.end("VEX LIVE bridge");});
const wss=new WebSocketServer({server,maxPayload:4096});
wss.on("connection",async(ws,req)=>{
 const u=new URL(req.url,"http://localhost"),host=u.searchParams.get("uniqueId")||"",token=u.searchParams.get("token")||"";
 if(!process.env.BRIDGE_TOKEN||token!==process.env.BRIDGE_TOKEN||!/^[a-zA-Z0-9_.]{2,32}$/.test(host)){ws.close(1008,"Unauthorized");return;}
 let conn;const send=x=>{if(ws.readyState===1)ws.send(JSON.stringify(x));};
 try{
 conn=new TikTokLiveConnection(host,{enableExtendedGiftInfo:true});
 for(const [ev,type] of [[WebcastEvent.CHAT,"comment"],[WebcastEvent.MEMBER,"join"],[WebcastEvent.LIKE,"like"],[WebcastEvent.GIFT,"gift"],[WebcastEvent.ROOM_USER,"viewers"],["follow","follow"],["share","share"]]){
 if(!ev)continue;conn.on(ev,d=>send({type,data:d}));
 }
 conn.on("disconnected",()=>ws.close(1011,"LIVE disconnected"));
 conn.on("error",()=>send({type:"error",message:"TikTok connection error"}));
 ws.on("close",()=>{try{conn.disconnect();}catch{}});
 await conn.connect();if(ws.readyState!==1)conn.disconnect();else send({type:"status",message:"TikTok LIVE connected"});
 }catch(e){send({type:"error",message:"LIVE connection failed"});ws.close(1011);}
});
server.listen(Number(process.env.PORT||8080),"127.0.0.1");
