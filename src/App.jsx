import { useState, useEffect, useCallback, useRef } from "react";
import sb from "./supabase.js";
import gcal from "./gcal.js";
import { HEADER_IMG } from "./assets.js";
import {
  PILLARS, TASKS_META, PROFILES, DEFAULT_TASK_CONFIG, DEFAULT_SCORE_LABELS,
  buildTasks, computeScore, pillarScore, scoreMeta, getEarned, todayKey,
} from "./data.js";

// Gera ID único para tarefas customizadas
const genId = label => "custom_" + label.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"") + "_" + Date.now().toString(36);

const C = {
  bg:"#1a1410",bgCard:"#221c17",bgEl:"#2a211a",border:"#3d2e24",
  rust:"#c1440e",rustL:"#e05a28",terra:"#b85c38",
  amber:"#d4892a",amberL:"#e8a84a",
  bord:"#7a1e3a",cream:"#f0e6d3",creamM:"#c4b09a",muted:"#7a6555",
  greenL:"#6aac7a",
};

// ── SCORE RING ────────────────────────────────────────────────────────────────
function ScoreRing({ score, labels, size=130 }) {
  const r=size*0.4, circ=2*Math.PI*r, dash=(score/100)*circ;
  const {label,color}=scoreMeta(score,labels);
  return (
    <div style={{position:"relative",width:size,height:size,margin:"0 auto"}}>
      <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="7"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{transition:"stroke-dasharray 0.5s cubic-bezier(.4,0,.2,1)"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:2}}>
        <span style={{fontSize:size*0.23,fontFamily:"'Playfair Display',serif",fontWeight:700,color:C.cream,lineHeight:1}}>{score}%</span>
        <span style={{fontSize:size*0.07,color,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600}}>{label}</span>
      </div>
    </div>
  );
}

