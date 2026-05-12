import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

// App pessoal — usuário fixo, sem tela de login
export const FIXED_USER_ID = "3f6a664a-ac50-4794-bf54-f1f85c29c607";

const sb = {
  _h(extra = {}) {
    return {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...extra,
    };
  },

  async upsertDay(date, patch) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_days?on_conflict=user_id,date`,
      {
        method: "POST",
        headers: this._h({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify({ user_id: FIXED_USER_ID, date, ...patch }),
      }
    );
    const d = await r.json();
    return r.ok ? { data: d[0], error: null } : { data: null, error: d };
  },

  async getDay(date) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_days?user_id=eq.${FIXED_USER_ID}&date=eq.${date}&limit=1`,
      { headers: this._h() }
    );
    const d = await r.json();
    return r.ok ? { data: d[0] || null, error: null } : { data: null, error: d };
  },

  async getDays(limit = 30) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_days?user_id=eq.${FIXED_USER_ID}&order=date.desc&limit=${limit}`,
      { headers: this._h() }
    );
    const d = await r.json();
    return r.ok ? { data: d, error: null } : { data: [], error: d };
  },

  async upsertProfile(patch) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_profiles?on_conflict=user_id`,
      {
        method: "POST",
        headers: this._h({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify({ user_id: FIXED_USER_ID, ...patch }),
      }
    );
    const d = await r.json();
    return r.ok ? { data: d[0], error: null } : { data: null, error: d };
  },

  async getProfile() {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/perfecta_profiles?user_id=eq.${FIXED_USER_ID}&limit=1`,
      { headers: this._h() }
    );
    const d = await r.json();
    return r.ok ? { data: d[0] || null, error: null } : { data: null, error: d };
  },
};

export default sb;
