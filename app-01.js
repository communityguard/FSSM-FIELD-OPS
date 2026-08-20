'use strict';

/* ---------- storage (local-first; switches to a team-specific key after sign-in) ---------- */
let ACTIVE_STORE_KEY = 'fssm_v1';
const LEGACY_CLAIM_KEY = 'fssm_legacy_claimed_team';
const localId = () => Math.random().toString(36).slice(2, 9);

const store = (() => {
  try {
    const k = '__sc_probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k);
    return {
      ok: true,
      get: () => localStorage.getItem(ACTIVE_STORE_KEY),
      set: v => localStorage.setItem(ACTIVE_STORE_KEY, v)
    };
  } catch (e) {
    let m = null;
    return { ok: false, get: () => m, set: v => { m = v; } };
  }
})();

function normalizeState(next) {
  const out = Object.assign({ roster: [], game: null, history: [] }, next || {});
  delete out.role;
  if (!Array.isArray(out.roster)) out.roster = [];
  if (!Array.isArray(out.history)) out.history = [];
  if (out.game) {
    if (!out.game.id) out.game.id = localId();
    if (!out.game.scoreEvents) out.game.scoreEvents = [];
    if (!out.game.fp) out.game.fp = { spot: null, down: null, dist: null, firstAt: null };
    if (!out.game.plays) out.game.plays = [];
    out.game.plays.forEach((pl, i) => { if (!pl.t) pl.t = Date.now() + i; });
    if (out.game.sel && Array.isArray(out.game.sel.ids) && out.game.sel.ids.length > 11) out.game.sel.ids = out.game.sel.ids.slice(0, 11);
  }
  out.history.forEach((h, hi) => {
    if (!h.id) h.id = localId();
    if (!h.plays) h.plays = [];
    h.plays.forEach((pl, pi) => { if (!pl.t) pl.t = Date.now() - ((hi + 1) * 100000) + pi; });
  });
  return out;
}

let S = { roster: [], game: null, history: [] };
try {
  let raw = store.get();
  if (!raw && store.ok) raw = localStorage.getItem('teamtally_v1') || localStorage.getItem('snapcount_v1');
  if (raw) S = normalizeState(JSON.parse(raw));
} catch (e) {}
S = normalizeState(S);
let lastSavedJSON = JSON.stringify(S);

const save = () => {
  try {
    const nextJSON = JSON.stringify(S);
    if (nextJSON === lastSavedJSON) return;
    store.set(nextJSON);
    lastSavedJSON = nextJSON;
    window.FSSMCloud?.noteLocalChange?.();
  } catch (e) {}
};

window.FSSMExportState = () => {
  const copy = JSON.parse(JSON.stringify(S));
  delete copy.role;
  return copy;
};

window.FSSMApplyCloudState = next => {
  S = normalizeState(next);
  const json = JSON.stringify(S);
  try { store.set(json); } catch (e) {}
  lastSavedJSON = json;
  if (typeof VIEW !== 'undefined') VIEW = S.game ? 'game' : 'home';
  if (typeof PVIEW !== 'undefined' && PVIEW && !S.roster.some(p => p.id === PVIEW)) PVIEW = null;
  if (typeof renderAll === 'function') renderAll();
};

window.FSSMSwitchTeamStore = teamId => {
  if (!store.ok || !teamId) return;
  const key = `fssm_v1_${teamId}`;
  if (ACTIVE_STORE_KEY === key) return;
  const teamRaw = localStorage.getItem(key);
  const legacyRaw = localStorage.getItem('fssm_v1');
  const claimed = localStorage.getItem(LEGACY_CLAIM_KEY);
  ACTIVE_STORE_KEY = key;

  if (teamRaw) {
    try { S = normalizeState(JSON.parse(teamRaw)); } catch (e) { S = normalizeState(null); }
  } else if (legacyRaw && (!claimed || claimed === teamId)) {
    if (!claimed) localStorage.setItem(LEGACY_CLAIM_KEY, teamId);
    try { S = normalizeState(JSON.parse(legacyRaw)); } catch (e) { S = normalizeState(S); }
    localStorage.setItem(key, JSON.stringify(S));
  } else {
    S = normalizeState(null);
    localStorage.setItem(key, JSON.stringify(S));
  }

  lastSavedJSON = JSON.stringify(S);
  if (typeof VIEW !== 'undefined') VIEW = S.game ? 'game' : 'home';
};

const uid = localId;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }[c]));

const TYPES = [
  ['kickoff', 'Kickoff', ''],
  ['kickret', 'Kick Return', ''],
  ['offense', 'Offense', ''],
  ['defense', 'Defense', ''],
  ['punt', 'Punt', ''],
  ['puntret', 'Punt Return', ''],
  ['fg', 'Field Goal', 'includes PAT'],
  ['fgdef', 'FG Defense', 'includes PAT']
];
const TNAME = Object.fromEntries(TYPES.map(t => [t[0], t[1]]));
