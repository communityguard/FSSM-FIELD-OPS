/* ---------- celebration ---------- */
const CEL = { t: null };
function celebrate(title, sub, score) {
  const el = document.getElementById('celebrate'); if (!el) return;
  el.innerHTML = `<div class="cel-card">
    <span class="cel-kicker">FSSM Field Ops</span>
    <b class="cel-title">${esc(title)}</b>
    ${sub ? `<span class="cel-sub">${esc(sub)}</span>` : ''}
    ${score ? `<span class="cel-score">${esc(score)}</span>` : ''}
    <span class="cel-hint">Tap to dismiss</span>
  </div>`;
  el.classList.remove('is-hidden');
  clearTimeout(CEL.t);
  CEL.t = setTimeout(() => el.classList.add('is-hidden'), 10000);
}
function pushScore(g, side, pts, q) {
  g.scoreEvents.push({ side, pts, q, t: Date.now() });
  const name = side === 'us' ? (g.team || 'Us') : (g.opp || 'Them');
  if (pts === 6) celebrate('Touchdown', name);
  if (pts === 3) celebrate('Field goal', name);
}
