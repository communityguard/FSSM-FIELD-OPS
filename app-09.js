/* ---------- Stat Assist ---------- */
const SA = { open: false, idx: -1, step: null, answers: {}, yd: 0 };
function numOfId(id) { const pl = S.roster.find(p => p.id === id); return pl ? pl.num : null; }
function saOpen(idx) {
  SA.open = true; SA.idx = idx; SA.answers = {}; SA.yd = 0; SA.custom = false;
  SA.step = saNext(); saRender();
}
function saClose() { SA.open = false; SA.idx = -1; SA.step = null; saRender(); }
function saPlay() { return (S.game && S.game.plays[SA.idx]) || null; }
function saNext() {
  const play = saPlay(); if (!play) return null;
  const a = SA.answers, t = play.type;
  const P = (key, label) => ({ kind: 'players', key, label });
  const C = (key, label, opts) => ({ kind: 'chips', key, label, opts });
  const Y = (key, label) => ({ kind: 'yards', key, label });
  const F = (label, opts) => ({ kind: 'flags', key: 'flags', label, opts });
  if (t === 'offense') {
    if (!a.otype) return C('otype', 'Play', ['Run', 'Pass', 'Penalty']);
    if (a.otype === 'Run') { if (!a.carrier) return P('carrier', 'Ball carrier'); if (a.yards == null) return Y('yards', 'Yards'); if (!a.flagsDone) return F('Result', ['Touchdown', 'First down', 'Fumble lost', 'Out of bounds']); }
    if (a.otype === 'Pass') {
      if (!a.presult) return C('presult', 'Pass result', ['Complete', 'Incomplete', 'Interception', 'Sack']);
      if (!a.passer) return P('passer', 'Passer');
      if (a.presult === 'Complete') { if (!a.receiver) return P('receiver', 'Receiver'); if (a.yards == null) return Y('yards', 'Yards'); if (!a.flagsDone) return F('Result', ['Touchdown', 'First down', 'Fumble lost', 'Out of bounds']); }
      if (a.presult === 'Sack' && a.yards == null) return Y('yards', 'Yards lost');
    }
    if (a.otype === 'Penalty') { if (!a.pteam) return C('pteam', 'Penalty on', ['Us', 'Them']); if (!a.pcall) return C('pcall', 'Call', ['Accepted', 'Declined', 'Offset']); if (a.pcall === 'Accepted' && a.pyards == null) return C('pyards', 'Yards', ['5', '10', '15']); if (!a.pcounts) return C('pcounts', 'Does the play count', ['Play counts', 'No play']); }
  }
  if (t === 'defense') {
    if (!a.dresult) return C('dresult', 'Result', ['Tackle', 'Sack', 'TFL', 'Interception', 'Pass breakup', 'Forced fumble', 'Fumble recovery']);
    if (!a.player) return P('player', 'By');
    if (a.dresult === 'Tackle') { if (!a.tkind) return C('tkind', 'Tackle type', ['Solo', 'Assist']); if (a.tkind === 'Assist' && !a.player2) return P('player2', 'Assisted by'); if (a.yards == null) return Y('yards', 'Their gain on the play'); }
    if ((a.dresult === 'Sack' || a.dresult === 'TFL' || a.dresult === 'Forced fumble') && a.yards == null) return Y('yards', a.dresult === 'Forced fumble' ? 'Their gain before the fumble' : 'Yards lost');
    if ((a.dresult === 'Interception' || a.dresult === 'Fumble recovery')) { if (a.yards == null) return Y('yards', 'Return yards'); if (!a.flagsDone) return F('Result', ['Touchdown']); }
  }
  if (t === 'kickret' || t === 'puntret') {
    if (!a.rresult) return C('rresult', 'Result', t === 'puntret' ? ['Return', 'Fair catch', 'Muffed', 'Touchback'] : ['Return', 'Touchback', 'Out of bounds']);
    if (a.rresult === 'Return') { if (!a.returner) return P('returner', 'Returner'); if (a.yards == null) return Y('yards', 'Return yards'); if (!a.flagsDone) return F('Result', ['Touchdown', 'Fumble lost']); }
  }
  if (t === 'kickoff' || t === 'punt') {
    if (!a.cresult) return C('cresult', 'Result', t === 'punt' ? ['Returned', 'Fair catch', 'Downed', 'Touchback', 'Out of bounds', 'Blocked'] : ['Returned', 'Touchback', 'Out of bounds', 'Onside kick']);
    if (a.cresult === 'Returned') { if (!a.tackler) return P('tackler', 'Tackle by'); if (!a.flagsDone) return F('Result', ['Return TD by them', 'Fumble forced', 'Fumble recovered by us']); }
  }
  if (t === 'fg') { if (!a.kresult) return C('kresult', 'Result', ['PAT good', 'FG good', 'No good', 'Blocked']); if (!a.kicker) return P('kicker', 'Kicker'); }
  if (t === 'fgdef') { if (!a.kdresult) return C('kdresult', 'Result', ['PAT good by them', 'FG good by them', 'No good', 'Blocked by us']); if (a.kdresult === 'Blocked by us' && !a.player) return P('player', 'Blocked by'); }
  return null;
}
function saAnswer(key, val) { SA.answers[key] = val; SA.step = saNext(); if (!SA.step) { saSave(); return; } SA.yd = 0; saRender(); }
function saSkip() { const st = SA.step; if (!st) { saSave(); return; } if (st.kind === 'flags') SA.answers.flagsDone = true; else SA.answers[st.key] = st.kind === 'yards' ? 0 : 'skip'; SA.step = saNext(); if (!SA.step) { saSave(); return; } SA.yd = 0; saRender(); }
function saSave() {
  const play = saPlay(); if (!play) { saClose(); return; }
  const a = SA.answers; play.stat = a;
  if (a.pcounts === 'No play') { play.voided = true; toast(`Play ${SA.idx + 1} removed from counts — penalty replay`); }
  const fp = S.game.fp;
  const scrimmage = play.type === 'offense' && (a.otype === 'Run' || (a.otype === 'Pass' && (a.presult === 'Complete' || a.presult === 'Incomplete' || a.presult === 'Sack')));
  if (fp && fp.spot != null && fp.down != null && !fp.theirs && scrimmage && a.pcounts !== 'No play') {
    a.down = fp.down; a.dist = fp.dist; a.fpStart = fp.spot; let moved = null;
    if (a.otype === 'Run' && typeof a.yards === 'number') moved = a.yards;
    if (a.otype === 'Pass' && a.presult === 'Complete' && typeof a.yards === 'number') moved = a.yards;
    if (a.otype === 'Pass' && a.presult === 'Sack' && typeof a.yards === 'number') moved = -Math.abs(a.yards);
    if (moved != null) {
      const end = Math.max(0, Math.min(100, fp.spot + moved)); a.fpEnd = end; a.flags = a.flags || [];
      if (end >= 100 && !a.flags.includes('Touchdown')) { a.flags.push('Touchdown'); toast('Touchdown detected at the goal line'); }
      if (end >= 100) { fp.spot = null; fp.down = null; fp.dist = null; fp.firstAt = null; }
      else if (end >= fp.firstAt) { if (!a.flags.includes('First down')) a.flags.push('First down'); fpNewSeries(S.game, end); }
      else if (fp.down >= 4) { fp.spot = end; fp.down = null; fp.dist = null; fp.firstAt = null; toast('Turnover on downs — start the new series when possession settles'); }
      else { fp.spot = end; fp.down = fp.down + 1; fp.dist = fp.firstAt - end; }
    } else if (a.presult === 'Incomplete') { a.fpEnd = fp.spot; if (fp.down >= 4) { fp.down = null; fp.dist = null; fp.firstAt = null; toast('Turnover on downs — start the new series when possession settles'); } else fp.down = fp.down + 1; }
    if (a.presult === 'Interception') { fp.down = null; fp.dist = null; fp.firstAt = null; }
    fp.lastSpot = fp.spot;
  }
  if (fp && fp.spot != null && fp.down != null && fp.theirs && play.type === 'defense' && a.pcounts !== 'No play') {
    a.down = fp.down; a.dist = fp.dist; const preSpot = fp.spot; a.fpStart = preSpot;
    if (a.dresult === 'Interception' || a.dresult === 'Fumble recovery') { const ret = typeof a.yards === 'number' ? a.yards : 0; const spot = Math.max(1, Math.min(99, preSpot + ret)); a.fpEnd = spot; fpNewSeries(S.game, spot, false); toast(`Takeaway — our ball, 1st & ${S.game.fp.dist} at ${fpText(spot)}. Adjust the spot if needed.`); }
    else {
      let gain = null; if (a.dresult === 'Tackle' && typeof a.yards === 'number') gain = a.yards; if ((a.dresult === 'Sack' || a.dresult === 'TFL') && typeof a.yards === 'number') gain = -Math.abs(a.yards); if (a.dresult === 'Forced fumble' && typeof a.yards === 'number') gain = a.yards; if (a.dresult === 'Pass breakup') gain = 0; if (gain == null) gain = (fp.lastSpot != null ? fp.lastSpot : preSpot) - preSpot;
      const rawEnd = preSpot - gain;
      if (rawEnd <= 0) { a.fpEnd = 0; pushScore(S.game, 'them', 6, play.q); S.game.fp = { spot: null, down: null, dist: null, firstAt: null, theirs: false }; toast('They reached the goal line — touchdown for them'); }
      else if (rawEnd >= 100) { a.fpEnd = 100; pushScore(S.game, 'us', 2, play.q); S.game.fp = { spot: null, down: null, dist: null, firstAt: null, theirs: false }; toast('Safety — 2 points. Set the spot after the free kick.'); }
      else { a.fpEnd = rawEnd; fp.spot = rawEnd; if (gain >= fp.dist) { fpNewSeries(S.game, rawEnd, true); toast(`Their first down — ${ddText(S.game.fp)}`); } else if (fp.down >= 4) { fp.down = null; fp.dist = null; fp.firstAt = null; fp.theirs = false; toast('Turnover on downs — start your series at the spot'); } else { fp.down += 1; fp.dist = Math.max(1, fp.dist - gain); fp.firstAt = Math.max(0, Math.min(100, fpAim(fp))); } }
    }
    if (S.game.fp) S.game.fp.lastSpot = S.game.fp.spot;
  }
  const flags = a.flags || []; const our6 = flags.includes('Touchdown') && play.type !== 'kickoff';
  if (our6) pushScore(S.game, 'us', 6, play.q); if (flags.includes('Return TD by them')) pushScore(S.game, 'them', 6, play.q); if (a.kresult === 'PAT good') pushScore(S.game, 'us', 1, play.q); if (a.kresult === 'FG good') pushScore(S.game, 'us', 3, play.q); if (a.kdresult === 'PAT good by them') pushScore(S.game, 'them', 1, play.q); if (a.kdresult === 'FG good by them') pushScore(S.game, 'them', 3, play.q);
  const who = a.carrier || a.player || a.passer || a.returner || a.tackler || a.kicker; if (a.pcounts !== 'No play') toast(`Stat saved${who && who !== 'skip' ? ' — #' + who : ''} · totals updated on the Stats tab`); saClose(); renderAll();
}
function saRender() {
  const el = document.getElementById('statSheet'); if (!el) return; if (!SA.open || !SA.step) { el.classList.add('is-hidden'); el.innerHTML = ''; return; }
  const play = saPlay(); if (!play) { el.classList.add('is-hidden'); return; } const st = SA.step; let body = '';
  if (st.kind === 'chips') body = `<div class="sa-chips">${st.opts.map(o => `<button class="sa-chip" data-sa="ans" data-key="${st.key}" data-val="${o}">${o}</button>`).join('')}</div>`;
  if (st.kind === 'players') { const onNums = play.ids.map(numOfId).filter(n => n != null); const others = S.roster.filter(p => (p.status === 'active' || p.status === 'exempt') && !onNums.includes(p.num)).map(p => p.num); body = `<div class="sa-chips">${onNums.sort((x, y) => x - y).map(n => `<button class="sa-chip num" data-sa="ans" data-key="${st.key}" data-val="${n}">${n}</button>`).join('')}</div>` + (others.length ? `<div class="sa-label">Not in the logged 11</div><div class="sa-chips">${others.sort((x, y) => x - y).map(n => `<button class="sa-chip num" data-sa="ans" data-key="${st.key}" data-val="${n}">${n}</button>`).join('')}</div>` : ''); }
  if (st.kind === 'yards') { const quick = [-10, -5, -3, -2, -1, 0, 1, 2, 3, 5, 10, 20]; body = `<div class="sa-chips">${quick.map(v => `<button class="sa-chip" data-sa="ans" data-key="${st.key}" data-val="${v}">${v > 0 ? '+' + v : v}</button>`).join('')}<button class="sa-chip ${SA.custom ? 'on' : ''}" data-sa="custom">Custom</button></div>${SA.custom ? `<div class="sa-yd"><button data-sa="yd" data-d="-5">−5</button><button data-sa="yd" data-d="-1">−1</button><b>${SA.yd}</b><button data-sa="yd" data-d="1">+1</button><button data-sa="yd" data-d="5">+5</button><button data-sa="yd" data-d="10">+10</button><button data-sa="ans" data-key="${st.key}" data-val="__yd" class="sa-chip on">Set ${SA.yd >= 0 ? '+' : ''}${SA.yd}</button></div>` : ''}`; }
  if (st.kind === 'flags') { const sel = SA.answers.flags || []; body = `<div class="sa-chips">${st.opts.map(o => `<button class="sa-chip ${sel.includes(o) ? 'on' : ''}" data-sa="flag" data-val="${o}">${o}</button>`).join('')}</div>`; }
  el.classList.remove('is-hidden'); el.innerHTML = `<div class="sa-panel"><div class="sa-head"><div class="sa-title">Play ${SA.idx + 1} <span>· ${TNAME[play.type]}</span></div><button class="sa-x" data-sa="close">Dismiss</button></div><div class="sa-label">${st.label}</div>${body}<div class="sa-foot"><button class="primary" data-sa="save">Save play</button><button class="ghost" data-sa="skip">Skip</button></div><div class="sa-note">Every answer is optional — Save keeps what you have. Totals come from these play events, never from stored numbers.</div></div>`;
}
function statTotals(plays) {
  const T = { rush: {}, pass: {}, recv: {}, tkl: {}, def: {}, team: { rushYds: 0, passYds: 0, first: 0, to: 0, penYds: 0, pen: 0 }, any: false };
  const g = (o, n) => o[n] || (o[n] = { n, c: 0, y: 0, td: 0, att: 0, comp: 0, int: 0, solo: 0, ast: 0, sack: 0, tfl: 0, pbu: 0, ff: 0, fr: 0 });
  for (const pl of plays || []) { const a = pl.stat; if (!a || pl.voided) { if (a && a.pteam) { T.any = true; T.team.pen++; if (a.pyards) T.team.penYds += +a.pyards; } continue; } T.any = true; const fl = a.flags || [], yd = a.yards || 0, td = fl.includes('Touchdown') ? 1 : 0; if (fl.includes('First down')) T.team.first++; if (fl.includes('Fumble lost')) T.team.to++; if (a.otype === 'Run' && a.carrier && a.carrier !== 'skip') { const r = g(T.rush, a.carrier); r.c++; r.y += yd; r.td += td; T.team.rushYds += yd; } if (a.otype === 'Pass' && a.passer && a.passer !== 'skip') { const q = g(T.pass, a.passer); q.att++; if (a.presult === 'Complete') { q.comp++; q.y += yd; q.td += td; T.team.passYds += yd; if (a.receiver && a.receiver !== 'skip') { const rc = g(T.recv, a.receiver); rc.c++; rc.y += yd; rc.td += td; } } if (a.presult === 'Interception') { q.int++; T.team.to++; } } if (a.dresult) { const d = g(T.def, a.player === 'skip' ? 0 : a.player); if (a.dresult === 'Tackle') { if (a.tkind === 'Assist') { d.ast++; if (a.player2 && a.player2 !== 'skip') g(T.def, a.player2).ast++; } else d.solo++; } if (a.dresult === 'Sack') d.sack++; if (a.dresult === 'TFL') d.tfl++; if (a.dresult === 'Pass breakup') d.pbu++; if (a.dresult === 'Forced fumble') d.ff++; if (a.dresult === 'Fumble recovery') d.fr++; if (a.dresult === 'Interception') d.int++; } if (a.tackler && a.tackler !== 'skip') g(T.def, a.tackler).solo++; if (a.pteam) { T.team.pen++; if (a.pyards) T.team.penYds += +a.pyards; } }
  return T;
}
