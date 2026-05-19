# Nail App

美甲预约与作品展示平台，支持美甲师发布作品、顾客浏览预约。

## 功能

- 作品发现：瀑布流浏览美甲作品，支持分类筛选
- 美甲师主页：个人简介、作品集、评分
- 预约系统：顾客在线预约，美甲师管理预约状态
- 评论与回复：微博风格嵌套回复，支持 @用户
- 收藏：收藏喜欢的作品
- 评价：预约完成后发布评价
- 通知：系统消息推送
- 双角色：同一账号支持美甲师 / 顾客两种身份

## 技术栈

**Mobile** — React Native (Expo 54) + TypeScript
- 路由：expo-router (file-based)
- 状态管理：Zustand
- HTTP：Axios
- 图标：@expo/vector-icons (Ionicons)

**Server** — Node.js + Express 5 + TypeScript
- 数据库：PostgreSQL (pg)
- 认证：JWT (jsonwebtoken) + bcryptjs
- 文件上传：Multer
- 安全：Helmet + CORS

## 目录结构

```
nail-app/
├── mobile/          # Expo React Native 应用
│   ├── app/         # 页面（file-based routing）
│   ├── components/  # 公共组件
│   ├── services/    # API 请求层
│   ├── stores/      # Zustand 状态
│   └── constants/   # 颜色等常量
├── server/          # Express API 服务
│   ├── src/
│   │   ├── controllers/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   ├── services/
│   │   └── config/
│   └── migrations/  # SQL 迁移文件
└── shared/          # 共享类型定义
```

## 本地开发

### 前置条件

- Node.js 20+
- PostgreSQL
- Expo Go（手机）或模拟器

### Server

```bash
cd server
npm install

# 复制环境变量模板并填写
cp .env.example .env.local

# 执行数据库迁移
bash migrations/run.sh

# 启动开发服务器
npm run dev
```

### Mobile

```bash
cd mobile
npm install

# 启动 Expo
npm start
```

扫描二维码或按 `i` / `a` 启动模拟器。

`mobile/services/api.ts` 中的 `BASE_URL` 改为本机局域网 IP（如 `http://192.168.x.x:3000`）。

## 生产部署（EC2）

```bash
# 安装依赖 & 编译
cd server
npm install
npm run build

# 填写生产环境变量
cp .env.example .env.production
# 编辑 .env.production，填入 DB 信息、JWT_SECRET、域名等

# 用 pm2 启动
NODE_ENV=production pm2 start dist/index.js --name nail-app
```

### 环境变量说明

| 变量 | 说明 | 示例 |
|------|------|------|
| `NODE_ENV` | 环境标识 | `production` |
| `PORT` | 监听端口 | `3000` |
| `BASE_URL` | 服务器公网地址 | `https://your-domain.com` |
| `DB_HOST` | PostgreSQL 主机 | `localhost` |
| `DB_PORT` | PostgreSQL 端口 | `5432` |
| `DB_NAME` | 数据库名 | `nail_app` |
| `DB_USER` | 数据库用户 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | |
| `JWT_SECRET` | JWT 签名密钥（必填） | 随机长字符串 |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `UPLOADS_DIR` | 图片上传目录 | `/var/www/nail-app/uploads` |
| `CORS_ORIGIN` | 允许的跨域来源 | `*` 或逗号分隔的地址 |

> `.env.local` 和 `.env.production` 已加入 `.gitignore`，不会提交到仓库。