// ── TASK CARDS ────────────────────────────────────────────────────────────────
function EssencialCard({task,value,onChange}){
  const p=PILLARS.find(x=>x.id===task.pillar);
  const done=value===true;
  return (
    <div onClick={()=>onChange(task.id,done?false:true)} style={{
      background:done?`${p.color}15`:C.bgCard,border:`1px solid ${done?p.color:C.border}`,
      borderRadius:12,padding:"11px 14px",cursor:"pointer",transition:"all 0.2s",
      display:"flex",alignItems:"center",gap:11,marginBottom:7}}>
      <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${done?C.rust:C.border}`,
        background:done?C.rust:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
        flexShrink:0,transition:"all 0.2s"}}>
        {done&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,color:done?C.cream:C.creamM,fontWeight:500}}>{task.label}</div>
        {task.note&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{task.note}</div>}
      </div>
      <span style={{fontSize:10,color:C.muted}}>+{task.points}</span>
    </div>
  );
}

function MultiCard({task,value,onChange}){
  const p=PILLARS.find(x=>x.id===task.pillar);
  const isAlim=task.id==="alimentacao";
  return (
    <div style={{background:C.bgCard,border:`1px solid ${value?p.color+"88":C.border}`,
      borderRadius:12,padding:"11px 14px",marginBottom:7}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
        <div>
          <span style={{fontSize:13,color:C.cream,fontWeight:500}}>{task.label}</span>
          {task.note&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{task.note}</div>}
        </div>
        <span style={{fontSize:9,color:task.type==="expansao"?C.amber:C.greenL,letterSpacing:"0.1em",fontWeight:700}}>
          {task.type==="expansao"?"EXP":"ALMA"}
        </span>
      </div>
      <div style={{display:"flex",gap:5}}>
        {task.levels.map((lv,i)=>{
          const sel=parseInt(value)===i+1;
          const btnColor=isAlim?(i===0?C.bord:i===1?C.amber:C.greenL):p.color;
          return (
            <button key={i} onClick={()=>onChange(task.id,sel?null:String(i+1))} style={{
              flex:1,padding:"7px 4px",borderRadius:8,fontSize:11,
              border:`1.5px solid ${sel?btnColor:C.border}`,background:sel?`${btnColor}28`:"transparent",
              color:sel?C.cream:C.muted,cursor:"pointer",transition:"all 0.15s",
              display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span>{lv}</span>
              <span style={{fontSize:9,color:sel?btnColor:C.muted}}>
                {Array.isArray(task.points)&&task.points[i]>0?`+${task.points[i]}`:"—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PillarBar({pillar,score}){
  if(score===null)return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
      <span style={{fontSize:13,color:pillar.color,width:16}}>{pillar.icon}</span>
      <span style={{fontSize:12,color:C.creamM,width:95,flexShrink:0}}>{pillar.label}</span>
      <div style={{flex:1,height:5,background:C.border,borderRadius:99,overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:99,width:`${score}%`,background:pillar.color,transition:"width 0.5s ease"}}/>
      </div>
      <span style={{fontSize:11,color:C.muted,width:30,textAlign:"right"}}>{score}%</span>
    </div>
  );
}

const SL=({type})=>{
  const m={essencial:{l:"● Essenciais",c:C.rust},expansao:{l:"◆ Expansão",c:C.amber},alma:{l:"◎ Alma",c:C.greenL}}[type];
  return <div style={{fontSize:10,color:m.c,letterSpacing:"0.15em",fontWeight:700,margin:"14px 0 8px",textTransform:"uppercase"}}>{m.l}</div>;
};

// ── TASK ROW (config) ─────────────────────────────────────────────────────────
function TaskRow({ t, cfg, allCustomTasks, setActive, setPoints, setLevelPts, onDeleteCustom }) {
  const tc  = cfg[t.id] || {};
  const pts = tc.points ?? DEFAULT_TASK_CONFIG[t.id]?.points ?? t.points;
  const isArr = Array.isArray(pts);
  return (
    <div style={{marginBottom:10,opacity:tc.active===false?0.4:1,transition:"opacity 0.2s"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:isArr?6:0}}>
        <div onClick={()=>setActive(t.id,!(tc.active!==false))}
          style={{width:32,height:18,borderRadius:9,background:tc.active!==false?C.rust:C.border,
            position:"relative",cursor:"pointer",flexShrink:0,transition:"background 0.2s"}}>
          <div style={{position:"absolute",top:2,left:tc.active!==false?14:2,width:14,height:14,
            borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
        </div>
        <span style={{flex:1,fontSize:12,color:C.cream}}>{t.label}{t.custom&&<span style={{fontSize:9,color:C.muted,marginLeft:5}}>✦ custom</span>}</span>
        {!isArr&&(
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,color:C.muted}}>pts:</span>
            <input type="number" min="0" max="100" value={pts||0} onChange={e=>setPoints(t.id,e.target.value)}
              style={{width:40,padding:"3px 5px",borderRadius:6,border:`1px solid ${C.border}`,
                background:C.bgEl,color:C.cream,fontSize:12,outline:"none",textAlign:"center"}}/>
          </div>
        )}
        {t.custom&&(
          <button onClick={()=>onDeleteCustom(t.id)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:"0 2px"}} title="Remover">✕</button>
        )}
      </div>
      {isArr&&t.levels&&(
        <div style={{display:"flex",gap:4,marginLeft:40}}>
          {t.levels.map((lv,i)=>(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <span style={{fontSize:9,color:C.muted}}>{lv}</span>
              <input type="number" min="0" max="100" value={Array.isArray(pts)?pts[i]:0}
                onChange={e=>setLevelPts(t.id,i,e.target.value)}
                style={{width:"100%",padding:"3px 4px",borderRadius:6,border:`1px solid ${C.border}`,
                  background:C.bgEl,color:C.cream,fontSize:11,outline:"none",textAlign:"center"}}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── NOVA TAREFA FORM ──────────────────────────────────────────────────────────
const BLANK_FORM = {label:"",pillar:"saude",type:"essencial",note:"",levels:["","",""],numLevels:2,points:10,levelPts:[5,10,15]};

function NewTaskForm({ onAdd, onCancel }) {
  const [f, setF] = useState(BLANK_FORM);
  const set = k => v => setF(p=>({...p,[k]:v}));

  const isMulti = f.type !== "essencial";
  const levelsUsed = f.levels.slice(0, f.numLevels);

  const handleAdd = () => {
    if (!f.label.trim()) return;
    const id = genId(f.label);
    const points = isMulti ? f.levelPts.slice(0, f.numLevels).map(Number) : Number(f.points);
    const task = {
      id, label: f.label.trim(), pillar: f.pillar,
      type: f.type, custom: true,
      ...(f.note.trim() ? {note: f.note.trim()} : {}),
      ...(isMulti ? {levels: levelsUsed.map((l,i)=>l.trim()||`nível ${i+1}`)} : {}),
      points,
    };
    onAdd(task);
  };

  const inputStyle = {
    width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,
    background:C.bgEl,color:C.cream,fontSize:12,outline:"none",
  };
  const labelStyle = {fontSize:10,color:C.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4,display:"block"};

  return (
    <div style={{background:C.bgEl,borderRadius:14,padding:16,border:`1.5px solid ${C.rust}40`,marginBottom:16}}>
      <div style={{fontSize:12,color:C.rust,fontWeight:600,marginBottom:14,letterSpacing:"0.05em"}}>✦ NOVA TAREFA</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div>
          <label style={labelStyle}>Nome</label>
          <input style={inputStyle} placeholder="Ex: Meditação" value={f.label} onChange={e=>set("label")(e.target.value)}/>
        </div>
        <div>
          <label style={labelStyle}>Observação (opcional)</label>
          <input style={inputStyle} placeholder="Ex: 10 min, app Calm" value={f.note} onChange={e=>set("note")(e.target.value)}/>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        <div>
          <label style={labelStyle}>Pilar</label>
          <select value={f.pillar} onChange={e=>set("pillar")(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
            {PILLARS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select value={f.type} onChange={e=>set("type")(e.target.value)} style={{...inputStyle,cursor:"pointer"}}>
            <option value="essencial">Essencial (✓/✗)</option>
            <option value="expansao">Expansão (níveis)</option>
            <option value="alma">Alma (níveis)</option>
          </select>
        </div>
        {!isMulti ? (
          <div>
            <label style={labelStyle}>Pontos</label>
            <input type="number" min="1" max="100" style={inputStyle} value={f.points} onChange={e=>set("points")(e.target.value)}/>
          </div>
        ) : (
          <div>
            <label style={labelStyle}>Nº de níveis</label>
            <select value={f.numLevels} onChange={e=>set("numLevels")(Number(e.target.value))} style={{...inputStyle,cursor:"pointer"}}>
              <option value={2}>2 níveis</option>
              <option value={3}>3 níveis</option>
            </select>
          </div>
        )}
      </div>

      {isMulti && (
        <div style={{marginBottom:12}}>
          <label style={labelStyle}>Níveis — nome e pontos</label>
          <div style={{display:"flex",gap:8}}>
            {Array.from({length:f.numLevels}).map((_,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                <input style={{...inputStyle,textAlign:"center"}} placeholder={`nível ${i+1}`}
                  value={f.levels[i]||""} onChange={e=>{const l=[...f.levels];l[i]=e.target.value;set("levels")(l);}}/>
                <input type="number" min="0" max="100" style={{...inputStyle,textAlign:"center"}}
                  placeholder="pts" value={f.levelPts[i]||0}
                  onChange={e=>{const l=[...f.levelPts];l[i]=e.target.value;set("levelPts")(l);}}/>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:8}}>
        <button onClick={handleAdd} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",background:C.rust,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          Adicionar tarefa
        </button>
        <button onClick={onCancel} style={{padding:"9px 16px",borderRadius:9,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,fontSize:13,cursor:"pointer"}}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ── CONFIG SCREEN ─────────────────────────────────────────────────────────────
function ConfigScreen({ taskConfig, scoreLabels, customTasks, onSave, onBack }) {
  const [cfg, setCfg] = useState(()=>{
    const merged = {};
    TASKS_META.forEach(t=>{
      const def = DEFAULT_TASK_CONFIG[t.id];
      const usr = taskConfig[t.id];
      merged[t.id] = {points: usr?.points ?? def?.points, active: usr?.active ?? true};
    });
    customTasks.forEach(t=>{
      const usr = taskConfig[t.id];
      merged[t.id] = {points: usr?.points ?? t.points, active: usr?.active ?? true};
    });
    return merged;
  });
  const [labels,  setLabels]  = useState(scoreLabels || DEFAULT_SCORE_LABELS);
  const [custom,  setCustom]  = useState(customTasks);
  const [showForm,setShowForm]= useState(false);
  const [saving,  setSaving]  = useState(false);
  const [section, setSection] = useState("tarefas"); // "tarefas" | "scores"

  const setActive   = (id,val) => setCfg(p=>({...p,[id]:{...p[id],active:val}}));
  const setPoints   = (id,val) => {const n=parseInt(val);if(!isNaN(n)&&n>=0)setCfg(p=>({...p,[id]:{...p[id],points:n}}));};
  const setLevelPts = (id,idx,val) => {
    const n=parseInt(val);if(isNaN(n)||n<0)return;
    setCfg(p=>{const pts=Array.isArray(p[id].points)?[...p[id].points]:[0,p[id].points];pts[idx]=n;return {...p,[id]:{...p[id],points:pts}};});
  };

  const addCustomTask = task => {
    setCustom(p=>[...p, task]);
    setCfg(p=>({...p,[task.id]:{points:task.points,active:true}}));
    setShowForm(false);
  };

  const deleteCustomTask = id => {
    setCustom(p=>p.filter(t=>t.id!==id));
    setCfg(p=>{const n={...p};delete n[id];return n;});
  };

  // Agrupa base + custom por pilar
  const byPillar = {};
  PILLARS.forEach(p=>{byPillar[p.id]=[];});
  TASKS_META.forEach(t=>{byPillar[t.pillar]?.push({...t,custom:false});});
  custom.forEach(t=>{if(byPillar[t.pillar])byPillar[t.pillar].push({...t,custom:true});});

  const tabBtn = (k,label) => (
    <button onClick={()=>setSection(k)} style={{
      padding:"8px 18px",borderRadius:9,fontSize:12,fontWeight:500,cursor:"pointer",
      border:`1.5px solid ${section===k?C.rust:C.border}`,
      background:section===k?`${C.rust}18`:"transparent",
      color:section===k?C.cream:C.muted,transition:"all 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.cream}}>
      <div style={{maxWidth:960,margin:"0 auto",padding:"0 24px"}}>

        {/* Header */}
        <div style={{padding:"24px 0 16px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`,marginBottom:24}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>←</button>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:700,color:C.cream}}>Configurações</div>
            <div style={{fontSize:11,color:C.muted}}>Tarefas, pesos e faixas de score</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {tabBtn("tarefas","Tarefas")}
            {tabBtn("scores","Faixas de score")}
          </div>
        </div>

        {/* Seção: Tarefas */}
        {section==="tarefas"&&<>
          {showForm
            ? <NewTaskForm onAdd={addCustomTask} onCancel={()=>setShowForm(false)}/>
            : (
              <button onClick={()=>setShowForm(true)} style={{
                display:"flex",alignItems:"center",gap:8,marginBottom:20,
                padding:"10px 18px",borderRadius:10,border:`1.5px dashed ${C.rust}80`,
                background:`${C.rust}10`,color:C.rust,fontSize:13,fontWeight:500,cursor:"pointer",
              }}>
                ✦ Adicionar nova tarefa
              </button>
            )
          }

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:32}}>
            {PILLARS.map(p=>{
              const tasks = byPillar[p.id]||[];
              if(!tasks.length) return null;
              return (
                <div key={p.id} style={{background:C.bgCard,borderRadius:14,padding:14,border:`1px solid ${C.border}`,borderLeft:`3px solid ${p.color}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
                    <span style={{color:p.color}}>{p.icon}</span>
                    <span style={{fontSize:13,fontWeight:600,color:C.cream}}>{p.label}</span>
                    <span style={{fontSize:9,color:C.muted,marginLeft:"auto"}}>{tasks.length} tarefas</span>
                  </div>
                  {tasks.map(t=>(
                    <TaskRow key={t.id} t={t} cfg={cfg} allCustomTasks={custom}
                      setActive={setActive} setPoints={setPoints} setLevelPts={setLevelPts}
                      onDeleteCustom={deleteCustomTask}/>
                  ))}
                </div>
              );
            })}
          </div>
        </>}

        {/* Seção: Faixas de score */}
        {section==="scores"&&(
          <div style={{background:C.bgCard,borderRadius:14,padding:16,border:`1px solid ${C.border}`,marginBottom:24,maxWidth:480}}>
            <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14}}>Faixas de score</div>
            {labels.map((band,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:band.color,flexShrink:0}}/>
                <span style={{fontSize:12,color:C.creamM,width:70,flexShrink:0}}>{band.min}–{band.max===101?"100+":band.max}</span>
                <div style={{flex:1,padding:"6px 10px",borderRadius:8,background:C.bgEl,border:`1px solid ${C.border}`,fontSize:12,color:band.color,fontWeight:500}}>{band.label}</div>
              </div>
            ))}
          </div>
        )}

        <button onClick={async()=>{setSaving(true);await onSave(cfg,labels,custom);setSaving(false);}}
          disabled={saving} style={{width:"100%",padding:"14px 0",borderRadius:12,border:"none",marginBottom:40,
            background:saving?C.border:C.rust,color:saving?C.muted:"#fff",fontSize:14,fontWeight:600,cursor:saving?"not-allowed":"pointer"}}>
          {saving?"Salvando…":"Salvar configuração"}
        </button>
      </div>
    </div>
  );
}

// ── SIDEBAR (desktop only) ────────────────────────────────────────────────────
function Sidebar({ score, scoreLabels, today, atIds, allTasks, doneCount, profile, onProfile, gcalOn, gcalEvts, syncing, sm }) {
  return (
    <div style={{
      width:280,flexShrink:0,
      padding:"24px 20px",
      display:"flex",flexDirection:"column",gap:14,
      borderRight:`1px solid ${C.border}`,
      overflowY:"auto",
      height:"100vh",
      position:"sticky",top:0,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <img src={HEADER_IMG} alt="" style={{width:38,height:38,borderRadius:9,objectFit:"cover",opacity:0.92,border:`1px solid ${C.border}`}}/>
        <div>
          <div style={{fontSize:17,fontFamily:"'Playfair Display',serif",fontWeight:700,color:C.cream,letterSpacing:"-0.02em"}}>Perfecta</div>
          <div style={{fontSize:10,color:C.muted}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        {syncing&&<span style={{fontSize:9,color:C.muted,marginLeft:"auto"}}>✦</span>}
      </div>

      <div style={{background:C.bgCard,borderRadius:18,padding:"20px 16px",border:`1px solid ${C.border}`,textAlign:"center"}}>
        <ScoreRing score={score} labels={scoreLabels} size={148}/>
        <div style={{fontSize:11,color:C.muted,marginTop:10}}>{doneCount}/{atIds.length} ações concluídas</div>
      </div>

      <div style={{background:C.bgCard,borderRadius:14,padding:14,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Pilares</div>
        {PILLARS.map(p=><PillarBar key={p.id} pillar={p} score={pillarScore(today.checks,p.id,atIds,allTasks)}/>)}
      </div>

      <div style={{background:C.bgCard,borderRadius:14,padding:14,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:10,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Perfil do dia</div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {Object.entries(PROFILES).map(([k,p])=>{
            const active=today.profile===k;
            const isD=today.gcal_detected===k;
            return (
              <button key={k} onClick={()=>onProfile(k)} style={{
                padding:"7px 10px",borderRadius:9,fontSize:12,
                border:`1.5px solid ${active?p.color:C.border}`,background:active?`${p.color}20`:"transparent",
                color:active?C.cream:C.muted,cursor:"pointer",
                display:"flex",alignItems:"center",gap:6,textAlign:"left",transition:"all 0.15s"}}>
                <span style={{color:p.color}}>{p.icon}</span>
                <span style={{flex:1}}>{p.label}</span>
                {isD&&<span style={{fontSize:8,color:p.color}}>📅</span>}
                {active&&<span style={{fontSize:9,color:p.color}}>✓</span>}
              </button>
            );
          })}
        </div>
        {profile.note&&<div style={{fontSize:10,color:C.muted,marginTop:10}}>{profile.note}</div>}
      </div>

      {today.gcal_detected&&(()=>{
        const prof=PROFILES[today.gcal_detected];
        return (
          <div style={{background:`${prof.color}15`,border:`1px solid ${prof.color}40`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            <span>📅</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:C.cream,fontWeight:500}}><strong style={{color:prof.color}}>{prof.label}</strong></div>
              <div style={{fontSize:10,color:C.muted,marginTop:2}}>{gcalEvts.length} evento{gcalEvts.length!==1?"s":""} hoje</div>
            </div>
          </div>
        );
      })()}
      {!gcalOn&&gcal.isConfigured()&&(
        <button onClick={()=>gcal.requestToken()} style={{padding:"10px 0",borderRadius:10,border:`1px dashed ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          📅 Conectar Calendar
        </button>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [ready,       setReady]      = useState(false);
  const [tab,         setTab]        = useState("hoje");
  const [pFilter,     setPFilter]    = useState(null);
  const [syncing,     setSyncing]    = useState(false);
  const [showCfg,     setShowCfg]    = useState(false);
  const [gcalOn,      setGcalOn]     = useState(false);
  const [gcalEvts,    setGcalEvts]   = useState([]);
  const [taskConfig,  setTaskConfig] = useState({});
  const [scoreLabels, setScoreLabels]= useState(DEFAULT_SCORE_LABELS);
  const [customTasks, setCustomTasks]= useState([]);
  const [isDesktop,   setIsDesktop]  = useState(window.innerWidth>=768);
  const key = todayKey();
  const [today,   setToday]  = useState({profile:"consultorio",checks:{},score:0,gcal_detected:null});
  const [history, setHistory]= useState([]);
  const saveTimer = useRef(null);

  useEffect(()=>{
    const h=()=>setIsDesktop(window.innerWidth>=768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);

  const allTasks = buildTasks(taskConfig, customTasks);
  const profile  = PROFILES[today.profile]||PROFILES.consultorio;
  const atIds    = profile.tasks.filter(id=>allTasks.find(t=>t.id===id));
  const score    = computeScore(today.checks,atIds,allTasks);
  const sm       = scoreMeta(score,scoreLabels);

  useEffect(()=>{
    (async()=>{
      const [{data:day},{data:hist},{data:prof}]=await Promise.all([
        sb.getDay(key), sb.getDays(30), sb.getProfile(),
      ]);
      if(day) setToday({profile:day.profile||"consultorio",checks:day.checks||{},score:day.score||0,gcal_detected:day.gcal_detected||null});
      if(hist) setHistory(hist);
      if(prof?.task_config) setTaskConfig(prof.task_config);
      if(prof?.score_labels) setScoreLabels(prof.score_labels);
      if(prof?.custom_tasks) setCustomTasks(prof.custom_tasks);
      setReady(true);
    })();
  },[]);

  useEffect(()=>{
    if(!gcal.isConfigured())return;
    gcal.init(async token=>{
      setGcalOn(true);
      const events=await gcal.getTodayEvents(token);
      setGcalEvts(events);
      const detected=gcal.detectProfile(events);
      setToday(prev=>prev.gcal_detected?prev:{...prev,profile:detected,gcal_detected:detected});
    });
  },[]);

  const persist=useCallback(patch=>{
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      setSyncing(true);
      await sb.upsertDay(key,patch);
      setSyncing(false);
    },800);
  },[key]);

  const saveConfig=useCallback(async(newCfg,newLabels,newCustom)=>{
    setTaskConfig(newCfg); setScoreLabels(newLabels); setCustomTasks(newCustom);
    await sb.upsertProfile({task_config:newCfg,score_labels:newLabels,custom_tasks:newCustom});
    setShowCfg(false);
  },[]);

  const update=useCallback(patch=>{
    setToday(prev=>{
      const next={...prev,...patch};
      next.score=computeScore(next.checks,PROFILES[next.profile]?.tasks.filter(id=>allTasks.find(t=>t.id===id))||[],allTasks);
      persist(next); return next;
    });
  },[allTasks,persist]);

  const onCheck  =useCallback((id,v)=>update({checks:{...today.checks,[id]:v}}),[today.checks,update]);
  const onProfile=useCallback(p=>update({profile:p,checks:{},gcal_detected:null}),[update]);

  const visible  = atIds.map(id=>allTasks.find(t=>t.id===id)).filter(Boolean).filter(t=>!pFilter||t.pillar===pFilter);
  const ess      = visible.filter(t=>t.type==="essencial");
  const exp      = visible.filter(t=>t.type==="expansao");
  const alma     = visible.filter(t=>t.type==="alma");
  const doneCount= atIds.filter(id=>{const t=allTasks.find(x=>x.id===id);return t&&today.checks[id];}).length;
  const histMap  = {};
  history.forEach(d=>{histMap[d.date]={score:d.score,profile:d.profile,gcal:d.gcal_detected};});
  const last7    = Object.entries(histMap).sort(([a],[b])=>a.localeCompare(b)).slice(-7);

  const GLOBAL_STYLE = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#3d2e24;border-radius:99px;}button,input{font-family:inherit;}`;

  if(!ready) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
        <img src={HEADER_IMG} alt="" style={{width:56,height:56,borderRadius:12,objectFit:"cover",opacity:0.8}}/>
        <div style={{color:C.muted,fontSize:13,fontFamily:"'DM Sans',sans-serif"}}>carregando…</div>
      </div>
    </div>
  );

  if(showCfg) return (
    <>
      <style>{GLOBAL_STYLE}</style>
      <ConfigScreen taskConfig={taskConfig} scoreLabels={scoreLabels} customTasks={customTasks} onSave={saveConfig} onBack={()=>setShowCfg(false)}/>
    </>
  );

  // ── CONTEÚDO DAS ABAS (compartilhado entre mobile e desktop) ─────────────────
  const navTabs=[
    {k:"hoje",   icon:"◎",label:"Hoje"},
    {k:"pilares",icon:"◈",label:"Pilares"},
    {k:"hist",   icon:"◆",label:"Histórico"},
  ];

  const TabHoje=(
    <>
      <div style={{display:"flex",gap:6,overflowX:"auto",padding:"4px 0",marginBottom:14}}>
        <button onClick={()=>setPFilter(null)} style={{flexShrink:0,padding:"5px 10px",borderRadius:20,fontSize:11,
          border:`1.5px solid ${!pFilter?C.rust:C.border}`,background:!pFilter?`${C.rust}20`:"transparent",
          color:!pFilter?C.cream:C.muted,cursor:"pointer"}}>Todos</button>
        {PILLARS.filter(p=>atIds.some(id=>allTasks.find(t=>t.id===id&&t.pillar===p.id))).map(p=>(
          <button key={p.id} onClick={()=>setPFilter(pFilter===p.id?null:p.id)} style={{
            flexShrink:0,padding:"5px 10px",borderRadius:20,fontSize:11,
            border:`1.5px solid ${pFilter===p.id?p.color:C.border}`,background:pFilter===p.id?`${p.color}20`:"transparent",
            color:pFilter===p.id?C.cream:C.muted,cursor:"pointer",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
            <span style={{color:p.color}}>{p.icon}</span>{p.label}
          </button>
        ))}
      </div>
      {ess.length>0&&<><SL type="essencial"/>{ess.map(t=><EssencialCard key={t.id} task={t} value={today.checks[t.id]} onChange={onCheck}/>)}</>}
      {exp.length>0&&<><SL type="expansao"/>{exp.map(t=><MultiCard key={t.id} task={t} value={today.checks[t.id]} onChange={onCheck}/>)}</>}
      {alma.length>0&&<><SL type="alma"/>{alma.map(t=><MultiCard key={t.id} task={t} value={today.checks[t.id]} onChange={onCheck}/>)}</>}
    </>
  );

  const TabPilares=(
    <>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:38,fontFamily:"'Playfair Display',serif",fontWeight:700,color:C.cream}}>
          {score}<span style={{fontSize:18,color:C.muted}}>%</span></div>
        <div style={{fontSize:12,color:sm.color,marginTop:2}}>{sm.label}</div>
      </div>
      <div style={{background:C.bgCard,borderRadius:16,padding:16,border:`1px solid ${C.border}`,marginBottom:14}}>
        {PILLARS.map(p=><PillarBar key={p.id} pillar={p} score={pillarScore(today.checks,p.id,atIds,allTasks)}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 1fr":"1fr",gap:10}}>
        {PILLARS.map(p=>{
          const ps=pillarScore(today.checks,p.id,atIds,allTasks); if(ps===null)return null;
          const pT=atIds.map(id=>allTasks.find(t=>t.id===id)).filter(t=>t?.pillar===p.id);
          return (
            <div key={p.id} style={{background:C.bgCard,borderRadius:14,padding:14,border:`1px solid ${C.border}`,borderLeft:`3px solid ${p.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}>
                  <span style={{color:p.color,fontSize:15}}>{p.icon}</span>
                  <span style={{fontSize:13,fontWeight:600,color:C.cream}}>{p.label}</span>
                </div>
                <span style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:700,color:p.color}}>{ps}%</span>
              </div>
              <div style={{fontSize:10,color:C.muted,marginBottom:8}}>{p.desc}</div>
              {pT.map(t=>{
                const v=today.checks[t.id];
                const done=v&&v!==false;
                return (
                  <div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:done?C.creamM:C.muted,padding:"3px 0"}}>
                    <span>{done?"✓":"○"} {t.label}</span>
                    <span style={{color:done?p.color:C.muted}}>+{getEarned(t,v)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );

  const TabHist=(
    <>
      <div style={{background:C.bgCard,borderRadius:16,padding:16,border:`1px solid ${C.border}`,marginBottom:14}}>
        <div style={{fontSize:11,color:C.muted,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>Últimos 7 dias</div>
        {last7.length<2?(
          <div style={{textAlign:"center",color:C.muted,fontSize:12,padding:"20px 0"}}>Complete mais dias para ver</div>
        ):(
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:84}}>
            {last7.map(([date,data])=>{
              const s=data.score||0;
              const h=Math.max(4,(s/100)*56);
              const {color}=scoreMeta(s,scoreLabels);
              const day=new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short"}).replace(".","");
              return (
                <div key={date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:9,color:C.muted}}>{s}%</span>
                  <div style={{width:"100%",height:h,borderRadius:4,background:color,opacity:0.75}}/>
                  <span style={{fontSize:9,color:C.muted,textTransform:"capitalize"}}>{day}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {(()=>{
        const scores=history.map(d=>d.score||0).filter(s=>s>0);
        if(!scores.length)return null;
        const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
        const best=Math.max(...scores);
        const streak=(()=>{let s=0;for(const d of history){if((d.score||0)>=50)s++;else break;}return s;})();
        return (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
            {[{label:"Média",value:`${avg}%`,color:C.amber},{label:"Melhor",value:`${best}%`,color:C.greenL},{label:"Sequência",value:`${streak}d`,color:C.rust}].map(s=>(
              <div key={s.label} style={{background:C.bgCard,borderRadius:12,padding:12,border:`1px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontSize:22,fontFamily:"'Playfair Display',serif",fontWeight:700,color:s.color}}>{s.value}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      {history.slice(0,14).map(d=>{
        const s=d.score||0;
        const {label,color}=scoreMeta(s,scoreLabels);
        const prof=PROFILES[d.profile];
        return (
          <div key={d.date} style={{background:C.bgCard,borderRadius:12,padding:"11px 14px",border:`1px solid ${C.border}`,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:12,color:C.cream}}>{new Date(d.date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"numeric",month:"short"})}</div>
              {prof&&<div style={{fontSize:10,color:C.muted,marginTop:2}}>{prof.label}{d.gcal?"  📅":""}</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:700,color}}>{s}%</div>
              <div style={{fontSize:9,color:C.muted}}>{label}</div>
            </div>
          </div>
        );
      })}
    </>
  );

  // ── MOBILE ───────────────────────────────────────────────────────────────────
  if(!isDesktop) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.cream,maxWidth:430,margin:"0 auto"}}>
      <style>{GLOBAL_STYLE}</style>
      <div style={{padding:"20px 20px 0",background:`linear-gradient(180deg,${C.bgCard} 0%,transparent 100%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <img src={HEADER_IMG} alt="" style={{width:44,height:44,borderRadius:10,objectFit:"cover",opacity:0.92,border:`1px solid ${C.border}`}}/>
            <div>
              <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:700,color:C.cream,letterSpacing:"-0.02em"}}>Perfecta</div>
              <div style={{fontSize:10,color:C.muted,marginTop:1}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {syncing&&<span style={{fontSize:9,color:C.muted}}>✦</span>}
            <div style={{background:`${sm.color}20`,border:`1px solid ${sm.color}60`,borderRadius:20,padding:"5px 11px",fontSize:10,color:sm.color,fontWeight:700}}>{score}%</div>
          </div>
        </div>
        <div style={{height:1,background:C.border,marginTop:16}}/>
      </div>
      <div style={{padding:"16px 20px 100px"}}>
        {tab==="hoje"&&<>
          {today.gcal_detected&&(()=>{
            const prof=PROFILES[today.gcal_detected];
            return (
              <div style={{background:`${prof.color}15`,border:`1px solid ${prof.color}40`,borderRadius:12,padding:"10px 14px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
                <span>📅</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,color:C.cream,fontWeight:500}}>Calendário: <strong style={{color:prof.color}}>{prof.label}</strong></div>
                  <div style={{fontSize:10,color:C.muted,marginTop:2}}>{gcalEvts.length} evento{gcalEvts.length!==1?"s":""} hoje</div>
                </div>
              </div>
            );
          })()}
          {!gcalOn&&gcal.isConfigured()&&(
            <button onClick={()=>gcal.requestToken()} style={{width:"100%",padding:"10px 0",borderRadius:10,border:`1px dashed ${C.border}`,background:"transparent",color:C.muted,fontSize:12,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              📅 Conectar Google Calendar
            </button>
          )}
          <div style={{background:C.bgCard,borderRadius:18,padding:"20px 16px",marginBottom:14,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:16}}>
            <ScoreRing score={score} labels={scoreLabels}/>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:6}}>{doneCount}/{atIds.length} ações</div>
              {PILLARS.filter(p=>atIds.some(id=>allTasks.find(t=>t.id===id&&t.pillar===p.id))).slice(0,4).map(p=>{
                const ps=pillarScore(today.checks,p.id,atIds,allTasks);
                return ps!==null?(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                    <span style={{fontSize:11,color:p.color,width:12}}>{p.icon}</span>
                    <div style={{flex:1,height:3,background:C.border,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${ps}%`,background:p.color,borderRadius:99,transition:"width 0.4s"}}/>
                    </div>
                    <span style={{fontSize:9,color:C.muted,width:24,textAlign:"right"}}>{ps}%</span>
                  </div>
                ):null;
              })}
              {profile.note&&<div style={{fontSize:10,color:C.muted,marginTop:6}}>{profile.note}</div>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,overflowX:"auto",padding:"4px 0",marginBottom:14}}>
            {Object.entries(PROFILES).map(([k,p])=>{
              const active=today.profile===k;
              const isD=today.gcal_detected===k;
              return (
                <button key={k} onClick={()=>onProfile(k)} style={{flexShrink:0,padding:"7px 12px",borderRadius:20,fontSize:11,border:`1.5px solid ${active?p.color:C.border}`,background:active?`${p.color}20`:"transparent",color:active?C.cream:C.muted,cursor:"pointer",display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                  <span style={{color:p.color}}>{p.icon}</span>{p.label}{isD&&<span style={{fontSize:8,color:p.color}}>●</span>}
                </button>
              );
            })}
          </div>
          {TabHoje}
        </>}
        {tab==="pilares"&&TabPilares}
        {tab==="hist"&&TabHist}
      </div>
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:`linear-gradient(0deg,${C.bg} 60%,transparent 100%)`,padding:"8px 20px 28px",display:"flex",alignItems:"center",justifyContent:"space-around",zIndex:100}}>
        {navTabs.map(({k,icon,label})=>(
          <button key={k} onClick={()=>setTab(k)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"8px 16px",color:tab===k?C.cream:C.muted}}>
            <span style={{fontSize:18,color:tab===k?C.rust:C.muted}}>{icon}</span>
            <span style={{fontSize:10,fontWeight:tab===k?600:400}}>{label}</span>
          </button>
        ))}
        <button onClick={()=>setShowCfg(true)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"none",border:"none",cursor:"pointer",padding:"8px 16px",color:C.muted}}>
          <span style={{fontSize:18}}>⚙</span>
          <span style={{fontSize:10}}>Configurar</span>
        </button>
      </div>
    </div>
  );

  // ── DESKTOP ──────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans',sans-serif",color:C.cream,display:"flex"}}>
      <style>{GLOBAL_STYLE}</style>

      <Sidebar
        score={score} scoreLabels={scoreLabels} today={today}
        atIds={atIds} allTasks={allTasks} doneCount={doneCount}
        profile={profile} onProfile={onProfile}
        gcalOn={gcalOn} gcalEvts={gcalEvts} syncing={syncing} sm={sm}
      />

      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",overflow:"hidden"}}>
        {/* TOP BAR */}
        <div style={{padding:"20px 32px 0",background:`linear-gradient(180deg,${C.bgCard} 0%,transparent 100%)`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",gap:6}}>
              {navTabs.map(({k,icon,label})=>(
                <button key={k} onClick={()=>setTab(k)} style={{
                  display:"flex",alignItems:"center",gap:7,
                  padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:500,
                  border:`1.5px solid ${tab===k?C.rust:C.border}`,
                  background:tab===k?`${C.rust}18`:"transparent",
                  color:tab===k?C.cream:C.muted,cursor:"pointer",transition:"all 0.15s"}}>
                  <span style={{color:tab===k?C.rust:C.muted}}>{icon}</span>{label}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowCfg(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,fontSize:12,border:`1px solid ${C.border}`,background:"transparent",color:C.muted,cursor:"pointer"}}>
              ⚙ Configurar
            </button>
          </div>
          <div style={{height:1,background:C.border,marginTop:16}}/>
        </div>

        {/* CONTEÚDO */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 32px 40px"}}>
          {tab==="hoje"&&TabHoje}
          {tab==="pilares"&&TabPilares}
          {tab==="hist"&&TabHist}
        </div>
      </div>
    </div>
  );
}
