# MarkApp 开发日志

## v2.3.2 — 2026-06-29

### 🔍 全量代码审查

对项目进行了完整代码审查（backend + mobile），发现 20 个问题，按优先级分三级：
- 🔴 高优先级 5 个（配置失效、死代码、环境变量不匹配）
- 🟡 中优先级 7 个（代码重复、类型不安全、残留逻辑）
- 🟢 低优先级 8 个（精度问题、死代码、类型模糊）

### 🐛 Bug 修复

- **`.env` 限流配置变量名不匹配 — 限流参数静默失效**
  - `backend/.env` 使用 `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS`
  - `config.service.ts` 读取 `RATE_LIMIT_WINDOW` / `RATE_LIMIT_MAX`
  - 结果：`.env` 中的配置被忽略，限流永远用默认值（60000ms / 30次）
  - 修复：统一为 `RATE_LIMIT_WINDOW` / `RATE_LIMIT_MAX`
  - ⚠️ 教训：环境变量名必须与 ConfigService getter 严格一致，改名时要双向同步

- **`normalizeBatchNo` Unicode dash 替换不完整**
  - 旧正则 `/[—–‐]/g` 只匹配 3 种 dash 字符（em dash、en dash、hyphen）
  - OCR 可能识别出其他 Unicode dash（如 `‑` U+2011 non-breaking hyphen）
  - 修复：改用 `\p{Pd}` Unicode 属性转义，匹配所有 dash 类字符
  - ⚠️ 教训：处理 Unicode 标点时，优先用 `\p{Pd}`/`\p{P}` 等属性类，而非枚举

- **`confidence.service.ts` 重量比较使用 `parseFloat`**
  - `netWeight` 和 `encodedWeight` 都是整数千克，`parseFloat` 可能引入浮点精度问题
  - 修复：改为 `parseInt(String(val), 10)`

### 🧹 死代码清理

- **前端 `enableGLM` 参数 — 残留自 AI 模型迁移**
  - `mobile/src/api/nickel.ts` 的 `recognizeLabel()` 发送 `enableGLM` 参数
  - 后端 `RecognizeDto` 未定义此字段，`NickelService` 完全不使用
  - `HomeView.vue` 有 GLM 开关 toggle，但实际无效
  - 修复：移除 API 参数、toggle 组件、相关 CSS 样式
  - ⚠️ 教训：移除功能时要前后端联动清理，不能只删后端

- **`checkFieldLabelCase()` 规则永远不执行**
  - 依赖 `data._fieldLabels` 字段，但 `LabelOcrService.extractLabelFields()` 从未填充
  - 此方法是 AI 模型时代的遗留（AI 能报告标签上的英文标识文字，本地 OCR 不能）
  - 修复：移除方法定义 + `check()` 中的调用

- **`json-parser.service.ts` — AI 模型 JSON 解析器**
  - 为解析 AI 模型返回的 JSON 而设计，项目已完全移除 AI 模型
  - 仅在自己的 spec 文件中被引用，生产代码无调用
  - 保留：有测试覆盖且无害，暂不删除

- **`.env` / `README.md` 中 AI 模型引用**
  - `.env` 残留 `QWEN_API_KEY`、`VOLC_API_KEY`、`GLM_API_KEY` 等配置段
  - README.md 引用「三模型并行识别」和 AI API Key 环境变量
  - 修复：`.env` 删除 AI 配置段，README 更新为本地 OCR 描述

### ♻️ 重构

- **消除条码解析逻辑重复（3 处 → 1 处）**
  - `LabelOcrService.tryParseBarcode()` — 私有方法，只提取 workshopCode
  - `SpraycodeOcrService._tryParseBarcode()` — 私有方法，完整解析但独立实现
  - `BarcodeParserService.parse()` — 已有的公共服务，功能最完整
  - 修复：两个 OCR Service 改为注入 `BarcodeParserService`，删除私有方法
  - ⚠️ 教训：新功能开发时先搜索已有服务，不要「顺手写一个」

- **`ocr-utils.ts` 合并重复的 HTTP 调用函数**
  - `callOcrEndpoint()` 和 `callOcrTextEndpoint()` 函数体完全相同
  - 修复：合并为 `callOcrPost()`

- **`nickel.service.ts` / `nickel-history.service.ts` 类型安全**
  - `compare()` 和 `recognizeSpraycode()` 返回 `any` → 改为 `CompareResultResponse` / `SpraycodeResultResponse`
  - `saveCompareRecord(result: any)` → `result: CompareResultResponse`
  - `CompareResultResponse.data` 缺少 `labelCodeData` 和 `id` 字段 → 补全
  - 清理未使用的 `NickelLabelData` 导入

