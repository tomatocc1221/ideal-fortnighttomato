/* ========================================
   今日说法 API 封装 — Supabase 后端
   所有方法保持与旧 API 兼容的接口
   ======================================== */

const API = {
  // 请求级缓存（30s TTL，消除同一渲染周期内重复请求）
  // 缓存 Promise 本身以合并并发请求；失败不缓存，避免污染后续调用
  _cache: {},
  _cached: function(key, fetcher, ttl) {
    ttl = ttl || 30000;
    var entry = this._cache[key];
    // 命中：缓存未过期，直接返回（若请求进行中，共享同一个 Promise）
    if (entry && (Date.now() - entry._ts < ttl)) return entry.promise;
    var self = this;
    var promise = fetcher().then(function(data) {
      // 数据到达时才更新时间戳
      self._cache[key] = { promise: Promise.resolve(data), _ts: Date.now() };
      return data;
    }).catch(function(err) {
      // 失败不缓存，下次调用重试
      delete self._cache[key];
      throw err;
    });
    this._cache[key] = { promise: promise, _ts: Date.now() };
    return promise;
  },

  // ===== 队员 =====
  async getPlayers() {
    try {
      const rows = await sb.from('players').select('*', 'order=number.asc');
      return rows.map(p => ({ ...p, id: String(p.id) }));
    } catch (e) {
      console.warn('[API] getPlayers 失败:', e.message);
      return [];
    }
  },

  async addPlayer(data) {
    try {
      const pinHash = await sha256(data.pin || '');
      const row = await sb.from('players').insert({
        name: data.name,
        number: data.number,
        pin_hash: pinHash,
        role: data.role || 'player'
      });
      if (!row || !row.length) throw new Error('服务器未返回数据');
      return { ...row[0], id: String(row[0].id) };
    } catch (e) {
      console.error('[API] addPlayer:', e);
      throw new Error('添加队员失败: ' + (e.message || '网络错误'));
    }
  },

  async updatePlayer(id, data) {
    try {
      const payload = { ...data };
      if (payload.pin) {
        payload.pin_hash = await sha256(payload.pin);
        delete payload.pin;
      }
      delete payload.id;
      const row = await sb.from('players').update(payload, 'id=eq.' + id);
      if (!row || !row.length) throw new Error('服务器未返回数据');
      return { ...row[0], id: String(row[0].id) };
    } catch (e) {
      console.error('[API] updatePlayer:', e);
      throw new Error('更新队员失败: ' + (e.message || '网络错误'));
    }
  },

  async deletePlayer(id) {
    await sb.from('players').delete('id=eq.' + id);
    return { deleted: true };
  },

  async verifyPlayer(name, pin) {
    try {
      const rows = await sb.from('players').select('*', 'name=eq.' + encodeURIComponent(name));
      if (!rows.length) return { error: '你不是球队成员' };
      const hash = await sha256(pin || '');
      if (rows[0].pin_hash !== hash) return { error: '密码错误' };
      return { name: rows[0].name, number: rows[0].number };
    } catch (e) {
      return { error: '验证失败' };
    }
  },

  // ===== 比赛 =====
  async getMatches() {
    var self = this;
    return self._cached("matches", function() {
      return sb.from('matches').select('*', 'order=date.desc,time.desc').then(function(rows) {
        return rows.map(function(m) { return { ...m, id: String(m.id) }; });
      }).catch(function(e) {
        console.warn('[API] getMatches 失败:', e.message);
        return [];
      });
    });
  },

  async getResults() {
    var self = this;
    return self._cached("results", function() {
      return sb.from('matches').select('*', 'home_score=not.is.null&order=date.desc').then(function(rows) {
        return rows.map(function(m) { return { ...m, id: String(m.id) }; });
      }).catch(function(e) {
        console.warn('[API] getResults 失败:', e.message);
        return [];
      });
    });
  },

  async addMatch(data) {
    try {
      const payload = {
        date: data.date,
        time: data.time || '14:40',
        home_team: data.home_team || '今日说法',
        away_team: data.away_team,
        venue: data.venue || '',
        jersey: data.jersey || '',
        jersey_color: data.jersey_color || '',
        max_players: data.max_players || 13,
        max_substitutes: data.max_substitutes || 4,
        reg_open_at: data.reg_open_at,
        reg_close_at: data.reg_close_at,
        home_score: data.home_score != null ? data.home_score : null,
        away_score: data.away_score != null ? data.away_score : null,
        result: data.result || '',
        scorers: data.scorers || [],
        assisters: data.assisters || []
      };
      const row = await sb.from('matches').insert(payload);
      if (!row || !row.length) throw new Error('服务器未返回数据');
      return { ...row[0], id: String(row[0].id) };
    } catch (e) {
      console.error('[API] addMatch 失败:', e);
      throw new Error('创建比赛失败: ' + (e.message || '网络错误'));
    }
  },

  async updateMatch(id, data) {
    try {
      const row = await sb.from('matches').update(data, 'id=eq.' + id);
      if (!row || !row.length) throw new Error('服务器未返回数据');
      return { ...row[0], id: String(row[0].id) };
    } catch (e) {
      console.error('[API] updateMatch:', e);
      throw new Error('更新比赛失败: ' + (e.message || '网络错误'));
    }
  },

  async deleteMatch(id) {
    await sb.from('matches').delete('id=eq.' + id);
    return { deleted: true };
  },

  // ===== 报名 =====
  async getRegistrations(matchId) {
    try {
      const query = matchId
        ? 'match_id=eq.' + matchId + '&order=registered_at.asc'
        : 'order=registered_at.asc';
      const rows = await sb.from('registrations').select('*', query);
      return rows.map(r => ({ ...r, id: String(r.id), match_id: String(r.match_id) }));
    } catch (e) {
      console.warn('[API] getRegistrations 失败:', e.message);
      return [];
    }
  },

  async addRegistration(data) {
    // 检查是否已有有效报名（正选/候补），防止重复
    var existing = await sb.from('registrations').select('*', 'match_id=eq.' + parseInt(data.match_id) + '&player_name=eq.' + encodeURIComponent(data.player_name));
    var active = existing.filter(function (r) { return r.status === 'confirmed' || r.status === 'waitlist'; });
    if (active.length) {
      throw new Error('该队员已报名，请勿重复提交');
    }
    var row = await sb.from('registrations').insert({
      match_id: parseInt(data.match_id),
      player_name: data.player_name,
      player_number: data.player_number,
      status: data.status || 'confirmed',
      cancel_reason: '',
      registered_at: new Date().toISOString(),
      cancelled_at: null
    });
    return { ...row[0], id: String(row[0].id), match_id: String(row[0].match_id) };
  },

  async updateRegistration(id, data) {
    // 如果是取消正选报名，触发自动补位
    if (data.status === 'cancelled') {
      const existing = await sb.from('registrations').select('*', 'id=eq.' + id);
      if (existing.length && existing[0].status === 'confirmed') {
        // 先更新该记录为取消
        const row = await sb.from('registrations').update(
          { status: 'cancelled', cancel_reason: data.cancel_reason || '', cancelled_at: new Date().toISOString() },
          'id=eq.' + id
        );
        // 自动补位：将最早候补转为正选
        const waitlist = await sb.from('registrations').select('*', 'match_id=eq.' + existing[0].match_id + '&status=eq.waitlist&order=registered_at.asc&limit=1');
        if (waitlist.length) {
          await sb.from('registrations').update(
            { status: 'confirmed', registered_at: new Date().toISOString() },
            'id=eq.' + waitlist[0].id
          );
        }
        return { ...row[0], id: String(row[0].id), match_id: String(row[0].match_id) };
      }
    }

    // 重新报名时刷新时间戳
    if (data.status === 'confirmed' || data.status === 'waitlist') {
      data.registered_at = new Date().toISOString();
      data.cancelled_at = null;
    }

    const row = await sb.from('registrations').update(data, 'id=eq.' + id);
    return { ...row[0], id: String(row[0].id), match_id: String(row[0].match_id) };
  },

  async deleteRegistration(id) {
    await sb.from('registrations').delete('id=eq.' + id);
    return { deleted: true };
  },

  // ===== MVP 投票 =====
  async getVotes(matchId) {
    var self = this;
    var key = matchId ? "votes_" + matchId : "votes_all";
    return self._cached(key, function() {
      var query = matchId
        ? 'match_id=eq.' + parseInt(matchId) + '&order=created_at.asc'
        : 'order=created_at.asc';
      return sb.from('votes').select('*', query).then(function(rows) {
        return rows.map(function(v) { return { ...v, id: String(v.id), match_id: String(v.match_id) }; });
      }).catch(function(e) { console.warn('[API] getVotes 失败:', e.message); return []; });
    });
  },

  async castVote(data) {
    // data.votes: [{candidate_name, candidate_number, rank:1}, {rank:2}, {rank:3}]
    try {
      const rows = await sb.from('votes').insert(data.votes.map(function (v) {
        return {
          match_id: parseInt(data.match_id),
          voter_name: data.voter_name,
          voter_number: data.voter_number,
          candidate_name: v.candidate_name,
          candidate_number: v.candidate_number,
          rank: v.rank
        };
      }));
      if (!rows || !rows.length) throw new Error('服务器未返回数据');
      return rows.map(function (r) { return { ...r, id: String(r.id), match_id: String(r.match_id) }; });
    } catch (e) {
      console.error('[API] castVote:', e);
      throw new Error('投票失败: ' + (e.message || '网络错误'));
    }
  },

  // ===== 统计 =====
  async getStats() {
    try {
      const [players, regs] = await Promise.all([
        sb.from('players').select('name,number'),
        sb.from('registrations').select('player_name,status')
      ]);

      const stats = {};
      players.forEach(p => {
        stats[p.name] = { name: p.name, number: p.number, confirmed: 0, waitlist: 0, cancelled: 0 };
      });
      regs.forEach(r => {
        if (stats[r.player_name] && stats[r.player_name][r.status] !== undefined) {
          stats[r.player_name][r.status]++;
        }
      });

      return Object.values(stats)
        .map(s => ({
          ...s,
          total: s.confirmed + s.waitlist + s.cancelled,
          rate: s.confirmed + s.cancelled > 0 ? Math.round(s.confirmed / (s.confirmed + s.cancelled) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total || a.number - b.number);
    } catch (e) {
      console.warn('[API] getStats 失败:', e.message);
      return [];
    }
  },

  // ===== 管理员 =====
  async adminLogin(password) {
    try {
      const rows = await sb.from('config').select('value', 'key=eq.admin_password');
      const adminPwd = rows.length ? rows[0].value : 'admin123';
      if (password === adminPwd) {
        const token = await sha256(adminPwd + Date.now());
        return { token };
      }
      return { error: '密码错误' };
    } catch (e) {
      return { error: '登录失败: ' + e.message };
    }
  },

  // ===== 比赛照片 =====

  async getMatchPhotos(matchId) {
    try {
      var rows = await sb.from('match_photos').select('*',
        'match_id=eq.' + matchId + '&order=sort_order.asc');
      return rows.map(function (r) {
        return {
          ...r, id: String(r.id), match_id: String(r.match_id),
          fullUrl: sb.storage.publicUrl('match-photos', r.storage_path),
          thumbUrl: sb.storage.publicUrl('match-photos', r.thumb_path)
        };
      });
    } catch (e) { console.warn('[API] getMatchPhotos:', e.message); return []; }
  },

  async getAllPhotosGrouped() {
    try {
      var rows = await sb.from('match_photos').select('*', 'order=sort_order.asc');
      var matchIds = [...new Set(rows.map(function (r) { return r.match_id; }))];
      var matchesMap = {};
      if (matchIds.length) {
        try {
          var allMatches = await sb.from('matches').select('id,date,home_team,away_team,venue');
          allMatches.forEach(function (m) { matchesMap[String(m.id)] = m; });
        } catch (e) { console.warn('[API] getAllPhotosGrouped 比赛查询失败:', e.message); }
      }
      var grouped = {};
      rows.forEach(function (r) {
        var mid = String(r.match_id);
        var m = matchesMap[mid] || {};
        if (!grouped[mid]) grouped[mid] = {
          matchId: mid, date: m.date || '',
          home_team: m.home_team || '今日说法', away_team: m.away_team || '',
	          venue: m.venue || '',
          photos: []
        };
        grouped[mid].photos.push({
          ...r, id: String(r.id), match_id: mid,
          fullUrl: sb.storage.publicUrl('match-photos', r.storage_path),
          thumbUrl: sb.storage.publicUrl('match-photos', r.thumb_path)
        });
      });
      return grouped;
    } catch (e) { console.warn('[API] getAllPhotosGrouped:', e.message); return {}; }
  },

  async addMatchPhoto(data) {
    try {
      var row = await sb.from('match_photos').insert({
        match_id: parseInt(data.match_id), storage_path: data.storage_path,
        thumb_path: data.thumb_path, label: data.label || '',
        sort_order: data.sort_order || 0, width: data.width || null,
        height: data.height || null, file_size: data.file_size || null
      });
      if (!row || !row.length) throw new Error('服务器未返回数据');
      return { ...row[0], id: String(row[0].id), match_id: String(row[0].match_id) };
    } catch (e) {
      console.error('[API] addMatchPhoto:', e);
      throw new Error('保存照片失败: ' + (e.message || '网络错误'));
    }
  },

  async deleteMatchPhoto(id) {
    await sb.from('match_photos').delete('id=eq.' + id);
    return { deleted: true };
  },

  // ===== 球员统计 =====
  async getPlayerStats() {
    try {
      var matches = await sb.from('matches').select('scorers,assisters,result,date');
      var regs = await sb.from('registrations').select('player_name,status');
      var allVotes = await sb.from('votes').select('candidate_name,match_id,rank');

      var stats = {}; // {playerName: {goals, assists, apps, leaves, mvpWins}}

      // Process matches
      matches.forEach(function (m) {
        if (m.scorers) {
          (Array.isArray(m.scorers) ? m.scorers : []).forEach(function (s) {
            var name = s.name || '';
            if (!stats[name]) stats[name] = { goals: 0, assists: 0, apps: 0, leaves: 0, mvpWins: 0 };
            stats[name].goals += s.goals || 1;
            stats[name].apps = 1; // mark appeared
          });
        }
        if (m.assisters) {
          (Array.isArray(m.assisters) ? m.assisters : []).forEach(function (a) {
            var name = a.name || '';
            if (!stats[name]) stats[name] = { goals: 0, assists: 0, apps: 0, leaves: 0, mvpWins: 0 };
            stats[name].assists += a.assists || 1;
            stats[name].apps = 1;
          });
        }
      });

      // Process registrations
      regs.forEach(function (r) {
        var name = r.player_name || '';
        if (!stats[name]) stats[name] = { goals: 0, assists: 0, apps: 0, leaves: 0, mvpWins: 0 };
        if (r.status === 'confirmed') stats[name].apps = 1;
        if (r.status === 'cancelled') stats[name].leaves++;
      });

      // Process MVP
      var matchPoints = {};
      allVotes.forEach(function (v) {
        var mid = String(v.match_id);
        if (!matchPoints[mid]) matchPoints[mid] = {};
        var pts = v.rank === 1 ? 3 : v.rank === 2 ? 2 : 1;
        matchPoints[mid][v.candidate_name] = (matchPoints[mid][v.candidate_name] || 0) + pts;
      });
      Object.values(matchPoints).forEach(function (pts) {
        var sorted = Object.entries(pts).sort(function (a, b) { return b[1] - a[1]; });
        if (sorted.length) {
          var name = sorted[0][0];
          if (!stats[name]) stats[name] = { goals: 0, assists: 0, apps: 0, leaves: 0, mvpWins: 0 };
          stats[name].mvpWins++;
        }
      });

      return stats;
    } catch (e) {
      console.warn('[API] getPlayerStats 失败:', e.message);
      return {};
    }
  },

  async getPlayerHistory(playerName) {
    try {
      var matches = await sb.from('matches').select('date,home_team,away_team,scorers,assisters,result,venue').order('date');
      var votes = await sb.from('votes').select('match_id,candidate_name,rank');
      var regs = await sb.from('registrations').select('match_id,player_name,status');

      var events = [];

      // Goals / assists
      matches.forEach(function (m) {
        var d = (m.date || '').replace(/-/g, '.');
        var vs = m.away_team || '';
        if (m.scorers) {
          (Array.isArray(m.scorers) ? m.scorers : []).forEach(function (s) {
            if (s.name === playerName) {
              events.push({ date: d, type: 'goal', text: '进球 ×' + (s.goals || 1), detail: 'vs ' + vs });
            }
          });
        }
        if (m.assisters) {
          (Array.isArray(m.assisters) ? m.assisters : []).forEach(function (a) {
            if (a.name === playerName) {
              events.push({ date: d, type: 'assist', text: '助攻 ×' + (a.assists || 1), detail: 'vs ' + vs });
            }
          });
        }
      });

      // MVP wins (per match)
      var mvpMatchIds = {};
      var mvpByMatch = {};
      votes.forEach(function (v) {
        var mid = String(v.match_id);
        if (!mvpByMatch[mid]) mvpByMatch[mid] = {};
        var pts = v.rank === 1 ? 3 : v.rank === 2 ? 2 : 1;
        mvpByMatch[mid][v.candidate_name] = (mvpByMatch[mid][v.candidate_name] || 0) + pts;
      });
      Object.keys(mvpByMatch).forEach(function (mid) {
        var sorted = Object.entries(mvpByMatch[mid]).sort(function (a, b) { return b[1] - a[1]; });
        if (sorted.length && sorted[0][0] === playerName) mvpMatchIds[mid] = true;
      });

      // Map match IDs to dates
      matches.forEach(function (m) {
        var mid = String(m.id);
        if (mvpMatchIds[mid]) {
          events.push({ date: (m.date || '').replace(/-/g, '.'), type: 'mvp', text: 'MVP', detail: 'vs ' + (m.away_team || '') });
        }
      });

      // Leaves
      var leaveMatchDates = {};
      matches.forEach(function (m) { leaveMatchDates[String(m.id)] = (m.date || '').replace(/-/g, '.'); });
      regs.forEach(function (r) {
        if (r.player_name === playerName && r.status === 'cancelled') {
          var ld = leaveMatchDates[String(r.match_id)] || '';
          if (ld) events.push({ date: ld, type: 'leave', text: '请假', detail: '' });
        }
      });

      // Sort by date desc
      events.sort(function (a, b) { return new Date(b.date.replace(/\./g, '-')) - new Date(a.date.replace(/\./g, '-')); });

      return events;
    } catch (e) {
      console.warn('[API] getPlayerHistory 失败:', e.message);
      return [];
    }
  }
};
