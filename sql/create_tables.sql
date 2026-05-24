-- 今日说法足球俱乐部 — 数据表创建
-- 在 Supabase SQL Editor (https://supabase.com/dashboard) 中执行

-- 队员白名单
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  number INTEGER NOT NULL,
  pin_hash VARCHAR(64) NOT NULL,
  role VARCHAR(20) DEFAULT 'player',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 比赛管理
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL DEFAULT '14:40',
  home_team VARCHAR(50) DEFAULT '今日说法',
  away_team VARCHAR(50) NOT NULL,
  venue VARCHAR(100),
  jersey VARCHAR(10),
  jersey_color VARCHAR(10),
  fee DECIMAL DEFAULT 0,
  max_players INTEGER DEFAULT 14,
  max_substitutes INTEGER DEFAULT 4,
  home_score INTEGER,
  away_score INTEGER,
  result VARCHAR(10),
  scorers JSONB DEFAULT '[]',
  assisters JSONB DEFAULT '[]',
  reg_open_at TIMESTAMPTZ NOT NULL,
  reg_close_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 报名记录
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  player_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  cancel_reason VARCHAR(200),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

-- 系统配置
CREATE TABLE IF NOT EXISTS config (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL
);

-- MVP 阶段关闭 RLS
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE config DISABLE ROW LEVEL SECURITY;

-- 插入默认管理员密码
INSERT INTO config (key, value) VALUES ('admin_password', 'admin123')
  ON CONFLICT (key) DO NOTHING;