- **`history.ts` store `clear()` 静默吞错**
  - 旧代码 `catch { /* ignore */ }` 完全无日志
  - 修复：添加 `console.warn` 记录失败的记录 ID

### 📝 文档

- **README.md** — 移除 AI 模型描述，更新为本地 OCR + 条码扫描；环境变量表移除 AI API Key
- **HomeView.vue** — header 描述从「AI三模型投票校验」改为「OCR + 条码扫描校验」

### ✅ 验证

- TypeScript 编译：0 错误
- 单元测试：108/108 通过（7 个测试套件）
- `.env` 变量名与 ConfigService getter 一一对应

---

## v2.3.1 — 2026-06-26

### ✨ 功能优化

- **对比结果页面重构：喷码与标签识别结果分开展示**
  - 参考 `markminiprogram` 小程序喷码对比模块设计
  - 对比详情每行明确标注「喷码」和「标签」两侧值，一致用 `=` 分隔，不一致用 `≠`
  - 缺失状态：单方缺失显示「未识别」，双方缺失显示「均未识别」
  - 新增「标签识别结果」独立区块，展示标签的批号/包号/日期/净重
  - 后端对比接口新增返回 `labelCodeData` 字段
  - 前端新增 `CompareLabelData` 类型定义

### 🔧 技术变更

- `backend/src/nickel/nickel.service.ts` — compare 返回值增加 `labelCodeData`
- `mobile/src/types/index.ts` — 新增 `CompareLabelData` 接口，`CompareResult.data` 增加 `labelCodeData`
- `mobile/src/components/CompareResultCard.vue` — 重写组件，三层结构：逐项对比 → 喷码识别结果 → 标签识别结果

---

## v2.3.0 — 2026-06-25

### 🐛 Bug 修复

- **TypeORM 查询历史记录报错 `Property "0" not found in CompareRecord`**
  - `nickel-history.service.ts` 使用数组 where 语法查询关联图片
  - `recordId` �?`@ManyToOne` 关系字段，TypeORM 尝试通过关联实体解析导致报错
  - 修复：改�?`In()` 操作�?`where: { recordId: In(recordIds) }`

- **Mixed Content 混合内容阻止 HTTP 请求**
  - Capacitor �?HTTPS 加载页面（`androidScheme: 'https'`），后端�?HTTP
  - WebView 拦截 HTTP 请求，导�?网络错误"
  - 修复：`capacitor.config.ts` 设置 `cleartext: true`
  - 新建 `network_security_config.xml` 允许局域网 IP 明文 HTTP
  - `AndroidManifest.xml` 引用 `networkSecurityConfig`

- **真机无法安装 APK (INSTALL_FAILED_USER_RESTRICTED)**
  - 小米手机需开启「USB 安装」权限（开发者选项中）

### 🎨 UI 优化

- **全站 UI 大改�?�?iOS 设计语言**
  - 重新设计色彩系统（iOS 系统�?+ 灰度层级�?  - 统一圆角、阴影、间距规�?  - 新增 CSS 变量：`--bg-elevated`、`--accent-border`、`--green-border` �?  - 暗色模式全面适配

- **底部 TabBar 重构**
  - iOS 风格毛玻璃背景（`backdrop-filter: blur`�?  - 活跃指示器动画（圆点缩放�?  - 4 �?Tab：识�?/ 对比 / 历史 / 我的

- **首页 HomeView 重设�?*
  - 双按钮网格布局（拍�?/ 相册�?  - iOS 风格选项卡片（条形码输入 + GLM 开关）
  - 结果卡片动画（fadeUp�?
- **对比�?CompareView 优化**
  - 双图片上传区（喷�?+ 标签可选）
  - 图片预览卡片 + 清除按钮
  - Action Sheet 选择来源

- **历史记录�?HistoryView 改版**
  - 卡片式列表布局
  - 缩略�?+ 匹配状态指�?  - 空状态引导页

- **结果详情�?ResultView 优化**
  - 状态头部（成功/失败图标 + 动画�?  - 字段对比卡片（绿色匹�?红色不匹配）
  - 图片查看�?
- **登录�?LoginView 美化**
  - 品牌图标浮动动画
  - 输入框聚焦光晕效�?  - 按钮点击缩放反馈

- **个人中心 ProfileView 重设�?*
  - 用户头像 + 角色标签
  - iOS 风格功能列表
  - 退出登录二次确�?
