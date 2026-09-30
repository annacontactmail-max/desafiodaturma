const KEY="desafioTurmaV2";
const defaults={className:"Turma",pin:"1234",score:0,history:[],levels:[
 {name:"Sair 5 minutos mais cedo",points:20,emoji:"🟦"},{name:"Aula livre",points:35,emoji:"🟩"},
 {name:"1 torneio",points:50,emoji:"🟨"},{name:"Aula na rua",points:70,emoji:"🟧"},
 {name:"1h de festa final de ano",points:100,emoji:"🟪"},{name:"2h de festa final de ano",points:150,emoji:"🏆"}],
actions:[
 {name:"Semana sem ocorrências nem faltas",points:3,emoji:"🟢"},
 {name:"Elogio",points:4,emoji:"⭐"},
 {name:"Justificar faltas",points:2,emoji:"📝"},
 {name:"1 ponto extra",points:1,emoji:"➕"},
 {name:"Ocorrência",points:-3,emoji:"🔴"},
 {name:"Falta injustificada",points:-2,emoji:"🟠"},
 {name:"Mail professor",points:-5,emoji:"📧"},
 {name:"-1 ponto",points:-1,emoji:"➖"},
 {name:"Falta disciplinar",points:-10,emoji:"🚨"}]};

const configured=window.SUPABASE_URL && window.SUPABASE_ANON_KEY;
const sb=configured?supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;
let classroomId=localStorage.getItem("desafioClassroomId");
let data=JSON.parse(localStorage.getItem(KEY)||"null")||structuredClone(defaults);

