# 🚀 部署清单 - 跟着做就行

## ✅ 第一步：Supabase 数据库配置（5分钟）

### 1. 执行 SQL 脚本

在 Supabase Dashboard：
1. 点击左侧 **SQL Editor**
2. 点击 **New query**
3. 复制下面的 SQL 代码，粘贴进去
4. 点击 **Run**

```sql
-- 创建数据库表
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

CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_date ON analyses(date);

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

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

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

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on analyses" ON analyses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on reviews" ON reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on review_conversations" ON review_conversations FOR ALL USING (true) WITH CHECK (true);
```

### 2. 获取 API 凭证

在 Supabase Dashboard：
1. 点击左侧 **Settings** (⚙️)
2. 点击 **API**
3. 复制并保存（待会要用）：
   - **Project URL**：https://xxxxx.supabase.co
   - **anon public key**：eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

---

## ✅ 第二步：Cloudinary 图片存储配置（3分钟）

### 1. 注册 Cloudinary

1. 访问 https://cloudinary.com
2. 点击 **Sign Up For Free**
3. 填写邮箱、密码注册
4. 验证邮箱

### 2. 获取 API 凭证

登录后在 Dashboard 首页，复制并保存：
- **Cloud Name**：你的云名称
- **API Key**：数字串
- **API Secret**：字母数字混合串

---

## ✅ 第三步：部署到 Vercel（2分钟）

### 1. 导入项目

1. 访问 https://vercel.com/new
2. 用 GitHub 登录
3. 找到 **stock-analysis-system** 仓库
4. 点击 **Import**

### 2. 添加环境变量

在部署配置页面，点击 **Environment Variables**，添加以下 6 个变量：

**变量 1：**
```
Name: DEEPSEEK_API_KEY
Value: sk-你的DeepSeek-API-Key
```

**变量 2：**
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: 粘贴你的Supabase Project URL
```

**变量 3：**
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: 粘贴你的Supabase anon public key
```

**变量 4：**
```
Name: CLOUDINARY_CLOUD_NAME
Value: 粘贴你的Cloudinary Cloud Name
```

**变量 5：**
```
Name: CLOUDINARY_API_KEY
Value: 粘贴你的Cloudinary API Key
```

**变量 6：**
```
Name: CLOUDINARY_API_SECRET
Value: 粘贴你的Cloudinary API Secret
```

### 3. 部署

点击 **Deploy** 按钮，等待 2-3 分钟。

---

## 🎉 完成！

部署成功后，Vercel 会给你一个网址，例如：
```
https://stock-analysis-system.vercel.app
```

访问这个网址，测试功能！

---

## 📝 环境变量总结

你需要准备这 6 个值：

| 变量名 | 从哪里获取 |
|--------|-----------|
| DEEPSEEK_API_KEY | https://platform.deepseek.com |
| NEXT_PUBLIC_SUPABASE_URL | Supabase > Settings > API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase > Settings > API |
| CLOUDINARY_CLOUD_NAME | Cloudinary Dashboard |
| CLOUDINARY_API_KEY | Cloudinary Dashboard |
| CLOUDINARY_API_SECRET | Cloudinary Dashboard |

---

## ❓ 遇到问题？

### Vercel 部署失败
- 检查环境变量是否都正确填写
- 确保没有多余的空格

### 数据库连接失败
- 确认 SQL 脚本已成功执行
- 检查 Supabase URL 和 Key 是否正确

### 图片上传失败
- 确认 Cloudinary 凭证正确
- 检查 API Secret 没有泄露

---

**祝你部署顺利！** 🚀