### 🔧 原生适配

- **状态栏适配�? 文件联改�?*
  - `capacitor.config.ts`：StatusBar `overlaysWebView: false`，背景色白色
  - `MainActivity.java`：`WindowCompat.setDecorFitsSystemWindows(getWindow(), true)`
  - `activity_main.xml`：CoordinatorLayout `fitsSystemWindows="true"`
  - `styles.xml`：`windowDrawsSystemBarBackgrounds` + `statusBarColor: transparent`

- **网络安全配置**
  - 新建 `network_security_config.xml`，允许局域网 IP 明文 HTTP
  - `AndroidManifest.xml` 引用配置

- **Safe Area 处理**
  - `global.css`：`body` 添加 `padding-top: env(safe-area-inset-top, 24px)`
  - 各页�?header 添加 `padding-top: var(--safe-top)`

### 🔧 后端修复

- **TypeORM `In()` 操作符引�?*
  - `nickel-history.service.ts` 添加 `In` import
  - 修复关联图片查询的数�?where 语法问题

### 📦 依赖 & 配置

- **移动端环境变�?*
  - 新建 `mobile/.env` 配置 `VITE_NATIVE_API_URL`
  - 支持真机通过局域网 IP 访问后端

---

## v2.2.0 �?2026-06-22

### 🐛 Bug 修复

- **CompareResultCard 通过率渲�?NaN%**
  - `CompareResultCard.vue` 引用不存在的 `summary.passRate` 字段
  - 后端 `CompareSummary` 仅有 `matched/totalFields`，无 `passRate`
  - 修复：改�?`(summary.matched / summary.totalFields) * 100`

- **ResultView 对比详情页路由断�?*
  - `ResultView` 从未读取 `route.params.id` �?`sessionStorage`
  - 导致从历史记录点击进入显示错误记录，直接导航显示空白
  - 修复：优先读 sessionStorage �?降级�?route.params.id 从服务端获取详情

- **CompareResultCard 模板字段名错�?*
  - `item.match` �?`item.matched`，`item.sprayValue` �?`item.sprayCodeValue`
  - 移除不存在的 `item.message`，改�?`item.diffType`

- **5 �?CSS 变量未定义导致样式破�?*
  - 补全 `--bg-elevated`、`--bg-secondary`、`--accent-border`、`--green-border`、`--red-border`
  - 补全 `--space-10`�?0px�?  - 暗色模式同步补全

### 🧹 清理

- **完成 v2.1 AI 迁移残留清理**
  - 删除 `config.service.ts` �?9 �?AI 相关 getter（qwenApiKey/volcApiKey/glmApiKey 等）
  - 移除 `common.module.ts` �?`JsonParserService` 的注册和导出
  - 移除 `.env.example` �?Qwen/Volc/GLM 配置段落
  - 删除已无引用�?`rules/index.ts` barrel 文件
  - 移除 `NickelConfigModule` 中无效的�?`ConfigModule` import

- **移除前端死代�?*
  - 删除未使用的 `healthCheck` API 函数
  - 删除 History Store 模块初始化时自动调用 `load()` 的逻辑

### ♻️ 重构

- **提取 OCR 共享工具模块 `ocr-utils.ts`**
  - `LabelOcrService` �?`SpraycodeOcrService` �?6 个逐字相同的方�?  - 提取 `normalizeDigits`、`normalizeBatchNo`、`normalizeDate`、`normalizeWeight`、`pickBestBarcode`、`callOcrFull`
  - 两个 Service 改为调用共享函数，消�?~200 行重复代�?
- **消除 `CompareSummary` 双重定义**
  - `spraycode-compare.service.ts` 本地重声�?�?改为�?`nickel.types.ts` import

- **统一 CORS_ORIGIN 读取方式**
  - `main.ts` 改为通过 `NickelConfigService.corsOrigin` 读取 + `app.enableCors()`
  - 不再绕过 ConfigService 直接�?`process.env`

- **对齐前后�?TypeScript 类型**
  - `CheckResult.ruleType`：`string` �?`'format'|'range'|'consistency'|'crossField'|'labelFormat'`
  - `CheckResult.corrected`：对齐为 `string | undefined`
  - 新增 `CheckResult.barcodeCorrection` 字段
  - `CorrectionRecord.original`：对齐为 `string`（非 nullable�?  - `BarcodeParsed.productionDate/message`：对齐为 `optional`
  - 新增 `ConfidenceScore.deductions[].details` 字段