const $=s=>document.querySelector(s);
function normalizeData(){
 data.levels=(Array.isArray(data.levels)?data.levels:[]).map((l,i)=>({
   name:String(l?.name||`Prémio ${i+1}`),
   points:Number.isFinite(Number(l?.points))?Number(l.points):0,
   emoji:String(l?.emoji||"🏆")
 })).filter(l=>l.name).sort((a,b)=>a.points-b.points);
 if(!data.levels.length)data.levels=structuredClone(defaults.levels);
 // Migração das metas antigas para o percurso definido.
 const prizeNames={20:"Sair 5 minutos mais cedo",35:"Aula livre",50:"1 torneio",70:"Aula na rua",100:"1h de festa final de ano",130:"2h de festa final de ano",150:"2h de festa final de ano"};
 data.levels=data.levels.map(l=>({...l,name:prizeNames[Number(l.points)]||l.name})).filter(l=>![130].includes(Number(l.points)) || Number(l.points)===150);
 const requiredLevels=defaults.levels.filter(dl=>!data.levels.some(l=>Number(l.points)===dl.points));
 requiredLevels.forEach(l=>data.levels.push(structuredClone(l)));
 data.levels=data.levels.filter(l=>Number(l.points)!==130).sort((a,b)=>a.points-b.points);
 data.actions=(Array.isArray(data.actions)?data.actions:[]).map(a=>({
   name:String(a?.name||"Alteração de pontos"),
   points:Number.isFinite(Number(a?.points))?Number(a.points):0,
   emoji:String(a?.emoji||"⭐")
 }));
 defaults.actions.forEach(required=>{
   if(!data.actions.some(a=>a.name===required.name && Number(a.points)===required.points)){
     data.actions.push(structuredClone(required));
   }
 });
 if(!Number.isFinite(Number(data.score)))data.score=0;
 data.score=Number(data.score);
}
normalizeData();
let pendingActionIndex=null;
function saveLocal(){localStorage.setItem(KEY,JSON.stringify(data));}
function fmtDate(iso){return new Date(iso).toLocaleString("pt-PT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}

async function connectRemote(){
 if(!sb)return;
 let q=sb.from("classrooms").select("*").order("created_at",{ascending:true}).limit(1);
 if(classroomId) q=sb.from("classrooms").select("*").eq("id",classroomId).maybeSingle();
 const {data:r,error}=await q;
 if(error){console.warn(error); return;}
 const row=classroomId?r:(r?.[0]);
 if(row){
   classroomId=row.id; localStorage.setItem("desafioClassroomId",classroomId);
   data.className=row.name; data.pin=row.pin; data.score=row.score;
   data.levels=row.levels||defaults.levels; data.actions=row.actions||defaults.actions;
   normalizeData(); await loadHistory(); saveLocal(); render();
 } else {
   const {data:r2,error:e2}=await sb.from("classrooms").insert({
      name:data.className,pin:data.pin,score:data.score,levels:data.levels,actions:data.actions
   }).select().single();
   if(!e2){classroomId=r2.id;localStorage.setItem("desafioClassroomId",classroomId);normalizeData();await loadHistory();saveLocal();render();}
 }
}
async function loadHistory(){
 if(!sb||!classroomId)return;
 const {data:r,error}=await sb.from("score_history").select("*").eq("classroom_id",classroomId).order("created_at",{ascending:false});
 if(!error)data.history=(r||[]).map(h=>({id:h.id,date:h.created_at,name:h.name,emoji:h.emoji,delta:h.delta,before:h.before_score,after:h.after_score}));
}
async function pushClassroom(){
 if(!sb||!classroomId)return;
 await sb.from("classrooms").update({name:data.className,pin:data.pin,score:data.score,levels:data.levels,actions:data.actions,updated_at:new Date().toISOString()}).eq("id",classroomId);
}
function actionHTML(a,i){return `<button class="action ${a.points>0?"positive":"negative"}" data-i="${i}"><span class="label"><span class="actionEmoji">${a.emoji}</span><span>${escapeHtml(a.name)}</span></span><span class="value">${a.points>0?"+":""}${a.points}</span></button>`;}

function render(){
 $( "#classTitle").textContent=data.className; $( "#score").textContent=data.score;
 const next=data.levels.find(l=>l.points>data.score),prev=data.levels.filter(l=>l.points<=data.score).at(-1);
 const from=prev?.points||0,to=next?.points||Math.max(data.score,from+1);
 const pct=next?Math.max(0,Math.min(100,((data.score-from)/(to-from))*100)):100;
 $( "#progressBar").style.width=pct+"%"; $( "#progressPercent").textContent=Math.round(pct)+"%";
 $( "#progressFrom").textContent=from+" pts"; $( "#progressTo").textContent=next?to+" pts":"Tudo desbloqueado";
 $( "#targetBadge").textContent=next?"🎯 Próximo":"🏆 Completo";
 $( "#nextText").innerHTML=next
   ? `Faltam <strong>${next.points-data.score} pontos</strong> para ${next.emoji} ${escapeHtml(next.name)}`
   : "🏆 Todos os prémios desbloqueados!";
 $( "#levels").innerHTML=data.levels.map(l=>`<div class="level ${data.score>=l.points?"unlocked":""}"><span class="emoji">${l.emoji}</span><div class="info"><div class="name">${escapeHtml(l.name)}</div><div class="pts">${l.points} pontos</div></div>${data.score>=l.points?'<span class="badge">✓ Desbloqueado</span>':''}</div>`).join("");
 $( "#positiveActions").innerHTML=data.actions.map((a,i)=>a.points>0?actionHTML(a,i):"").join("");
 $( "#negativeActions").innerHTML=data.actions.map((a,i)=>a.points<0?actionHTML(a,i):"").join("");
 [...document.querySelectorAll(".action")].forEach(b=>b.onclick=()=>{
 pendingActionIndex=Number(b.dataset.i);
 $("#adminModal").classList.remove("hidden");
 $("#pinArea").classList.remove("hidden");
 $("#adminForm").classList.add("hidden");
 $("#pinInput").value="";
 $("#pinInput").focus();
});
 $( "#history").innerHTML=data.history.length?data.history.map((h,i)=>`<div class="historyItem"><span class="when">${fmtDate(h.date)}</span><span class="desc">${h.emoji} ${escapeHtml(h.name)}</span><span class="delta ${h.delta>=0?"pos":"neg"}">${h.delta>0?"+":""}${h.delta}</span><button class="undo" title="Desfazer" onclick="undo(${i})">↩</button></div>`).join(""):"<p class='empty'>Ainda não há alterações.</p>";
 drawChart();
}

function drawChart(){
 const canvas=$( "#progressChart"), empty=$( "#chartEmpty"), trend=$( "#trend");
 const points=[...data.history].reverse().map(h=>Number(h.after));
 if(!points.length){canvas.style.display="none";empty.style.display="grid";trend.textContent="Sem registos";return;}
 canvas.style.display="block";empty.style.display="none";
 const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(320,rect.width),h=Math.max(210,rect.height);
 canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
 const pad={l:42,r:18,t:20,b:30}, cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
 const all=[0,...points],min=Math.min(...all),max=Math.max(...all),range=Math.max(10,max-min);
 const yMin=Math.min(0,min)-Math.max(2,range*.12),yMax=Math.max(0,max)+Math.max(2,range*.12);
 const x=i=>pad.l+(points.length===1?cw/2:i*cw/(points.length-1));
 const y=v=>pad.t+(yMax-v)/(yMax-yMin)*ch;
 ctx.clearRect(0,0,w,h);ctx.lineWidth=1;ctx.font="12px system-ui,sans-serif";
 ctx.strokeStyle="rgba(100,116,139,.16)";ctx.fillStyle="#64748b";
 for(let i=0;i<=4;i++){const v=yMin+(yMax-yMin)*i/4,yy=y(v);ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.fillText(Math.round(v),6,yy+4);}
 ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.strokeStyle="#2563eb";ctx.lineWidth=3;ctx.stroke();
 ctx.lineTo(x(points.length-1),pad.t+ch);ctx.lineTo(x(0),pad.t+ch);ctx.closePath();ctx.fillStyle="rgba(37,99,235,.10)";ctx.fill();
 points.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),4.5,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#2563eb";ctx.lineWidth=2;ctx.stroke();});
 const first=points[0],last=points.at(-1),diff=last-first;
 trend.textContent=(diff>0?"↗ ":"")+ (diff<0?"↘ ":"") + (diff===0?"→ ":"") + (diff>0?"+":"")+diff+" pts";
 trend.className="trend "+(diff>0?"up":diff<0?"down":"flat");
}

async function change(i){
 const a=data.actions[i],before=data.score; data.score+=a.points;
 const h={date:new Date().toISOString(),name:a.name,emoji:a.emoji,delta:a.points,before,after:data.score};
 data.history.unshift(h);saveLocal();render();
 if(sb&&classroomId){
   const {data:r,error}=await sb.from("score_history").insert({classroom_id:classroomId,name:h.name,emoji:h.emoji,delta:h.delta,before_score:h.before,after_score:h.after}).select().single();
   if(!error)h.id=r.id; await pushClassroom();
 }
 $( "#celebration").textContent=`${a.points>0?"🎉":"📌"} ${a.points>0?"+":""}${a.points} pontos — ${a.name}. Total: ${data.score}`;
 $( "#celebration").classList.remove("hidden");setTimeout(()=>$( "#celebration").classList.add("hidden"),2200);
 const reached=data.levels.find(l=>l.points>before&&l.points<=data.score);
 if(reached)setTimeout(()=>alert(`🎊 OBJETIVO ATINGIDO!\n\n${reached.emoji} ${reached.name}\n\nA turma chegou aos ${reached.points} pontos!`),100);
}
window.undo=async function(i){
 const h=data.history[i];if(!h)return;
 data.score=h.before;data.history.splice(i,1);saveLocal();render();
 if(sb&&classroomId){if(h.id)await sb.from("score_history").delete().eq("id",h.id);await pushClassroom();}
};
$( "#adminBtn").onclick=()=>{$( "#adminModal").classList.remove("hidden");$( "#pinArea").classList.remove("hidden");$( "#adminForm").classList.add("hidden");$( "#pinInput").value=""};
$( "#closeAdmin").onclick=()=>$( "#adminModal").classList.add("hidden");
$( "#unlockBtn").onclick=async()=>{
 if($("#pinInput").value===data.pin){
   const actionIndex=pendingActionIndex;
   pendingActionIndex=null;
   $("#adminModal").classList.add("hidden");
   if(actionIndex!==null){await change(actionIndex);return;}
   $("#pinArea").classList.add("hidden");
   $("#adminForm").classList.remove("hidden");
   loadAdmin();
 }else alert("PIN incorreto. Só a administração pode alterar os pontos.");
};
function loadAdmin(){
 $( "#classInput").value=data.className;$( "#newPinInput").value=data.pin;
 $( "#levelInputs").innerHTML=data.levels.map((l,i)=>`<div class="levelRow"><input data-name="${i}" value="${escapeHtml(l.name)}" aria-label="Nome do prémio"><input data-points="${i}" type="number" min="0" value="${l.points}" aria-label="Pontos"></div>`).join("");
}
$( "#adminForm").onsubmit=async e=>{e.preventDefault();data.className=$( "#classInput").value.trim()||"Turma";data.pin=$( "#newPinInput").value.trim()||"1234";
 data.levels.forEach((l,i)=>{l.name=document.querySelector(`[data-name="${i}"]`).value.trim()||l.name;l.points=Math.max(0,Number(document.querySelector(`[data-points="${i}"]`).value)||0)});
 data.levels.sort((a,b)=>a.points-b.points);normalizeData();saveLocal();render();if(sb&&classroomId)await pushClassroom();$( "#adminModal").classList.add("hidden")};
$( "#clearHistory").onclick=async()=>{if(confirm("Apagar todo o histórico?")){data.history=[];saveLocal();render();if(sb&&classroomId)await sb.from("score_history").delete().eq("classroom_id",classroomId);}};
$( "#resetBtn").onclick=async()=>{if(confirm("Repor todos os dados de exemplo?")){data=structuredClone(defaults);saveLocal();render();if(sb&&classroomId)await pushClassroom();loadAdmin()}};

render();window.addEventListener("resize",drawChart);
connectRemote();
if(sb)setInterval(async()=>{const {data:r}=await sb.from("classrooms").select("*").eq("id",classroomId).maybeSingle();if(r&&Number(r.score)!==data.score&&document.visibilityState==="visible"){data.score=r.score;data.className=r.name;data.levels=r.levels;data.actions=r.actions;await loadHistory();saveLocal();render();}},5000);
