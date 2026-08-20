/* ---------- AYF rules ---------- */
function fieldNeed() { return Math.min(11, S.roster.filter(p => p.status === 'active' || p.status === 'exempt').length); }
function participating() { return S.roster.filter(p => p.status === 'active' || p.status === 'exempt'); }
function activeOnly() { return S.roster.filter(p => p.status === 'active'); }
function chartRequired(n) {
  if (n >= 31 && n <= 36) return 4;
  if (n >= 26 && n <= 30) return 6;
  if (n >= 16 && n <= 25) return 8;
  return n > 36 ? 4 : 8;
}
function inChart(n) { return n >= 16 && n <= 36; }
