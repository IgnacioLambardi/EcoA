// =============================================
//  ADMIN PANEL – admin.js
// =============================================

const ADMIN_PASS = 'AdminEco';

// ---- AUTH ----
function checkAuth() {
  if (sessionStorage.getItem('ecoa_admin') !== '1') {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
  } else {
    showAdmin();
  }
}

function login() {
  const pw = document.getElementById('pw-input').value;
  if (pw === ADMIN_PASS) {
    sessionStorage.setItem('ecoa_admin', '1');
    showAdmin();
  } else {
    document.getElementById('login-error').textContent = 'Contraseña incorrecta.';
  }
}

function logout() {
  sessionStorage.removeItem('ecoa_admin');
  location.reload();
}

function publicarPortal() {
  const db = loadDB();
  db._version = Date.now(); // marca de tiempo → permite detectar publicación más nueva
  const contenido = `// Este archivo es generado automáticamente desde el Panel de Administración.
// No lo edites a mano. Usá el botón "Publicar" del admin para actualizarlo.
// Última publicación: ${new Date().toLocaleString('es-AR')}
const EXPORTED_DATA = ${JSON.stringify(db, null, 2)};
`;
  const blob = new Blob([contenido], { type: 'application/javascript' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'db-export.js';
  a.click();
  URL.revokeObjectURL(url);

  // Mostrar instrucciones
  document.getElementById('publish-instructions').style.display = 'block';
}

function showAdmin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'block';
  // Si no hay datos en localStorage todavía, seedear desde EXPORTED_DATA
  _ensureLocalDB();
  initAdmin();
}

function _ensureLocalDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw && typeof EXPORTED_DATA !== 'undefined' && EXPORTED_DATA !== null) {
      localStorage.setItem(DB_KEY, JSON.stringify(EXPORTED_DATA));
    }
  } catch {}
}

function resetLocalDB() {
  if (!confirm('¿Resetear datos locales y cargar la última versión publicada?\n\nPerdés los cambios no publicados.')) return;
  if (typeof EXPORTED_DATA !== 'undefined' && EXPORTED_DATA !== null) {
    localStorage.setItem(DB_KEY, JSON.stringify(EXPORTED_DATA));
    alert('✅ Datos reseteados. Recargando...');
    location.reload();
  } else {
    alert('No hay datos publicados para cargar.');
  }
}

// ---- INIT ----
function initAdmin() {
  renderAdminSection('players');
  document.querySelectorAll('[data-admin-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-admin-section]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAdminSection(btn.dataset.adminSection);
    });
  });
}

function renderAdminSection(sec) {
  const content = document.getElementById('admin-content');
  document.querySelectorAll('[data-admin-section]').forEach(b =>
    b.classList.toggle('active', b.dataset.adminSection === sec)
  );
  try {
    if (sec === 'players')        renderPlayersAdmin(content);
    else if (sec === 'matches')   renderMatchesAdmin(content);
    else if (sec === 'standings') renderStandingsAdmin(content);
  } catch(e) {
    content.innerHTML = `<div style="padding:20px;color:#dc2626;background:#fee2e2;border-radius:8px;margin:20px">
      <strong>Error al cargar sección "${sec}":</strong><br><code>${e.message}</code>
    </div>`;
    console.error('renderAdminSection error:', e);
  }
}

