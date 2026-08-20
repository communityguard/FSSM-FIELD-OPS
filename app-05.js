/* ---------- views ---------- */
let VIEW = S.game ? 'game' : 'home';

function renderHeader() {
  const tag = $('#hdrTag');
  if (tag) tag.textContent = VIEW === 'home' ? 'Future Sports Stars Media' : 'Football · AYF Field Operations';
  const el = $('#hdrChip');
  if (S.game) el.innerHTML = `<span class="chip em">Q${S.game.quarter} · play ${S.game.plays.length}</span>`;
  else el.innerHTML = `<span class="chip">No game</span>`;
  window.FSSMCloud?.updateBadge?.();
  const dot = $('#navDot');
  const un = S.game ? unmetPlayers().length : 0;
  if (S.game && un > 0) { dot.className = 'ndot'; dot.textContent = un; }
  else { dot.className = ''; dot.textContent = ''; }
}

function statusLabel(s) { return { active: 'Active', absent: 'Absent', injured: 'Injured', exempt: 'Exempt' }[s] || s; }
