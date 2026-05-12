// ─────────────────────────────────────────────────────────────────────────────
// PERFECTA — ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR
// ─────────────────────────────────────────────────────────────────────────────

// ── SUPABASE ── já configurado
export const SUPABASE_URL = "https://uxkjvbjlsbgmbalokisf.supabase.co";
export const SUPABASE_KEY = "sb_publishable_luFo8Pk5c86scyMctz3VAQ_y61A1S3J";

// ── GOOGLE CALENDAR ───────────────────────────────────────────────────────────
// 1. console.cloud.google.com → Crie projeto "Perfecta"
// 2. Ative "Google Calendar API"
// 3. Credenciais → OAuth 2.0 → Aplicativo da Web
//    Origens autorizadas:
//      http://localhost:5173
//      https://SEU-PROJETO.pages.dev
// 4. Cole o Client ID abaixo:
export const GCAL_CLIENT_ID = "COLE_SEU_CLIENT_ID_AQUI.apps.googleusercontent.com";

// ── PALAVRAS-CHAVE PARA DETECÇÃO DE PERFIL ────────────────────────────────────
export const GCAL_KEYWORDS = {
  sus:         ["sus", "hgf", "plantão", "plantonista", "escala", "viagem", "voo", "hotel", "aeroporto"],
  recuperacao: ["repouso", "recuperação", "atestado", "folga"],
  consultorio: ["consulta", "atendimento", "cirurgia", "retorno", "paciente", "clinic"],
};
