(() => {
  'use strict';
  const SUPABASE_URL = 'https://yloiorusilsecvctzfrz.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_wvbWV2IZY33TEi7STE49XQ_sob1FbS3';
  const CTX_KEY = 'fssm_cloud_ctx_v1';
  const META_PREFIX = 'fssm_cloud_meta_v1_';
  const STAFF_ROLES = new Set(['owner', 'admin', 'coach', 'mpr']);
  const COACH_ROLES = new Set(['owner', 'admin', 'coach']);
  let db = null, syncTimer = null, syncBusy = false, initBusy = false;
  const ctx = { user: null, teamId: null, teamName: '', role: null, offline: false, ready: false };
  const $ = s => document.querySelector(s);
  const safeJSON = (raw, fallback = null) => { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } };
  const readCtx = () => safeJSON(localStorage.getItem(CTX_KEY), null);
  const saveCtx = () => localStorage.setItem(CTX_KEY, JSON.stringify({ userId: ctx.user?.id || null, email: ctx.user?.email || '', teamId: ctx.teamId, teamName: ctx.teamName, role: ctx.role }));
  const metaKey = () => META_PREFIX + (ctx.teamId || 'none');
  const readMeta = () => safeJSON(localStorage.getItem(metaKey()), { localChangedAt: 0, lastSyncedAt: 0 });
  const writeMeta = m => localStorage.setItem(metaKey(), JSON.stringify(m));
  const isStaff = role => STAFF_ROLES.has(role || ctx.role);
  const isCoach = role => COACH_ROLES.has(role || ctx.role);
  const hasState = st => !!(st && ((st.roster && st.roster.length) || st.game || (st.history && st.history.length)));
  function setStatus(message, kind = '') { const el = $('#authStatus'); if (!el) return; el.textContent = message || ''; el.className = 'auth-status' + (kind ? ' ' + kind : ''); }
  function showGate(mode = 'login', message = '') { const gate = $('#authGate'); if (!gate) return; gate.classList.remove('is-hidden'); $('#authLoginPane')?.classList.toggle('is-hidden', mode !== 'login'); $('#authTeamPane')?.classList.toggle('is-hidden', mode !== 'team'); $('#authRestrictedPane')?.classList.toggle('is-hidden', mode !== 'restricted'); setStatus(message); }
  function hideGate() { $('#authGate')?.classList.add('is-hidden'); }
  function updateCloudBadge(state = '') {
    const host = $('#hdrChip'); if (!host) return; let dotClass = 'cloud-dot'; let label = ctx.role ? ctx.role.toUpperCase() : 'LOCAL';
    if (!navigator.onLine || ctx.offline) { dotClass += ' offline'; label += ' · OFFLINE'; } else if (state === 'syncing') { dotClass += ' syncing'; label += ' · SYNCING'; } else if (ctx.ready) label += ' · CLOUD';
    host.querySelector('.cloud-userbar')?.remove(); const wrap = document.createElement('span'); wrap.className = 'cloud-userbar'; wrap.innerHTML = `<span class="cloud-badge"><i class="${dotClass}"></i>${label}</span>${ctx.user ? '<button class="xbtn" type="button" data-cloud-signout>Sign out</button>' : ''}`; host.appendChild(wrap);
  }
  function cacheOfflineContext() { const cached = readCtx(); if (!cached || !cached.teamId || !isStaff(cached.role)) return false; ctx.teamId = cached.teamId; ctx.teamName = cached.teamName || ''; ctx.role = cached.role; ctx.offline = true; ctx.ready = true; window.FSSMSwitchTeamStore?.(ctx.teamId); hideGate(); updateCloudBadge(); window.renderAll?.(); return true; }
  async function loadMembership(user) {
    ctx.user = user;
    const { data, error } = await db.from('team_members').select('team_id,role,status,teams(id,name,organization_name)').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: true }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) { ctx.teamId = null; ctx.teamName = ''; ctx.role = null; ctx.ready = false; showGate('team', 'Signed in. Create the team workspace for this account.'); return false; }
    ctx.teamId = data.team_id; ctx.teamName = data.teams?.name || 'FSSM Football'; ctx.role = data.role; ctx.offline = false; ctx.ready = isStaff(ctx.role); saveCtx(); window.FSSMSwitchTeamStore?.(ctx.teamId);
    if (!ctx.ready) { showGate('restricted'); if ($('#restrictedRole')) $('#restrictedRole').textContent = String(ctx.role || 'member').toUpperCase(); return false; }
    hideGate(); updateCloudBadge(); await reconcileCloudState(); window.renderAll?.(); return true;
  }
  async function reconcileCloudState() {
    if (!db || !ctx.ready || !navigator.onLine || !ctx.teamId) return;
    const { data, error } = await db.from('field_ops_state').select('state,updated_at').eq('team_id', ctx.teamId).maybeSingle(); if (error) { console.warn('FSSM cloud pull failed', error); return; }
    const localState = window.FSSMExportState?.() || null, meta = readMeta(); if (!data) { if (localState) await pushState(true); return; }
    const cloudMs = Date.parse(data.updated_at) || 0, localMs = meta.localChangedAt || 0, lastSync = meta.lastSyncedAt || 0, localDirty = localMs > lastSync;
    if (!hasState(localState) || (!localDirty && cloudMs > lastSync) || (localDirty && cloudMs > localMs)) { window.FSSMApplyCloudState?.(data.state); writeMeta({ localChangedAt: cloudMs, lastSyncedAt: cloudMs }); return; }
    if (localDirty) await pushState(true);
  }
  async function pushState(force = false) {
    if (syncBusy || !db || !ctx.ready || !ctx.user || !ctx.teamId || !navigator.onLine) return; const state = window.FSSMExportState?.(); if (!state) return; const meta = readMeta(); if (!force && (meta.localChangedAt || 0) <= (meta.lastSyncedAt || 0)) return;
    syncBusy = true; updateCloudBadge('syncing');
    try { const { data, error } = await db.from('field_ops_state').upsert({ team_id: ctx.teamId, state, updated_by: ctx.user.id }, { onConflict: 'team_id' }).select('updated_at').single(); if (error) throw error; const ts = Date.parse(data.updated_at) || Date.now(); writeMeta({ localChangedAt: ts, lastSyncedAt: ts }); } catch (err) { console.warn('FSSM cloud sync failed', err); } finally { syncBusy = false; updateCloudBadge(); }
  }
  function noteLocalChange() { if (!ctx.teamId) return; const meta = readMeta(); meta.localChangedAt = Date.now(); writeMeta(meta); scheduleSync(); }
  function scheduleSync() { clearTimeout(syncTimer); if (!ctx.ready || !navigator.onLine) return; syncTimer = setTimeout(() => pushState(false), 1000); }
  async function init() {
    if (initBusy) return; initBusy = true; showGate('login', 'Checking secure access…');
    try {
      if (!window.supabase?.createClient) { if (cacheOfflineContext()) return; setStatus('Cloud sign-in is unavailable offline. Connect to the internet once to sign in.', 'err'); return; }
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      const { data: { session } } = await db.auth.getSession(); if (session?.user) await loadMembership(session.user); else showGate('login', 'Sign in with your FSSM staff account.');
      db.auth.onAuthStateChange((event, sessionNow) => { if (event === 'SIGNED_OUT') { ctx.user = null; ctx.teamId = null; ctx.teamName = ''; ctx.role = null; ctx.ready = false; ctx.offline = false; localStorage.removeItem(CTX_KEY); showGate('login', 'Signed out.'); } else if (sessionNow?.user && (!ctx.user || ctx.user.id !== sessionNow.user.id)) setTimeout(() => loadMembership(sessionNow.user).catch(err => setStatus(err.message || 'Unable to load account.', 'err')), 0); });
    } catch (err) { if (!navigator.onLine && cacheOfflineContext()) return; setStatus(err?.message || 'Unable to connect to FSSM cloud.', 'err'); } finally { initBusy = false; }
  }
  async function signIn() { if (!db) return init(); const email = $('#authEmail')?.value.trim(), password = $('#authPassword')?.value || ''; if (!email || !password) return setStatus('Enter your email and password.', 'err'); setStatus('Signing in…'); const { data, error } = await db.auth.signInWithPassword({ email, password }); if (error) return setStatus(error.message, 'err'); if (data.user) await loadMembership(data.user); }
  async function signUp() { if (!db) return init(); const display_name = $('#authName')?.value.trim() || '', email = $('#authEmail')?.value.trim(), password = $('#authPassword')?.value || ''; if (!email || password.length < 8) return setStatus('Use a valid email and a password of at least 8 characters.', 'err'); setStatus('Creating account…'); const { data, error } = await db.auth.signUp({ email, password, options: { data: { display_name } } }); if (error) return setStatus(error.message, 'err'); if (data.session?.user) await loadMembership(data.session.user); else setStatus('Account created. Check your email to confirm the address, then sign in.', 'ok'); }
  async function createTeam() { if (!db || !ctx.user) return; const name = $('#teamName')?.value.trim() || 'FSSM Football'; setStatus('Creating team workspace…'); const { error } = await db.from('teams').insert({ name, created_by: ctx.user.id }); if (error) return setStatus(error.message, 'err'); await loadMembership(ctx.user); }
  async function signOut() { if (db) await db.auth.signOut(); localStorage.removeItem(CTX_KEY); ctx.user = null; ctx.teamId = null; ctx.teamName = ''; ctx.role = null; ctx.ready = false; ctx.offline = false; showGate('login', 'Signed out. Local game data remains on this device.'); }
  document.addEventListener('click', e => { if (e.target.closest('[data-auth-signin]')) { e.preventDefault(); signIn(); } if (e.target.closest('[data-auth-signup]')) { e.preventDefault(); signUp(); } if (e.target.closest('[data-auth-create-team]')) { e.preventDefault(); createTeam(); } if (e.target.closest('[data-cloud-signout]')) { e.preventDefault(); signOut(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.closest('#authGate input')) { e.preventDefault(); signIn(); } });
  window.addEventListener('online', () => { ctx.offline = false; updateCloudBadge(); if (ctx.ready) reconcileCloudState().then(() => scheduleSync()); else init(); }); window.addEventListener('offline', () => { ctx.offline = true; updateCloudBadge(); }); window.addEventListener('DOMContentLoaded', init, { once: true });
  window.FSSMCloud = { scheduleSync, noteLocalChange, role: () => ctx.role, teamId: () => ctx.teamId, teamName: () => ctx.teamName, isStaff: () => isStaff(), isCoach: () => isCoach(), updateBadge: updateCloudBadge, pushNow: () => pushState(true) };
})();
