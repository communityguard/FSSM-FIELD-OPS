/* ---------- home ---------- */
const SOON = [
  ['Baseball', '<circle cx="12" cy="12" r="8.5"/><path d="M6.2 6.4c1.6 1.5 2.6 3.5 2.6 5.6s-1 4.1-2.6 5.6M17.8 6.4c-1.6 1.5-2.6 3.5-2.6 5.6s1 4.1 2.6 5.6"/>'],
  ['Basketball', '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6c3.3 3.3 3.3 8.7 0 12M18 6c-3.3 3.3-3.3 8.7 0 12"/>'],
  ['Soccer', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.5 2.5-1.3 4h-4.4l-1.3-4zM12 3.5v4M8.6 14.2l-3.7 1.1M15.4 14.2l3.7 1.1M10.3 18.9l1.7-4.9M13.7 18.9l-1.7-4.9"/>'],
  ['Volleyball', '<circle cx="12" cy="12" r="8.5"/><path d="M12 12c0-3.5 2.6-6.6 6-7.8M12 12c-3 1.8-7 1.6-9.6-.6M12 12c3 1.8 4.4 5.4 3.6 8.8"/>']
];
function renderHome() {
  const gActive = !!S.game;
  const fb = '<img src="https://fssmsports.netlify.app/football-icon.png" alt="Football">';
  $('#view-home').innerHTML = `
    <section class="homehero">
      <div class="heroeyebrow"><span></span> SIDELINE COMMAND CENTER</div>
      <h1>GAME DAY.<br><em>UNDER CONTROL.</em></h1>
      <p>Track mandatory plays, live scoring, personnel, and postgame reporting from one fast sideline workspace.</p>
      <button class="football-launch" data-nav="${gActive ? 'game' : 'roster'}">
        <span class="sport-icon">${fb}</span>
        <span class="launch-copy"><small>${gActive ? 'LIVE GAME' : 'READY TO START'}</small><b>Football</b><span>${gActive ? 'Return to the active game' : 'AYF minimum play tracking + live game tools'}</span></span>
        <span class="launch-arrow">→</span>
      </button>
      <div class="hero-strip"><span>ROSTER</span><i></i><span>LIVE SCORE</span><i></i><span>MPR</span><i></i><span>REPORT</span></div>
      <button id="homeInstallBtn" class="home-install" data-install-app type="button">Install / Add to Home Screen</button>
    </section>
    <section class="coming-block">
      <div class="section-cap"><span>EXPANDING THE PLATFORM</span><small>More sports are on deck</small></div>
      <div class="sportgrid">${SOON.map(([name, icon]) => `<div class="stile soon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg><div><b>${name}</b><small>Coming soon</small></div></div>`).join('')}</div>
    </section>`;
}
