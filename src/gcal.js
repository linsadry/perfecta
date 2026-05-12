import { GCAL_CLIENT_ID, GCAL_KEYWORDS } from "./config.js";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

const gcal = {
  _client: null, _token: null,
  isConfigured() { return GCAL_CLIENT_ID !== "COLE_SEU_CLIENT_ID_AQUI.apps.googleusercontent.com"; },
  init(onToken) {
    if (!this.isConfigured()) return;
    const load = () => {
      this._client = window.google.accounts.oauth2.initTokenClient({
        client_id: GCAL_CLIENT_ID, scope: SCOPE,
        callback: (resp) => { if (resp.access_token) { this._token=resp.access_token; onToken(resp.access_token); } },
      });
    };
    if (window.google?.accounts) { load(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = load;
    document.head.appendChild(s);
  },
  requestToken() { this._client?.requestAccessToken({prompt:""}); },
  async getTodayEvents(token) {
    try {
      const start=new Date(); start.setHours(0,0,0,0);
      const end=new Date(); end.setHours(23,59,59,999);
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=20`,
        {headers:{Authorization:`Bearer ${token}`}});
      if (!r.ok) return [];
      return (await r.json()).items||[];
    } catch { return []; }
  },
  detectProfile(events) {
    const full = events.map(e=>(e.summary||"").toLowerCase()).join(" ");
    if (GCAL_KEYWORDS.sus.some(kw=>full.includes(kw))) return "sus";
    if (GCAL_KEYWORDS.recuperacao.some(kw=>full.includes(kw))) return "recuperacao";
    if (!GCAL_KEYWORDS.consultorio.some(kw=>full.includes(kw)) && events.length<=2) return "livre";
    return "consultorio";
  },
};
export default gcal;
