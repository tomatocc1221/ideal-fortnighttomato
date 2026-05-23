/* ========================================
   今日说法 API 封装 — 本地服务器
   ======================================== */

const API = {
  // ===== 队员 =====
  getPlayers() {
    return fetch('/api/players').then(r => r.json());
  },
  addPlayer(data) {
    return fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  updatePlayer(id, data) {
    return fetch('/api/players/id/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  deletePlayer(id) {
    return fetch('/api/players/id/' + id, { method: 'DELETE' }).then(r => r.json());
  },
  verifyPlayer(name, pin) {
    return fetch('/api/players/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin })
    }).then(r => r.json());
  },

  // ===== 比赛 =====
  getMatches() {
    return fetch('/api/matches').then(r => r.json());
  },
  getResults() {
    return fetch('/api/matches/results').then(r => r.json());
  },
  addMatch(data) {
    return fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  updateMatch(id, data) {
    return fetch('/api/matches/id/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  deleteMatch(id) {
    return fetch('/api/matches/id/' + id, { method: 'DELETE' }).then(r => r.json());
  },

  // ===== 报名 =====
  getRegistrations(matchId) {
    const url = matchId ? '/api/registrations?match_id=' + matchId : '/api/registrations';
    return fetch(url).then(r => r.json());
  },
  addRegistration(data) {
    return fetch('/api/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  updateRegistration(id, data) {
    return fetch('/api/registrations/id/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
  },
  deleteRegistration(id) {
    return fetch('/api/registrations/id/' + id, { method: 'DELETE' }).then(r => r.json());
  },

  // ===== 统计 =====
  getStats() {
    return fetch('/api/stats').then(r => r.json());
  },

  // ===== 管理员 =====
  adminLogin(password) {
    return fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    }).then(r => r.json());
  },
  getConfig() {
    return fetch('/api/config').then(r => r.json());
  },
  saveConfig(data) {
    return fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json());
  }
};
