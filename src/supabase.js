import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const sb = {
  _token: null,
  _h(extra = {}) {
    return { "Content-Type":"application/json", apikey:SUPABASE_KEY,
      Authorization:`Bearer ${this._token||SUPABASE_KEY}`, ...extra };
  },

  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      { method:"POST", headers:this._h(), body:JSON.stringify({email,password}) });
    const d = await r.json();
    if (d.access_token) { this._token = d.access_token; this._save(d); return {data:d,error:null}; }
    return {data:null,error:d};
  },
  async signInMagic(email) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`,
      { method:"POST", headers:this._h(), body:JSON.stringify({email}) });
    return r.ok ? {error:null} : {error:await r.json()};
  },
  async signOut() {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:this._h()});
    this._token = null; localStorage.removeItem("pf_session");
  },
  async getUser() {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:this._h()});
    const d = await r.json();
    return r.ok ? {data:{user:d},error:null} : {data:null,error:d};
  },
  restoreSession() {
    try {
      const s = JSON.parse(localStorage.getItem("pf_session")||"null");
      if (s?.access_token && s.expires_at > Date.now()/1000) { this._token=s.access_token; return s; }
    } catch {}
    return null;
  },
  _save(d) {
    try { localStorage.setItem("pf_session", JSON.stringify(
      {...d, expires_at: Math.floor(Date.now()/1000)+(d.expires_in||3600)})); } catch {}
  },

  async upsertDay(userId, date, patch) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/perfecta_days?on_conflict=user_id,date`,
      { method:"POST", headers:this._h({Prefer:"resolution=merge-duplicates,return=representation"}),
        body:JSON.stringify({user_id:userId,date,...patch}) });
    const d = await r.json(); return r.ok ? {data:d[0],error:null} : {data:null,error:d};
  },
  async getDay(userId, date) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/perfecta_days?user_id=eq.${userId}&date=eq.${date}&limit=1`,
      {headers:this._h()});
    const d = await r.json(); return r.ok ? {data:d[0]||null,error:null} : {data:null,error:d};
  },
  async getDays(userId, limit=30) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/perfecta_days?user_id=eq.${userId}&order=date.desc&limit=${limit}`,
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
    const r = await fetch(`${SUPABASE_URL}/rest/v1/perfecta_profiles?user_id=eq.${userId}&limit=1`,
      {headers:this._h()});
    const d = await r.json(); return r.ok ? {data:d[0]||null,error:null} : {data:null,error:d};
  },
};
export default sb;
