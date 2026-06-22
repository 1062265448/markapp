# MarkApp — 镍板标签识别 APP

## 项目概述

基于本地 OCR + 条码扫描的镍板标签智能识别系统。移动端拍照上传镍板标签图片，后端调用 RapidOCR 本地 OCR 识别 + zxing-cpp 条码扫描，执行规则校验、自动纠错和置信度评分。支持喷码 OCR 识别和喷码与标签信息一致性对比。

## 架构

```
markapp/
├── backend/               # NestJS 11 后端 API（端口 3003）
│   ├── src/
│   │   ├── main.ts              # 启动入口（CORS via ConfigService、全局管道、异常过滤器、shutdown hooks）
│   │   ├── app.module.ts        # 根模块（TypeORM + MySQL、ScheduleModule、ConfigModule）
│   │   ├── config/              # 配置模块
│   │   │   ├── config.module.ts
│   │   │   └── config.service.ts      # NickelConfigService — 所有环境变量集中读取
│   │   ├── common/              # 公共模块（@Global）
│   │   │   ├── common.module.ts
│   │   │   ├── filters/
│   │   │   │   └── http-exception.filter.ts  # AllExceptionsFilter — 防堆栈泄露
│   │   │   └── services/
│   │   │       ├── ocr-utils.ts           # OCR 共享工具（normalizeDigits/Date/Weight/BatchNo、callOcrFull、pickBestBarcode）
│   │   │       ├── label-ocr.service.ts  # 标签 OCR 识别（RapidOCR + zxing-cpp）
│   │   │       ├── spraycode-ocr.service.ts  # 喷码 OCR 识别（RapidOCR + zxing-cpp）
│   │   │       ├── barcode-parser.service.ts # 条码解析（车间/批号/包号/重量编码）
│   │   │       ├── rule-checker.service.ts   # 规则校验 + 自动纠错（O→0、l→1等）
│   │   │       ├── confidence.service.ts     # 置信度评分（null字段/纠正/校验维度）
│   │   │       ├── spraycode-compare.service.ts # 喷码与标签字段对比
│   │   │       ├── image-preprocess.service.ts  # 图片格式/大小验证+预处理
│   │   │       └── image-storage.service.ts     # 本地文件系统图片存储（按日期目录）
│   │   └── nickel/              # 业务模块
│   │       ├── nickel.module.ts
│   │       ├── nickel.controller.ts    # REST API 端点
│   │       ├── nickel.service.ts       # 核心业务：OCR识别→纠错→校验→评分
│   │       ├── nickel-history.service.ts # MySQL 对比记录 CRUD + 定时清理
│   │       ├── dto/recognize.dto.ts
│   │       ├── guards/
│   │       │   ├── api-key.guard.ts    # API Key 认证（timingSafeEqual）
│   │       │   └── rate-limit.guard.ts # 内存限流（窗口/次数可配置）
│   │       ├── entities/
│   │       │   ├── compare-record.entity.ts  # 对比记录表
│   │       │   └── compare-image.entity.ts   # 图片引用表（FK CASCADE，10天自动清理）
│   │       └── types/nickel.types.ts   # 所有 TypeScript 接口定义
│   ├── package.json
│   ├── nest-cli.json
│   └── tsconfig.json
│
└── mobile/                # Vue 3 + Capacitor 8 移动端
    ├── src/
    │   ├── main.ts
    │   ├── App.vue
    │   ├── api/
    │   │   ├── request.ts            # Axios 实例（原生/浏览器环境自动切换 baseURL）
    │   │   └── nickel.ts            # API 封装（recognize/spraycode/compare/history）
    │   ├── components/
    │   │   ├── ResultCard.vue        # 标签识别结果卡片
    │   │   ├── CompareResultCard.vue # 对比结果卡片
    │   │   └── TabBar.vue           # 底部导航栏
    │   ├── composables/
    │   │   ├── useCamera.ts          # 相机拍照（Capacitor Camera 插件）
    │   │   └── useToast.ts           # Toast 提示
    │   ├── views/
    │   │   ├── HomeView.vue          # 标签识别首页
    │   │   ├── CompareView.vue       # 喷码对比页
    │   │   ├── ResultView.vue        # 结果详情页
    │   │   ├── HistoryView.vue       # 历史记录页（分页+服务端API驱动）
    │   │   ├── LoginView.vue         # 登录页
    │   │   └── ProfileView.vue      # 个人资料页
    │   ├── stores/
    │   │   ├── auth.ts              # 认证状态（demo stub）
    │   │   └── history.ts           # Pinia 历史状态（服务端API按需加载）
    │   ├── router/index.ts           # Hash 路由 + 404 兜底
    │   ├── types/index.ts            # 前端类型定义
    │   └── styles/                   # 全局样式 + CSS 变量
    ├── capacitor.config.ts
    ├── package.json
    ├── vite.config.ts
    └── android/                       # Android 原生壳
```

