/* ========================================
   今日说法俱乐部 — 本地服务器 + JSON 数据库
   启动：node server.js
   访问：http://localhost:3456
   ======================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3456;
const ROOT = __dirname;

// ======== 数据库 ========
const DB_PATH = path.join(__dirname, 'db.json');

function loadDB() {
  if (fs.existsSync(DB_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch (e) {
      console.error('数据库文件损坏，使用空数据库:', e.message);
      return { players: [], matches: [], registrations: [], config: {} };
    }
  }
  return { players: [], matches: [], registrations: [], config: {} };
}

function saveDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error('数据库保存失败:', e.message);
  }
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// ======== MIME 类型 ========
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon'
};

// ======== JSON 响应工具 ========
function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

// ======== 解析请求体 ========
function parseBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', c => body += c);
    req.on('error', () => resolve({}));
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (e) { resolve({}); }
    });
  });
}

// ======== API 路由 ========
async function handleAPI(req, res, db) {
  const url = new URL(req.url, 'http://localhost');
  const seg = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  // POST/PUT 需要解析 body
  let body = {};
  if (method === 'POST' || method === 'PUT') {
    body = await parseBody(req);
  }

  // === Players ===
  if (seg[1] === 'players') {
    // GET /api/players
    if (method === 'GET') {
      return json(res, 200, db.players.map(p => ({ id: p.id, name: p.name, number: p.number, role: p.role, created_at: p.created_at })));
    }
    // POST /api/players
    if (method === 'POST' && seg.length === 2) {
      const p = {
        id: Date.now().toString(),
        name: body.name,
        number: body.number,
        pin_hash: sha256(body.pin || ''),
        role: body.role || 'player',
        created_at: new Date().toISOString()
      };
      db.players.push(p);
      saveDB(db);
      return json(res, 200, p);
    }
    // POST /api/players/verify
    if (method === 'POST' && seg[2] === 'verify') {
      const player = db.players.find(p => p.name === body.name);
      if (!player) return json(res, 403, { error: '你不是球队成员' });
      if (player.pin_hash !== sha256(body.pin || '')) return json(res, 403, { error: '密码错误' });
      return json(res, 200, { name: player.name, number: player.number });
    }
    // PUT /api/players/id/:id
    if (method === 'PUT' && seg[2] === 'id' && seg[3]) {
      const idx = db.players.findIndex(p => p.id === seg[3]);
      if (idx === -1) return json(res, 404, { error: '队员不存在' });
      if (body.pin) body.pin_hash = sha256(body.pin);
      Object.assign(db.players[idx], body);
      saveDB(db);
      return json(res, 200, db.players[idx]);
    }
    // DELETE /api/players/id/:id
    if (method === 'DELETE' && seg[2] === 'id' && seg[3]) {
      const idx = db.players.findIndex(p => p.id === seg[3]);
      if (idx === -1) return json(res, 404, { error: '队员不存在' });
      db.players.splice(idx, 1);
      saveDB(db);
      return json(res, 200, { deleted: true });
    }
    return json(res, 400, { error: '无效请求' });
  }

  // === Matches ===
  if (seg[1] === 'matches') {
    // GET /api/matches/results — 返回已录入赛果的比赛
    if (method === 'GET' && seg[2] === 'results') {
      const results = db.matches
        .filter(m => m.home_score !== undefined && m.home_score !== null)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return json(res, 200, results);
    }
    if (method === 'GET') return json(res, 200, db.matches);
    if (method === 'POST') {
      const m = {
        id: Date.now().toString(),
        date: body.date,
        time: body.time || '14:40',
        home_team: body.home_team || '今日说法',
        away_team: body.away_team,
        venue: body.venue || '',
        jersey: body.jersey || '',
        jersey_color: body.jersey_color || '',
        max_players: body.max_players || 14,
        max_substitutes: body.max_substitutes || 4,
        reg_open_at: body.reg_open_at,
        reg_close_at: body.reg_close_at,
        home_score: body.home_score ?? null,
        away_score: body.away_score ?? null,
        result: body.result || '',
        scorers: body.scorers || [],
        assisters: body.assisters || [],
        created_at: new Date().toISOString()
      };
      db.matches.push(m);
      saveDB(db);
      return json(res, 200, m);
    }
    if (method === 'PUT' && seg[2] === 'id' && seg[3]) {
      const idx = db.matches.findIndex(m => m.id === seg[3]);
      if (idx === -1) return json(res, 404, { error: '比赛不存在' });
      Object.assign(db.matches[idx], body);
      saveDB(db);
      return json(res, 200, db.matches[idx]);
    }
    if (method === 'DELETE' && seg[2] === 'id' && seg[3]) {
      const idx = db.matches.findIndex(m => m.id === seg[3]);
      if (idx === -1) return json(res, 404, { error: '比赛不存在' });
      db.registrations = db.registrations.filter(r => r.match_id !== seg[3]);
      db.matches.splice(idx, 1);
      saveDB(db);
      return json(res, 200, { deleted: true });
    }
    return json(res, 400, { error: '无效请求' });
  }

  // === Registrations ===
  if (seg[1] === 'registrations') {
    if (method === 'GET') {
      const matchId = url.searchParams.get('match_id');
      const list = matchId
        ? db.registrations.filter(r => r.match_id === matchId).sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at))
        : db.registrations.sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at));
      return json(res, 200, list);
    }
    if (method === 'POST') {
      const r = {
        id: Date.now().toString(),
        match_id: body.match_id,
        player_name: body.player_name,
        player_number: body.player_number,
        status: body.status || 'confirmed',
        cancel_reason: '',
        registered_at: new Date().toISOString(),
        cancelled_at: null
      };
      db.registrations.push(r);
      saveDB(db);
      return json(res, 200, r);
    }
    if (method === 'PUT' && seg[2] === 'id' && seg[3]) {
      const idx = db.registrations.findIndex(r => r.id === seg[3]);
      if (idx === -1) return json(res, 404, { error: '记录不存在' });

      if (body.status === 'cancelled' && db.registrations[idx].status === 'confirmed') {
        db.registrations[idx].status = 'cancelled';
        db.registrations[idx].cancel_reason = body.cancel_reason || '';
        db.registrations[idx].cancelled_at = new Date().toISOString();
        const waitlist = db.registrations
          .filter(r => r.match_id === db.registrations[idx].match_id && r.status === 'waitlist')
          .sort((a, b) => new Date(a.registered_at) - new Date(b.registered_at));
        if (waitlist.length > 0) {
          waitlist[0].status = 'confirmed';
        }
        saveDB(db);
        return json(res, 200, db.registrations[idx]);
      }

      // 重新报名时刷新时间戳，确保排在队尾
      if (body.status === 'confirmed' || body.status === 'waitlist') {
        body.registered_at = new Date().toISOString();
        body.cancelled_at = null;
      }

      Object.assign(db.registrations[idx], body);
      saveDB(db);
      return json(res, 200, db.registrations[idx]);
    }
    if (method === 'DELETE' && seg[2] === 'id' && seg[3]) {
      const idx = db.registrations.findIndex(r => r.id === seg[3]);
      if (idx === -1) return json(res, 404, { error: '记录不存在' });
      db.registrations.splice(idx, 1);
      saveDB(db);
      return json(res, 200, { deleted: true });
    }
    return json(res, 400, { error: '无效请求' });
  }

  // === Stats ===
  if (seg[1] === 'stats') {
    const stats = {};
    db.players.forEach(p => {
      stats[p.name] = { name: p.name, number: p.number, confirmed: 0, waitlist: 0, cancelled: 0 };
    });
    db.registrations.forEach(r => {
      if (stats[r.player_name]) {
        stats[r.player_name][r.status] = (stats[r.player_name][r.status] || 0) + 1;
      }
    });
    const list = Object.values(stats).map(s => ({
      ...s,
      total: s.confirmed + s.waitlist + s.cancelled,
      rate: s.confirmed + s.cancelled > 0 ? Math.round(s.confirmed / (s.confirmed + s.cancelled) * 100) : 0
    }));
    list.sort((a, b) => b.total - a.total || a.number - b.number);
    return json(res, 200, list);
  }

  // === Config ===
  if (seg[1] === 'config') {
    if (method === 'GET') return json(res, 200, db.config);
    if (method === 'POST') {
      Object.assign(db.config, body);
      saveDB(db);
      return json(res, 200, db.config);
    }
    return json(res, 400, { error: '无效请求' });
  }

  // === Admin Auth ===
  if (seg[1] === 'admin' && seg[2] === 'login') {
    const adminPwd = db.config.admin_password || 'admin123';
    if (body.password === adminPwd) return json(res, 200, { token: sha256(adminPwd + Date.now()) });
    return json(res, 403, { error: '密码错误' });
  }

  return json(res, 404, { error: 'API 路径不存在: ' + url.pathname });
}

// ======== 静态文件服务 ========
function serveStatic(req, res) {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('404 Not Found');
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size
  });
  fs.createReadStream(filePath).pipe(res);
}

// ======== 主服务 ========
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*'
    });
    return res.end();
  }

  if (req.url.startsWith('/api/')) {
    const db = loadDB();
    return handleAPI(req, res, db);
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  今日说法足球俱乐部 — 本地服务器');
  console.log('  http://localhost:' + PORT);
  console.log('  按 Ctrl+C 停止');
  console.log('========================================');
});
