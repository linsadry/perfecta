export const PILLARS = [
  {id:"saude",    label:"Saúde",        icon:"◎", color:"#c1440e", weight:2.0, desc:"Base para tudo — inclui maternidade"},
  {id:"mente",    label:"Mente",         icon:"◈", color:"#d4892a", weight:1.5, desc:"Foco, clareza, crescimento interno"},
  {id:"concurso", label:"Concurso",      icon:"◆", color:"#e8a84a", weight:1.8, desc:"AFRFB / TCU — construção de futuro"},
  {id:"clinica",  label:"Clínica",       icon:"◉", color:"#b85c38", weight:1.3, desc:"Atendimento, protocolos, SUS"},
  {id:"marca",    label:"Marca Pessoal", icon:"◇", color:"#7a1e3a", weight:1.2, desc:"Instagram, conteúdo, posicionamento"},
  {id:"financas", label:"Finanças",      icon:"◈", color:"#e8a84a", weight:1.2, desc:"Reserva, investimentos, controle"},
  {id:"vida",     label:"Vida Pessoal",  icon:"◌", color:"#6aac7a", weight:1.0, desc:"Família, descanso, alma"},
];

export const DEFAULT_TASK_CONFIG = {
  sono:        {points:20, active:true},
  agua:        {points:5,  active:true},
  suplementos: {points:8,  active:true},
  alimentacao: {points:[0,8,15], active:true},
  treino:      {points:[6,12,18], active:true},
  skincare:    {points:[3,6],  active:true},
  natureza:    {points:[4,10], active:true},
  foco_manha:  {points:10, active:true},
  leitura:     {points:[4,8,12], active:true},
  escrita:     {points:[4,8,12], active:true},
  silencio:    {points:[3,8],  active:true},
  estudo_conc: {points:15, active:true},
  revisao:     {points:[6,12,18], active:true},
  planeja:     {points:[4,8],  active:true},
  atendimento: {points:10, active:true},
  estudo_oft:  {points:[5,10], active:true},
  conteudo:    {points:[6,12,18], active:true},
  fotografia:  {points:[5,10], active:true},
  estudo_foto: {points:[4,8],  active:true},
  financas_r:  {points:[6,12], active:true},
  poupanca:    {points:[8,16], active:true},
  familia:     {points:15, active:true},
  descanso:    {points:[6,12], active:true},
  hobbies:     {points:[6,12], active:true},
};

export const TASKS_META = [
  {id:"sono",        pillar:"saude",    type:"essencial", label:"Dormir ≥ 7h"},
  {id:"agua",        pillar:"saude",    type:"essencial", label:"Hidratação adequada"},
  {id:"suplementos", pillar:"saude",    type:"essencial", label:"Suplementos / vitaminas", note:"Ácido fólico, D3"},
  {id:"alimentacao", pillar:"saude",    type:"expansao",  label:"Alimentação",             levels:["ruim","média","boa"]},
  {id:"treino",      pillar:"saude",    type:"expansao",  label:"Treino",                  levels:["20min","40min","60min+"]},
  {id:"skincare",    pillar:"saude",    type:"expansao",  label:"Skincare completo",        levels:["básico","completo"]},
  {id:"natureza",    pillar:"saude",    type:"alma",      label:"Tempo ao ar livre",        levels:["breve","longo"]},
  {id:"foco_manha",  pillar:"mente",    type:"essencial", label:"Bloco de foco matinal"},
  {id:"leitura",     pillar:"mente",    type:"expansao",  label:"Leitura",                 levels:["15min","30min","60min+"]},
  {id:"escrita",     pillar:"mente",    type:"expansao",  label:"Escrita / journaling",    levels:["breve","foco","profundo"]},
  {id:"silencio",    pillar:"mente",    type:"alma",      label:"Momento de silêncio",     levels:["5min","15min+"]},
  {id:"estudo_conc", pillar:"concurso", type:"essencial", label:"Estudo concurso"},
  {id:"revisao",     pillar:"concurso", type:"expansao",  label:"Revisão / questões",      levels:["25min","50min","90min+"]},
  {id:"planeja",     pillar:"concurso", type:"expansao",  label:"Planejamento de estudos", levels:["revisar","ajustar"]},
  {id:"atendimento", pillar:"clinica",  type:"essencial", label:"Atendimento com presença"},
  {id:"estudo_oft",  pillar:"clinica",  type:"expansao",  label:"Estudo oftalmologia",     levels:["artigo","aprofundado"], note:"Glaucoma, atualizações"},
  {id:"conteudo",    pillar:"marca",    type:"expansao",  label:"Criação de conteúdo",     levels:["ideia","rascunho","publicado"]},
  {id:"fotografia",  pillar:"marca",    type:"expansao",  label:"Fotografia / videografia",levels:["registro","sessão"]},
  {id:"estudo_foto", pillar:"marca",    type:"alma",      label:"Estudo de fotografia",    levels:["referência","técnica"]},
  {id:"financas_r",  pillar:"financas", type:"expansao",  label:"Registro financeiro",     levels:["transações","análise"]},
  {id:"poupanca",    pillar:"financas", type:"expansao",  label:"Ação de reserva",         levels:["planejou","executou"]},
  {id:"familia",     pillar:"vida",     type:"essencial", label:"Presença com família"},
  {id:"descanso",    pillar:"vida",     type:"alma",      label:"Descanso real",           levels:["pausa","recarregou"]},
  {id:"hobbies",     pillar:"vida",     type:"alma",      label:"Hobbie / prazer puro",    levels:["breve","mergulhado"]},
];

