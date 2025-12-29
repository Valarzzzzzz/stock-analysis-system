-- ============================================
-- 股市AI分析系统 - Supabase 数据库表结构
-- ============================================
-- 使用说明：
-- 1. 登录 Supabase Dashboard (https://supabase.com)
-- 2. 进入你的项目
-- 3. 点击左侧 "SQL Editor"
-- 4. 复制粘贴此文件内容并执行
-- ============================================

-- 1. 分析记录表
CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  stock_code TEXT,
  date TEXT NOT NULL,
  image_url TEXT NOT NULL,
  user_input TEXT,
  ai_analysis JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_review', 'reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_date ON analyses(date);

-- 2. 复盘记录表
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  actual_high NUMERIC NOT NULL,
  actual_low NUMERIC NOT NULL,
  actual_close NUMERIC NOT NULL,
  accuracy INTEGER NOT NULL,
  feedback TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_analysis_id ON reviews(analysis_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_at ON reviews(reviewed_at DESC);

-- 3. 对话记录表
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- 4. 复盘对话表
CREATE TABLE IF NOT EXISTS review_conversations (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  actual_data JSONB,
  accuracy INTEGER,
  status TEXT NOT NULL CHECK (status IN ('ongoing', 'completed')),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_conversations_analysis_id ON review_conversations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_review_conversations_status ON review_conversations(status);
CREATE INDEX IF NOT EXISTS idx_review_conversations_updated_at ON review_conversations(updated_at DESC);

-- ============================================
-- 可选：启用 Row Level Security (RLS)
-- 如果你想让数据公开访问，可以跳过这部分
-- ============================================

-- 启用 RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_conversations ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（适用于个人项目）
CREATE POLICY "Allow all operations on analyses" ON analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on review_conversations" ON review_conversations FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 完成！现在你的数据库已经准备好了
-- ============================================

-- 验证表是否创建成功
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('analyses', 'reviews', 'conversations', 'review_conversations');
