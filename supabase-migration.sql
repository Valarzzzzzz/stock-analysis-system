-- ========================================
-- Supabase数据库迁移脚本
-- 更新日期: 2025-12-30
-- 功能: 支持对话级复盘功能
-- ========================================

-- 步骤1: 检查表是否存在，如果存在则删除旧表（谨慎操作！）
-- 如果你有重要数据，请先备份
DROP TABLE IF EXISTS review_conversations CASCADE;

-- 步骤2: 创建新的对话级复盘表
CREATE TABLE review_conversations (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  predictions JSONB NOT NULL DEFAULT '[]',
  overall_accuracy INTEGER,
  quality_score INTEGER,
  status TEXT NOT NULL DEFAULT 'ongoing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步骤3: 为conversation_id创建索引
CREATE INDEX idx_review_conversations_conversation_id
ON review_conversations(conversation_id);

-- 步骤4: 为status创建索引
CREATE INDEX idx_review_conversations_status
ON review_conversations(status);

-- 4. 添加注释
COMMENT ON TABLE review_conversations IS '对话级复盘记录表';
COMMENT ON COLUMN review_conversations.id IS '复盘对话唯一ID';
COMMENT ON COLUMN review_conversations.conversation_id IS '关联的原始对话ID';
COMMENT ON COLUMN review_conversations.messages IS '复盘讨论消息列表（JSON数组）';
COMMENT ON COLUMN review_conversations.predictions IS '对话中所有预测的复盘结果（JSON数组）';
COMMENT ON COLUMN review_conversations.overall_accuracy IS '平均准确率（0-100）';
COMMENT ON COLUMN review_conversations.quality_score IS '整体对话质量评分（0-100）';
COMMENT ON COLUMN review_conversations.status IS '状态: ongoing(进行中) | completed(已完成)';

-- 5. 启用RLS（Row Level Security）
ALTER TABLE review_conversations ENABLE ROW LEVEL SECURITY;

-- 6. 创建RLS策略（允许所有操作，可根据需要调整）
CREATE POLICY "Enable all operations for review_conversations"
ON review_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- ========================================
-- 验证脚本（可选，用于检查表结构）
-- ========================================

-- 查看表结构
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'review_conversations'
ORDER BY ordinal_position;

-- 查看索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'review_conversations';
