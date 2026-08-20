/* ---------- player profiles ---------- */
let PVIEW = null;
let FS = false;
function currentRole() { return window.FSSMCloud?.role?.() || 'locked'; }
function canCoachEdit() { return ['owner', 'admin', 'coach'].includes(currentRole()); }
function canSeeMprCounts() { return ['owner', 'admin', 'coach', 'mpr'].includes(currentRole()); }
function ensureProfile(pl) {
  if (!pl.profile) pl.profile = {
    status: 'Active', lock: 'Editable', lockReason: '', hidden: false,
    official: { positions: '', classOf: '', ht: '', wt: '' },
    personal: { bio: '', fav: '', goals: '' },
    history: []
  };
  return pl.profile;
}
function phist(pl, what) {
  const pr = ensureProfile(pl);
  const last = pr.history[0];
  if (last && last.what === what && last.by === currentRole() && Date.now() - last.t < 60000) { last.t = Date.now(); return; }
  pr.history.unshift({ t: Date.now(), by: currentRole(), what });
  if (pr.history.length > 20) pr.history.length = 20;
}
function allPlaysForStats() {
  const out = [];
  if (S.game) {
    const numById = {}; S.roster.forEach(x => numById[x.id] = x.num);
    S.game.plays.forEach(pl => out.push({ q: pl.q, type: pl.type, voided: pl.voided, stat: pl.stat, nums: pl.ids.map(id => numById[id]).filter(n => n != null) }));
  }
  S.history.forEach(h => (h.plays || []).forEach(pl => out.push(pl)));
  return out;
}
function profileStats(num) {
  const plays = allPlaysForStats();
  const T = statTotals(plays);
  const snaps = plays.filter(pl => !pl.voided && (pl.nums || []).includes(num)).length;
  let games = 0, met = 0, tracked = 0;
  S.history.forEach(h => {
    const r = (h.snap || []).find(x => x.num === num);
    if (r && (r.status === 'active' || r.status === 'exempt') && r.total > 0) { games++; if (r.status === 'active') { tracked++; if (r.total >= h.required) met++; } }
  });
  if (S.game) { const pl = S.roster.find(x => x.num === num); const { total } = counts(S.game); if (pl && (total[pl.id] || 0) > 0) games++; }
  return { rush: T.rush[num], pass: T.pass[num], recv: T.recv[num], def: T.def[num], snaps, games, met, tracked };
}
function canEditPersonal(pr) { return canCoachEdit() && pr.lock === 'Editable'; }
function renderProfile() {
  const v = $('#view-profile');
  const pl = S.roster.find(x => x.id === PVIEW);
  if (!pl) { v.innerHTML = ''; return; }
  const pr = ensureProfile(pl), stats = profileStats(pl.num), coach = canCoachEdit();
  const lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const off = pr.official, per = pr.personal;
  const offField = (label,key,val) => coach ? `<div class="pfield"><label>${label}</label><input data-pbind="official.${key}" value="${esc(val)}" placeholder="—"></div>` : `<div class="pfield"><label>${label}</label><div class="pstatic">${esc(val)||'—'}</div></div>`;
  const perOk = canEditPersonal(pr);
  const perField = (label,key,val,area) => perOk ? `<div class="pfield"><label>${label}</label>${area ? `<textarea data-pbind="personal.${key}" placeholder="—">${esc(val)}</textarea>` : `<input data-pbind="personal.${key}" value="${esc(val)}" placeholder="—">`}</div>` : `<div class="pfield"><label>${label}</label><div class="pstatic">${esc(val)||'—'}</div></div>`;
  const lockBanner = pr.lock !== 'Editable' ? `<div class="banner gd"><span class="locknote">${lockIcon} Profile locked by coach${pr.lockReason ? ' — '+esc(pr.lockReason) : ''}. Player and parent editing is disabled.</span></div>` : '';
  const hiddenBanner = pr.hidden ? `<div class="banner rb">This profile is hidden from the team by the coach.</div>` : '';
  const line=[];
  if (stats.rush?.c) line.push(`<span class="chip em">${stats.rush.c} CAR · ${stats.rush.y} YDS${stats.rush.td ? ' · '+stats.rush.td+' TD' : ''}</span>`);
  if (stats.pass?.att) line.push(`<span class="chip em">${stats.pass.comp} of ${stats.pass.att} · ${stats.pass.y} YDS</span>`);
  if (stats.recv?.c) line.push(`<span class="chip em">${stats.recv.c} REC · ${stats.recv.y} YDS</span>`);
  if (stats.def && (stats.def.solo + stats.def.ast)) line.push(`<span class="chip em">${stats.def.solo + stats.def.ast} TKL${stats.def.sack ? ' · '+stats.def.sack+' SACK' : ''}</span>`);
  v.innerHTML = `<div class="row" style="margin:10px 0 4px;justify-content:space-between"><button class="pback" data-act="pback">Back to roster</button><span class="chip em">${currentRole().toUpperCase()} ACCESS</span></div>
  <p class="sub" style="margin:0 0 6px">Field Ops uses your signed-in Supabase role. MPR participation data is never exposed to parent or player accounts.</p>${hiddenBanner}${lockBanner}
  <div class="card"><div class="spread"><h2 style="margin:0">Official team information</h2><span class="chip em locknote">${lockIcon} TEAM VERIFIED</span></div><div class="row" style="margin:8px 0 2px"><span class="chip">#${pl.num}${pl.name ? ' · '+esc(pl.name):''}</span><span class="chip">${statusLabel(pl.status)}</span><span class="chip am">Team private</span><span class="chip">${pr.lock === 'Editable' ? 'Editable' : pr.lock}</span></div>
  ${coach ? `<div class="pfield"><label>Name</label><input data-pbind="name" value="${esc(pl.name)}" placeholder="Player name"></div>` : `<div class="pfield"><label>Name</label><div class="pstatic">${esc(pl.name)||'—'}</div></div>`}
  ${offField('Positions','positions',off.positions)}${offField('Class of','classOf',off.classOf)}<div class="rgrid">${offField('Height','ht',off.ht)}${offField('Weight','wt',off.wt)}</div>${coach ? '' : '<p class="sub" style="margin-top:8px">Official fields are coach controlled.</p>'}</div>
  <div class="card"><h2>Player profile</h2><div class="profgrid" style="margin-top:8px"><div><div class="photobox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="8.2" r="3.6"/><path d="M4.5 20c.9-4 4-6 7.5-6s6.6 2 7.5 6"/></svg></div><button class="xbtn staged" disabled style="margin-top:8px;border:1px solid var(--line);width:96px">Upload photo</button></div><div>${perField('Bio','bio',per.bio,true)}${perField('Favorite position','fav',per.fav)}${perField('Goals','goals',per.goals)}</div></div></div>
  <div class="card"><h2>Season stats</h2><div class="row" style="margin-top:6px">${canSeeMprCounts() ? `<span class="chip">${stats.snaps} snaps</span>` : ''}<span class="chip">${stats.games} game${stats.games===1?'':'s'}</span>${canSeeMprCounts() && stats.tracked ? `<span class="chip ${stats.met===stats.tracked?'em':'gd'}">MPR met ${stats.met} of ${stats.tracked}</span>` : ''}</div>${line.length ? `<div class="row" style="margin-top:8px">${line.join('')}</div>` : '<p class="sub" style="margin-top:8px">Stat lines build automatically from Stat Assist play events.</p>'}</div>
  ${coach ? `<div class="card"><h2>Coach controls</h2><div class="row" style="margin-top:8px">${pr.lock==='Editable' ? '<button data-act="plock">Lock official profile</button>' : '<button data-act="punlock">Unlock profile</button>'}<button data-act="phide">${pr.hidden ? 'Unhide profile':'Hide profile'}</button></div></div>` : ''}
  ${pr.history.length ? `<div class="card"><h2>Change history</h2>${pr.history.slice(0,5).map(h=>`<div class="histline"><b>${h.by}</b> · ${esc(h.what)} · ${new Date(h.t).toLocaleString()}</div>`).join('')}</div>` : ''}`;
}
