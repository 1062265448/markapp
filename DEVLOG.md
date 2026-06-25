# MarkApp 开发日志

## v2.3.0 — 2026-06-25

### 🐛 Bug 修复

- **TypeORM 查询历史记录报错 `Property "0" not found in CompareRecord`**
  - `nickel-history.service.ts` 使用数组 where 语法查询关联图片
  - `recordId` 是 `@ManyToOne` 关系字段，TypeORM 尝试通过关联实体解析导致报错
  - 修复：改用 `In()` 操作符 `where: { recordId: In(recordIds) }`

- **Mixed Content 混合内容阻止 HTTP 请求**
  - Capacitor 用 HTTPS 加载页面（`androidScheme: 'https'`），后端用 HTTP
  - WebView 拦截 HTTP 请求，导致"网络错误"
  - 修复：`capacitor.config.ts` 设置 `cleartext: true`
  - 新建 `network_security_config.xml` 允许局域网 IP 明文 HTTP
  - `AndroidManifest.xml` 引用 `networkSecurityConfig`

- **真机无法安装 APK (INSTALL_FAILED_USER_RESTRICTED)**
  - 小米手机需开启「USB 安装」权限（开发者选项中）

### 🎨 UI 优化

- **全站 UI 大改版 — iOS 设计语言**
  - 重新设计色彩系统（iOS 系统蓝 + 灰度层级）
  - 统一圆角、阴影、间距规范
  - 新增 CSS 变量：`--bg-elevated`、`--accent-border`、`--green-border` 等
  - 暗色模式全面适配

- **底部 TabBar 重构**
  - iOS 风格毛玻璃背景（`backdrop-filter: blur`）
  - 活跃指示器动画（圆点缩放）
  - 4 个 Tab：识别 / 对比 / 历史 / 我的

- **首页 HomeView 重设计**
  - 双按钮网格布局（拍照 / 相册）
  - iOS 风格选项卡片（条形码输入 + GLM 开关）
  - 结果卡片动画（fadeUp）

- **对比页 CompareView 优化**
  - 双图片上传区（喷码 + 标签可选）
  - 图片预览卡片 + 清除按钮
  - Action Sheet 选择来源

- **历史记录页 HistoryView 改版**
  - 卡片式列表布局
  - 缩略图 + 匹配状态指示
  - 空状态引导页

- **结果详情页 ResultView 优化**
  - 状态头部（成功/失败图标 + 动画）
  - 字段对比卡片（绿色匹配/红色不匹配）
  - 图片查看器

- **登录页 LoginView 美化**
  - 品牌图标浮动动画
  - 输入框聚焦光晕效果
  - 按钮点击缩放反馈

- **个人中心 ProfileView 重设计**
  - 用户头像 + 角色标签
  - iOS 风格功能列表
  - 退出登录二次确认

### 🔧 原生适配

- **状态栏适配（4 文件联改）**
  - `capacitor.config.ts`：StatusBar `overlaysWebView: false`，背景色白色
  - `MainActivity.java`：`WindowCompat.setDecorFitsSystemWindows(getWindow(), true)`
  - `activity_main.xml`：CoordinatorLayout `fitsSystemWindows="true"`
  - `styles.xml`：`windowDrawsSystemBarBackgrounds` + `statusBarColor: transparent`

- **网络安全配置**
  - 新建 `network_security_config.xml`，允许局域网 IP 明文 HTTP
  - `AndroidManifest.xml` 引用配置

- **Safe Area 处理**
  - `global.css`：`body` 添加 `padding-top: env(safe-area-inset-top, 24px)`
  - 各页面 header 添加 `padding-top: var(--safe-top)`

### 🔧 后端修复

- **TypeORM `In()` 操作符引入**
  - `nickel-history.service.ts` 添加 `In` import
  - 修复关联图片查询的数组 where 语法问题

### 📦 依赖 & 配置

