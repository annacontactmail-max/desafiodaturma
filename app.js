const KEY="desafioTurmaV2";
const defaults={className:"Turma",pin:"1234",score:0,history:[],levels:[
 {name:"Sair mais cedo",points:20,emoji:"🟦"},{name:"Aula livre",points:35,emoji:"🟩"},
 {name:"Torneio",points:50,emoji:"🟨"},{name:"Aula na rua",points:70,emoji:"🟧"},
 {name:"Festa 1h",points:100,emoji:"🟪"},{name:"Festa 2h",points:130,emoji:"🏆"}],
actions:[
 {name:"Semana sem ocorrências nem faltas",points:3,emoji:"🟢"},{name:"Elogio",points:4,emoji:"⭐"},
 {name:"Ocorrência",points:-3,emoji:"🔴"},{name:"Falta injustificada",points:-2,emoji:"🟠"},
 {name:"Falta disciplinar",points:-10,emoji:"🚨"}]};

const configured=window.SUPABASE_URL && window.SUPABASE_ANON_KEY;
const sb=configured?supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY):null;
let classroomId=localStorage.getItem("desafioClassroomId");
let data=JSON.parse(localStorage.getItem(KEY)||"null")||structuredClone(defaults);

const $=s=>document.querySelector(s);
function saveLocal(){localStorage.setItem(KEY,JSON.stringify(data));}
function fmtDate(iso){return new Date(iso).toLocaleString("pt-PT",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}

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
   data.levels=row.levels; data.actions=row.actions;
   await loadHistory();
   saveLocal(); render();
 } else {
   const {data:r2,error:e2}=await sb.from("classrooms").insert({
      name:data.className,pin:data.pin,score:data.score,levels:data.levels,actions:data.actions
   }).select().single();
   if(!e2){classroomId=r2.id;localStorage.setItem("desafioClassroomId",classroomId);await loadHistory();}
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
function actionHTML(a,i){return `<button class="action ${a.points>0?'positive':'negative'}" data-i="${i}"><span class="label">${a.emoji} ${a.name}</span><span class="value">${a.points>0?"+":""}${a.points}</span></button>`}
function render(){
 $("#classTitle").textContent=data.className; $("#score").textContent=data.score;
 const next=data.levels.find(l=>l.points>data.score),prev=data.levels.filter(l=>l.points<=data.score).at(-1);
 const from=prev?.points||0,to=next?.points||Math.max(data.score,1);
 $("#progressBar").style.width=(next?Math.max(0,Math.min(100,(data.score-from)/(to-from)*100)):100)+"%";
 $("#nextText").textContent=next?`Próximo objetivo: ${next.emoji} ${next.name} — faltam ${next.points-data.score} pontos`:"🏆 Todos os prémios desbloqueados!";
 $("#levels").innerHTML=data.levels.map(l=>`<div class="level ${data.score>=l.points?"unlocked":""}"><span class="emoji">${l.emoji}</span><div class="info"><div class="name">${l.name}</div><div class="pts">${l.points} pontos</div></div>${data.score>=l.points?'<span class="badge">✓ Desbloqueado</span>':''}</div>`).join("");
 $("#positiveActions").innerHTML=data.actions.map((a,i)=>a.points>0?actionHTML(a,i):"").join("");
 $("#negativeActions").innerHTML=data.actions.map((a,i)=>a.points<0?actionHTML(a,i):"").join("");
 [...document.querySelectorAll(".action")].forEach(b=>b.onclick=()=>change(Number(b.dataset.i)));
 $("#history").innerHTML=data.history.length?data.history.map((h,i)=>`<div class="historyItem"><span class="when">${fmtDate(h.date)}</span><span class="desc">${h.emoji} ${h.name}</span><span class="delta ${h.delta>=0?'pos':'neg'}">${h.delta>0?"+":""}${h.delta}</span><button class="undo" title="Desfazer" onclick="undo(${i})">↩</button></div>`).join(""):"<p style='color:#94a3b8'>Ainda não há alterações.</p>";
}
async function change(i){
 const a=data.actions[i], before=data.score; data.score+=a.points;
 const h={date:new Date().toISOString(),name:a.name,emoji:a.emoji,delta:a.points,before,after:data.score};
 data.history.unshift(h); saveLocal(); render();
 if(sb&&classroomId){
   const {data:r,error}=await sb.from("score_history").insert({classroom_id:classroomId,name:h.name,emoji:h.emoji,delta:h.delta,before_score:h.before,after_score:h.after}).select().single();
   if(!error)h.id=r.id;
   await pushClassroom();
 }
 $("#celebration").textContent=`${a.points>0?"🎉":"📌"} ${a.points>0?"+":""}${a.points} pontos — ${a.name}. Total: ${data.score}`;
 $("#celebration").classList.remove("hidden");setTimeout(()=>$("#celebration").classList.add("hidden"),2200);
 const reached=data.levels.find(l=>l.points>before&&l.points<=data.score);
 if(reached)setTimeout(()=>alert(`🎊 OBJETIVO ATINGIDO!\n\n${reached.emoji} ${reached.name}\n\nA turma chegou aos ${reached.points} pontos!`),100);
}
window.undo=async function(i){
 const h=data.history[i];if(!h)return;
 data.score=h.before;data.history.splice(i,1);saveLocal();render();
 if(sb&&classroomId){if(h.id)await sb.from("score_history").delete().eq("id",h.id);await pushClassroom();}
}
$("#adminBtn").onclick=()=>{$("#adminModal").classList.remove("hidden");$("#pinArea").classList.remove("hidden");$("#adminForm").classList.add("hidden");$("#pinInput").value=""};
$("#closeAdmin").onclick=()=>$("#adminModal").classList.add("hidden");
$("#unlockBtn").onclick=()=>{if($("#pinInput").value===data.pin){$("#pinArea").classList.add("hidden");$("#adminForm").classList.remove("hidden");loadAdmin()}else alert("PIN incorreto.")};
function loadAdmin(){
 $("#classInput").value=data.className;$("#newPinInput").value=data.pin;
 $("#levelInputs").innerHTML=data.levels.map((l,i)=>`<div class="levelRow"><input data-name="${i}" value="${l.name}" aria-label="Nome do prémio"><input data-points="${i}" type="number" min="0" value="${l.points}" aria-label="Pontos"></div>`).join("");
}
$("#adminForm").onsubmit=async e=>{e.preventDefault();data.className=$("#classInput").value.trim()||"Turma";data.pin=$("#newPinInput").value.trim()||"1234";
 data.levels.forEach((l,i)=>{l.name=document.querySelector(`[data-name="${i}"]`).value.trim()||l.name;l.points=Math.max(0,Number(document.querySelector(`[data-points="${i}"]`).value)||0)});
 data.levels.sort((a,b)=>a.points-b.points);saveLocal();render();if(sb&&classroomId)await pushClassroom();$("#adminModal").classList.add("hidden")};
$("#clearHistory").onclick=async()=>{if(confirm("Apagar todo o histórico?")){data.history=[];saveLocal();render();if(sb&&classroomId){await sb.from("score_history").delete().eq("classroom_id",classroomId);}}};
$("#resetBtn").onclick=async()=>{if(confirm("Repor todos os dados de exemplo?")){data=structuredClone(defaults);saveLocal();render();if(sb&&classroomId)await pushClassroom();loadAdmin()}};

render();
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
connectRemote();

if(sb){
 setInterval(async()=>{
   const {data:r}=await sb.from("classrooms").select("*").eq("id",classroomId).maybeSingle();
   if(r && r.updated_at!==undefined){
      // O dispositivo atual é a fonte da verdade durante uma edição;
      // atualizações externas são aplicadas quando o score local não mudou.
      if(Number(r.score)!==data.score && document.visibilityState==="visible"){
         data.score=r.score;data.className=r.name;data.levels=r.levels;data.actions=r.actions;
         await loadHistory();saveLocal();render();
      }
   }
 },5000);
}
