# 🚀 Vercel 部署指南（完全免费方案）

本指南将帮助你把股市AI分析系统部署到 Vercel，使用完全免费的云服务。

---

## 📋 前置准备

在开始部署前，你需要注册以下免费账号：

1. **Vercel** - 部署平台
   - 访问：https://vercel.com
   - 用 GitHub 账号登录

2. **Supabase** - 数据库服务
   - 访问：https://supabase.com
   - 用 GitHub 账号登录
   - 免费额度：500MB 数据库，无限API请求

3. **Cloudinary** - 图片存储服务
   - 访问：https://cloudinary.com
   - 注册免费账号
   - 免费额度：25GB 存储 + 25GB 带宽/月

---

## 第一步：配置 Supabase 数据库

### 1. 创建 Supabase 项目

1. 登录 https://supabase.com
2. 点击 "New Project"
3. 填写信息：
   - Name: `stock-analysis-db`
   - Database Password: 设置一个强密码（记住它！）
   - Region: 选择 `Northeast Asia (Tokyo)` 或离你最近的
4. 点击 "Create new project"，等待 2-3 分钟

### 2. 执行数据库初始化脚本

1. 在 Supabase Dashboard，点击左侧 "SQL Editor"
2. 点击 "New query"
3. 打开项目中的 `supabase-schema.sql` 文件
4. 复制全部内容，粘贴到 SQL Editor
5. 点击 "Run" 执行脚本
6. 确认看到 "Success" 提示

### 3. 获取 API 凭证

1. 点击左侧 "Settings" > "API"
2. 记录以下信息（稍后会用到）：
   ```
   Project URL: https://xxxxx.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 第二步：配置 Cloudinary 图片存储

### 1. 创建 Cloudinary 账号

1. 访问 https://cloudinary.com
2. 点击 "Sign Up For Free"
3. 填写信息并注册

### 2. 获取 API 凭证

1. 登录后进入 Dashboard
2. 在首页可以看到：
   ```
   Cloud Name: your-cloud-name
   API Key: 123456789012345
   API Secret: xxxxxxxxxxxxxxxxxxx
   ```
3. 记录这三个值（稍后会用到）

---

## 第三步：部署到 Vercel

### 方案 A：通过 Git 部署（推荐）

#### 1. 推送代码到 GitHub

```bash
# 进入项目目录
cd /Users/zhousong/Desktop/stock_analysis_system/stock_analysis_system

# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Ready for Vercel deployment"

# 创建 GitHub 仓库后推送
git remote add origin https://github.com/your-username/stock-analysis.git
git branch -M main
git push -u origin main
```

#### 2. 从 Vercel 导入项目

1. 访问 https://vercel.com/new
2. 点击 "Import Git Repository"
3. 选择你刚才推送的 GitHub 仓库
4. 点击 "Import"

#### 3. 配置环境变量

在 Vercel 部署页面，点击 "Environment Variables"，添加以下变量：

```env
DEEPSEEK_API_KEY=sk-你的DeepSeek-API-Key

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxx
```

**重要提示：**
- `NEXT_PUBLIC_` 开头的变量会暴露给前端，这是正常的
- `CLOUDINARY_API_SECRET` 不要暴露给前端
- 不要在 GitHub 公开仓库中包含 `.env.local` 文件

#### 4. 开始部署

1. 点击 "Deploy"
2. 等待 2-3 分钟
3. 部署成功后，你会获得一个网址：`https://your-app.vercel.app`

---

### 方案 B：通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 添加环境变量（交互式）
vercel env add DEEPSEEK_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET

# 重新部署以应用环境变量
vercel --prod
```

---

## 第四步：验证部署

### 1. 访问你的网站

打开 Vercel 提供的网址，例如：`https://your-app.vercel.app`

### 2. 测试功能

1. **上传图片测试**
   - 上传一张 K 线图
   - 点击 "AI 分析"
   - 检查是否能正常分析

2. **查看历史记录**
   - 点击 "历史记录"
   - 确认能看到刚才的分析

3. **检查 Supabase 数据**
   - 回到 Supabase Dashboard
   - 点击 "Table Editor"
   - 选择 `analyses` 表
   - 应该能看到刚才的分析记录

