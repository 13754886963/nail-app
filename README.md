# Nail App

美甲预约与作品展示平台，支持美甲师发布作品、顾客浏览预约。

## 功能

- 作品发现：瀑布流浏览美甲作品，支持分类筛选
- 美甲师列表：含服务分（基于评分 × 评价数加权）、完成单数
- 美甲师主页：个人简介、作品集、收到的评论、粉丝列表、评分展示
- 预约系统：顾客在线预约（含参考图上传）、美甲师管理预约状态（确认/拒绝/完成）
- 可预约时间设置：美甲师设定每周可用时间段，顾客预约时实时校验
- 评价系统：预约完成后顾客发布评价（1-5星+文字），美甲师可回复
- 评论：作品详情页评论，支持点赞/收藏
- 双角色：同一账号支持美甲师 / 顾客两种身份

## 技术栈

**Mobile** — React Native 0.81.5 + Expo SDK 54 + TypeScript
- 路由：expo-router 6（file-based）
- 状态管理：Zustand 5
- HTTP：Axios
- 图片：expo-image
- 图标：@expo/vector-icons (Ionicons)
- 日期选择：@react-native-community/datetimepicker
- 安全存储：expo-secure-store
- New Architecture 已启用（`newArchEnabled: true`）

**Server** — Node.js 20 + Express 5 + TypeScript
- 数据库：PostgreSQL（pg）
- 认证：JWT（jsonwebtoken）+ bcryptjs
- 文件上传：Multer → 本地 `uploads/` 目录
- 进程管理（生产）：PM2

## 目录结构

```
nail-app/
├── mobile/
│   ├── app/
│   │   ├── (auth)/          # 登录、注册
│   │   ├── (customer)/      # 顾客 Tab：发现/预约/我的
│   │   ├── (artist)/        # 美甲师 Tab：发现/作品/预约管理/我的
│   │   ├── artist/[id].tsx  # 美甲师公开主页（顾客视角）
│   │   ├── style/[id].tsx   # 作品详情
│   │   ├── appointment/[id].tsx  # 预约详情
│   │   ├── works/upload.tsx # 作品上传
│   │   └── settings/        # 设置（个人资料、可预约时间等）
│   ├── components/
│   │   ├── DiscoverFeed.tsx # 发现页（作品+美甲师 Tab）
│   │   ├── Avatar.tsx
│   │   └── BouncingDots.tsx # 下拉刷新动画
│   ├── services/            # API 请求层
│   ├── stores/              # Zustand（authStore、badgeStore）
│   └── constants/           # colors.ts
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middlewares/
│   │   └── config/
│   ├── migrations/          # 001~019 SQL 迁移
│   └── uploads/             # 上传的图片（生产环境配置持久存储）
└── shared/                  # 共享类型定义
```

## 本地开发

### 前置条件

- Node.js 20+
- PostgreSQL（本地已建库 `nail_app`）
- 手机安装 Expo Go（注意：本项目含原生模块，**需要 Development Build**，无法直接用标准 Expo Go）

### 1. Server

```bash
cd server
npm install
cp .env.example .env.local   # 填写 DB 信息和 JWT_SECRET
```

执行数据库迁移（001 ~ 019 按顺序）：

```bash
# macOS / Linux（无密码本地 PostgreSQL）
for f in migrations/0*.sql; do psql -U <DB_USER> -d nail_app -f "$f"; done

# 或逐个执行
psql -U <DB_USER> -d nail_app -f migrations/001_create_users.sql
# ... 到 019
```

启动开发服务器：

```bash
npm run dev    # ts-node-dev，改动自动重启，监听 :3000
```

### 2. Mobile

```bash
cd mobile
npm install
```

**修改 API 地址**（开发时指向本机局域网 IP）：

`mobile/services/api.ts` 中：
```ts
const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://<你的局域网IP>:3000/api';
```

或在 `mobile/.env` 中设置：
```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api
```

启动：

```bash
npx expo start
```

> 由于项目使用了 `@react-native-community/datetimepicker` 等原生模块，需要构建 Development Build 而非直接使用标准 Expo Go：
> ```bash
> eas build --profile development --platform android  # 或 ios
> ```

## 生产环境（AWS EC2）

**当前部署：** `ubuntu@54.248.67.35`，SSH Key：`/Users/gyuukaki/Documents/project/AWS/aws-key.pem`

```bash
ssh -i /path/to/aws-key.pem ubuntu@54.248.67.35
```

### 部署流程

```bash
cd /home/ubuntu/nail-app

# 拉取最新代码
git pull origin main

# 编译
cd server && npm run build

# 重启服务
pm2 restart nail-app
pm2 status
```

### 数据库迁移（EC2）

EC2 上的 PostgreSQL 使用密码认证，需加 `-h localhost`：

```bash
PGPASSWORD=$(grep DB_PASSWORD /home/ubuntu/nail-app/server/.env.production | cut -d= -f2) \
  psql -h localhost -U nailapp -d nail_app -f migrations/0XX_xxx.sql
```

### PM2 路径（nvm 环境）

```bash
~/.nvm/versions/node/$(ls ~/.nvm/versions/node | tail -1)/bin/pm2 restart nail-app
```

### 环境变量（server/.env.production）

| 变量 | 说明 | 示例 |
|------|------|------|
| `PORT` | 监听端口 | `3000` |
| `DB_HOST` | PostgreSQL 主机 | `localhost` |
| `DB_PORT` | PostgreSQL 端口 | `5432` |
| `DB_NAME` | 数据库名 | `nail_app` |
| `DB_USER` | 数据库用户 | `nailapp` |
| `DB_PASSWORD` | 数据库密码 | |
| `JWT_SECRET` | JWT 签名密钥（必填，随机长字符串） | |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |

## 打包 APK（Android，免费）

```bash
cd mobile
npm install -g eas-cli
eas login          # 需要 expo.dev 账号（免费注册）
eas build:configure
eas build -p android --profile preview
```

构建完成后下载 APK，开启手机"允许未知来源安装"即可分发。免费账号每月 30 次构建。