## API 端点

所有端点受 `ApiKeyGuard` + `RateLimitGuard` 保护。

| 方法 | 路径 | 说明 | 关键参数 |
|------|------|------|----------|
| POST | `/api/nickel/recognize` | 标签识别（本地OCR+条码） | `file`(multipart), `barcode?` |
| POST | `/api/nickel/spraycode` | 喷码 OCR 识别 | `file`(multipart) |
| POST | `/api/nickel/compare` | 喷码对比（自动保存记录+图片） | `files`(multipart, 1-2张), `barcode?` |
| GET | `/api/nickel/history` | 历史记录列表（分页） | `page?`, `limit?` |
| GET | `/api/nickel/history/:id` | 记录详情 | — |
| GET | `/api/nickel/images/:recordId/:imageType` | 图片流式返回 | — |
| DELETE | `/api/nickel/history/:id` | 删除记录+图片 | — |
| GET | `/api/nickel/health` | 健康检查 | — |

## 环境变量

### 后端 (`backend/.env`)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 3003 |
| `NODE_ENV` | 环境 | production |
| `API_KEY` | API 认证密钥 | — |
| `API_KEY_ENABLED` | 启用 API Key 认证 | — |
| `CORS_ORIGIN` | CORS 允许源（逗号分隔） | — |
| `RAPID_OCR_URL` | RapidOCR 服务地址 | `http://localhost:8866` |
| `RATE_LIMIT_WINDOW` | 限流窗口(ms) | 60000 |
| `RATE_LIMIT_MAX` | 限流最大请求数 | 30 |
| `MAX_IMAGE_SIZE` | 最大图片大小(bytes) | 10485760 |
| `MYSQL_HOST` | MySQL 主机 | localhost |
| `MYSQL_PORT` | MySQL 端口 | 3306 |
| `MYSQL_USERNAME` | MySQL 用户名 | root |
| `MYSQL_PASSWORD` | MySQL 密码 | — |
| `MYSQL_DATABASE` | MySQL 数据库名 | markapp |
| `IMAGE_UPLOAD_DIR` | 图片上传目录 | uploads |
| `IMAGE_RETENTION_DAYS` | 图片保留天数 | 10 |

### 移动端

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 浏览器端 API 地址 | `http://localhost:3003` |
| `VITE_NATIVE_API_URL` | 原生端 API 地址 | `http://localhost:3003` |

## 开发命令

```bash
# 后端
cd backend
cp .env.example .env          # 配置环境变量
npm install
npm run start:dev              # 开发模式（端口 3003）
npm test                       # 运行单元测试（108 个用例）
npm run test:cov               # 测试 + 覆盖率

# 移动端
cd mobile
npm install
npm run dev                    # 浏览器开发模式
npm run cap:build              # 构建并同步到 Android
```

## 核心业务流程

### 标签识别（`nickel.service.ts → recognize()`）