// ---- Escape para atributos HTML ----
function escAttr(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// =============================================
//  PLAYERS
// =============================================
function renderPlayersAdmin(container) {
  const players = getPlayers().sort((a, b) => (a.number || 0) - (b.number || 0));
  container.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <span>👥 Plantilla</span>
        <button class="btn-primary" onclick="openPlayerForm()">+ Agregar jugador</button>
      </div>
      <div id="player-form-area"></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Nombre</th><th>Posición</th><th>Acciones</th></tr></thead>
          <tbody id="players-tbody">
            ${players.length ? players.map(p => `
              <tr>
                <td class="td-center"><strong>${p.number}</strong></td>
                <td>${p.name}</td>
                <td>${p.position || '—'}</td>
                <td>
                  <button class="btn-sm btn-edit" onclick="openPlayerForm('${p.id}')">Editar</button>
                  <button class="btn-sm btn-del"  onclick="confirmDeletePlayer('${p.id}')">Eliminar</button>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">Sin jugadores cargados.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openPlayerForm(id) {
  const p = id ? getPlayers().find(x => x.id === id) : null;
  document.getElementById('player-form-area').innerHTML = `
    <div class="inline-form">
      <h4>${p ? 'Editar jugador' : 'Nuevo jugador'}</h4>
      <div class="form-row">
        <div class="form-group">
          <label>Nombre *</label>
          <input id="pf-name" type="text" value="${escAttr(p?.name || '')}" placeholder="Nombre completo">
        </div>
        <div class="form-group" style="max-width:90px">
          <label>Número</label>
          <input id="pf-number" type="number" min="1" max="99" value="${p?.number || ''}">
        </div>
        <div class="form-group">
          <label>Posición</label>
          <select id="pf-pos">
            ${['Arquero','Defensor','Mediocampista','Delantero',''].map(pos =>
              `<option value="${pos}" ${(p?.position || '') === pos ? 'selected' : ''}>${pos || '— Sin especificar —'}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn-primary"   onclick="savePlayerForm('${id || ''}')">💾 Guardar</button>
        <button class="btn-secondary" onclick="closePlayerForm()">Cancelar</button>
      </div>
    </div>
  `;
  document.getElementById('pf-name').focus();
}

function closePlayerForm() { document.getElementById('player-form-area').innerHTML = ''; }

function savePlayerForm(id) {
  const name = document.getElementById('pf-name').value.trim();
  if (!name) { alert('El nombre es obligatorio.'); return; }
  savePlayer({
    id: id || newId(),
    name,
    number:   parseInt(document.getElementById('pf-number').value) || 0,
    position: document.getElementById('pf-pos').value,
  });
  renderAdminSection('players');
}

function confirmDeletePlayer(id) {
  const p = getPlayers().find(x => x.id === id);
  if (confirm(`¿Eliminar a ${p?.name || 'este jugador'}?`)) { deletePlayer(id); renderAdminSection('players'); }
}

// =============================================
//  MATCHES
// =============================================
function renderMatchesAdmin(container) {
  const matches = getMatches().sort((a, b) => {
    const ja = a.jornada || 9999, jb = b.jornada || 9999;
    if (ja !== jb) return jb - ja;
    return new Date(b.date) - new Date(a.date);
  });
  container.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <span>📅 Partidos</span>
        <button class="btn-primary" onclick="openMatchForm()">+ Agregar partido</button>
      </div>
      <div id="match-form-area"></div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Fecha #</th><th>Fecha</th><th>Rival</th><th>L/V</th><th>Resultado</th><th>Formación</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            ${matches.length ? matches.map(m => {
              const d = new Date(m.date + 'T00:00:00');
              return `
                <tr>
                  <td class="td-center">${m.jornada ? `<strong>${m.jornada}</strong>` : '—'}</td>
                  <td>${d.toLocaleDateString('es-AR')}</td>
                  <td>${m.opponent}</td>
                  <td><span class="match-badge ${m.isHome ? 'badge-home' : 'badge-away'}">${m.isHome ? 'Local' : 'Visit.'}</span></td>
                  <td>${m.played ? `<strong>${m.goalsFor} - ${m.goalsAgainst}</strong>` : '<span style="color:var(--muted)">Pendiente</span>'}</td>
                  <td>${m.formation || '—'}</td>
                  <td>
                    <button class="btn-sm btn-edit" onclick="openMatchForm('${m.id}')">Editar</button>
                    <button class="btn-sm btn-del"  onclick="confirmDeleteMatch('${m.id}')">Eliminar</button>
                  </td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px">Sin partidos cargados.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ---- sub counter ----
let _subCount = 0;

function openMatchForm(id) {
  const m = id ? getMatches().find(x => x.id === id) : null;
  const players = getPlayers().sort((a, b) => (a.number || 0) - (b.number || 0));

  const convocadosIds = m?.convocados || [];
  const scorersMap   = {}; (m?.scorers  || []).forEach(s => { scorersMap[s.id]  = s.goals;   });
  const assistsMap   = {}; (m?.assists  || []).forEach(a => { assistsMap[a.id]  = a.assists; });
  const yellowsArr   = m?.yellows || [];
  const redsArr      = m?.reds    || [];
  const formation    = m?.formation || '';
  const lineup       = m?.lineup    || [];
  const subs         = m?.subs      || [];
  _subCount = subs.length;

  const rivalOptions = ['Exactas B','FADU B','Ingeniería','Agronomía','Veterinarias',
                        'Filo B','FADU A','FUBA','Farmacia'].map(t => `<option value="${t}">`).join('');

  const formationOptions = Object.keys(FORMATIONS).map(f =>
    `<option value="${f}" ${formation === f ? 'selected' : ''}>${f}</option>`
  ).join('');

  const playerRows = players.map(p => `
    <tr>
      <td>
        <input type="checkbox" id="conv-${p.id}" value="${p.id}" ${convocadosIds.includes(p.id) ? 'checked' : ''}>
        <label for="conv-${p.id}"> ${p.number ? '#' + p.number + ' ' : ''}${escAttr(p.name)}</label>
      </td>
      <td class="td-center">
        <input type="number" min="0" max="20" style="width:50px" id="gol-${p.id}" value="${scorersMap[p.id] || 0}">
      </td>
      <td class="td-center">
        <input type="number" min="0" max="20" style="width:50px" id="ast-${p.id}" value="${assistsMap[p.id] || 0}">
      </td>
      <td class="td-center">
        <input type="radio" name="captain" value="${p.id}" ${m?.captainId === p.id ? 'checked' : ''}> Cap
      </td>
      <td class="td-center">
        <input type="checkbox" id="yel-${p.id}" ${yellowsArr.includes(p.id) ? 'checked' : ''}> 🟡
      </td>
      <td class="td-center">
        <input type="checkbox" id="red-${p.id}" ${redsArr.includes(p.id) ? 'checked' : ''}> 🔴
      </td>
    </tr>
  `).join('');

  document.getElementById('match-form-area').innerHTML = `
    <div class="inline-form">
      <h4>${m ? 'Editar partido' : 'Nuevo partido'}</h4>

      <!-- Datos básicos -->
      <div class="form-row">
        <div class="form-group" style="max-width:90px">
          <label>Fecha #</label>
          <input id="mf-jornada" type="number" min="1" max="50" value="${m?.jornada || ''}" placeholder="1">
        </div>
        <div class="form-group">
          <label>Rival *</label>
          <input id="mf-opponent" type="text" value="${escAttr(m?.opponent || '')}" list="rivals-list" placeholder="Nombre del rival">
          <datalist id="rivals-list">${rivalOptions}</datalist>
        </div>
        <div class="form-group" style="max-width:165px">
          <label>Fecha del partido *</label>
          <input id="mf-date" type="date" value="${m?.date || ''}">
        </div>
        <div class="form-group" style="max-width:140px">
          <label>Condición</label>
          <select id="mf-home">
            <option value="1" ${m?.isHome !== false ? 'selected' : ''}>Local</option>
            <option value="0" ${m?.isHome === false  ? 'selected' : ''}>Visitante</option>
          </select>
        </div>
      </div>

      <!-- Resultado -->
      <div class="form-row" style="align-items:center;gap:16px;margin-bottom:8px">
        <label style="display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="mf-played" ${m?.played ? 'checked' : ''} onchange="toggleResultFields()">
          Partido jugado
        </label>
        <div id="result-fields" style="display:${m?.played ? 'flex' : 'none'};gap:16px;align-items:center">
          <div class="form-group" style="max-width:110px">
            <label>Goles Eco A</label>
            <input id="mf-gf" type="number" min="0" max="30" value="${m?.goalsFor  ?? 0}">
          </div>
          <div class="form-group" style="max-width:110px">
            <label>Goles Rival</label>
            <input id="mf-gc" type="number" min="0" max="30" value="${m?.goalsAgainst ?? 0}">
          </div>
        </div>
      </div>

      <!-- Convocados / Goles / Asistencias / Capitán -->
      ${players.length ? `
        <div class="section-label" style="margin-top:16px">Convocados / Goles / Asistencias / Capitán</div>
        <div class="table-wrap" style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
          <table>
            <thead><tr>
              <th>Jugador (✓ conv.)</th>
              <th class="td-center">Goles</th>
              <th class="td-center">Asist.</th>
              <th class="td-center">Cap.</th>
              <th class="td-center">🟡</th>
              <th class="td-center">🔴</th>
            </tr></thead>
            <tbody>${playerRows}</tbody>
          </table>
        </div>
      ` : '<p style="color:var(--muted);font-size:13px;margin-top:8px">Primero cargá jugadores en la sección Plantilla.</p>'}

      <!-- Alineación -->
      <div class="section-label" style="margin-top:20px">Alineación en cancha</div>
      <div class="form-row" style="align-items:flex-end;gap:16px;margin-bottom:10px">
        <div class="form-group" style="max-width:150px">
          <label>Formación</label>
          <select id="mf-formation" onchange="updateLineupSlots()">
            <option value="">— Sin formación —</option>
            ${formationOptions}
          </select>
        </div>
      </div>
      <div class="table-wrap" style="border:1px solid var(--border);border-radius:8px;max-height:300px;overflow-y:auto">
        <table>
          <thead><tr><th style="width:55px;text-align:center">Pos.</th><th>Jugador</th></tr></thead>
          <tbody id="lineup-slots-body">
            ${renderLineupSlotsHTML(formation, lineup, players)}
          </tbody>
        </table>
      </div>

      <!-- Cambios -->
      <div class="section-label" style="margin-top:20px">🔄 Cambios</div>
      <div id="subs-container">
        ${subs.map((s, i) => renderSubRowHTML(i, s, players)).join('')}
      </div>
      <button class="btn-secondary" style="margin-top:8px;font-size:13px" onclick="addSubRow()">+ Agregar cambio</button>

      <div class="form-actions" style="margin-top:24px">
        <button class="btn-primary"   onclick="saveMatchForm('${id || ''}')">💾 Guardar partido</button>
        <button class="btn-secondary" onclick="closeMatchForm()">Cancelar</button>
      </div>
    </div>
  `;
  document.getElementById('mf-opponent').focus();
}

function renderLineupSlotsHTML(formation, lineup, players) {
  if (!formation || !FORMATIONS[formation]) {
    return `<tr><td colspan="2" style="color:var(--muted);padding:14px;text-align:center;font-size:13px">
      Seleccioná una formación arriba para asignar jugadores.
    </td></tr>`;
  }
  const slots = FORMATIONS[formation];
  return slots.map((slot, i) => {
    const selectedId = lineup[i] || '';
    return `<tr>
      <td style="text-align:center;font-weight:700;font-size:11px;color:var(--muted);padding:6px 8px">${slot.pos}</td>
      <td style="padding:4px 8px">
        <select id="ls-${i}" style="width:100%;padding:5px;border:1px solid var(--border);border-radius:6px">
          <option value="">— sin asignar —</option>
          ${players.map(p => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.number ? '#' + p.number + ' ' : ''}${escAttr(p.name)}</option>`).join('')}
        </select>
      </td>
    </tr>`;
  }).join('');
}

function updateLineupSlots() {
  const formation = document.getElementById('mf-formation')?.value || '';
  const body = document.getElementById('lineup-slots-body');
  if (!body) return;
  const players = getPlayers().sort((a, b) => (a.number || 0) - (b.number || 0));
  body.innerHTML = renderLineupSlotsHTML(formation, [], players);
}

function renderSubRowHTML(i, sub, players) {
  const opts = players.map(p =>
    `<option value="${p.id}" ${p.id === sub?.inId  ? 'selected' : ''}>${p.number ? '#' + p.number + ' ' : ''}${escAttr(p.name)}</option>`
  ).join('');
  const optsOut = players.map(p =>
    `<option value="${p.id}" ${p.id === sub?.outId ? 'selected' : ''}>${p.number ? '#' + p.number + ' ' : ''}${escAttr(p.name)}</option>`
  ).join('');
  return `
    <div class="sub-row" id="sub-row-${i}" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;padding:8px;background:#f9fafb;border:1px solid var(--border);border-radius:8px">
      <div style="display:flex;align-items:center;gap:4px">
        <input type="number" min="1" max="120" placeholder="Min" id="sub-min-${i}" value="${sub?.minute || ''}"
          style="width:58px;padding:6px;border:1px solid var(--border);border-radius:6px;text-align:center">
        <span style="font-size:11px;color:var(--muted)">'</span>
      </div>
      <span style="color:#16a34a;font-size:18px">⬆</span>
      <select id="sub-in-${i}" style="flex:1;min-width:120px;padding:6px;border:1px solid var(--border);border-radius:6px">
        <option value="">Entra...</option>${opts}
      </select>
      <span style="color:var(--muted);font-size:12px">por</span>
      <span style="color:#dc2626;font-size:18px">⬇</span>
      <select id="sub-out-${i}" style="flex:1;min-width:120px;padding:6px;border:1px solid var(--border);border-radius:6px">
        <option value="">Sale...</option>${optsOut}
      </select>
      <button class="btn-sm btn-del" onclick="removeSubRow(${i})" style="flex-shrink:0">✕</button>
    </div>
  `;
}

function addSubRow() {
  const container = document.getElementById('subs-container');
  const players   = getPlayers().sort((a, b) => (a.number || 0) - (b.number || 0));
  const i = _subCount++;
  const div = document.createElement('div');
  div.innerHTML = renderSubRowHTML(i, null, players);
  container.appendChild(div.firstElementChild);
}

function removeSubRow(i) {
  document.getElementById('sub-row-' + i)?.remove();
}

function toggleResultFields() {
  const show = document.getElementById('mf-played').checked;
  document.getElementById('result-fields').style.display = show ? 'flex' : 'none';
}

function closeMatchForm() {
  document.getElementById('match-form-area').innerHTML = '';
}

function saveMatchForm(id) {
  const opponent = document.getElementById('mf-opponent').value.trim();
  const date     = document.getElementById('mf-date').value;
  if (!opponent || !date) { alert('Rival y fecha son obligatorios.'); return; }

  const played  = document.getElementById('mf-played').checked;
  const players = getPlayers();

  const convocados = players
    .filter(p => document.getElementById('conv-' + p.id)?.checked)
    .map(p => p.id);

  const scorers = players
    .map(p => ({ id: p.id, goals:   parseInt(document.getElementById('gol-' + p.id)?.value) || 0 }))
    .filter(s => s.goals > 0);

  const assists = players
    .map(p => ({ id: p.id, assists: parseInt(document.getElementById('ast-' + p.id)?.value) || 0 }))
    .filter(a => a.assists > 0);

  const captainRadio = document.querySelector('input[name="captain"]:checked');

  const yellows = players.filter(p => document.getElementById('yel-' + p.id)?.checked).map(p => p.id);
  const reds    = players.filter(p => document.getElementById('red-' + p.id)?.checked).map(p => p.id);

  // Lineup
  const formation = document.getElementById('mf-formation')?.value || '';
  const slots     = formation && FORMATIONS[formation] ? FORMATIONS[formation] : [];
  const lineup    = slots.map((_, i) => document.getElementById('ls-' + i)?.value || '');

  // Subs
  const subs = [];
  document.querySelectorAll('[id^="sub-row-"]').forEach(row => {
    const i      = row.id.replace('sub-row-', '');
    const minute = parseInt(document.getElementById('sub-min-' + i)?.value) || 0;
    const inId   = document.getElementById('sub-in-'  + i)?.value || '';
    const outId  = document.getElementById('sub-out-' + i)?.value || '';
    if (inId || outId) subs.push({ minute, inId, outId });
  });
  subs.sort((a, b) => a.minute - b.minute);

  saveMatch({
    id: id || newId(),
    opponent,
    date,
    isHome:      document.getElementById('mf-home').value === '1',
    jornada:     parseInt(document.getElementById('mf-jornada')?.value) || null,
    played,
    goalsFor:    played ? (parseInt(document.getElementById('mf-gf').value) || 0) : null,
    goalsAgainst:played ? (parseInt(document.getElementById('mf-gc').value) || 0) : null,
    convocados,
    scorers,
    assists,
    captainId:   captainRadio?.value || null,
    yellows,
    reds,
    formation,
    lineup,
    subs,
  });

  renderAdminSection('matches');
}

function confirmDeleteMatch(id) {
  if (confirm('¿Eliminar este partido?')) { deleteMatch(id); renderAdminSection('matches'); }
}

// =============================================
//  STANDINGS — Fixture-based, auto-calculated
// =============================================
let _stActiveZona = 'zona1';
let _zmEditId     = null; // id de zoneMatch en edición

function renderStandingsAdmin(container) {
  container.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <span>📊 Tabla de posiciones</span>
      </div>
      <div class="card-body" style="padding:0">
        <div class="tabs" style="padding:16px 20px 0">
          <button class="tab-btn ${_stActiveZona==='zona1'?'active':''}" onclick="switchStandingsTab('zona1',this)">Zona 1</button>
          <button class="tab-btn ${_stActiveZona==='zona2'?'active':''}" onclick="switchStandingsTab('zona2',this)">Zona 2</button>
        </div>
        <div id="st-panel" style="padding:16px 20px 20px">
          ${renderStandingsPanel(_stActiveZona)}
        </div>
      </div>
    </div>
  `;
}

function switchStandingsTab(zona, btn) {
  _stActiveZona = zona;
  _zmEditId = null;
  btn.closest('.tabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('st-panel').innerHTML = renderStandingsPanel(zona);
}

function renderStandingsPanel(zona) {
  const teams    = ZONE_TEAMS[zona];
  const allZM    = getZoneMatches().filter(m => m.zona === zona);
  const standings = computeStandings()[zona];

  // Agrupar por jornada
  const byJornada = {};
  allZM.forEach(m => {
    const j = m.jornada || 0;
    if (!byJornada[j]) byJornada[j] = [];
    byJornada[j].push(m);
  });
  const jornadas = Object.keys(byJornada).map(Number).sort((a,b) => a-b);

  const teamOpts = (selected) => teams.map(t =>
    `<option value="${escAttr(t)}" ${t === selected ? 'selected' : ''}>${t}</option>`
  ).join('');

  // Form de alta/edición
  const editMatch = _zmEditId ? allZM.find(m => m.id === _zmEditId) : null;
  const emStatus  = editMatch ? (editMatch.status || (editMatch.played ? 'played' : 'pending')) : 'pending';

  const statusOpts = [
    { v:'pending',   label:'⏳ Pendiente' },
    { v:'played',    label:'✅ Jugado' },
    { v:'no_show',   label:'🚫 No se presentó (W.O.)' },
    { v:'suspended', label:'⛔ Suspendido' },
    { v:'postponed', label:'📅 Pospuesto' },
    { v:'libre',     label:'🗓️ Fecha libre' },
  ].map(o => `<option value="${o.v}" ${emStatus === o.v ? 'selected' : ''}>${o.label}</option>`).join('');

  const noShowOpts = `
    <option value="away" ${editMatch?.noShowTeam !== 'home' ? 'selected' : ''}>Visitante</option>
    <option value="home" ${editMatch?.noShowTeam === 'home' ? 'selected' : ''}>Local</option>
  `;

  const showScore   = emStatus === 'played';
  const showNoShow  = emStatus === 'no_show';

  const formHTML = `
    <div class="inline-form" style="margin-bottom:20px">
      <h4 style="margin-bottom:12px">${editMatch ? '✏️ Editar resultado' : '➕ Agregar resultado'}</h4>
      <div class="form-row" style="flex-wrap:wrap;gap:12px;align-items:flex-end">
        <div class="form-group" style="max-width:90px">
          <label>Fecha #</label>
          <input id="zm-jornada" type="number" min="1" max="50" placeholder="1" value="${editMatch?.jornada || ''}">
        </div>
        <div class="form-group">
          <label>Local</label>
          <select id="zm-home"><option value="">— Equipo —</option>${teamOpts(editMatch?.homeTeam)}</select>
        </div>
        <div class="form-group" style="max-width:48px;padding-top:22px;text-align:center">
          <strong style="font-size:16px;color:var(--muted)">vs</strong>
        </div>
        <div class="form-group">
          <label>Visitante</label>
          <select id="zm-away"><option value="">— Equipo —</option>${teamOpts(editMatch?.awayTeam)}</select>
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select id="zm-status" onchange="onZMStatusChange(this.value)">${statusOpts}</select>
        </div>
      </div>

      <!-- Goles (solo si jugado) -->
      <div id="zm-score-row" style="display:${showScore ? 'flex' : 'none'};gap:12px;align-items:flex-end;margin-top:4px;flex-wrap:wrap">
        <div class="form-group" style="max-width:80px">
          <label>Goles Local</label>
          <input id="zm-gh" type="number" min="0" max="30" value="${editMatch?.goalsHome ?? 0}" placeholder="0">
        </div>
        <div class="form-group" style="max-width:80px">
          <label>Goles Visit.</label>
          <input id="zm-ga" type="number" min="0" max="30" value="${editMatch?.goalsAway ?? 0}" placeholder="0">
        </div>
      </div>

      <!-- No se presentó (W.O.) -->
      <div id="zm-noshow-row" style="display:${showNoShow ? 'flex' : 'none'};gap:12px;align-items:flex-end;margin-top:4px;flex-wrap:wrap">
        <div class="form-group">
          <label>¿Quién no se presentó?</label>
          <select id="zm-noshow">${noShowOpts}</select>
        </div>
        <p style="font-size:12px;color:var(--muted);align-self:flex-end;margin-bottom:8px">
          El equipo que no se presentó pierde 3-0 (W.O.)
        </p>
      </div>

      <div class="form-actions" style="margin-top:16px">
        <button class="btn-primary"   onclick="saveZoneMatchForm()">💾 Guardar</button>
        <button class="btn-secondary" onclick="cancelZMEdit()">Cancelar</button>
      </div>
    </div>
  `;

  // Lista de partidos por jornada
  let matchListHTML = '';
  if (allZM.length === 0) {
    matchListHTML = '<p style="color:var(--muted);font-size:13px;margin-bottom:20px">Todavía no hay resultados cargados en esta zona.</p>';
  } else {
    jornadas.forEach(j => {
      const label = j ? `Fecha ${j}` : 'Sin fecha asignada';
      matchListHTML += `<div class="jornada-header" style="margin:0 0 8px">${label}</div>`;
      matchListHTML += `<div style="margin-bottom:16px">`;
      byJornada[j].forEach(m => {
        const st = m.status || (m.played ? 'played' : 'pending');
        const statusBadge = {
          played:    `<strong>${m.goalsHome} - ${m.goalsAway}</strong>`,
          no_show:   `<span style="color:#dc2626;font-size:12px;font-weight:600">W.O. — no se presentó: ${m.noShowTeam === 'home' ? m.homeTeam : m.awayTeam}</span>`,
          suspended: `<span style="color:#d97706;font-size:12px;font-weight:600">⛔ Suspendido</span>`,
          postponed: `<span style="color:#6366f1;font-size:12px;font-weight:600">📅 Pospuesto</span>`,
          libre:     `<span style="color:#059669;font-size:12px;font-weight:600">🗓️ Fecha libre</span>`,
          pending:   `<span style="color:var(--muted);font-size:12px">Pendiente</span>`,
        }[st] || `<span style="color:var(--muted);font-size:12px">Pendiente</span>`;
        const teamLabel = st === 'libre'
          ? `<strong>${m.homeTeam}</strong> <span style="color:var(--muted);font-size:12px">— libre</span>`
          : `${m.homeTeam} <span style="color:var(--muted);margin:0 4px">vs</span> ${m.awayTeam}`;
        matchListHTML += `
          <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;background:#f9fafb;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="flex:1;min-width:160px;font-size:14px">
              ${teamLabel}
            </span>
            <span style="min-width:70px;text-align:center">${score}</span>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn-sm btn-edit" onclick="editZMRow('${m.id}')">Editar</button>
              <button class="btn-sm btn-del"  onclick="deleteZMRow('${m.id}')">Eliminar</button>
            </div>
          </div>
        `;
      });
      matchListHTML += `</div>`;
    });
  }

  // Tabla calculada
  const tableHTML = `
    <div class="section-label" style="margin-top:8px;margin-bottom:10px">📋 Tabla calculada (automática)</div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>#</th><th>Equipo</th>
          <th class="td-center">PJ</th><th class="td-center">PG</th>
          <th class="td-center">PE</th><th class="td-center">PP</th>
          <th class="td-center">GF</th><th class="td-center">GC</th>
          <th class="td-center">DG</th><th class="td-center">PTS</th>
        </tr></thead>
        <tbody>
          ${standings.map((t, i) => {
            const isEcoa = t.team === 'Económicas A';
            return `<tr class="${isEcoa ? 'my-team-row' : ''}">
              <td class="td-center" style="color:var(--muted);font-size:12px">${i+1}</td>
              <td><strong>${t.team}</strong></td>
              <td class="td-center">${t.pj}</td>
              <td class="td-center">${t.pg}</td>
              <td class="td-center">${t.pe}</td>
              <td class="td-center">${t.pp}</td>
              <td class="td-center">${t.gf}</td>
              <td class="td-center">${t.gc}</td>
              <td class="td-center">${t.gf - t.gc >= 0 ? '+' : ''}${t.gf - t.gc}</td>
              <td class="td-center"><strong>${t.pts}</strong></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  return formHTML + matchListHTML + tableHTML;
}

function onZMStatusChange(val) {
  document.getElementById('zm-score-row').style.display  = val === 'played'   ? 'flex' : 'none';
  document.getElementById('zm-noshow-row').style.display = val === 'no_show'  ? 'flex' : 'none';
}

function saveZoneMatchForm() {
  const jornada   = parseInt(document.getElementById('zm-jornada')?.value) || null;
  const homeTeam  = document.getElementById('zm-home')?.value;
  const awayTeam  = document.getElementById('zm-away')?.value;
  const status    = document.getElementById('zm-status')?.value || 'pending';

  if (!homeTeam || !awayTeam) { alert('Seleccioná ambos equipos.'); return; }
  if (homeTeam === awayTeam)  { alert('El local y visitante no pueden ser el mismo equipo.'); return; }

  const zm = {
    id:         _zmEditId || newId(),
    zona:       _stActiveZona,
    jornada,
    homeTeam,
    awayTeam,
    status,
    played:     status === 'played', // backward compat
    goalsHome:  0,
    goalsAway:  0,
    noShowTeam: null,
  };

  if (status === 'played') {
    zm.goalsHome = parseInt(document.getElementById('zm-gh')?.value) || 0;
    zm.goalsAway = parseInt(document.getElementById('zm-ga')?.value) || 0;
  } else if (status === 'no_show') {
    zm.noShowTeam = document.getElementById('zm-noshow')?.value || 'away';
  }

  saveZoneMatch(zm);
  _zmEditId = null;
  document.getElementById('st-panel').innerHTML = renderStandingsPanel(_stActiveZona);
}

function editZMRow(id) {
  _zmEditId = id;
  document.getElementById('st-panel').innerHTML = renderStandingsPanel(_stActiveZona);
  document.getElementById('zm-home')?.focus();
}

function deleteZMRow(id) {
  if (!confirm('¿Eliminar este resultado?')) return;
  deleteZoneMatch(id);
  if (_zmEditId === id) _zmEditId = null;
  document.getElementById('st-panel').innerHTML = renderStandingsPanel(_stActiveZona);
}

function cancelZMEdit() {
  _zmEditId = null;
  document.getElementById('st-panel').innerHTML = renderStandingsPanel(_stActiveZona);
}

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  document.getElementById('pw-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
});
