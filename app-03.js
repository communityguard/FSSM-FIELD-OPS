/* ---------- counts ---------- */
function counts(game) {
  const total = {}, q3 = {};
  if (!game) return { total, q3 };
  for (const pl of game.plays) {
    if (pl.voided) continue;
    for (const id of pl.ids) {
      total[id] = (total[id] || 0) + 1;
      if (pl.q <= 3) q3[id] = (q3[id] || 0) + 1;
    }
  }
  return { total, q3 };
}
function unmetPlayers() {
  if (!S.game) return [];
  const { total } = counts(S.game);
  return activeOnly().filter(p => (total[p.id] || 0) < S.game.required);
}
function tone(p, total, req) {
  if (p.status === 'exempt') return 'am';
  const c = total[p.id] || 0;
  if (c >= req) return 'em';
  return (req - c) <= 2 ? 'gd' : 'rb';
}
