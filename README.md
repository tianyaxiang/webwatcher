# WebWatcher 🔍

<p align="center">
  <strong>智能网页变化监控工具</strong> — 精准 Diff 对比 · 多渠道通知 · 模板一键监控
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## ✨ 功能特性

### 🌐 网页监控
- **CSS 选择器定位** — 精准监控页面特定区域
- **JSON API 监控** — 支持 JSONPath 提取数据接口字段
- **SPA 渲染支持** — 通过 Playwright 渲染 React/Vue 等单页应用
- **灵活频率** — 5分钟到1天，6 种检查频率可选

### 🔍 精准 Diff 对比
- **行级差异算法** — 基于 `diff` 库实现精确文本对比
- **可视化侧边栏** — 绿色高亮新增，红色标记删除
- **快照历史** — 查看任意监控目标的完整快照记录
- **智能噪音过滤** — 自动过滤时间戳、广告等动态内容

### 📬 全渠道通知（6 种）
| 渠道 | 说明 |
|------|------|
| 📧 **邮件** | SMTP 发送，HTML 富文本 |
| 🔵 **飞书** | 机器人 Webhook，卡片消息 |
| 🟢 **企业微信** | 群机器人 Webhook |
| 📱 **Server酱** | 推送到微信 |
| ✈️ **Telegram** | Bot API 推送 |
| 💬 **Discord** | Webhook Embed 消息 |
| 🔗 **自定义 Webhook** | 发送 JSON 到任意 URL |

### 🎯 深度抓取配置
- **自定义 Headers** — 支持 Authorization、Referer 等
- **Cookie 注入** — 监控需要登录的页面
- **User-Agent 切换** — 预设 Chrome/Firefox/Safari/Mobile/Googlebot
- **代理池** — HTTP/HTTPS/SOCKS5 代理轮换，自动故障检测

### 📋 监控模板库（14 个预设）
| 分类 | 模板 |
|------|------|
| 开发者 | GitHub Releases · GitHub Commits · NPM 包更新 |
| 新闻资讯 | Hacker News · V2EX 热门 · Product Hunt |
| 电商价格 | 京东 · Amazon |
| 服务状态 | GitHub Status · Cloudflare Status |
| 社交媒体 | 微博热搜 · 知乎热榜 |
| 政府公告 | 政策更新 |

### 🔐 生产就绪
- **Docker 一键部署** — Dockerfile + docker-compose
- **身份认证** — Admin 密码登录，Cookie 会话
- **健康检查** — `/api/health` 端点，Docker 原生支持
- **组件化架构** — 7 个独立 React 组件，易于维护

---

## 🚀 快速开始

### 方式一：本地开发

```bash
# 克隆仓库
git clone https://github.com/tianyaxiang/webwatcher.git
cd webwatcher

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

### 方式二：Docker 部署（推荐生产环境）

```bash
# 克隆仓库
git clone https://github.com/tianyaxiang/webwatcher.git
cd webwatcher

# 编辑配置
cp .env.example .env.local
# 修改 .env.local 中的配置...

# 一键启动
docker compose up -d
```

访问 http://localhost:3000

---

## ⚙️ 环境变量配置

```env
# ============ 基础配置 ============
DATA_DIR=./data                          # 数据存储目录
ADMIN_PASSWORD=your-password             # 管理密码（不设置则无需登录）

# ============ 邮件通知 ============
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com

# ============ 飞书通知 ============
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxx

# ============ 企业微信通知 ============
WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx

# ============ Server酱 (微信推送) ============
SERVERCHAN_KEY=SCTxxx

# ============ Telegram ============
TELEGRAM_BOT_TOKEN=your-bot-token

