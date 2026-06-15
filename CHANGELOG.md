# Changelog

## [1.2.0] - 2026-06-15

### 🗄️ 数据库持久化（喷码对比模块）

- 新增 MySQL 数据库支持（TypeORM + `@nestjs/typeorm`），开发模式自动建表
- 新增 `compare_record` 表：永久保留所有对比记录（含摘要列 + JSON 大字段）
- 新增 `compare_image` 表：图片引用表（FK CASCADE，10天自动清理）
- 新增 `NickelHistoryService`：保存/查询/详情/删除/定时清理
- 新增 `ImageStorageService`：本地文件系统图片存储（按日期目录 `uploads/compare/YYYY/MM/DD/`）
- 新增 `@nestjs/schedule` 定时任务：每天凌晨 2:30 清理过期图片文件
- `POST /api/nickel/compare` 返回值新增 `data.id`（向后兼容），对比后自动保存记录+图片
- `GET /api/nickel/history` 实现分页历史列表（支持 `page`/`limit` 参数）
- `GET /api/nickel/history/:id` 新增记录详情端点（含完整对比结果+图片URL）
- `GET /api/nickel/images/:recordId/:imageType` 新增图片流式返回端点（过期返回 404）
- `DELETE /api/nickel/history/:id` 新增删除记录+图片端点
- `NickelConfigService` 新增 MySQL 配置（host/port/username/password/database）+ 图片存储配置（uploadDir/retentionDays）
- `.env.example` 新增 `MYSQL_*` 和 `IMAGE_*` 环境变量

### 📱 移动端适配（服务端历史记录）

- `api/nickel.ts` 新增 `fetchHistory()`/`fetchRecordDetail()`/`deleteHistoryRecord()`
- `stores/history.ts` 从 localStorage 迁移为服务端 API 驱动（分页+加载更多+本地缓存即时反馈）
- `types/index.ts` 新增 `CompareResult`/`HistoryListItem`/`HistoryListResponse`/`RecordDetailResponse` 类型
- `HistoryView.vue` 使用服务端历史+分页加载+匹配度徽章
- `CompareView.vue` 使用服务端图片 URL 做缩略图，移除 `blobToDataURL`
- `ResultView.vue` 类型判别函数兼容 `CompareResult` 类型
- 新增 `mobile/.env` 配置 `VITE_NATIVE_API_URL`

### 🐳 Docker 部署

- MySQL 8.0 容器化部署（`markapp-mysql`，端口 3307，utf8mb4 字符集，持久化数据卷）

### 🧪 测试

- 新增 2 个测试套件，23 个测试用例：
  - `nickel-history.service.spec.ts` — 保存/分页查询/详情/删除/图片信息/NotFoundException
  - `image-storage.service.spec.ts` — 保存/删除/存在检查/路径解析/批量清理
- 总测试数：107 passed（原 84 → 107）

### 📦 新增依赖

- `@nestjs/typeorm` — NestJS TypeORM 集成
- `typeorm` — ORM 核心
- `mysql2` — MySQL 驱动
- `@nestjs/schedule` — 定时任务支持

### 📝 文档

- `.gitignore` 新增 `uploads/` 忽略
- `backend/.env` 创建（MySQL 连接配置）

---

## [1.1.0] - 2026-06-15

### 🔒 安全修复

- API Key 比较改用 `crypto.timingSafeEqual()` 防止时序攻击
- 所有端点统一应用 `ApiKeyGuard` + `RateLimitGuard`（之前仅 `/recognize` 受保护）
- 移除 `json-parser.service.ts` 中破坏性的全局单引号替换（会损坏含撇号的合法字符串）
- `recognize.dto.ts` 添加 `@Transform` 处理 multipart form 布尔值转换

### 🐛 Bug 修复

- AndroidManifest.xml 添加 `CAMERA` 权限（修复部分设备相机静默失败）
- `useCamera.ts` 移除非空断言 `photo.webPath!`，添加 `response.ok` 检查
- `HomeView.vue` 的 `openGallery` 改用 Capacitor Camera 插件 `pickFromGallery()`（修复原生端相册不可用）
- 缩略图改用 base64 dataURL 存储（修复刷新后缩略图丢失）
- 添加 `onUnmounted` 清理 Object URL（修复内存泄漏）
- 路由改用 `createWebHashHistory`（修复 Capacitor 原生端路由问题）
- 添加 404 兜底路由
- `ResultView.vue` 添加类型判别，修复识别失败时白屏
- `checkDateVsBarcode` 兼容 `BarcodeParseResult` 和 `BarcodeParsed` 两种类型
- 所有 `parseInt` 调用添加 radix 参数
- 移除 `nickel.service.ts` 中冗余的 `Buffer.from()` 调用

### ✨ 功能改进

- 注册全局 `ValidationPipe`（DTO 校验装饰器生效）
- 注册全局 `AllExceptionsFilter`（防止堆栈泄露给客户端）
- 启用 `enableShutdownHooks()`（确保 RateLimitGuard 定时器正确清理）
- Qwen/Volc AI 服务添加重试逻辑（2次重试，1秒间隔退避）
- `CompareView.vue` 添加相册选图选项，移除死代码 `pickFile`
- `HistoryRecord.result` 类型移除 `| any`，保留类型安全
- `stores/history.ts` 的 `addCompare` 参数类型化，错误日志可见
- `request.ts` 原生端 API URL 改为环境变量 `VITE_NATIVE_API_URL` 可配置

### 🧪 测试

- 修复 jest v30 / ts-jest v29 版本冲突（统一 jest v29）
- 新增 5 个测试套件，84 个测试用例：
  - `barcode-parser.service.spec.ts` — 条码解析（格式、范围、生成、提取）
  - `json-parser.service.spec.ts` — JSON 多层兜底解析（直接/代码块/花括号/清理）
  - `image-preprocess.service.spec.ts` — 图片格式/大小验证
  - `confidence.service.spec.ts` — 置信度评分（null字段/纠正/校验/边界）
  - `rule-checker.service.spec.ts` — 规则校验 + 自动纠错（批号/包号/日期/重量/品牌/标准）

### 📝 文档

- 新增 `README.md`（架构、环境变量、API 端点、快速开始）
- 新增 `backend/.env.example`（环境变量模板）
- 新增 `backend/.eslintrc.js`（ESLint 配置）
- 新增 `CHANGELOG.md`

### 📦 依赖更新

- jest: ^30.0.0 → ^29.7.0（兼容 ts-jest）
- @types/jest: ^30.0.0 → ^29.5.14
- 新增 jest-util@29（ts-jest 依赖）

---

## [1.0.0] - 初始版本

- 初始提交：markapp - 镍板标签识别 APP