4. **检查 Cloudinary 图片**
   - 访问 Cloudinary Dashboard
   - 点击 "Media Library"
   - 应该能看到上传的图片

---

## 🐛 常见问题排查

### Q1: 部署后报错 "Missing Supabase environment variables"

**解决方法：**
1. 检查 Vercel 环境变量是否正确添加
2. 确保变量名拼写正确（区分大小写）
3. 重新部署：`vercel --prod`

### Q2: 图片上传失败

**可能原因：**
- Cloudinary 凭证错误
- API Secret 没有正确设置

**解决方法：**
1. 检查 Cloudinary Dashboard 中的凭证
2. 确认环境变量拼写正确
3. 在 Vercel Dashboard > Settings > Environment Variables 中重新检查

### Q3: 数据库连接失败

**可能原因：**
- Supabase URL 或 Key 错误
- RLS 策略配置问题

**解决方法：**
1. 重新检查 Supabase API 凭证
2. 确认 `supabase-schema.sql` 已正确执行
3. 在 Supabase Dashboard 检查 RLS 策略是否启用

### Q4: Vercel 部署超时

**解决方法：**
- 检查 `package.json` 中的依赖是否有问题
- 尝试删除 `node_modules` 和 `package-lock.json`，重新 `npm install`

### Q5: 本地可以运行，但部署后不行

**检查清单：**
1. 所有环境变量是否在 Vercel 中设置？
2. `.env.local` 文件是否被 `.gitignore` 忽略了（应该被忽略）？
3. Supabase 数据库表是否正确创建？
4. Cloudinary 账号是否正常激活？

---

## 🔧 本地开发配置

如果你想在本地测试 Vercel 版本的代码：

### 1. 创建 `.env.local` 文件

```bash
cp .env.example .env.local
```

### 2. 填入真实的环境变量

编辑 `.env.local`，填入你在 Supabase 和 Cloudinary 获取的凭证。

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 测试。

---

## 📊 免费额度说明

### Vercel 免费版限制

- ✅ 无限次部署
- ✅ 100GB 带宽/月
- ✅ 自动 HTTPS
- ⚠️ 函数执行时间限制：10秒
- ⚠️ 函数内存限制：1GB

### Supabase 免费版限制

- ✅ 500MB 数据库存储
- ✅ 无限 API 请求
- ✅ 1GB 文件存储
- ⚠️ 项目闲置 7 天会暂停（访问后自动恢复）

### Cloudinary 免费版限制

- ✅ 25GB 存储
- ✅ 25GB 带宽/月
- ✅ 25,000 次图片转换/月
- ⚠️ 超额后需要升级

**对于个人使用，这些免费额度完全够用！**

---

## 🎯 下一步优化

部署成功后，你可以：

1. **绑定自定义域名**
   - 在 Vercel Dashboard > Settings > Domains
   - 添加你的域名（如 `stock.yourdomain.com`）

2. **设置自动部署**
   - 每次 push 到 GitHub 主分支，Vercel 会自动部署
   - 在 Vercel Dashboard > Git 中配置

3. **监控性能**
   - 在 Vercel Dashboard > Analytics 查看访问数据
   - 在 Supabase Dashboard > Logs 查看数据库日志

4. **备份数据**
   - 定期导出 Supabase 数据库
   - SQL Editor 中执行：`SELECT * FROM analyses;` 并导出

---

## 💰 成本估算

**完全免费方案（个人使用）：**
- Vercel: ¥0
- Supabase: ¥0
- Cloudinary: ¥0
- DeepSeek API: 约 ¥30-90/月（根据使用量）

**总成本：¥30-90/月**（仅 API 调用费用）

---

## 📞 获取帮助

如果遇到问题：

1. 查看 Vercel 部署日志：Dashboard > Deployments > 点击部署记录 > View Function Logs
2. 查看 Supabase 数据库日志：Dashboard > Logs
3. 查看浏览器控制台错误：F12 > Console

---

**祝你部署顺利！** 🎉

如有问题，请检查本文档的"常见问题排查"部分。