- **CompareResultCard props 类型 `any` �?`CompareResult`**
- **History Store 改为 HistoryView `onMounted` 按需加载**
- **CompareView `cameraLoading` ref 绑定到按�?disabled 状�?*

### 📝 文档

- **CLAUDE.md 全面更新�?v2.1 架构**
  - 架构树：移除已删除的 4 �?AI 服务文件，新�?`ocr-utils.ts`
  - 架构树：补充 LoginView/ProfileView/auth store
  - 环境变量表：新增 `CORS_ORIGIN`，移�?AI 相关变量
  - 环境变量表：修正 `RATE_LIMIT_MAX` 默认�?30、`MYSQL_USERNAME` 默认�?root
  - 核心业务流程：更新为本地 OCR + 条码扫描描述
  - 技术栈：移�?AI 模型行，更新 OCR 描述
  - 测试用例数：107 �?108
  - 已知注意事项：未推送提交数 1 �?4

- **`.gitignore` 修复中文目录名乱�?*
  - �?39-40 �?GBK 编码损坏 �?重写�?UTF-8 `镍板标签/` �?`喷码照片/`

---

## v2.1.1 �?2026-06-16

### �?验证

- **条码识别功能验证通过**
  - 使用 `镍板标签/喷码/标签1.JPG` 测试图片验证
  - 确认整条识别链路畅通：拍照 �?OCR 服务 `/ocr/full` �?`_scan_barcodes()` �?后端 `LabelOcrService` �?`BarcodeParserService` �?规则校验
  - 修复�?`read_barcode()` 正确返回单个 Barcode 对象，不再触�?TypeError

---

## v2.1.0 �?2026-06-16

### 🐛 Bug 修复

- **ocr-service: 修复 zxing-cpp `read_barcode()` 返回值迭代错�?*
  - `zxing-cpp` �?`read_barcode()` 返回单个 `Barcode` 对象（或 `None`），而非列表
  - 旧代�?`for barcode in results` 试图迭代单个 Barcode 对象，触�?`TypeError: 'Barcode' object is not iterable`
  - 导致 `/ocr/full` 端点在检测到条码时返�?500 错误
  - 修复：直接访�?`results.text` �?`results.format`，移除错误的循环
  - 文件：`ocr-service/main.py:110-129`

### 🧹 清理

- **移除已停用的 5 �?AI 服务死代�?* (`eb926a8`)
  - 删除 `qwen-ai.service.ts`、`volc-ai.service.ts`、`glm-ai.service.ts`、`nickel-prompt.service.ts`、`vision-ai-base` 相关代码
  - 全面切换�?OCR 本地识别 + zxing-cpp 条码扫描方案

### �?新功�?
- **停用 AI 模型，全面使�?OCR 本地识别 + zxing-cpp 条码扫描** (`bfb7bf0`)
  - 引入 RapidOCR 作为本地 OCR 引擎
  - 引入 zxing-cpp 条码扫描
  - 移除�?Qwen VL / Volc Doubao / GLM-4V 云端 API 的依�?
---

## v2.0.0 �?2026-06-15

### �?新功�?
- **MySQL 数据库持久化** (`3e96194`)
  - TypeORM + MySQL 存储喷码对比记录
  - 图片本地文件系统存储（按日期目录 `uploads/compare/YYYY/MM/DD/`�?  - `compare_record` 表（永久保留�? `compare_image` 表（FK CASCADE�?0天自动清理）
  - 历史记录 CRUD API：分页列表、详情查询、删除记�?图片
  - 定时任务清理过期图片引用

- **全面安全加固、功能修复与测试覆盖** (`8990631`)
  - API Key 认证：`timingSafeEqual` 防时序攻�?  - 内存限流 Guard：可配置窗口/次数
  - 全局异常过滤器：防堆栈泄�?  - 图片格式/大小验证 + 预处�?  - 规则校验 + 自动纠错（O�?、l�? �?OCR 混淆�?  - 置信度评分（null 字段/纠正/校验维度�?  - 107 个单元测试用�?
---

## v1.0.0 �?2026-06-11

### �?初始版本

- **MarkApp 镍板标签识别 APP** (`626d47d`)
  - NestJS 11 后端 API（端�?3003�?  - Vue 3 + Capacitor 8 移动�?  - 三模型并行识别（Qwen VL / Volc Doubao / GLM-4V�?  - 投票合并 + 规则校验 + 自动纠错 + 置信度评�?  - 喷码 OCR 识别 + 喷码与标签信息一致性对�?  - 条码解析（车�?批号/包号/重量编码�?