# Supabase 数据库部署指南

## 📋 概述

本项目使用 Supabase 作为数据库，需要执行以下步骤完成数据库部署。

## 🔧 步骤一：执行数据库迁移

### 1. 登录 Supabase
访问 https://supabase.com 并登录

### 2. 选择你的项目
进入你的 Stock Analysis System 项目

### 3. 打开 SQL Editor
左侧菜单 → SQL Editor → New Query

### 4. 执行迁移脚本
将 `supabase-migration.sql` 的内容粘贴到编辑器中，点击 "Run"

```sql
-- 脚本会自动创建:
-- 1. review_conversations 表（对话级复盘）
-- 2. 相关索引
-- 3. RLS 策略
```

### 5. 验证表结构
执行以下查询验证表是否创建成功：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('conversations', 'analyses', 'reviews', 'review_conversations');
```

应该返回 4 个表。

## 📊 数据库结构说明

### 现有表（已存在）

**conversations** - 对话记录
- `id` - 对话ID
- `title` - 对话标题
- `messages` - 消息列表（JSONB）
- `created_at` - 创建时间
- `updated_at` - 更新时间

**analyses** - 单个分析记录（旧系统）
- `id` - 分析ID
- `stock_code` - 股票代码
- `date` - 分析日期
- `image_url` - K线图URL
- `user_input` - 用户输入
- `ai_analysis` - AI分析结果（JSONB）
- `status` - 状态
- `created_at` - 创建时间

**reviews** - 单个分析的复盘（旧系统）
- `id` - 复盘ID
- `analysis_id` - 关联的分析ID
- `actual_high` - 实际最高价
- `actual_low` - 实际最低价
- `actual_close` - 实际收盘价
- `accuracy` - 准确率
- `feedback` - 反馈
- `reviewed_at` - 复盘时间

### 新增表（本次更新）

**review_conversations** - 对话级复盘（新系统）
- `id` - 复盘对话ID
- `conversation_id` - 关联的原始对话ID
- `messages` - 复盘讨论消息（JSONB数组）
- `predictions` - 所有预测的复盘结果（JSONB数组）
  ```json
  [
    {
      "messageId": "消息ID",
      "imageUrl": "图片URL",
      "prediction": {
        "keyLevels": { "support": 100, "resistance": 110 },
        "direction": "做多",
        "stopLoss": 95,
        "target": 115
      },
      "actualData": {
        "actualHigh": 112,
        "actualLow": 98,
        "actualClose": 108
      },
      "accuracy": 85
    }
  ]
  ```
- `overall_accuracy` - 平均准确率（0-100）
- `quality_score` - 整体质量评分（0-100）
- `status` - 状态：'ongoing' | 'completed'
- `created_at` - 创建时间
- `updated_at` - 更新时间

## 🔄 步骤二：切换到 Supabase 存储

### 1. 确认当前使用的存储
检查项目中是否使用了正确的 storage 文件：

```bash
# 当前应该使用 storage.ts（文件系统版本）
# 需要切换为 storage.supabase.ts
```

### 2. 重命名文件
```bash
cd /Users/zhousong/Desktop/stock_analysis_system/stock_analysis_system

# 备份当前的文件系统版本
mv lib/storage.ts lib/storage.fs.backup.ts

# 使用 Supabase 版本
cp lib/storage.supabase.ts lib/storage.ts
```

### 3. 配置环境变量
确保 Vercel 中配置了以下环境变量：

```env
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥

# AI配置
QWEN_API_KEY=sk-d6b2144c2e5a45a09a474aaf2056ecf0
DEEPSEEK_API_KEY=你的DeepSeek Key

# 环境
NODE_ENV=production
```

获取 Supabase 配置：
1. 访问 Supabase Dashboard
2. Settings → API
3. 复制 `Project URL` 和 `anon public` key

## 🚀 步骤三：部署到 Vercel

### 1. 提交代码
```bash
git add .
git commit -m "chore: 切换到Supabase存储"
git push origin main
```

### 2. Vercel 自动部署
- 访问 https://vercel.com/dashboard
- 等待构建完成
- 检查环境变量是否已配置

### 3. 测试功能

访问你的部署域名，测试：

✅ **基础功能**
- 登录（密码：20251230）
- 创建对话
- 上传K线图分析

✅ **对话级复盘**
- 进入复盘中心（`/review`）
- 选择一个对话开始复盘
- 上传实际K线图
- 查看三种准确率计算结果

✅ **旧系统兼容**
- 历史分析（`/history`）
- 单个分析复盘

## 🔍 故障排查

### 问题1：Supabase连接失败
**错误**: `supabase is not defined`

**解决**:
1. 检查 `lib/supabase.ts` 文件是否存在
2. 确认环境变量已在 Vercel 配置
3. 重新部署项目

### 问题2：review_conversations 表不存在
**错误**: `relation "review_conversations" does not exist`

**解决**:
1. 执行 `supabase-migration.sql`
2. 在 Supabase SQL Editor 中验证表是否创建成功

### 问题3：数据迁移
**场景**: 需要将本地 JSON 数据迁移到 Supabase

**解决**:
1. 导出本地 data/ 目录的 JSON 文件
2. 编写迁移脚本将数据导入 Supabase
3. 或者选择重新开始（建议，因为是测试数据）

## 📌 重要提示

1. **数据库迁移不可逆**：执行前请备份数据
2. **环境变量必须配置**：否则应用无法连接数据库
3. **旧系统保留**：analyses 和 reviews 表保留用于向后兼容
4. **新旧系统共存**：单个分析复盘和对话级复盘可以同时使用

## ✅ 完成检查清单

- [ ] 执行 `supabase-migration.sql` 创建 review_conversations 表
- [ ] 验证表结构正确
- [ ] 切换 storage.ts 为 Supabase 版本
- [ ] 配置 Supabase 环境变量
- [ ] 提交代码并推送到 GitHub
- [ ] Vercel 自动部署成功
- [ ] 测试登录功能
- [ ] 测试对话创建和分析
- [ ] 测试对话级复盘功能
- [ ] 测试旧系统历史分析功能

## 🎉 部署完成！

数据库已更新到最新版本，支持：
- 混合模型策略（qwen-vl-plus + qwen-plus/deepseek）
- 对话级复盘（一次复盘多个预测）
- 三种准确率计算（单个、平均、质量评分）
- 密码保护功能