1. **图片验证** — 格式(JPG/PNG/GIF/WebP) + 大小(≤10MB)
2. **图像预处理** — `image-preprocess.service.ts`
3. **本地 OCR + 条码扫描** — `label-ocr.service.ts`（RapidOCR `/ocr/full` → 降级 `/ocr/text`）
4. **自动纠错** — `rule-checker.service.ts`（O→0、l→1、I→1 等常见 OCR 混淆）
5. **规则校验** — 批号格式、包号范围、日期合法性、重量范围、交叉校验
6. **条码解析** — `barcode-parser.service.ts`（车间代码、生产日期、包号/重量编码）
7. **置信度评分** — `confidence.service.ts`（null 字段扣分、纠正次数扣分、校验错误扣分）

### 喷码对比（`nickel.service.ts → compare()`）

1. 喷码 OCR 识别（RapidOCR + zxing-cpp 条码扫描）
2. 标签识别（复用 recognize 流程，如果提供标签图）
3. 字段对比（`spraycode-compare.service.ts`）
4. 保存记录到 MySQL + 图片到本地文件系统
5. 返回对比结果 + 记录 ID

## 数据库

- **TypeORM + MySQL**，开发模式 `synchronize: true` 自动建表
- `compare_record` — 对比记录（永久保留）
- `compare_image` — 图片引用（FK CASCADE，10天自动清理 via `@nestjs/schedule`）
- 图片按日期目录存储：`uploads/compare/YYYY/MM/DD/`

## 技术栈

| 层 | 技术 |
|----|------|
| 后端框架 | NestJS 11、TypeScript 5.7 |
| ORM | TypeORM + mysql2 |
| 定时任务 | @nestjs/schedule |
| HTTP 客户端 | Axios |
| 验证 | class-validator + class-transformer + ValidationPipe |
| 前端框架 | Vue 3.5 + Vite 6 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 (Hash 模式) |
| 移动端 | Capacitor 8 (Android) |
| OCR | RapidOCR（自部署 HTTP 服务）+ zxing-cpp 条码扫描 |
| 测试 | Jest 29 + ts-jest（108 个用例） |

## 编码规范

- **语言**：后端和前端均使用 TypeScript
- **注释语言**：中文（业务逻辑注释）、英文（技术性注释）
- **命名**：后端 PascalCase（类/接口）/ camelCase（方法/变量）；前端 camelCase + kebab-case 文件名
- **API 响应格式**：`{ success, data, message, timestamp }` 统一结构
- **错误处理**：全局 `AllExceptionsFilter`，业务层抛 `BadRequestException`
- **安全**：API Key 用 `crypto.timingSafeEqual` 比较；全端点 Guard 保护
- **路由**：前端使用 `createWebHashHistory`（兼容 Capacitor 原生端）

## 测试

后端 7 个测试套件、108 个用例：

| 套件 | 文件 | 用例数 |
|------|------|--------|
| 条码解析 | `barcode-parser.service.spec.ts` | ~15 |
| JSON 解析 | `json-parser.service.spec.ts` | ~10 |
| 图片预处理 | `image-preprocess.service.spec.ts` | ~8 |
| 置信度评分 | `confidence.service.spec.ts` | ~15 |
| 规则校验 | `rule-checker.service.spec.ts` | ~26 |
| 历史服务 | `nickel-history.service.spec.ts` | ~15 |
| 图片存储 | `image-storage.service.spec.ts` | ~18 |

前端暂无测试套件。

## 已知注意事项

- 有 4 个未推送的提交（含 MySQL 持久化、本地 OCR 迁移等），需 `git push`
- `.env` 文件被 `.gitignore` 排除，部署时需手动配置
- `uploads/` 目录被 `.gitignore` 排除（运行时图片存储）
- MySQL 需单独部署（推荐 Docker: `markapp-mysql`，端口 3307，utf8mb4）
- RapidOCR 需单独部署为 HTTP 服务（默认 `localhost:8866`）

## Agent Skills

本项目已配置 Matt Pocock Skills。按需使用：

| 触发 | Skill | 用途 |
|------|-------|------|
| Bug | `/diagnose` | 系统化调试 |
| 编码 | `/tdd` | 测试驱动开发 |
| 代码腐化 | `/improve-codebase-architecture` | 深化浅模块 |
| 迷失方向 | `/zoom-out` | 高层视角 |
| 会话结束 | `/handoff` | 压缩上下文给下一个 Agent |
