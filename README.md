# Stock AI Analyzer - 股市AI分析系统

基于 DeepSeek 多模态模型的智能股市分析系统，支持图文分析、复盘和持续学习。

## 🌟 核心功能

- **📊 图文分析**: 上传股市K线图+文字描述，AI智能分析关键点位和操作方向
- **🎯 操作建议**: 自动给出支撑位、阻力位、止损位、目标位和操作方向
- **📝 每日复盘**: 工作日收盘后对比预测vs实际，评估准确性
- **🧠 持续学习**: 自动整合历史复盘结果，不断提升预测准确率

## 🛠️ 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **AI**: DeepSeek 多模态模型
- **存储**: 本地JSON文件（无需数据库）

## 🚀 快速开始

### 1. 克隆项目

```bash
cd stock_analysis_system
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`:

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 DeepSeek API Key:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

> 💡 获取 API Key: https://platform.deepseek.com/

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 📖 使用指南

### 分析股市图表

1. 在首页点击上传区域，选择股市K线图
2. （可选）填写补充描述，如当天市场情况
3. 点击「AI 分析」按钮
4. 等待几秒，查看AI给出的分析结果

### 每日复盘

1. 进入「历史记录」页面
2. 找到待复盘的分析记录
3. 点击「开始复盘」
4. 输入实际最高价、最低价、收盘价
5. （可选）填写复盘总结
6. 提交后系统自动计算准确率

## 📁 项目结构

```
stock_analysis_system/
├── app/
│   ├── api/                  # API路由
│   │   ├── analyze/          # 分析API
│   │   ├── analyses/         # 获取历史记录
│   │   └── reviews/          # 复盘API
│   ├── history/              # 历史记录页面
│   ├── page.tsx              # 首页
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式
├── lib/
│   ├── deepseek.ts           # DeepSeek API集成
│   └── storage.ts            # 文件存储系统
├── types/
│   └── index.ts              # TypeScript类型定义
├── data/
│   ├── analyses.json         # 分析记录存储
│   ├── reviews.json          # 复盘记录存储
│   └── uploads/              # 上传图片
└── public/
    └── uploads/              # 公开访问的图片
```

## 🔧 核心原理

### 持续学习机制

系统会自动将历史复盘结果作为 context 传给 DeepSeek API：

1. 每次分析时，读取最近5条已复盘的分析
2. 整理成「预测 vs 实际」的对比数据
3. 作为历史经验添加到 AI Prompt 中
4. AI 参考过往成功/失败案例，提升准确率

### 准确率计算

简单算法（可自行优化）：

- 方向正确 + 价格接近目标 = 70-100分
- 方向正确但价格偏差较大 = 40-70分
- 方向错误 = 0-30分

## 🎨 UI 设计

- **极简风格**: 白底黑字，去除多余元素
- **响应式**: 支持桌面和移动端
- **现代化**: 圆角、阴影、过渡动画

## ⚙️ 部署

### Vercel（推荐）

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 添加环境变量 `DEEPSEEK_API_KEY`
4. 部署完成

### 本地生产环境

```bash
npm run build
npm run start
```

## 📝 注意事项

- DeepSeek API 需要付费使用
- 图片文件会保存在本地，注意磁盘空间
- JSON 文件适合中小规模数据（< 10000条）
- 如需处理大量数据，建议迁移到数据库

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

ISC License

---

**Powered by DeepSeek AI** 🚀
