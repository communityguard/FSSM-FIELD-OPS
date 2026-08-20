/* ---------- score ---------- */
function scoreOf(g) {
  const r = { us: 0, them: 0, byQ: { us: [0, 0, 0, 0], them: [0, 0, 0, 0] } };
  if (!g || !g.scoreEvents) return r;
  for (const ev of g.scoreEvents) {
    r[ev.side] += ev.pts;
    if (ev.q >= 1 && ev.q <= 4) r.byQ[ev.side][ev.q - 1] += ev.pts;
  }
  return r;
}
