# WebWatcher 🔍

智能网页变化监控工具 - AI驱动，智能过滤噪音

## ✨ 特性

- 🌐 **网页监控** - 监控任意网页的内容变化
- 🎯 **精准定位** - 支持 CSS 选择器，监控特定区域
- 🤖 **AI 智能过滤** - 自动过滤广告、时间戳等噪音变化
- 📊 **变化分析** - AI 生成变化摘要，评估重要性
- ⏰ **灵活频率** - 5分钟到1天，多种检查频率可选
- 📱 **响应式设计** - 支持桌面和移动端访问
- ⏱️ **定时任务** - 自动按设定频率检查网页
- 📬 **通知系统** - 支持邮件、Webhook、Telegram、Discord通知
- 💾 **数据持久化** - JSON文件存储，数据安全可靠

## 🚀 快速开始

### 安装依赖

```bash
pnpm install
```

### 环境配置

创建 `.env.local` 文件：

```env
# 数据目录 (默认: ./data)
DATA_DIR=./data

# SMTP 邮件配置 (可选)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Telegram 机器人 (可选)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
pnpm build
pnpm start
```

## 📁 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── targets/      # 监控目标 API
│   │   ├── changes/      # 变化记录 API
│   │   ├── stats/        # 统计数据 API
│   │   └── scheduler/    # 调度器 API
│   ├── page.tsx          # 主页面 (仪表盘)
│   ├── layout.tsx        # 布局
│   └── globals.css       # 全局样式
├── services/
│   ├── webMonitor.ts     # 网页监控核心服务
│   ├── storage.ts        # 数据存储服务
│   ├── scheduler.ts      # 定时任务调度器
│   └── notification.ts   # 通知服务
├── types/
│   └── index.ts          # TypeScript 类型定义
└── lib/
    └── utils.ts          # 工具函数
```

## 🔧 API 接口

### 监控目标

- `GET /api/targets` - 获取所有监控目标
- `POST /api/targets` - 添加新监控目标
- `GET /api/targets/[id]` - 获取单个目标详情
- `PUT /api/targets/[id]` - 更新监控目标
- `DELETE /api/targets/[id]` - 删除监控目标
- `POST /api/targets/[id]` - 立即执行检查

### 变化记录

- `GET /api/changes` - 获取变化记录列表
- `GET /api/changes?targetId=xxx` - 获取特定目标的变化

### 统计

- `GET /api/stats` - 获取监控统计数据

### 调度器

- `GET /api/scheduler` - 获取调度器状态
- `POST /api/scheduler` - 控制调度器 (start, stop, check-all, check-one, reschedule)

## 📊 功能详解

### 1. 定时任务 (Scheduler)

WebWatcher 使用内置调度器自动检查网页变化：

- **自动启动**: 通过 `instrumentation.ts` 在应用启动时自动开始调度
- **灵活频率**: 支持 5分钟、15分钟、30分钟、1小时、6小时、1天等频率
- **智能检查**: 只检查启用的目标，避免不必要的请求
- **并发控制**: 防止同一目标的重复检查

### 2. 通知系统 (Notifications)

支持多种通知方式：

- **邮件通知**: 通过 SMTP 发送变化摘要
- **Webhook**: 发送到指定 URL 进行后续处理
- **Telegram**: 发送消息到指定频道
- **Discord**: 发送到 Discord 频道

### 3. AI 智能分析

- **噪音过滤**: 自动识别并过滤时间戳、广告、计数器等动态元素
- **变化摘要**: 生成人类可读的变化描述
- **重要性评估**: 根据变化程度评估重要性等级

### 4. 数据存储

- **JSON 文件**: 采用文件系统存储，无需数据库
- **快照保存**: 保存每次检查的网页快照用于对比
- **变化记录**: 记录所有检测到的变化及其详细信息
- **统计信息**: 实时计算监控统计信息

## 🛠️ 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **网页解析**: Cheerio
- **图标**: Lucide React
- **调度**: Node.js Timer API
- **邮件**: Nodemailer
- **存储**: JSON 文件系统

## 📈 使用场景

- **价格监控**: 监控商品价格变化
- **内容更新**: 监控新闻、博客更新
- **竞品分析**: 监控竞争对手网站变化
- **服务状态**: 监控网站可用性
- **舆情监控**: 监控特定内容变化

## 🚀 部署

### Vercel (推荐)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/webwatcher)

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ using Next.js and AI technology