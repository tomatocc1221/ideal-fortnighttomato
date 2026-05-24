/* ========================================
   Supabase API 封装 — 纯 fetch，零依赖
   ======================================== */

const SB_URL = 'https://jdrryazqzrcaspqzelkd.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkcnJ5YXpxenJjYXNwcXplbGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1Mzk4NTcsImV4cCI6MjA5NTExNTg1N30.9qXwnbyVHGTFdJ6uhvIi56CmNxjmDG1uIqZarIqkOdI';

function sbHeaders() {
  return {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json'
  };
}

const sb = {
  from(table) {
    const base = SB_URL + '/rest/v1/' + table;
    return {
      select(cols, query) {
        let url = base + '?select=' + (cols || '*');
        if (query) url += '&' + query;
        return fetch(url, { headers: sbHeaders() }).then(r => {
          if (!r.ok) throw new Error(r.status + ' ' + r.statusText);
          return r.json();
        });
      },
      insert(data) {
        return fetch(base, {
          method: 'POST',
          headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
          body: JSON.stringify(data)
        }).then(async r => {
          if (!r.ok) {
            let detail = r.statusText;
            try { const err = await r.json(); detail = err.message || err.msg || JSON.stringify(err); } catch (_) {}
            throw new Error(r.status + ' ' + detail);
          }
          return r.json();
        });
      },
      upsert(data, onConflict) {
        const conflict = onConflict || 'id';
        return fetch(base + '?on_conflict=' + conflict, {
          method: 'POST',
          headers: { ...sbHeaders(), 'Prefer': 'return=representation', 'Prefer-Resolution': 'merge-duplicates' },
          body: JSON.stringify(Array.isArray(data) ? data : [data])
        }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
      },
      update(data, query) {
        return fetch(base + '?' + query, {
          method: 'PATCH',
          headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
          body: JSON.stringify(data)
        }).then(async r => {
          if (!r.ok) {
            let detail = r.statusText;
            try { const err = await r.json(); detail = err.message || err.msg || JSON.stringify(err); } catch (_) {}
            throw new Error(r.status + ' ' + detail);
          }
          return r.json();
        });
      },
      delete(query) {
        return fetch(base + '?' + query, {
          method: 'DELETE',
          headers: sbHeaders()
        }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); });
      }
    };
  }
};

// SHA256 哈希（Web Crypto API，所有现代浏览器支持）
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 连通性测试
(async () => {
  try {
    await sb.from('players').select('count');
    console.log('[Supabase] 连接成功');
  } catch (e) {
    console.warn('[Supabase] 未连接（需先在 Supabase SQL Editor 执行 sql/create_tables.sql）:', e.message);
  }
})();
