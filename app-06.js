/* ---------- ball placement ---------- */
const BP = { open: false, side: null, range: null };
function fpText(v) {
  if (v == null) return 'NOT SET';
  if (v <= 0) return 'OUR GOAL';
  if (v >= 100) return 'OPP GOAL';
  if (v === 50) return '50';
  return v < 50 ? `OWN ${v}` : `OPP ${100 - v}`;
}
function ddText(fp) {
  if (!fp || fp.down == null || fp.spot == null) return '';
  const gtg = fp.firstAt != null && (fp.theirs ? fp.firstAt <= 0 : fp.firstAt >= 100);
  const o = ['1ST', '2ND', '3RD', '4TH'][fp.down - 1] || fp.down + 'TH';
  return `${o} & ${gtg ? 'GOAL' : fp.dist}`;
}
function fpNewSeries(g, spot, theirs) {
  theirs = !!theirs;
  const dist = Math.min(10, theirs ? spot : 100 - spot);
  g.fp = { spot, down: 1, dist, firstAt: theirs ? spot - dist : spot + dist, theirs, lastSpot: spot };
}
function fpAim(fp) { return fp.theirs ? fp.spot - fp.dist : fp.spot + fp.dist; }

function fieldSVG(g) {
  const fp = g.fp || {};
  const flip = !!g.fieldFlip;
  const X0 = 80, X1 = 920, W = 1000, H = 440;
  const raw = v => X0 + (Math.max(0, Math.min(100, v)) * (X1 - X0) / 100);
  const px = v => flip ? W - raw(v) : raw(v);
  const weBall = (fp.down != null) ? !fp.theirs : (!g.sel || !g.sel.type || ['offense', 'kickret', 'puntret', 'fg'].includes(g.sel.type));
  const dir = (weBall ? 1 : -1) * (flip ? -1 : 1);
  const cy = H / 2;
  let sv = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Field position">`;
  sv += `<rect width="${W}" height="${H}" fill="#08130D"/>`;
  for (let i = 0; i < 10; i++) sv += `<rect x="${X0 + i * 84}" y="24" width="84" height="${H - 48}" fill="${i % 2 ? '#0E2418' : '#10291B'}"/>`;
  sv += `<rect x="0" y="24" width="${X0}" height="${H - 48}" fill="#0A2A18"/><rect x="${X1}" y="24" width="${W - X1}" height="${H - 48}" fill="#0A2A18"/>`;
  sv += `<rect x="${X0 - 3}" y="24" width="3" height="${H - 48}" fill="#C7FF3D" opacity=".7"/><rect x="${X1}" y="24" width="3" height="${H - 48}" fill="#C7FF3D" opacity=".7"/>`;
  for (let yd = 10; yd <= 90; yd += 10) {
    const x = raw(yd);
    sv += `<line x1="${x}" y1="24" x2="${x}" y2="${H - 24}" stroke="${yd === 50 ? 'rgba(199,255,61,.5)' : 'rgba(255,255,255,.14)'}" stroke-width="${yd === 50 ? 3 : 2}"/>`;
    sv += `<text x="${x}" y="${H - 42}" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-size="24" font-weight="800" fill="rgba(220,231,223,.4)">${yd <= 50 ? yd : 100 - yd}</text>`;
  }
  for (let yd = 5; yd < 100; yd += 5) {
    const x = raw(yd);
    sv += `<line x1="${x}" y1="128" x2="${x}" y2="142" stroke="rgba(255,255,255,.10)" stroke-width="2"/><line x1="${x}" y1="${H - 142}" x2="${x}" y2="${H - 128}" stroke="rgba(255,255,255,.10)" stroke-width="2"/>`;
  }
  const ez = (x, label, rot) => `<text x="${x}" y="${cy}" text-anchor="middle" transform="rotate(${rot} ${x} ${cy})" font-family="'Barlow Condensed',sans-serif" font-size="30" font-weight="900" letter-spacing="3" fill="rgba(199,255,61,.55)">${label}</text>`;
  const ourName = esc((g.team || 'HOME').toUpperCase()).slice(0, 12);
  const oppName = esc((g.opp || 'VISITOR').toUpperCase()).slice(0, 12);
  sv += ez(X0 / 2, flip ? oppName : ourName, -90);
  sv += ez(X1 + (W - X1) / 2, flip ? ourName : oppName, 90);
  if (fp.spot == null) {
    sv += `<text x="${W / 2}" y="${cy + 8}" text-anchor="middle" font-family="'Inter',sans-serif" font-size="18" font-weight="800" letter-spacing="3" fill="rgba(150,168,158,.8)">SET THE BALL SPOT TO LIGHT UP THE FIELD</text></svg>`;
    return sv;
  }
  if (fp.firstAt != null && fp.firstAt > 0 && fp.firstAt < 100) {
    const fx = px(fp.firstAt);
    sv += `<line x1="${fx}" y1="24" x2="${fx}" y2="${H - 24}" stroke="#FFD34D" stroke-width="4" opacity=".85"/>`;
  }
  const bx = px(fp.spot);
  const clamp = x => Math.max(16, Math.min(W - 16, x));
  const O = (x, y) => `<circle cx="${clamp(x)}" cy="${y}" r="13" fill="none" stroke="#E9F0EB" stroke-width="4" opacity=".9"/>`;
  const Xm = (x, y) => `<text x="${clamp(x)}" y="${y + 10}" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-size="32" font-weight="900" fill="#C7FF3D" opacity=".92">X</text>`;
  const oS = -dir, dS = dir;
  [-100, -50, 0, 50, 100].forEach(k => sv += O(bx + oS * 34, cy + k));
  [-45, 45].forEach(k => sv += O(bx + oS * 82, cy + k));
  [-80, -27, 27, 80].forEach(k => sv += Xm(bx + dS * 34, cy + k));
  [-45, 45].forEach(k => sv += Xm(bx + dS * 80, cy + k));
  sv += Xm(bx + dS * 128, cy);
  sv += `<ellipse cx="${bx}" cy="${cy}" rx="24" ry="15" fill="rgba(199,255,61,.22)"/>`;
  sv += `<ellipse cx="${bx}" cy="${cy}" rx="15" ry="9" fill="#C7FF3D" transform="rotate(-18 ${bx} ${cy})"/>`;
  sv += `<line x1="${bx - 6}" y1="${cy}" x2="${bx + 6}" y2="${cy}" stroke="#07100D" stroke-width="2" transform="rotate(-18 ${bx} ${cy})"/>`;
  const ay = cy - 44, ax = bx + dir * 8;
  sv += `<polygon points="${ax},${ay - 8} ${ax + dir * 18},${ay} ${ax},${ay + 8}" fill="#C7FF3D" opacity=".8"/>`;
  const lab = `${ddText(fp) ? ddText(fp) + ' · ' : ''}${fpText(fp.spot)}`;
  sv += `<rect x="${W / 2 - 132}" y="30" width="264" height="38" rx="5" fill="rgba(5,12,9,.85)" stroke="rgba(199,255,61,.35)"/>`;
  sv += `<text x="${W / 2}" y="57" text-anchor="middle" font-family="'Barlow Condensed',sans-serif" font-size="26" font-weight="900" letter-spacing="2" fill="#C7FF3D">${esc(lab)}</text>`;
  return sv + '</svg>';
}
