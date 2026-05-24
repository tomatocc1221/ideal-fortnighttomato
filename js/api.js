/* ========================================
   今日说法 API 封装 — Supabase 后端
   所有方法保持与旧 API 兼容的接口
   ======================================== */

const API = {
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
    try {
      const rows = await sb.from('matches').select('*', 'order=date.desc,time.desc');
      return rows.map(m => ({ ...m, id: String(m.id) }));
    } catch (e) {
      console.warn('[API] getMatches 失败:', e.message);
      return [];
    }
  },

  async getResults() {
    try {
      const rows = await sb.from('matches').select('*', 'home_score=not.is.null&order=date.desc');
      return rows.map(m => ({ ...m, id: String(m.id) }));
    } catch (e) {
      console.warn('[API] getResults 失败:', e.message);
      return [];
    }
  },

  async addMatch(data) {
    try {
      const row = await sb.from('matches').insert({
        date: data.date,
        time: data.time || '14:40',
        home_team: data.home_team || '今日说法',
        away_team: data.away_team,
        venue: data.venue || '',
        jersey: data.jersey || '',
        jersey_color: data.jersey_color || '',
        fee: data.fee || null,
        max_players: data.max_players || 14,
        max_substitutes: data.max_substitutes || 4,
        reg_open_at: data.reg_open_at,
        reg_close_at: data.reg_close_at,
        home_score: data.home_score ?? null,
        away_score: data.away_score ?? null,
        result: data.result || '',
        scorers: data.scorers || [],
        assisters: data.assisters || []
      });
      if (!row || !row.length) throw new Error('服务器未返回数据');
      return { ...row[0], id: String(row[0].id) };
    } catch (e) {
      console.error('[API] addMatch:', e);
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
    const row = await sb.from('registrations').insert({
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

  async getConfig() {
    try {
      const rows = await sb.from('config').select('*');
      const cfg = {};
      rows.forEach(r => { cfg[r.key] = r.value; });
      return cfg;
    } catch (e) {
      console.warn('[API] getConfig 失败:', e.message);
      return {};
    }
  },

  async saveConfig(data) {
    // config 表 key 为主键，逐条 upsert
    const entries = Object.entries(data);
    for (const [key, value] of entries) {
      await sb.from('config').delete('key=eq.' + key).catch(() => {});
      await sb.from('config').insert({ key, value: String(value) });
    }
    return data;
  }
};
