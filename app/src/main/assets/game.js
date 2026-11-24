"use strict";
const $=id=>document.getElementById(id);
const games=[["Halay 3D","🪗","Dans zinciri"],["Infinite Miner","⛏","Maden ilerlemesi"],["Monster Arena","🐲","Yaratık geliştirme"],["Last Civilization","🏛","Köy kurma"],["Marble Race","🏁","Bilye yarışı"]];
let game=0, camera=0, demo=false, socket=null, reconnect=null, generation=0, delay=1000, wants=false, connected=false;
const people=new Map(), pics=new Map(), seen=new Set();
let likes=0,gifts=0,views=0,festUntil=0,goalStep=0,toastUntil=0,phase=0,last=0,paint=0,particles=[],audioCtx=null,beatTimer=null,trackURL=null;
const canvas=$("scene"), c=canvas.getContext("2d",{alpha:false});
const num=(v,d=0)=>Number.isFinite(Number(v))?Math.max(0,Number(v)):d;
const setting=(id)=>$(id).value;
function notify(s){$("notice").textContent=s;}
function status(s){$("status").textContent=s;}
function label(s){$("toast").textContent=s;toastUntil=performance.now()+3000;}
function renderGames(){ $("games").replaceChildren();games.forEach((g,i)=>{let b=document.createElement("button");b.className="game"+(game===i?" active":"");let icon=document.createElement("b");icon.textContent=g[1];let title=document.createElement("span");title.textContent=g[0];let sub=document.createElement("small");sub.textContent=g[2];b.append(icon,title,sub);b.onclick=()=>{game=i;renderGames();save();};$("games").append(b);});}
const settings=["host","map","quality","fps","cap","goal","gift","orientation","filter","autoJoin","avatars","showchat"];
function save(){try{let o={game};for(let id of settings)o[id]=$(id).type==="checkbox"?$(id).checked:$(id).value;localStorage.setItem("vex-settings",JSON.stringify(o));}catch(e){}}
try{let o=JSON.parse(localStorage.getItem("vex-settings")||"{}");game=Math.min(4,Math.max(0,num(o.game)));for(let id of settings)if(o[id]!==undefined){if($(id).type==="checkbox")$(id).checked=!!o[id];else $(id).value=o[id];}}catch(e){}
settings.forEach(id=>$(id).addEventListener("change",save));renderGames();
function clean(v){let s=String(v||"").replace(/[\u0000-\u001f\u007f\u202a-\u202e]/g,"").slice(0,24);return s||"İzleyici";}
function blocked(s){return setting("filter").split(",").map(x=>x.trim().toLocaleLowerCase("tr")).filter(Boolean).some(x=>String(s).toLocaleLowerCase("tr").includes(x));}
function imageFor(url){if(typeof url!=="string"||!url.startsWith("https://"))return null;if(!pics.has(url)&&pics.size<180){let im=new Image();im.referrerPolicy="no-referrer";im.src=url;pics.set(url,im);}return pics.get(url);}
function add(e){let id=String(e.id||e.name||"").slice(0,128);if(!id)return null;let p=people.get(id);if(!p){if(people.size>=num(setting("cap"),120))return null;let name=clean(e.name||id);if(blocked(name))name="İzleyici";p={id,name,score:0,likes:0,gifts:0,seed:Math.random(),color:"hsl("+Math.floor(Math.random()*360)+" 68% 57%)",photo:null};people.set(id,p);label(name+" katıldı!");}if(e.avatar&&$("avatars").checked)p.photo=imageFor(e.avatar);return p;}
function event(e){if(!e||!e.type)return;
 if(e.eventId){let id=String(e.eventId);if(seen.has(id))return;seen.add(id);if(seen.size>3000)seen.delete(seen.values().next().value);}
 if(e.type==="viewers"){views=Math.floor(num(e.count));return;}
 if(e.type==="join"&&!$("autoJoin").checked)return;
 if(!["join","comment","like","gift","follow","share"].includes(e.type))return;
 let p=add(e);if(e.type==="like"){let n=Math.min(10000,num(e.count,1));likes+=n;if(p){p.likes+=n;p.score+=n;}let g=Math.max(100,num(setting("goal"),1000));if(Math.floor(likes/g)>goalStep){goalStep=Math.floor(likes/g);festUntil=performance.now()+7000;burst(70);label("FESTİVAL • HEDEF TAMAMLANDI!");}}
 if(e.type==="gift"){let n=Math.max(1,Math.min(1000,num(e.count,1)));gifts+=n;if(p){p.gifts+=n;p.score+=n*10*num(setting("gift"));}if(num(setting("gift"))){burst(Math.min(60,n*5+10));label((p?p.name:"İzleyici")+" • "+(blocked(e.gift)?"Hediye":clean(e.gift||"Hediye")));}}
 if(p&&e.type==="comment"){p.score+=2;if($("showchat").checked&&!blocked(e.text))label(p.name+": "+clean(e.text));}
 if(p&&(e.type==="follow"||e.type==="share")){p.score+=5;burst(12);}
}
function normalize(raw){
 if(!raw||typeof raw!=="object")return;
 if(Array.isArray(raw)){raw.forEach(normalize);return;}
 if(Array.isArray(raw.events)){raw.events.forEach(normalize);return;}
 if(Array.isArray(raw.messages)){raw.messages.forEach(normalize);return;}
 if(raw.type==="status"||raw.type==="error"){notify(clean(raw.message));return;}
 let t=String(raw.type||raw.event||raw.method||raw.eventType||"").toLowerCase();
 let d=raw.data||raw.payload||raw.message||raw;
 if(typeof d!=="object")return;
 const aliases={webcastchatmessage:"comment",chat:"comment",comment:"comment",webcastmembermessage:"join",member:"join",join:"join",presencejoin:"join",webcastlikemessage:"like",like:"like",webcastgiftmessage:"gift",gift:"gift",follow:"follow",share:"share",roomuser:"viewers",webcastroomuserseqmessage:"viewers",viewers:"viewers"};
 let type=aliases[t];if(!type){if(t==="webcastsocialmessage"){type=String(d.displayType||d.action||"").toLowerCase().includes("follow")?"follow":null;}if(!type)return;}
 if(type==="gift"&&(d.giftType===1||d.gift_type===1||d.gift?.giftType===1)&&!(d.repeatEnd||d.repeat_end||d.repeatEnd===1))return;
 let u=d.user||raw.user||{};let av=u.profilePictureUrl||u.avatarThumb?.urlList?.[0]||u.avatar_thumb?.url_list?.[0]||d.profilePictureUrl||d.avatar;
 event({type,id:u.uniqueId||u.unique_id||u.userId||u.user_id||u.id||d.id||d.uniqueId||d.unique_id||d.name,name:d.name||u.nickname||u.uniqueId||u.unique_id||d.nickname||d.uniqueId,avatar:av,count:type==="viewers"?(d.viewerCount??d.total??d.count??d.totalUser??d.total_user):(d.likeCount??d.like_count??d.repeatCount??d.repeat_count??d.count??1),text:d.comment||d.text,gift:d.giftName||d.gift?.name||d.extendedGiftInfo?.name||d.gift,eventId:raw.eventId||d.msgId||d.common?.msgId||d.common?.msg_id});
}
function closeSocket(){wants=false;generation++;clearTimeout(reconnect);if(socket){socket.close();socket=null;}connected=false;status("BAĞLI DEĞİL");}
function openSocket(url){let g=++generation;status("BAĞLANIYOR");try{socket=new WebSocket(url);}catch(e){notify("WebSocket adresi geçersiz.");closeSocket();return;}
 socket.onopen=()=>{if(g!==generation)return;connected=true;delay=1000;status("WS BAĞLI");notify("WebSocket açık; LIVE olayları bekleniyor.");};
 socket.onmessage=m=>{if(g!==generation)return;try{normalize(JSON.parse(m.data));}catch(e){}};
 socket.onerror=()=>{if(g===generation)notify("Bağlantı hatası. Yayın / anahtar / sağlayıcıyı kontrol et.");};
 socket.onclose=()=>{if(g!==generation)return;connected=false;status("BAĞLANTI KOPTU");if(wants){reconnect=setTimeout(()=>openSocket(url),delay);delay=Math.min(30000,delay*2);}};
}
$("provider").onchange=()=>{$("keyLabel").hidden=setting("provider")!=="euler";$("urlLabel").hidden=setting("provider")!=="bridge";};
$("connect").onclick=()=>{let url;let h=setting("host").trim().replace(/^@/,"");if(!/^[a-zA-Z0-9_.]{2,32}$/.test(h)){notify("Geçerli TikTok kullanıcı adı gir.");return;}if(setting("provider")==="euler"){let k=setting("key").trim();if(!k){notify("Euler API anahtarı gerekli.");return;}url="wss://ws.eulerstream.com?uniqueId="+encodeURIComponent(h)+"&apiKey="+encodeURIComponent(k)+"&features.bundleEvents=false";}else{try{let u=new URL(setting("url"));if(u.protocol!=="wss:")throw Error();u.searchParams.set("uniqueId",h);url=u.href;}catch(e){notify("Güvenli wss:// adresi gir.");return;}}closeSocket();reset();demo=false;wants=true;delay=1000;openSocket(url);};
$("disconnect").onclick=closeSocket;
function reset(){window.Vex3D?.reset();people.clear();pics.clear();seen.clear();likes=gifts=views=goalStep=0;particles=[];festUntil=toastUntil=0;demo=false;}
$("reset").onclick=()=>{reset();notify("Oturum sıfırlandı.");};
function addDemo(){if(wants||connected){notify("Önce gerçek bağlantıyı ayır.");return;}if(!demo){reset();demo=true;}let n=people.size;for(let i=0;i<10&&people.size<num(setting("cap"));i++)event({type:"join",id:"demo"+(n+i),name:"Demo "+(n+i+1)});event({type:"like",id:"demo0",name:"Demo 1",count:70});}
$("demo").onclick=addDemo;$("demoEvent").onclick=()=>{if(!wants&&!connected){addDemo();event({type:"gift",id:"demo0",name:"Demo 1",gift:"Demo çiçek",count:3});}};
$("streamHelp").onclick=()=>{$("help").hidden=!$("help").hidden;};
function showStage(){$("stage").hidden=false;window.VexMusic?.selectGame(game);$("dashboard").hidden=true;document.querySelector("header").hidden=true;$("gameTitle").textContent=games[game][0];if(window.Native){Native.orientation(setting("orientation")==="1");Native.immersive(true);}resize();}
window.exitStage=()=>{$("stage").hidden=true;$("dashboard").hidden=false;document.querySelector("header").hidden=false;if(window.Native){Native.orientation(false);Native.immersive(false);}};
$("launch").onclick=showStage;$("back").onclick=window.exitStage;$("camera").onclick=()=>camera=(camera+1)%3;
function resize(){let scale=Math.min(2,Math.max(.75,num(setting("quality"),1)));canvas.width=Math.max(1,Math.round(canvas.clientWidth*scale));canvas.height=Math.max(1,Math.round(canvas.clientHeight*scale));}
window.addEventListener("resize",resize);$("quality").onchange=()=>{save();resize();};
function burst(n){for(let i=0;i<n&&particles.length<180;i++)particles.push({x:Math.random(),y:.25+Math.random()*.15,dx:(Math.random()-.5)*.2,dy:-Math.random()*.35,t:1+Math.random(),color:"hsl("+Math.random()*360+" 90% 70%)"});}
function ell(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fill();}
function line(x,y,x2,y2,w,color){c.strokeStyle=color;c.lineWidth=w;c.lineCap="round";c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.stroke();}
function polygon(points,color){c.fillStyle=color;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();}
function project(x,z,y=0){let W=canvas.width,H=canvas.height,zoom=[1,1.15,.86][camera],s=Math.min(W/24,H/30)*zoom*(1+z*.017);return [W/2+x*s,H*.60+z*s*.49-y*s,s];}
function box3(x,z,y,w,d,h,col,side,top){let a=project(x-w/2,z-d/2,y),b=project(x+w/2,z-d/2,y),f=project(x+w/2,z+d/2,y),g=project(x-w/2,z+d/2,y),A=project(x-w/2,z-d/2,y+h),B=project(x+w/2,z-d/2,y+h),F=project(x+w/2,z+d/2,y+h),G=project(x-w/2,z+d/2,y+h);polygon([g,f,F,G],col);polygon([b,f,F,B],side);polygon([A,B,F,G],top);}
function landscape(){let W=canvas.width,H=canvas.height,night=setting("map")==="Gece Düğünü",hall=setting("map")==="Düğün Salonu",mount=setting("map")==="Karadeniz Yaylası";let grad=c.createLinearGradient(0,0,0,H);grad.addColorStop(0,night?"#151431":hall?"#30243e":"#6bb9e4");grad.addColorStop(.48,night?"#57517c":hall?"#65546e":"#f4d8a2");grad.addColorStop(.5,night?"#2b3c39":mount?"#436c43":hall?"#54434d":"#a88a61");grad.addColorStop(1,night?"#162624":mount?"#263d2b":hall?"#251d31":"#68533f");c.fillStyle=grad;c.fillRect(0,0,W,H);
 for(let i=0;i<9;i++){let x=(i-1)*W/7;polygon([[x,H*.49],[x+W*.15,H*(.27+(i%3)*.04)],[x+W*.32,H*.49]],night?"#37364e":mount?"#4b805d":"#89978d");}
 for(let i=-3;i<=3;i++){let x=i*4,z=-10;box3(x,z,0,2.8,2,2.5,night?"#594f69":"#c4a987","#8f7b69","#e6d1ab");let a=project(x-1.7,z+1,2.5),b=project(x+1.7,z+1,2.5),m=project(x,z+1,3.7);polygon([a,b,m],night?"#52415e":"#964c3e");}
 let a=project(-11,14),b=project(11,14),d=project(11,-7),e=project(-11,-7);polygon([a,b,d,e],night?"#46534a":hall?"#77647a":"#c2a67c");
 for(let i=-10;i<=10;i+=2){let p=project(i,-7),q=project(i,14);line(p[0],p[1],q[0],q[1],1,"#ffffff13");}
 for(let i=-9;i<=9;i+=1.5){let p=project(i,-6,5+Math.cos(i)*.4);ell(p[0],p[1],3,3,night?"#fff4aa":"#ffd66e");}
}
function person(p,x,z,t,style=0){let [sx,sy,s]=project(x,z),stride=Math.sin(t+p.seed*.8),bob=Math.abs(stride)*s*.14,headY=sy-s*2.5-bob;ell(sx,sy,s*.52,s*.15,"#0004");let hip=sy-s*.95-bob,shoulder=sy-s*1.8-bob;let left=sx-s*.25,right=sx+s*.25;line(left,hip,left+stride*s*.28,sy-bob,s*.30,"#363148");line(right,hip,right-stride*s*.28,sy,s*.30,"#25233a");ell(left+stride*s*.28,sy-bob,s*.22,s*.11,"#181625");ell(right-stride*s*.28,sy,s*.22,s*.11,"#181625");line(left,shoulder,sx-s*.70,shoulder+s*.1+stride*s*.12,s*.24,"#deb092");line(right,shoulder,sx+s*.70,shoulder+s*.1-stride*s*.12,s*.24,"#deb092");c.fillStyle=p.color;c.beginPath();c.roundRect(sx-s*.40,shoulder-s*.12,s*.8,s*.9,s*.12);c.fill();line(sx-s*.35,hip,sx+s*.35,hip,s*.08,"#f3d59b");ell(sx,headY+s*.2,s*.35,s*.39,"#d9a180");ell(sx,headY-s*.03,s*.36,s*.19,"#302239");if($("avatars").checked&&p.photo?.complete&&p.photo.naturalWidth){c.save();c.beginPath();c.arc(sx,headY-s*.55,s*.38,0,Math.PI*2);c.clip();c.drawImage(p.photo,sx-s*.38,headY-s*.93,s*.76,s*.76);c.restore();}c.font="bold "+Math.max(8,s*.42)+"px sans-serif";c.textAlign="center";c.fillStyle="#fff";c.strokeStyle="#251e32";c.lineWidth=2;c.strokeText(p.name,sx,headY-s*1.02);c.fillText(p.name,sx,headY-s*1.02);}
function scene(now,dt){landscape();let arr=[...people.values()],t=phase;let W=canvas.width,H=canvas.height;
 if(game===0){let positions=arr.map((p,i)=>{let ring=Math.floor(i/24),n=Math.min(24,arr.length-ring*24),a=i%24/Math.max(5,n)*Math.PI*2+phase*.075;let r=3+ring*1.9;return {p,x:Math.cos(a)*r,z:Math.sin(a)*r,angle:a};}).sort((a,b)=>a.z-b.z);for(let q of positions)person(q.p,q.x,q.z,t);}
 if(game===1){for(let i=0;i<18;i++){let x=(i%6-2.5)*2.5,z=Math.floor(i/6)*3-3;box3(x,z,0,1.6,1.6,.8+Math.sin(i)*.2,"#766b83","#423d57","#b4a9d2");}arr.slice(0,60).forEach((p,i)=>{let x=(i%8-3.5)*2.1,z=Math.floor(i/8)*2-5;person(p,x,z,t);let q=project(x+.5,z,1.2);line(q[0],q[1],q[0]+Math.sin(t)*q[2]*.7,q[1]-q[2]*.6,q[2]*.13,"#ffdc7e");if(p.score>0){let a=project(x,z,3);c.fillStyle="#ffe7a5";c.font="bold 12px sans-serif";c.fillText("Lv "+(1+Math.floor(p.score/30)),a[0],a[1]);}});}
 if(game===2){arr.slice(0,60).forEach((p,i)=>{let a=i/Math.max(1,arr.length)*6.28+t*.03,r=4+Math.floor(i/20)*2;let q=project(Math.cos(a)*r,Math.sin(a)*r),s=q[2]*(.8+Math.min(1.5,p.score/200));ell(q[0],q[1],s*.7,s*.18,"#0005");ell(q[0],q[1]-s*.7,s*.75,s*.8,p.color);ell(q[0]-s*.25,q[1]-s*.95,s*.12,s*.16,"white");ell(q[0]+s*.25,q[1]-s*.95,s*.12,s*.16,"white");c.font="bold 12px sans-serif";c.fillStyle="white";c.textAlign="center";c.fillText(p.name,q[0],q[1]-s*1.8);});}
 if(game===3){let sorted=arr.slice(0,48);sorted.forEach((p,i)=>{let x=(i%8-3.5)*2.5,z=Math.floor(i/8)*2.7-6,h=1+Math.min(3,p.score/60);box3(x,z,0,1.6,1.4,h,p.color,"#51485e","#ffe1ad");let q=project(x,z,h+.35);c.fillStyle="white";c.font="bold 10px sans-serif";c.textAlign="center";c.fillText(p.name,q[0],q[1]);});}
 if(game===4){for(let i=0;i<6;i++){let a=project(i*2.6-6.5,-7),b=project(i*2.6-6.5,14);line(a[0],a[1],b[0],b[1],3,"#fff6");}arr.slice(0,60).forEach((p,i)=>{let z=((phase*(.4+p.seed*.6)+p.score*.03+i*.3)%21)-7,x=(i%6-2.5)*2.6;let q=project(x,z);ell(q[0],q[1],q[2]*.42,q[2]*.42,p.color);ell(q[0]-q[2]*.1,q[1]-q[2]*.1,q[2]*.13,q[2]*.13,"#fff9");c.fillStyle="white";c.font="bold 10px sans-serif";c.textAlign="center";c.fillText(p.name,q[0],q[1]-q[2]*.65);});}
 if(arr.length===0){c.fillStyle="#ffffff";c.textAlign="center";c.font="bold "+Math.max(16,W*.045)+"px sans-serif";c.fillText("İlk katılımcı bekleniyor",W/2,H*.65);}
 if(now<festUntil&&Math.random()<.3)burst(2);particles=particles.filter(p=>{p.t-=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;p.dy+=dt*.35;c.fillStyle=p.color;c.fillRect(p.x*W,p.y*H,5,8);return p.t>0;});
}
function hud(now){let g=Math.max(100,num(setting("goal"),1000));$("stageMode").textContent=demo?"DEMO • SANAL":connected?"LIVE • WS BAĞLI":"OFFLINE";$("players").textContent="👥 "+people.size;$("likes").textContent="♥ "+likes;$("gifts").textContent="🎁 "+gifts;$("views").textContent="◉ "+views;$("bar").style.width=(likes%g)/g*100+"%";$("goalText").textContent="Festival "+(goalStep+1)+" • "+(likes%g)+" / "+g;$("rank").textContent="LİDERLER\n"+[...people.values()].sort((a,b)=>b.score-a.score).slice(0,4).map((p,i)=>(i+1)+". "+p.name+"  "+Math.floor(p.score)).join("\n");$("stats").textContent=people.size+" katılımcı • "+likes+" beğeni • "+gifts+" hediye";$("demoEvent").hidden=wants||connected;if(now>toastUntil)$("toast").textContent="";}
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.1,(now-(last||now))/1000);last=now;phase+=dt*(3+Math.min(4,likes/500));if(!$("stage").hidden&&now-paint>=1000/num(setting("fps"),60)-2){let elapsed=Math.min(.1,(now-(paint||now))/1000);paint=now;if(!window.Vex3D?.render({game,camera,people:[...people.values()],phase,likes,gifts,fest:now<festUntil,map:setting("map"),quality:num(setting("quality"),1),avatars:$("avatars").checked,dt:elapsed,now})){scene(now,elapsed);}}if(now%250<20)hud(now);}
requestAnimationFrame(frame);setInterval(()=>hud(performance.now()),300);
$("audioFile").onchange=()=>{let f=$("audioFile").files[0];if(!f)return;if(trackURL)URL.revokeObjectURL(trackURL);trackURL=URL.createObjectURL(f);$("audio").src=trackURL;$("audio").play().catch(()=>{});};

window.VexState={getGame:()=>game,getLikes:()=>likes,notify};
