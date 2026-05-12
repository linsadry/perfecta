import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const sb = {
  _token: null,
  _h(extra = {}) {
    return { "Content-Type":"application/json", apikey:SUPABASE_KEY,
      Authorization:`Bearer ${this._token||SUPABASE_KEY}`, ...extra };
  },

  // ── Login com senha ───────────────────────────────────────────────────────
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      { method:"POST", headers:this._h(), body:JSON.stringify({email,password}) });
    const d = await r.json();
    if (d.access_token) { this._token=d.access_token; this._save(d); return {data:d,error:null}; }
    return {data:null,error:d};
  },

  // ── Magic link — redireciona para ESTE app ────────────────────────────────
  async signInMagic(email) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
      method:"POST", headers:this._h(),
      body:JSON.stringify({
        email,
        options: { emailRedirectTo: window.location.origin }
      })
    });
    return r.ok ? {error:null} : {error:await r.json()};
  },

  // ── Captura token ao voltar do magic link (hash na URL) ───────────────────
  async handleMagicLinkCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return null;
    const params = new URLSearchParams(hash.replace("#",""));
    const access_token  = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const expires_in    = parseInt(params.get("expires_in")||"3600");
    if (!access_token) return null;
    this._token = access_token;
    this._save({access_token, refresh_token, expires_in});
    window.history.replaceState(null,"",window.location.pathname);
    const {data} = await this.getUser();
    return data?.user || null;
  },

  // ── Refresh automático do token ───────────────────────────────────────────
  // Supabase aceita refresh_token para emitir novo access_token
  // Isso permite sessão "permanente" — você só faz login uma vez
  async refreshSession() {
    try {
      const raw = localStorage.getItem("pf_session");
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s.refresh_token) return null;
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method:"POST", headers:this._h(),
        body:JSON.stringify({refresh_token: s.refresh_token})
      });
      if (!r.ok) return null;
      const d = await r.json();
      if (d.access_token) {
        this._token = d.access_token;
        this._save(d);
        return d;
      }
    } catch {}
    return null;
  },

  // ── Restaura sessão — tenta local, depois faz refresh ────────────────────
  async restoreOrRefresh() {
    try {
      const s = JSON.parse(localStorage.getItem("pf_session")||"null");
      if (!s) return null;

      // Token ainda válido (com 5min de margem)
      if (s.access_token && s.expires_at > Date.now()/1000 + 300) {
        this._token = s.access_token;
        const {data} = await this.getUser();
        if (data?.user) return data.user;
      }

      // Token expirado mas tem refresh_token — renova silenciosamente
      if (s.refresh_token) {
        const refreshed = await this.refreshSession();
        if (refreshed) {
          const {data} = await this.getUser();
          if (data?.user) return data.user;
        }
      }
    } catch {}
    return null;
  },

  async signOut() {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:this._h()});
    this._token=null; localStorage.removeItem("pf_session");
  },

  async getUser() {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:this._h()});
    const d = await r.json();
    return r.ok ? {data:{user:d},error:null} : {data:null,error:d};
  },

  _save(d) {
    try {
      const existing = JSON.parse(localStorage.getItem("pf_session")||"{}");
      localStorage.setItem("pf_session", JSON.stringify({
        ...existing, ...d,
        expires_at: Math.floor(Date.now()/1000)+(d.expires_in||3600),
      }));
    } catch {}
  },

  async upsertDay(userId, date, patch) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/perfecta_days?on_conflict=user_id,date`,
      { method:"POST", headers:this._h({Prefer:"resolution=merge-duplicates,return=representation"}),
        body:JSON.stringify({user_id:userId,date,...patch}) });
    const d = await r.json(); return r.ok ? {data:d[0],error:null} : {data:null,error:d};
  },
  async getDay(userId, date) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_days?user_id=eq.${userId}&date=eq.${date}&limit=1`,
      {headers:this._h()});
    const d = await r.json(); return r.ok ? {data:d[0]||null,error:null} : {data:null,error:d};
  },
  async getDays(userId, limit=30) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_days?user_id=eq.${userId}&order=date.desc&limit=${limit}`,
      {headers:this._h()});
    const d = await r.json(); return r.ok ? {data:d,error:null} : {data:[],error:d};
  },
  async upsertProfile(userId, patch) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/perfecta_profiles?on_conflict=user_id`,
      { method:"POST", headers:this._h({Prefer:"resolution=merge-duplicates,return=representation"}),
        body:JSON.stringify({user_id:userId,...patch}) });
    const d = await r.json(); return r.ok ? {data:d[0],error:null} : {data:null,error:d};
  },
  async getProfile(userId) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_profiles?user_id=eq.${userId}&limit=1`,
      {headers:this._h()});
    const d = await r.json(); return r.ok ? {data:d[0]||null,error:null} : {data:null,error:d};
  },
};

export default sb;
