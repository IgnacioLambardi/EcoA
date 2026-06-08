// =============================================
//  DATA LAYER – localStorage persistence
// =============================================

const DB_KEY = 'ecoa_portal_v1';

const ZONE_TEAMS = {
  zona1: ['Exactas B', 'FADU B', 'Ingeniería', 'Agronomía', 'Veterinarias'],
  zona2: ['Económicas A', 'Filo B', 'FADU A', 'FUBA', 'Farmacia'],
};

const DEFAULT_DATA = {
  players:      [],
  matches:      [],
  zoneMatches:  [], // { id, jornada, zona, homeTeam, awayTeam, goalsHome, goalsAway, played }
};

function loadDB() {
  // Si hay datos exportados (sitio publicado en GitHub), los usa como fuente de verdad
  if (typeof EXPORTED_DATA !== 'undefined' && EXPORTED_DATA !== null) {
    return structuredClone(EXPORTED_DATA);
  }
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return structuredClone(DEFAULT_DATA);
    const parsed = JSON.parse(raw);
    if (!parsed.zoneMatches) parsed.zoneMatches = [];
    // Migrate: drop old manual standings if present
    if (parsed.standings) delete parsed.standings;
    return parsed;
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

function saveDB(data) {
  // Solo guarda en localStorage si no estamos en modo publicado
  if (typeof EXPORTED_DATA !== 'undefined' && EXPORTED_DATA !== null) return;
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

// ---- Players ----
function getPlayers() { return loadDB().players; }

function savePlayer(player) {
  const db = loadDB();
  const idx = db.players.findIndex(p => p.id === player.id);
  if (idx >= 0) db.players[idx] = player;
  else db.players.push(player);
  saveDB(db);
}

function deletePlayer(id) {
  const db = loadDB();
  db.players = db.players.filter(p => p.id !== id);
  saveDB(db);
}

// ---- Matches ----
function getMatches() { return loadDB().matches; }

function saveMatch(match) {
  const db = loadDB();
  const idx = db.matches.findIndex(m => m.id === match.id);
  if (idx >= 0) db.matches[idx] = match;
  else db.matches.push(match);
  saveDB(db);
}

function deleteMatch(id) {
  const db = loadDB();
  db.matches = db.matches.filter(m => m.id !== id);
  saveDB(db);
}

// ---- Zone Matches (fixture results for all teams) ----
function getZoneMatches() { return loadDB().zoneMatches || []; }

function saveZoneMatch(match) {
  const db = loadDB();
  if (!db.zoneMatches) db.zoneMatches = [];
  const idx = db.zoneMatches.findIndex(m => m.id === match.id);
  if (idx >= 0) db.zoneMatches[idx] = match;
  else db.zoneMatches.push(match);
  saveDB(db);
}

function deleteZoneMatch(id) {
  const db = loadDB();
  db.zoneMatches = (db.zoneMatches || []).filter(m => m.id !== id);
  saveDB(db);
}

// ---- Auto-computed Standings ----
// status values: 'pending' | 'played' | 'no_show' | 'suspended' | 'postponed'
// no_show: noShowTeam = 'home' | 'away'  →  forfeiting team loses 3-0 (W.O.)
// backward compat: if status absent, fall back to played boolean
function _resolveMatchStatus(m) {
  if (m.status) return m.status;
  return m.played ? 'played' : 'pending';
}

function computeStandings() {
  const result = {};
  ['zona1', 'zona2'].forEach(zona => {
    const table = {};
    ZONE_TEAMS[zona].forEach(team => {
      table[team] = { team, pj:0, pg:0, pe:0, pp:0, gf:0, gc:0, pts:0 };
    });

    getZoneMatches().filter(m => m.zona === zona).forEach(m => {
      const status = _resolveMatchStatus(m);
      if (status === 'pending' || status === 'suspended' || status === 'postponed') return;

      const h = table[m.homeTeam];
      const a = table[m.awayTeam];
      if (!h || !a) return;

      if (status === 'played') {
        const gh = Number(m.goalsHome) || 0;
        const ga = Number(m.goalsAway) || 0;
        h.pj++; a.pj++;
        h.gf += gh; h.gc += ga;
        a.gf += ga; a.gc += gh;
        if (gh > ga)      { h.pg++; h.pts += 3; a.pp++; }
        else if (gh < ga) { a.pg++; a.pts += 3; h.pp++; }
        else              { h.pe++; h.pts++; a.pe++; a.pts++; }

      } else if (status === 'no_show') {
        // W.O.: la que no se presentó pierde 3-0
        h.pj++; a.pj++;
        if (m.noShowTeam === 'home') {
          // home forfeits → away wins
          h.pp++; h.gc += 3;
          a.pg++; a.pts += 3; a.gf += 3;
        } else {
          // away forfeits → home wins
          a.pp++; a.gc += 3;
          h.pg++; h.pts += 3; h.gf += 3;
        }
      }
    });

    result[zona] = Object.values(table).sort((a, b) =>
      b.pts - a.pts || (b.gf - b.gc) - (a.gf - a.gc) || b.gf - a.gf
    );
  });
  return result;
}

function getStandings() { return computeStandings(); }

// ---- Derived stats ----
function getTopScorers() {
  const db = loadDB();
  const map = {};
  db.matches.forEach(m => {
    if (!m.played) return;
    (m.scorers || []).forEach(s => {
      if (!map[s.id]) map[s.id] = { id: s.id, goals: 0 };
      map[s.id].goals += s.goals;
    });
  });
  const players = db.players;
  return Object.values(map)
    .map(e => ({ ...e, name: players.find(p => p.id === e.id)?.name || '—', number: players.find(p => p.id === e.id)?.number || '' }))
    .sort((a, b) => b.goals - a.goals);
}

function getTopAssists() {
  const db = loadDB();
  const map = {};
  db.matches.forEach(m => {
    if (!m.played) return;
    (m.assists || []).forEach(a => {
      if (!map[a.id]) map[a.id] = { id: a.id, assists: 0 };
      map[a.id].assists += a.assists;
    });
  });
  const players = db.players;
  return Object.values(map)
    .map(e => ({ ...e, name: players.find(p => p.id === e.id)?.name || '—', number: players.find(p => p.id === e.id)?.number || '' }))
    .sort((a, b) => b.assists - a.assists);
}

function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ---- Mi perfil (localStorage) ----
const MY_PLAYER_KEY = 'ecoa_my_player_id';
function getMyPlayerId() { return localStorage.getItem(MY_PLAYER_KEY) || null; }
function setMyPlayerId(id) {
  if (id) localStorage.setItem(MY_PLAYER_KEY, id);
  else localStorage.removeItem(MY_PLAYER_KEY);
}

// ---- Stats por jugador ----
function getPlayerStats(playerId) {
  const matches = getMatches().filter(m => m.played);
  return {
    pj:      matches.filter(m => (m.convocados || []).includes(playerId)).length,
    goals:   matches.reduce((s, m) => s + ((m.scorers  || []).find(x => x.id === playerId)?.goals   || 0), 0),
    assists: matches.reduce((s, m) => s + ((m.assists  || []).find(x => x.id === playerId)?.assists  || 0), 0),
    yellows: matches.reduce((s, m) => s + ((m.yellows  || []).includes(playerId) ? 1 : 0), 0),
    reds:    matches.reduce((s, m) => s + ((m.reds     || []).includes(playerId) ? 1 : 0), 0),
  };
}

// ---- Formation layouts (x/y as % of pitch, y=0 top/GK, y=100 bottom/forwards) ----
const FORMATIONS = {
  '4-3-3': [
    {pos:'POR',x:50,y:8},
    {pos:'LD',x:80,y:26},{pos:'DC',x:61,y:23},{pos:'DC',x:39,y:23},{pos:'LI',x:20,y:26},
    {pos:'MC',x:68,y:48},{pos:'MC',x:50,y:45},{pos:'MC',x:32,y:48},
    {pos:'ED',x:78,y:72},{pos:'DC',x:50,y:76},{pos:'EI',x:22,y:72},
  ],
  '4-2-3-1': [
    {pos:'POR',x:50,y:8},
    {pos:'LD',x:80,y:25},{pos:'DC',x:61,y:22},{pos:'DC',x:39,y:22},{pos:'LI',x:20,y:25},
    {pos:'MCD',x:62,y:43},{pos:'MCD',x:38,y:43},
    {pos:'MD',x:78,y:62},{pos:'MC',x:50,y:59},{pos:'MI',x:22,y:62},
    {pos:'DC',x:50,y:79},
  ],
  '4-4-2': [
    {pos:'POR',x:50,y:8},
    {pos:'LD',x:80,y:26},{pos:'DC',x:61,y:23},{pos:'DC',x:39,y:23},{pos:'LI',x:20,y:26},
    {pos:'MD',x:79,y:50},{pos:'MC',x:59,y:47},{pos:'MC',x:41,y:47},{pos:'MI',x:21,y:50},
    {pos:'DC',x:63,y:73},{pos:'DC',x:37,y:73},
  ],
  '3-5-2': [
    {pos:'POR',x:50,y:8},
    {pos:'DC',x:70,y:25},{pos:'DC',x:50,y:22},{pos:'DC',x:30,y:25},
    {pos:'MD',x:87,y:47},{pos:'MC',x:67,y:44},{pos:'MC',x:50,y:41},{pos:'MC',x:33,y:44},{pos:'MI',x:13,y:47},
    {pos:'DC',x:63,y:72},{pos:'DC',x:37,y:72},
  ],
  '4-1-4-1': [
    {pos:'POR',x:50,y:8},
    {pos:'LD',x:80,y:26},{pos:'DC',x:61,y:23},{pos:'DC',x:39,y:23},{pos:'LI',x:20,y:26},
    {pos:'MCD',x:50,y:42},
    {pos:'MD',x:79,y:59},{pos:'MC',x:59,y:56},{pos:'MC',x:41,y:56},{pos:'MI',x:21,y:59},
    {pos:'DC',x:50,y:77},
  ],
  '5-3-2': [
    {pos:'POR',x:50,y:8},
    {pos:'LD',x:87,y:28},{pos:'DC',x:69,y:24},{pos:'DC',x:50,y:22},{pos:'DC',x:31,y:24},{pos:'LI',x:13,y:28},
    {pos:'MC',x:65,y:52},{pos:'MC',x:50,y:49},{pos:'MC',x:35,y:52},
    {pos:'DC',x:63,y:74},{pos:'DC',x:37,y:74},
  ],
};
