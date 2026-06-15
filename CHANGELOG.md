# Changelog

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