// Monta tarefas: base (TASKS_META) + customizadas (do Supabase), aplicando config do usuário
export function buildTasks(taskConfig, customTasks = []) {
  const base = TASKS_META.map(meta => {
    const cfg = taskConfig[meta.id] || DEFAULT_TASK_CONFIG[meta.id] || {};
    return {
      ...meta,
      points: cfg.points ?? DEFAULT_TASK_CONFIG[meta.id]?.points,
      active: cfg.active ?? true,
      custom: false,
    };
  });

  const custom = customTasks.map(meta => {
    const cfg = taskConfig[meta.id] || {};
    return {
      ...meta,
      points: cfg.points ?? meta.points,
      active: cfg.active ?? true,
      custom: true,
    };
  });

  return [...base, ...custom].filter(t => t.active !== false);
}

export const PROFILES = {
  consultorio: {
    label:"Consultório", icon:"◉", color:"#b85c38",
    tasks:["sono","agua","suplementos","alimentacao","treino","skincare","foco_manha","estudo_conc","revisao","atendimento","familia","descanso"],
  },
  sus: {
    label:"SUS / Viagem", icon:"◈", color:"#d4892a",
    tasks:["sono","agua","suplementos","alimentacao","atendimento","estudo_conc","familia"],
    note:"Exigência reduzida — dia intenso",
  },
  livre: {
    label:"Dia Livre", icon:"◌", color:"#6aac7a",
    tasks:["sono","agua","suplementos","alimentacao","treino","skincare","natureza","leitura","escrita","silencio","estudo_conc","revisao","planeja","conteudo","fotografia","estudo_foto","financas_r","familia","descanso","hobbies"],
  },
  recuperacao: {
    label:"Recuperação", icon:"○", color:"#7a6555",
    tasks:["sono","agua","suplementos","alimentacao","familia","descanso"],
    note:"Dias difíceis também contam",
  },
};

export const DEFAULT_SCORE_LABELS = [
  {min:0,  max:40,  label:"Sobrevivência", color:"#7a6555"},
  {min:40, max:70,  label:"Funcional",     color:"#d4892a"},
  {min:70, max:90,  label:"Alinhado",      color:"#e8a84a"},
  {min:90, max:101, label:"Excelente",     color:"#6aac7a"},
];

export function scoreMeta(score, labels) {
  const L = labels || DEFAULT_SCORE_LABELS;
  const band = L.slice().reverse().find(b => score >= b.min) || L[0];
  return {label: band.label, color: band.color};
}

export const getMax = t => Array.isArray(t.points) ? t.points[t.points.length-1] : t.points;

export function getEarned(t, v) {
  if (!v && v !== 0) return 0;
  if (t.type === "essencial") return v === true ? (Array.isArray(t.points) ? t.points[t.points.length-1] : t.points) : 0;
  if (Array.isArray(t.points)) { const i=parseInt(v)-1; return i>=0 ? (t.points[i]||0) : 0; }
  return 0;
}

export function computeScore(checks, taskIds, allTasks) {
  let e=0, p=0;
  taskIds.forEach(id => {
    const t = allTasks.find(x=>x.id===id); if (!t) return;
    const w = PILLARS.find(x=>x.id===t.pillar)?.weight || 1;
    p += getMax(t)*w; e += getEarned(t,checks[id])*w;
  });
  return p===0 ? 0 : Math.round((e/p)*100);
}

export function pillarScore(checks, pid, taskIds, allTasks) {
  let e=0, p=0;
  taskIds.forEach(id => {
    const t=allTasks.find(x=>x.id===id); if(!t||t.pillar!==pid) return;
    p+=getMax(t); e+=getEarned(t,checks[id]);
  });
  return p===0 ? null : Math.round((e/p)*100);
}

export const todayKey = () => new Date().toISOString().split("T")[0];