- **移动端环境变量**
  - 新建 `mobile/.env` 配置 `VITE_NATIVE_API_URL`
  - 支持真机通过局域网 IP 访问后端

---

## v2.2.0 — 2026-06-22

### 🐛 Bug 修复

- **CompareResultCard 通过率渲染 NaN%**
  - `CompareResultCard.vue` 引用不存在的 `summary.passRate` 字段
  - 后端 `CompareSummary` 仅有 `matched/totalFields`，无 `passRate`
  - 修复：改为 `(summary.matched / summary.totalFields) * 100`

- **ResultView 对比详情页路由断裂**
  - `ResultView` 从未读取 `route.params.id` 或 `sessionStorage`
  - 导致从历史记录点击进入显示错误记录，直接导航显示空白
  - 修复：优先读 sessionStorage → 降级按 route.params.id 从服务端获取详情

- **CompareResultCard 模板字段名错误**
  - `item.match` → `item.matched`，`item.sprayValue` → `item.sprayCodeValue`
  - 移除不存在的 `item.message`，改为 `item.diffType`

- **5 个 CSS 变量未定义导致样式破损**
  - 补全 `--bg-elevated`、`--bg-secondary`、`--accent-border`、`--green-border`、`--red-border`
  - 补全 `--space-10`（40px）
  - 暗色模式同步补全

### 🧹 清理

- **完成 v2.1 AI 迁移残留清理**
  - 删除 `config.service.ts` 中 9 个 AI 相关 getter（qwenApiKey/volcApiKey/glmApiKey 等）
  - 移除 `common.module.ts` 中 `JsonParserService` 的注册和导出
  - 移除 `.env.example` 中 Qwen/Volc/GLM 配置段落
  - 删除已无引用的 `rules/index.ts` barrel 文件
  - 移除 `NickelConfigModule` 中无效的空 `ConfigModule` import

- **移除前端死代码**
  - 删除未使用的 `healthCheck` API 函数
  - 删除 History Store 模块初始化时自动调用 `load()` 的逻辑

### ♻️ 重构

- **提取 OCR 共享工具模块 `ocr-utils.ts`**
  - `LabelOcrService` 和 `SpraycodeOcrService` 有 6 个逐字相同的方法
  - 提取 `normalizeDigits`、`normalizeBatchNo`、`normalizeDate`、`normalizeWeight`、`pickBestBarcode`、`callOcrFull`
  - 两个 Service 改为调用共享函数，消除 ~200 行重复代码

- **消除 `CompareSummary` 双重定义**
  - `spraycode-compare.service.ts` 本地重声明 → 改为从 `nickel.types.ts` import

- **统一 CORS_ORIGIN 读取方式**
  - `main.ts` 改为通过 `NickelConfigService.corsOrigin` 读取 + `app.enableCors()`
  - 不再绕过 ConfigService 直接读 `process.env`

- **对齐前后端 TypeScript 类型**
  - `CheckResult.ruleType`：`string` → `'format'|'range'|'consistency'|'crossField'|'labelFormat'`
  - `CheckResult.corrected`：对齐为 `string | undefined`
  - 新增 `CheckResult.barcodeCorrection` 字段
  - `CorrectionRecord.original`：对齐为 `string`（非 nullable）
  - `BarcodeParsed.productionDate/message`：对齐为 `optional`
  - 新增 `ConfidenceScore.deductions[].details` 字段

- **CompareResultCard props 类型 `any` → `CompareResult`**
- **History Store 改为 HistoryView `onMounted` 按需加载**
- **CompareView `cameraLoading` ref 绑定到按钮 disabled 状态**

### 📝 文档

- **CLAUDE.md 全面更新至 v2.1 架构**
  - 架构树：移除已删除的 4 个 AI 服务文件，新增 `ocr-utils.ts`
  - 架构树：补充 LoginView/ProfileView/auth store
  - 环境变量表：新增 `CORS_ORIGIN`，移除 AI 相关变量
  - 环境变量表：修正 `RATE_LIMIT_MAX` 默认值 30、`MYSQL_USERNAME` 默认值 root
  - 核心业务流程：更新为本地 OCR + 条码扫描描述
  - 技术栈：移除 AI 模型行，更新 OCR 描述
  - 测试用例数：107 → 108
  - 已知注意事项：未推送提交数 1 → 4