# ============ 代理池 (可选) ============
PROXY_URLS=http://user:pass@host1:port,socks5://host2:port
```

---

## 📁 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # 登录认证
│   │   ├── capabilities/   # 系统能力查询
│   │   ├── changes/        # 变化记录
│   │   ├── export/         # 数据导出 (Markdown/CSV)
│   │   ├── health/         # 健康检查
│   │   ├── notifications/  # 通知状态与测试
│   │   ├── proxies/        # 代理池管理
│   │   ├── scheduler/      # 调度器控制
│   │   ├── snapshots/      # 快照管理
│   │   ├── stats/          # 统计数据
│   │   ├── targets/        # 监控目标 CRUD
│   │   └── templates/      # 监控模板
│   ├── login/              # 登录页面
│   ├── page.tsx            # 主页面 (仪表盘)
│   └── layout.tsx          # 布局
├── components/
│   ├── AppHeader.tsx       # 顶部导航栏
│   ├── StatsCards.tsx      # 统计卡片
│   ├── TargetList.tsx      # 监控目标列表
│   ├── RecentChanges.tsx   # 最近变化列表
│   ├── ChangeSidebar.tsx   # Diff 对比侧边栏
│   ├── SnapshotPanel.tsx   # 快照历史面板
│   └── AddTargetModal.tsx  # 添加监控弹窗
├── services/
│   ├── webMonitor.ts       # 网页监控核心 (静态/浏览器/JSON)
│   ├── browserRenderer.ts  # Playwright 渲染引擎
│   ├── storage.ts          # 数据存储
│   ├── scheduler.ts        # 定时任务调度器
│   ├── notification.ts     # 多渠道通知
│   ├── proxyPool.ts        # 代理池管理
│   └── templates.ts        # 监控模板定义
├── types/
│   └── index.ts            # TypeScript 类型
├── lib/
│   └── utils.ts            # 工具函数
└── middleware.ts            # 认证中间件
```

---

## 🔧 API 接口

### 监控目标
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/targets` | 获取所有监控目标 |
| `POST` | `/api/targets` | 添加新监控目标 |
| `GET` | `/api/targets/[id]` | 获取目标详情 + 变化记录 |
| `PUT` | `/api/targets/[id]` | 更新监控目标 |
| `DELETE` | `/api/targets/[id]` | 删除监控目标 |
| `POST` | `/api/targets/[id]` | 立即触发检查 |

### 变化记录与快照
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/changes` | 获取变化记录列表 |
| `GET` | `/api/snapshots?targetId=xxx` | 获取目标快照列表 |
| `GET` | `/api/snapshots/[id]` | 获取快照内容 |

### 调度与系统
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/scheduler` | 调度器状态 |
| `POST` | `/api/scheduler` | 控制调度器 (start/stop/check-all) |
| `GET` | `/api/stats` | 监控统计 |
| `GET` | `/api/health` | 健康检查（免认证） |
| `GET` | `/api/capabilities` | 系统能力（Playwright/代理） |

### 通知与导出
| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/notifications` | 通知渠道配置状态 |
| `POST` | `/api/notifications` | 测试通知渠道 |
| `GET` | `/api/export?format=markdown` | 导出 Markdown 报告 |
| `GET` | `/api/export?format=csv` | 导出 CSV 表格 |
| `GET` | `/api/templates` | 获取监控模板列表 |

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth` | 登录（设置 Cookie） |
| `DELETE` | `/api/auth` | 登出 |

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **Next.js 16** | 全栈框架 (App Router) |
| **TypeScript** | 类型安全 |
| **Tailwind CSS 4** | 样式 |
| **Cheerio** | HTML 解析 |
| **Playwright** | SPA 渲染（可选） |
| **diff** | 文本差异算法 |
| **Lucide React** | 图标 |
| **Nodemailer** | 邮件发送 |

---

## 📈 使用场景

- 🛒 **价格监控** — 电商商品价格变动提醒
- 📰 **内容追踪** — 新闻、博客、论坛更新监控
- 🏢 **竞品分析** — 竞争对手网站内容变化
- 🟢 **服务状态** — 第三方服务可用性监控
- 📊 **数据接口** — JSON API 返回值变化检测
- 📜 **政策监控** — 政府公告、法规更新

---

## 📄 License

MIT

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/tianyaxiang">tianyaxiang</a>
</p>
