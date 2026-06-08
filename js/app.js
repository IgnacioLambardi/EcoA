// =============================================
//  PUBLIC PORTAL – app.js
// =============================================

// ---- NAV ----
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('mainNav');
  hamburger.addEventListener('click', () => nav.classList.toggle('open'));

  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      showSection(link.dataset.section);
      nav.classList.remove('open');
    });
  });
}

function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('[data-section]').forEach(a => a.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  document.querySelectorAll(`[data-section="${id}"]`).forEach(a => a.classList.add('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- HOME ----
function renderHome() {
  const matches = getMatches();
  const played = matches.filter(m => m.played);
  const wins   = played.filter(m => m.goalsFor > m.goalsAgainst).length;
  const draws  = played.filter(m => m.goalsFor === m.goalsAgainst).length;
  const losses = played.filter(m => m.goalsFor < m.goalsAgainst).length;
  const gf     = played.reduce((s, m) => s + (m.goalsFor  || 0), 0);
  const gc     = played.reduce((s, m) => s + (m.goalsAgainst || 0), 0);

  document.getElementById('stat-pj').textContent = played.length;
  document.getElementById('stat-pg').textContent = wins;
  document.getElementById('stat-pe').textContent = draws;
  document.getElementById('stat-pp').textContent = losses;
  document.getElementById('stat-gf').textContent = gf;
  document.getElementById('stat-gc').textContent = gc;

  // próximo partido
  const upcoming = matches.filter(m => !m.played).sort((a, b) => new Date(a.date) - new Date(b.date));
  const nextEl = document.getElementById('next-match');
  if (upcoming.length) {
    const m = upcoming[0];
    const d = new Date(m.date + 'T00:00:00');
    nextEl.innerHTML = `
      <strong>${m.isHome ? 'Económicas A' : m.opponent}</strong>
      <span style="margin:0 10px;color:var(--muted)">vs</span>
      <strong>${m.isHome ? m.opponent : 'Económicas A'}</strong>
      <span style="margin-left:12px;font-size:13px;color:var(--muted)">${formatDate(d)}</span>
      <span class="match-badge ${m.isHome ? 'badge-home' : 'badge-away'}" style="margin-left:8px">${m.isHome ? 'Local' : 'Visitante'}</span>
    `;
  } else {
    nextEl.textContent = 'Sin partidos programados.';
  }

  // últimos 5 resultados
  const last5 = played.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const l5El = document.getElementById('last5');
  l5El.innerHTML = last5.map(m => {
    const res = m.goalsFor > m.goalsAgainst ? 'G' : m.goalsFor === m.goalsAgainst ? 'E' : 'P';
    const cls = res === 'G' ? 'badge-w' : res === 'E' ? 'badge-d' : 'badge-l';
    return `<span class="match-badge ${cls}" style="padding:5px 10px;border-radius:6px;font-size:13px;">${res} ${m.goalsFor}-${m.goalsAgainst} vs ${m.opponent}</span>`;
  }).join('') || '<span style="color:var(--muted);font-size:14px">Sin partidos jugados aún.</span>';
}

// ---- PARTIDOS ----
function renderMatches() {
  const matches = getMatches().sort((a, b) => {
    const ja = a.jornada || 9999, jb = b.jornada || 9999;
    if (ja !== jb) return jb - ja;
    return new Date(b.date) - new Date(a.date);
  });

  const el = document.getElementById('match-list');
  if (!matches.length) {
    el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:30px">No hay partidos cargados aún.</p>';
    return;
  }

  // Agrupar por jornada
  const groups = {};
  matches.forEach(m => {
    const key = m.jornada ? String(m.jornada) : '__sin__';
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });

  const keys = Object.keys(groups).sort((a, b) => {
    if (a === '__sin__') return 1;
    if (b === '__sin__') return -1;
    return Number(b) - Number(a);
  });

  el.innerHTML = keys.map(key => {
    const header = key !== '__sin__'
      ? `<div class="jornada-header">Fecha ${key}</div>`
      : '';
    return header + groups[key].map(renderMatchItem).join('');
  }).join('');
}

function renderMatchItem(m) {
  const d = new Date(m.date + 'T00:00:00');
  const homeTeam = m.isHome ? 'Económicas A' : m.opponent;
  const awayTeam = m.isHome ? m.opponent : 'Económicas A';
  let score, resultBadge = '';
  if (m.played) {
    const gH = m.isHome ? m.goalsFor : m.goalsAgainst;
    const gA = m.isHome ? m.goalsAgainst : m.goalsFor;
    score = `<div class="match-score">${gH} - ${gA}</div>`;
    const res = m.goalsFor > m.goalsAgainst
      ? '<span class="match-badge badge-w">Ganado</span>'
      : m.goalsFor === m.goalsAgainst
        ? '<span class="match-badge badge-d">Empate</span>'
        : '<span class="match-badge badge-l">Perdido</span>';
    resultBadge = res;
  } else {
    score = `<div class="match-score pending">vs</div>`;
  }
  return `
    <div class="match-item" onclick="openMatchModal('${m.id}')">
      <div class="match-date">
        <strong>${d.getDate()}</strong>
        ${monthShort(d)}<br>${d.getFullYear()}
      </div>
      <div class="match-teams">
        <span>${homeTeam}</span>
        ${score}
        <span>${awayTeam}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <span class="match-badge ${m.isHome ? 'badge-home' : 'badge-away'}">${m.isHome ? 'Local' : 'Visitante'}</span>
        ${resultBadge}
      </div>
    </div>
  `;
}

// ---- MATCH MODAL ----
function openMatchModal(id) {
  const m = getMatches().find(m => m.id === id);
  if (!m) return;
  const players = getPlayers();
  const d = new Date(m.date + 'T00:00:00');
  const captain = players.find(p => p.id === m.captainId);

  let html = `
    <div class="modal-header">
      <h3>⚽ Económicas A ${m.played ? (m.goalsFor + ' – ' + m.goalsAgainst) : 'vs'} ${m.opponent}</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="font-size:13px;color:var(--muted);margin-bottom:16px">
        ${m.jornada ? `<strong style="color:var(--blue)">Fecha ${m.jornada}</strong> &nbsp;·&nbsp; ` : ''}${formatDate(d)} · ${m.isHome ? 'Local' : 'Visitante'}
      </div>
  `;

  // Alineación en el campo
  if (m.formation && m.lineup && m.lineup.some(id => id)) {
    html += `<div class="section-label">Alineación – ${m.formation}</div>`;
    html += buildPitchHTML(m.formation, m.lineup, players);
  }

  // Cambios
  const subs = (m.subs || []).filter(s => s.inId || s.outId).sort((a, b) => (a.minute || 0) - (b.minute || 0));
  if (subs.length) {
    html += `<div class="section-label">🔄 Cambios</div><div class="subs-list">`;
    subs.forEach(s => {
      const pIn  = players.find(p => p.id === s.inId);
      const pOut = players.find(p => p.id === s.outId);
      html += `
        <div class="sub-item">
          <span class="sub-min">${s.minute || '?'}'</span>
          <span class="sub-in">⬆ ${pIn  ? pIn.name  : '?'}</span>
          <span style="color:var(--muted);font-size:12px">por</span>
          <span class="sub-out">⬇ ${pOut ? pOut.name : '?'}</span>
        </div>`;
    });
    html += '</div>';
  }

  // Convocados
  const convocados = (m.convocados || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  if (convocados.length) {
    html += `<div class="section-label">Convocados</div><div class="player-chips">`;
    convocados.forEach(p => {
      const isCap = captain && p.id === captain.id;
      html += `<span class="chip ${isCap ? 'captain' : ''}"><span class="num">${p.number}</span> ${p.name}</span>`;
    });
    html += '</div>';
  }

  // Goles
  const scorers = (m.scorers || []).filter(s => s.goals > 0);
  if (scorers.length) {
    html += `<div class="section-label">⚽ Goles</div><div class="player-chips">`;
    scorers.forEach(s => {
      const p = players.find(x => x.id === s.id);
      if (p) html += `<span class="chip"><span class="num">${p.number}</span> ${p.name} × ${s.goals}</span>`;
    });
    html += '</div>';
  }

  // Asistencias
  const assists = (m.assists || []).filter(a => a.assists > 0);
  if (assists.length) {
    html += `<div class="section-label">🎯 Asistencias</div><div class="player-chips">`;
    assists.forEach(a => {
      const p = players.find(x => x.id === a.id);
      if (p) html += `<span class="chip"><span class="num">${p.number}</span> ${p.name} × ${a.assists}</span>`;
    });
    html += '</div>';
  }

  html += '</div>';
  document.getElementById('match-modal').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
}

function buildPitchHTML(formation, lineup, players) {
  const slots = FORMATIONS[formation];
  if (!slots) return '';

  const dots = slots.map((slot, i) => {
    const p = players.find(x => x.id === lineup[i]);
    if (!p) return '';
    // Si tiene apodo entre comillas, usarlo; si no, primer apellido (última palabra)
    const nickname = p.name.match(/"([^"]+)"/);
    const displayName = nickname
      ? nickname[1]
      : p.name.trim().split(/\s+/).slice(-1)[0];
    return `<div class="pitch-player" style="left:${100 - slot.x}%;top:${slot.y}%">
      <div class="p-num">${p.number || '?'}</div>
      <div class="p-name">${displayName}</div>
    </div>`;
  }).join('');

  const L = 'rgba(255,255,255,.62)';
  const sw = '.7';
  return `<div class="pitch-field">
    <svg class="pitch-lines" viewBox="0 0 100 145" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Borde del campo -->
      <rect x="1" y="1" width="98" height="143" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Línea de medio campo -->
      <line x1="1" y1="72.5" x2="99" y2="72.5" stroke="${L}" stroke-width="${sw}"/>
      <!-- Círculo central -->
      <circle cx="50" cy="72.5" r="10" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Punto central -->
      <circle cx="50" cy="72.5" r=".9" fill="${L}"/>
      <!-- Área grande arriba -->
      <rect x="20" y="1" width="60" height="19" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Área chica arriba -->
      <rect x="34" y="1" width="32" height="8" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Punto penal arriba -->
      <circle cx="50" cy="15" r=".9" fill="${L}"/>
      <!-- Arco área arriba (semicírculo — curva hacia afuera del área) -->
      <path d="M 34 20 A 12 12 0 0 0 66 20" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Área grande abajo -->
      <rect x="20" y="125" width="60" height="19" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Área chica abajo -->
      <rect x="34" y="137" width="32" height="7" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Punto penal abajo -->
      <circle cx="50" cy="130" r=".9" fill="${L}"/>
      <!-- Arco área abajo (curva hacia afuera del área) -->
      <path d="M 34 125 A 12 12 0 0 1 66 125" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <!-- Córners (arcos pequeños) -->
      <path d="M 1 5 A 4 4 0 0 1 5 1"   fill="none" stroke="${L}" stroke-width="${sw}"/>
      <path d="M 95 1 A 4 4 0 0 1 99 5" fill="none" stroke="${L}" stroke-width="${sw}"/>
      <path d="M 1 140 A 4 4 0 0 0 5 144"  fill="none" stroke="${L}" stroke-width="${sw}"/>
      <path d="M 95 144 A 4 4 0 0 0 99 140" fill="none" stroke="${L}" stroke-width="${sw}"/>
    </svg>
    ${dots}
  </div>`;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ---- SCORERS & ASSISTS ----
function renderScorers() {
  const scorers = getTopScorers();
  const el = document.getElementById('scorers-table');
  if (!scorers.length) {
    el.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">Sin datos aún.</td></tr>';
    return;
  }
  el.innerHTML = scorers.map((s, i) => `
    <tr ${i === 0 ? 'class="highlight-row"' : ''}>
      <td><span class="pos-badge ${i < 3 ? 'pos-' + (i + 1) : ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</span></td>
      <td><strong>${s.name}</strong></td>
      <td class="td-center">${s.number}</td>
      <td class="td-center"><strong>${s.goals}</strong></td>
    </tr>
  `).join('');
}

function renderAssists() {
  const assists = getTopAssists();
  const el = document.getElementById('assists-table');
  if (!assists.length) {
    el.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px">Sin datos aún.</td></tr>';
    return;
  }
  el.innerHTML = assists.map((a, i) => `
    <tr ${i === 0 ? 'class="highlight-row"' : ''}>
      <td><span class="pos-badge ${i < 3 ? 'pos-' + (i + 1) : ''}">${i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}</span></td>
      <td><strong>${a.name}</strong></td>
      <td class="td-center">${a.number}</td>
      <td class="td-center"><strong>${a.assists}</strong></td>
    </tr>
  `).join('');
}

function setActiveStats(tab) {
  document.querySelectorAll('.stats-tab').forEach(b => b.classList.toggle('active', b.dataset.stats === tab));
  document.getElementById('stats-panel-scorers').style.display = tab === 'scorers' ? 'block' : 'none';
  document.getElementById('stats-panel-assists').style.display = tab === 'assists'  ? 'block' : 'none';
}

// ---- STANDINGS ----
let activeZona = 'zona1';

function renderStandings() {
  const standings = getStandings();
  const allZM     = getZoneMatches();

  ['zona1', 'zona2'].forEach(z => {
    // ── Tabla de posiciones ──
    const rows = standings[z];
    document.getElementById('table-' + z).innerHTML = rows.map((t, i) => {
      const isEco = t.team === 'Económicas A';
      return `
        <tr ${isEco ? 'class="highlight-row"' : ''}>
          <td><span class="pos-badge ${i < 3 ? 'pos-' + (i + 1) : ''}">${i + 1}</span></td>
          <td>${t.team}</td>
          <td class="td-center">${t.pj}</td>
          <td class="td-center">${t.pg}</td>
          <td class="td-center">${t.pe}</td>
          <td class="td-center">${t.pp}</td>
          <td class="td-center">${t.gf}</td>
          <td class="td-center">${t.gc}</td>
          <td class="td-center">${t.gf - t.gc >= 0 ? '+' : ''}${t.gf - t.gc}</td>
          <td class="td-center"><strong>${t.pts}</strong></td>
        </tr>`;
    }).join('');

    // ── Resultados por fecha ──
    const zoneMatches = allZM.filter(m => m.zona === z);
    const resultsEl   = document.getElementById('results-' + z);
    if (!resultsEl) return;

    if (!zoneMatches.length) {
      resultsEl.innerHTML = '';
      return;
    }

    // Agrupar por jornada
    const byJ = {};
    zoneMatches.forEach(m => {
      const j = m.jornada || 0;
      if (!byJ[j]) byJ[j] = [];
      byJ[j].push(m);
    });

    const statusLabel = {
      played:    null,          // se muestra el resultado numérico
      no_show:   'W.O.',
      suspended: '⛔ Susp.',
      postponed: '📅 Pospuesto',
      pending:   'Pendiente',
    };

    let html = '<div class="results-section">';
    Object.keys(byJ).map(Number).sort((a,b)=>a-b).forEach(j => {
      html += `<div class="results-fecha-header">Fecha ${j || '?'}</div>`;
      byJ[j].forEach(m => {
        const st = m.status || (m.played ? 'played' : 'pending');
        let scoreHTML;
        if (st === 'played') {
          scoreHTML = `<span class="res-score">${m.goalsHome} – ${m.goalsAway}</span>`;
        } else if (st === 'no_show') {
          const who = m.noShowTeam === 'home' ? m.homeTeam : m.awayTeam;
          scoreHTML = `<span class="res-badge res-wo">W.O.</span><span class="res-noshow-label">${who} no se presentó</span>`;
        } else {
          scoreHTML = `<span class="res-badge res-${st}">${statusLabel[st] || st}</span>`;
        }
        html += `
          <div class="result-row">
            <span class="res-team res-home">${m.homeTeam}</span>
            ${scoreHTML}
            <span class="res-team res-away">${m.awayTeam}</span>
          </div>`;
      });
    });
    html += '</div>';
    resultsEl.innerHTML = html;
  });

  setActiveZona(activeZona);
}

function setActiveZona(z) {
  activeZona = z;
  document.querySelectorAll('.zona-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.tab-btn[data-zona]').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + z).style.display = 'block';
  document.querySelector(`[data-zona="${z}"]`).classList.add('active');
}

// ---- UTILS ----
function formatDate(d) {
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function monthShort(d) {
  return d.toLocaleDateString('es-AR', { month: 'short' });
}

// ---- INIT ----
function _removedProfile() {
  const myId = getMyPlayerId();
  const container = document.getElementById('profile-content');
  if (!container) return;

  if (!myId) {
    renderProfileSelector(container);
    return;
  }

  const p = getPlayers().find(x => x.id === myId);
  if (!p) { setMyPlayerId(null); renderProfileSelector(container); return; }

  const stats = getPlayerStats(myId);
  const avatarContent = p.photo
    ? `<img src="${p.photo}" alt="${p.name}"><div class="avatar-overlay">📷</div>`
    : `<span>${p.number || '?'}</span><div class="avatar-overlay">📷</div>`;

  container.innerHTML = `
    <!-- Tarjeta principal -->
    <div class="profile-card">
      <div class="profile-avatar" onclick="document.getElementById('photo-upload').click()" title="Cambiar foto">
        ${avatarContent}
        <input type="file" id="photo-upload" accept="image/*" style="display:none" onchange="handlePhotoUpload(event)">
      </div>
      <div class="profile-info">
        <h2>${p.name}</h2>
        <div class="profile-sub">#${p.number || '—'} · ${p.position || 'Sin posición'}</div>
        <div style="margin-top:8px;font-size:11px;color:#aac4ff">Tocá la foto para cambiarla</div>
      </div>
    </div>

    <!-- Estadísticas -->
    <div class="profile-stat-grid">
      <div class="profile-stat card-blue">
        <div class="ps-value">${stats.pj}</div>
        <div class="ps-label">Partidos</div>
      </div>
      <div class="profile-stat card-green">
        <div class="ps-value" style="color:#16a34a">${stats.goals}</div>
        <div class="ps-label">⚽ Goles</div>
      </div>
      <div class="profile-stat card-blue">
        <div class="ps-value">${stats.assists}</div>
        <div class="ps-label">🎯 Asistencias</div>
      </div>
      <div class="profile-stat card-yellow">
        <div class="ps-value" style="color:#d97706">${stats.yellows}</div>
        <div class="ps-label">🟡 Amarillas</div>
      </div>
      <div class="profile-stat card-red">
        <div class="ps-value" style="color:#dc2626">${stats.reds}</div>
        <div class="ps-label">🔴 Rojas</div>
      </div>
    </div>

    <!-- Editar datos -->
    <div class="card">
      <div class="card-header"><span class="icon">✏️</span> Editar mis datos</div>
      <div class="card-body">
        <div class="form-row" style="gap:12px;flex-wrap:wrap">
          <div style="flex:2;min-width:180px">
            <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Nombre completo</label>
            <input id="profile-name" type="text" value="${p.name}"
              style="width:100%;margin-top:6px;padding:10px 12px;border:2px solid var(--border);border-radius:8px;font-size:15px;outline:none"
              onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border)'">
          </div>
          <div style="flex:0 0 90px">
            <label style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Camiseta</label>
            <input id="profile-number" type="number" min="1" max="99" value="${p.number || ''}"
              style="width:100%;margin-top:6px;padding:10px 12px;border:2px solid var(--border);border-radius:8px;font-size:15px;outline:none;text-align:center"
              onfocus="this.style.borderColor='var(--blue)'" onblur="this.style.borderColor='var(--border)'">
          </div>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
          <button onclick="saveMyProfile()"
            style="padding:10px 22px;background:var(--blue);color:var(--gold);border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer">
            💾 Guardar cambios
          </button>
          <button onclick="setMyPlayerId(null);renderProfile()"
            style="padding:10px 16px;background:#f3f4f6;color:var(--muted);border:1px solid var(--border);border-radius:8px;font-size:13px;cursor:pointer">
            🔄 No soy yo — cambiar jugador
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderProfileSelector(container) {
  const players = getPlayers().sort((a, b) => (a.number || 0) - (b.number || 0));
  container.innerHTML = `
    <div class="hero" style="margin-bottom:24px">
      <div>
        <h1 style="font-size:22px">👤 Mi Perfil</h1>
        <p style="margin-top:6px">¿Cuál es tu jugador? Elegite de la lista.</p>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="icon">👥</span> Seleccioná tu jugador</div>
      <div class="card-body">
        ${players.length ? `<div class="player-selector-grid">
          ${players.map(p => `
            <button class="player-selector-btn" onclick="selectMyPlayer('${p.id}')">
              <span class="player-selector-num">${p.number || '?'}</span>
              ${p.name}
              ${p.position ? `<span style="margin-left:auto;font-size:12px;color:var(--muted);font-weight:400">${p.position}</span>` : ''}
            </button>
          `).join('')}
        </div>` : '<p style="color:var(--muted);text-align:center;padding:20px">No hay jugadores cargados aún. Pedile al profe que los agregue desde el Admin.</p>'}
      </div>
    </div>
  `;
}

function selectMyPlayer(id) {
  setMyPlayerId(id);
  renderProfile();
}

function saveMyProfile() {
  const myId = getMyPlayerId();
  if (!myId) return;
  const p = getPlayers().find(x => x.id === myId);
  if (!p) return;
  const name = document.getElementById('profile-name')?.value.trim();
  const number = parseInt(document.getElementById('profile-number')?.value) || 0;
  if (!name) { alert('El nombre no puede estar vacío.'); return; }
  p.name = name;
  p.number = number;
  savePlayer(p);
  renderProfile();
  renderHome(); renderScorers(); renderAssists(); renderMatches();
  // feedback
  const btn = document.querySelector('[onclick="saveMyProfile()"]');
  if (btn) { btn.textContent = '✅ Guardado'; setTimeout(() => { btn.innerHTML = '💾 Guardar cambios'; }, 1500); }
}

function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { alert('La imagen no puede superar 3MB.'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const myId = getMyPlayerId();
    const p = getPlayers().find(x => x.id === myId);
    if (!p) return;
    p.photo = e.target.result;
    savePlayer(p);
    renderProfile();
  };
  reader.readAsDataURL(file);
}

// ---- EDITAR NOMBRE (portal público) ----
let _editingPlayerId = null;

function openNameModal() {
  const players = getPlayers().sort((a, b) => (a.number || 0) - (b.number || 0));
  const list = document.getElementById('name-player-list');

  if (!players.length) {
    list.innerHTML = '<p style="color:var(--muted);text-align:center;font-size:13px">No hay jugadores cargados aún.</p>';
  } else {
    list.innerHTML = players.map(p => `
      <button onclick="selectPlayerToEdit('${p.id}')"
        style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;background:#f5f7ff;border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;transition:background .15s"
        onmouseover="this.style.background='#e8eeff'" onmouseout="this.style.background='#f5f7ff'">
        <span style="background:var(--gold);color:var(--blue);border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0">${p.number || '?'}</span>
        <span style="font-weight:600;color:var(--blue)">${p.name}</span>
      </button>
    `).join('');
  }

  document.getElementById('name-edit-form').style.display = 'none';
  _editingPlayerId = null;
  document.getElementById('name-modal-overlay').style.display = 'flex';
}

function selectPlayerToEdit(id) {
  const p = getPlayers().find(x => x.id === id);
  if (!p) return;
  _editingPlayerId = id;
  const input = document.getElementById('name-edit-input');
  input.value = p.name;
  document.getElementById('name-edit-form').style.display = 'block';
  setTimeout(() => input.focus(), 50);
}

function savePlayerName() {
  if (!_editingPlayerId) return;
  const name = document.getElementById('name-edit-input').value.trim();
  if (!name) { alert('El nombre no puede estar vacío.'); return; }
  const players = getPlayers();
  const p = players.find(x => x.id === _editingPlayerId);
  if (!p) return;
  p.name = name;
  savePlayer(p);
  closeNameModal();
  renderHome();
  renderScorers();
  renderAssists();
  renderMatches();
}

function cancelEditName() {
  document.getElementById('name-edit-form').style.display = 'none';
  _editingPlayerId = null;
}

function closeNameModal() {
  document.getElementById('name-modal-overlay').style.display = 'none';
  document.getElementById('name-edit-form').style.display = 'none';
  _editingPlayerId = null;
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  renderHome();
  renderMatches();
  renderScorers();
  renderAssists();
  renderStandings();

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  document.querySelectorAll('.tab-btn[data-zona]').forEach(b => {
    b.addEventListener('click', () => setActiveZona(b.dataset.zona));
  });

  document.querySelectorAll('.stats-tab').forEach(b => {
    b.addEventListener('click', () => setActiveStats(b.dataset.stats));
  });

  showSection('home');
});