- **`.gitignore` 修复中文目录名乱码**
  - 第 39-40 行 GBK 编码损坏 → 重写为 UTF-8 `镍板标签/` 和 `喷码照片/`

---

## v2.1.1 — 2026-06-16

### ✅ 验证

- **条码识别功能验证通过**
  - 使用 `镍板标签/喷码/标签1.JPG` 测试图片验证
  - 确认整条识别链路畅通：拍照 → OCR 服务 `/ocr/full` → `_scan_barcodes()` → 后端 `LabelOcrService` → `BarcodeParserService` → 规则校验
  - 修复后 `read_barcode()` 正确返回单个 Barcode 对象，不再触发 TypeError

---

## v2.1.0 — 2026-06-16

### 🐛 Bug 修复

- **ocr-service: 修复 zxing-cpp `read_barcode()` 返回值迭代错误**
  - `zxing-cpp` 的 `read_barcode()` 返回单个 `Barcode` 对象（或 `None`），而非列表
  - 旧代码 `for barcode in results` 试图迭代单个 Barcode 对象，触发 `TypeError: 'Barcode' object is not iterable`
  - 导致 `/ocr/full` 端点在检测到条码时返回 500 错误
  - 修复：直接访问 `results.text` 和 `results.format`，移除错误的循环
  - 文件：`ocr-service/main.py:110-129`

### 🧹 清理

- **移除已停用的 5 个 AI 服务死代码** (`eb926a8`)
  - 删除 `qwen-ai.service.ts`、`volc-ai.service.ts`、`glm-ai.service.ts`、`nickel-prompt.service.ts`、`vision-ai-base` 相关代码
  - 全面切换为 OCR 本地识别 + zxing-cpp 条码扫描方案

### ✨ 新功能

- **停用 AI 模型，全面使用 OCR 本地识别 + zxing-cpp 条码扫描** (`bfb7bf0`)
  - 引入 RapidOCR 作为本地 OCR 引擎
  - 引入 zxing-cpp 条码扫描
  - 移除对 Qwen VL / Volc Doubao / GLM-4V 云端 API 的依赖

---

## v2.0.0 — 2026-06-15

### ✨ 新功能

- **MySQL 数据库持久化** (`3e96194`)
  - TypeORM + MySQL 存储喷码对比记录
  - 图片本地文件系统存储（按日期目录 `uploads/compare/YYYY/MM/DD/`）
  - `compare_record` 表（永久保留）+ `compare_image` 表（FK CASCADE，10天自动清理）
  - 历史记录 CRUD API：分页列表、详情查询、删除记录+图片
  - 定时任务清理过期图片引用

- **全面安全加固、功能修复与测试覆盖** (`8990631`)
  - API Key 认证：`timingSafeEqual` 防时序攻击
  - 内存限流 Guard：可配置窗口/次数
  - 全局异常过滤器：防堆栈泄露
  - 图片格式/大小验证 + 预处理
  - 规则校验 + 自动纠错（O→0、l→1 等 OCR 混淆）
  - 置信度评分（null 字段/纠正/校验维度）
  - 107 个单元测试用例

---

## v1.0.0 — 2026-06-11

### ✨ 初始版本

- **MarkApp 镍板标签识别 APP** (`626d47d`)
  - NestJS 11 后端 API（端口 3003）
  - Vue 3 + Capacitor 8 移动端
  - 三模型并行识别（Qwen VL / Volc Doubao / GLM-4V）
  - 投票合并 + 规则校验 + 自动纠错 + 置信度评分
  - 喷码 OCR 识别 + 喷码与标签信息一致性对比
  - 条码解析（车间/批号/包号/重量编码）
