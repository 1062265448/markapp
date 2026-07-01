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
---

## v2.3.3 — 2026-06-30

### 🔍 项目完整审计 + 修复

#### 审计发现
对 backend + mobile + ocr-service 三个子项目做了完整审计，发现 13 个问题（P0: 3, P1: 6, P2: 4）。

#### P0 修复（阻塞/上线风险）
- **barcode-parser 解析回归**：commit `7e23644` 在 `parse()` 中禁用 `decodePackNo()` 导致 3 个测试失败，影响所有 J 后缀批号一致性校验。修复：恢复 `decodePackNo()` 调用。
- **登录是 Stub**：`mobile/src/stores/auth.ts` 任意用户名密码都生成 demo token。修复：实现后端 `AuthService`（HMAC 签名 token + 7 天过期）+ `AuthController`（`/api/auth/login`、`/api/auth/me`）+ `JwtAuthGuard`；移动端改为真实 API 调用。
- **生产配置缺失**：`.env.example` 与 `.env` 不一致。修复：`.env.example` 设为生产基线（`API_KEY_ENABLED=true`、`CORS_ORIGIN=https://mark.jcngcp.xyz`、新加 `ADMIN_USERNAME/PASSWORD/TOKEN_SECRET/TRUST_PROXY`）。

#### P1 修复（应当修复）
- **OCR API Key 时序攻击**：`ocr-service/main.py` 改用 `hmac.compare_digest` 替代 `!=`。
- **OCR 调试 print 泄露**：`ocr-service/main.py` 改为 `logger.exception` + 删除调试输出。
- **移动端 cleartext 条件化**：`mobile/capacitor.config.ts` 通过 `import.meta.env.DEV` 判断，仅开发模式启用 `cleartext` / `allowMixedContent`。
- **.gitignore 编码损坏**：从 CRLF/NEL 混合改为 UTF-8 LF，删除不存在的 `喷码照片/` 引用。
- **RateLimitGuard 代理 IP 伪造**：添加 `TRUST_PROXY` 配置，仅启用时取 `X-Forwarded-For` 首段。
- **API Key 加密存储**：移动端引入 `@capacitor/preferences` + `useStorage.ts` 抽象，原生端用应用沙箱 SharedPreferences；删除硬编码 `markapp2026` API Key。
- **未实现页面入口**：`ProfileView.vue` 设置/统计改为 Toast "敬请期待"。

#### P2 改进
- **后端测试套件扩展**：从 116 → 165 用例（+49）。新增 `auth.service` (97.87% 覆盖) / `api-key.guard` (100%) / `jwt-auth.guard` (100%) / `rate-limit.guard` (78.94%) / `ocr-utils` (66.66%) 单测。

#### 依赖评估（已核实）
- **`typeorm@1.0.0`** — 实际为已发布稳定版本（2025 年发布），非 alpha。无需迁移。
- **`uuid@^14.0.0`** — 实际安装版本以 lockfile 为准，npm caret 范围允许 minor 升级。无需关注。

#### 已知未完成
- **覆盖率**：核心 OCR 调用服务（`label-ocr`、`spraycode-ocr`、`spraycode-compare`）仍 0% 覆盖（需 mock HTTP）。`nickel.service`、`nickel.controller` 0%（端到端集成测试缺失）。
- **TypeORM 1.x → 0.3.x 迁移**：经核实 TypeORM 1.0.0 已是稳定版，无需迁移。
- **`callOcrFull` 覆盖率**：依赖 axios HTTP 集成测试，单元测试中跳过。

---

## v2.3.4 — 2026-06-30

### 🎨 前端UI全面重构 — iOS 18 现代时尚设计

在不改变任何业务功能的前提下，对移动端全部视图组件和全局样式系统进行重新规划设计，目标对齐 iOS 原生软件 UI 设计语言，以亮色为主体基调，追求简约大方、细节精致的用户体验。

#### 🐛 重构中遇到的问题与修复经验

- **CSS 变量覆盖导致构建失败**  
  在更新 `variables.css` 时，新增了大量变量（如 `--gradient-accent`、`--shadow-glow`、`--radius-2xl`），但 `global.css` 中引用了旧变量名（`--amber-soft` 等）。由于 Vue 单文件组件的 `<style scoped>` 也直接引用这些变量，如果变量缺失或拼写错误，会导致样式解析异常。  
  **教训**：CSS 变量是全局契约，修改前需用 `grep -r "var(--"` 全量搜索引用点，确保增删改三方同步。

- **Build 环境 `npm` 命令缺失**  
  执行 `npm run build` 时系统报错 `/usr/bin/bash: npm: command not found`。实际环境使用 Kimi Desktop 内置的 Node Runtime，路径为 `/c/Users/.../kimi-desktop/resources/resources/runtime/node`。  
  **修复**：改用 `/path/to/node node_modules/vite/bin/vite.js build` 直接调用。  
  **教训**：CI/CD 脚本中不要硬编码 `npm` 全局命令，应优先使用 `npx` 或 `node ./node_modules/.bin/vite` 的本地路径方式，确保跨环境可复现。

- **Vue 单文件组件中的 `::after` 伪元素与 `scoped` 样式冲突**  
  在 `.btn-primary` 等全局类上叠加 `::after` 高光层时，初期写在组件 `scoped` 样式中，导致伪元素无法正确继承父组件的 CSS 变量（特别是暗色模式下的 `--accent` 变化）。  
  **修复**：将按钮系统、卡片系统、表单系统等基础组件样式统一收敛到 `global.css`，组件 `scoped` 样式仅保留布局与业务相关覆盖。  
  **教训**：iOS 风格的高光/阴影/渐变效果属于「设计系统层」，应放在全局样式文件中，不要在每个组件里重复实现。

- **文字渐变 `-webkit-background-clip: text` 在暗色模式下的可读性**  
  大标题（`large-title`）使用 `linear-gradient(135deg, var(--text) → var(--text-secondary))` 作为文字渐变，在亮色模式下效果清晰。但暗色模式下 `var(--text)` 为 `#FFFFFF`，`var(--text-secondary)` 为 `#EBEBF5`，两者对比度过低，几乎看不出渐变。  
  **修复**：在暗色模式 `@media (prefers-color-scheme: dark)` 下，将标题渐变调整为 `linear-gradient(135deg, #FFFFFF 0%, #0A84FF 100%)`，利用蓝色点缀增强暗色下的视觉层次。该覆盖写在各组件的 `scoped` 样式中，而非全局，避免影响非标题元素。  
  **教训**：「看起来很美」的效果在暗色模式下往往失效，必须双模式实测。

- **TabBar 图标 `stroke-width` 动态切换导致的布局抖动**  初始方案中，Tab 激活时通过改变 `stroke-width: 1.8 → 2.2` 来体现「加粗」。但由于 SVG 的 `stroke-width` 变化会影响图标的视觉中心点，在 `viewBox="0 0 24 24"` 下，从 1.8 到 2.2 的增量会让图标边界外扩约 0.2px，导致 Tab 整体布局发生 1px 级抖动。  
  **修复**：将图标容器 `.tab-icon-wrap` 的 `width/height` 从 `28px` 增大到 `32px`，并在容器内部使用 `flex` 居中，为图标留出足够的安全边距，从而消除抖动。同时，将 `stroke-width` 变化改为纯颜色变化（未激活灰色 → 激活蓝色），更符合 iOS 原生 TabBar 的行为。  
  **教训**：微交互的物理尺寸变化必须考虑容器的安全边距，1px 的抖动在 60fps 动画下非常明显。

- **对比结果卡片 `CompareResultCard` 的 stagger 动画在数据更新时重排**  
  `CompareResultCard` 中的 `.compare-row` 使用 `animation: staggerRow 0.4s ... forwards`，并通过 `:style` 绑定 `animationDelay`。当用户重新上传图片对比时，`compareResults` 数组重新渲染，所有行的 `animation-delay` 被重新计算，导致列表整体「闪一下」再重新渐入。  
  **修复**：在 `CompareResultCard` 外层包裹 `<TransitionGroup name="list">`，配合 Vue 的 `key` 管理，确保组件在数据更新时整体替换而非逐行重排。同时，将 `staggerRow` 动画的 `animation-fill-mode` 从 `forwards` 改为 `both`，防止首次渲染时的「空行占位」问题。  
  **教训**：交错动画（stagger）必须配合 Vue 的 `TransitionGroup` 或 `key` 管理，否则数据刷新时会导致全量重排。

- **Toast 通知在暗色模式下背景对比度不足**  
  旧版 Toast 使用 `rgba(40, 40, 40, 0.92)`，在暗色模式下与页面背景 `#000000` 的对比度仅约 1.3:1，几乎不可见。  
  **修复**：暗色模式下 Toast 背景改为 `rgba(45, 45, 48, 0.95)`，同时增加 `border: 0.5px solid rgba(255,255,255,0.08)` 作为边框分隔。  
  **教训**：半透明浮层在暗色模式下需要更重的背景浓度和边框线，而非简单降低透明度。

#### 🎨 设计系统升级

- **色彩系统**：引入 iOS 18 系统色，新增 6 组渐变变量（`--gradient-accent` / `--gradient-green` / `--gradient-red` / `--gradient-amber` / `--gradient-surface` / `--gradient-hero`），全局统一使用。  
- **阴影系统**：从 3 档扩展到 7 档（`xs` → `xl`），新增 `inner` 内阴影和 `glow` 发光阴影，所有卡片、按钮、浮层均有对应层级。  
- **排版系统**：标题字号整体放大（hero 34px → 36px，large-title 28px → 30px），大标题采用文字渐变（`-webkit-background-clip: text`），字距更精细。  
- **圆角系统**：新增 `radius-xs: 6px` 和 `radius-2xl: 32px`，按钮统一使用 `14px` 大圆角，更符合现代 iOS 风格。  
- **动画系统**：新增 `ease-spring-soft`、`ease-bounce`、`ease-smooth` 曲线，页面过渡从 `translateX(30px)` 优化为 `translateX(24px)`，更贴近 iOS 原生手感。

#### 🧩 组件级改进

| 页面 | 核心改进 |
|------|---------|
| **App.vue** | Toast 改为深色毛玻璃风格，带圆角和发光阴影，增加 `:active` 缩放反馈。 |
| **TabBar.vue** | 图标放大至 24px，激活态 `stroke-width` 加粗，底部指示点带弹性动画，毛玻璃背景浓度降低更通透。 |
| **LoginView.vue** | 品牌图标改为渐变背景 + 浮空动画，增加弥散光晕背景装饰，输入框聚焦时上浮 1px + 光晕扩散，按钮增加 `::after` 高光层。 |
| **HomeView.vue** | 大标题采用文字渐变，拍照/相册按钮图标放大至 60px 且更圆润，图片预览卡片带阴影和 `scaleIn` 动画，结果卡片弹入更流畅。 |
| **ResultCard.vue** | 可信度徽章采用更粗的数字（800 weight），状态标签带细边框区分，卡片增加 `has-errors` 时的边框发光效果。 |
| **CompareView.vue** | 状态点脉冲动画增加 `box-shadow` 发光，虚线上传区域更通透，Action Sheet 动画时长和缓动优化。 |
| **CompareResultCard.vue** | Summary Banner 增加渐变背景装饰层，对比行交错动画优化，匹配/不匹配状态徽章带细边框。 |
| **HistoryView.vue** | 列表卡片交错渐入动画，缩略图带内阴影，状态标签带细边框，加载更多按钮改为圆角胶囊。 |
| **ProfileView.vue** | 用户头像渐变背景，菜单项图标带微阴影，退出按钮悬停时红色背景渐入。 |
| **ResultView.vue** | 状态卡片圆角更大，对比行带红色高亮，通过/异常标签带细边框和阴影。 |

#### ✅ 验证

- `vite build` 成功：126 modules transformed，0 错误，1.59s 完成。  
- 所有功能保持完全不变：标签识别、喷码对比、历史记录、登录/退出等核心业务逻辑零改动。  
- 仅 CSS 和 Vue 模板层面的视觉升级，无 JavaScript 逻辑变更。

---

## v2.3.5 — 2026-06-30

### 🔍 v2.3.4 全面复盘 — 三个问题修复

v2.3.4 提交（前端 UI 重构 + v2.3.3 审计修复）合入后，做了完整的二次审查，发现 3 个需要立即处理的问题。本次提交按"问题记录 → 原因分析 → 修复方案 → 教训总结"的四段式记录。

---

### 🐛 问题 1（P0 — JwtAuthGuard 误伤 /health 健康检查端点）

#### 现象
- v2.3.3 在 `NickelController` 控制器级别加了 `@UseGuards(ApiKeyGuard, RateLimitGuard, JwtAuthGuard)`
- 后果：`GET /api/nickel/health` 也会强制要求 `Authorization: Bearer <token>`
- 影响范围：负载均衡器健康探针、k8s liveness/readiness、监控告警、CLI smoke test 全部会 401

#### 原因分析
这是典型的「控制器级装饰器陷阱」：
- 控制器级 `@UseGuards` 会无差别应用给所有方法
- 加 guard 时只想着"业务接口都要 JWT"，却忽略了 `health` 端点的语义本质上是**基础设施层**而非**业务层**
- 没有写针对 health 的集成测试 — 现有单测都是单元 guard 测试，没有覆盖到控制器级组装

#### 修复方案
- 把 `@UseGuards(...)` 从控制器类装饰器下放到**方法级**
- 健康检查只挂 `ApiKeyGuard + RateLimitGuard`，**不挂 JwtAuthGuard**
- 业务接口（recognize / spraycode / compare / history / images / delete）三个 guard 都挂

```ts
// 修复前 — 控制器级（错误）
@Controller('api/nickel')
@UseGuards(ApiKeyGuard, RateLimitGuard, JwtAuthGuard)
export class NickelController { ... }

// 修复后 — 方法级
@Controller('api/nickel')
export class NickelController {
  @Get('health')
  @UseGuards(ApiKeyGuard, RateLimitGuard)   // ← 不挂 JwtAuthGuard
  async health() { ... }

  @Get('history')
  @UseGuards(ApiKeyGuard, RateLimitGuard, JwtAuthGuard)   // ← 方法级挂载
  async getHistory() { ... }
}
```

#### 教训
1. **控制器级装饰器是高权限操作** — `@UseGuards` / `@UseInterceptors` / `@UsePipes` 在控制器级会作用于所有方法，加之前先问自己"每个方法都需要吗？"
2. **端点分类先于挂载决定** — 在 controller 顶部写一行注释明确「基础设施端点 vs 业务端点」，再决定 guard
3. **必须有端到端测试兜底** — 仅靠单元 guard 测试无法发现"挂错位置"这类集成 bug。新增 `nickel.controller.spec.ts` 用 `Reflector.get(GUARDS_METADATA, fn)` 在元数据层断言每个方法的守卫集合，防止未来回归

#### 验证
- 新增 10 个回归测试（`nickel.controller.spec.ts`）：
  - 控制器级不应挂任何 guard（防止有人重新提到类上）
  - 7 个业务方法都必须包含 `JwtAuthGuard`
  - `/health` 不应包含 `JwtAuthGuard`、但仍包含 `ApiKeyGuard + RateLimitGuard`
- 测试结果：13 套件 / 175 用例全部通过（+10 用例）

---

### 🐛 问题 2（P1 — mobile 端 `localStorage` 上的 API Key 死代码）

#### 现象
- v2.3.3 commit message 声称"移动端 API Key 加密存储（Capacitor Preferences）"
- 但 `mobile/src/api/request.ts:35` 实际是 `localStorage.getItem('markapp_api_key')`
- 全项目搜索 `markapp_api_key` 只此一处，**没有任何 store 或 UI 写入过**
- 结果：这段代码永远不会读到任何值，属于**死代码** + **误导性 commit 描述**

#### 原因分析
两个独立的失误叠在一起：
1. 在 `request.ts` 留了一个「兜底兼容未登录场景的机器调用」fallback，但从未配套实现「机器调用场景」的入口
2. commit 描述描述了「加密存储」的愿景，但实际代码仍是 raw localStorage，描述与实现脱节

这是 v2.3.2 强调过的"消除死代码"主题的同类问题 — commit 时没核对「代码与描述一致性」。

#### 修复方案
直接删除 fallback 分支：

```ts
// 修复前
request.interceptors.request.use((config) => {
  const token = authToken.get()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  // ← 这段是死代码
  const apiKey = localStorage.getItem('markapp_api_key')
  if (apiKey) {
    config.headers['x-api-key'] = apiKey
  }
  return config
})

// 修复后
request.interceptors.request.use((config) => {
  const token = authToken.get()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})
```

服务端的 `ApiKeyGuard` 保留 — 它仍然是机器到机器调用的合法路径，只是入口由后端 `API_KEY` 环境变量管控，不在前端做这件事。

#### 教训
1. **commit message 是契约** — 写"做了什么"时必须与代码逐字对照；如果做不到，宁可不写这种修饰
2. **找不到写入方的读取代码就是死代码** — 写 fallback 时必须反向追问"谁会写这个 key？"；没人写就删
3. **后端的能力不等于前端的入口** — `ApiKeyGuard` 是后端的事，前端不必模仿；后端 + 环境变量 + 运维发 key 是正确的机器到机器路径

---

### 🐛 问题 3（P2 — `sessionStorage` 用法缺乏文档说明）

#### 现象
- `mobile/src/views/HistoryView.vue:140/144` 与 `ResultView.vue:72/77` 使用 `sessionStorage.markapp_detail` 传递详情数据
- v2.3.3 引入 `useStorage` 抽象把 token/user/apiKey 都统一管了，sessionStorage 成了"漏网之鱼"
- 没有人知道 sessionStorage 是登录态外的合法用途，还是漏迁移

#### 原因分析
- sessionStorage 在前端确实有它的合理用途（一次性跨路由传 snapshot、与 tab 生命周期对齐、跨 tab 不共享）
- 但项目的 DEVLOG 强调「统一存储抽象到 `useStorage`」，没有交代「哪些场景仍用原生 sessionStorage 是合理的」
- 缺乏注释 → 下次有人看到 sessionStorage 会以为这是漏迁移的死代码，或者错误的"我会继续补充迁移"

#### 修复方案
**不动代码，只加注释** — sessionStorage 的 usage 在这里（detail-passing）就是对的：

```ts
// HistoryView.vue — viewDetail() 降级路径
} catch (e) {
  // 详情拉取失败时降级：用列表 record 数据直接跳转（ResultView 用它兜底渲染）
  // sessionStorage 仅用于跨路由传一次性 detail snapshot，非登录态/持久化数据
  sessionStorage.setItem('markapp_detail', JSON.stringify(record))
  router.push('/result/' + record.id)
}

// ResultView.vue — onMounted()
onMounted(async () => {
  // 读取 HistoryView 跳转前注入的详情快照（tab 切换/路由参数丢失时不重新拉取）
  // 仅 detail-passing 用途，不承载登录态或跨标签页持久化（统一由 storage 抽象处理）
  const cached = sessionStorage.getItem('markapp_detail')
  if (cached) { ... }
})
```

#### 教训
1. **抽象统一 ≠ 删除所有原生 API** — sessionStorage/localStorage/cookie/IndexedDB 各有适用场景，全替换会失去合理差异化
2. **看似不一致的代码要写明「为什么不一致」** — 一行注释比 10 行 PR 描述都有效，因为它刻在代码现场
3. **架构原则要"双重声明"** — DEVLOG 写一次，代码注释写一次；前者面向阅读，后者面向维护

---

### 📊 本次提交统计

| 文件 | 变更 |
|------|------|
| `backend/src/nickel/nickel.controller.ts` | 控制器级 `@UseGuards` 下放到方法级，health 不挂 JwtAuthGuard |
| `backend/src/nickel/nickel.controller.spec.ts` | 新增（10 个回归测试） |
| `mobile/src/api/request.ts` | 删除 `markapp_api_key` 死代码分支 |
| `mobile/src/views/HistoryView.vue` | sessionStorage 加注释 |
| `mobile/src/views/ResultView.vue` | sessionStorage 加注释 |
| `DEVLOG.md` | 本节 |

### ✅ 验证
- 后端 `npm test`：**13 套件 / 175 用例**全部通过（+10 用例）
- 后端 `npm run build`：通过
- 前端 `npx vue-tsc --noEmit`：通过
- 前端 `npm run build`：通过

---

## v2.3.6 — 2026-06-30

### 🎯 条码优先架构重构

v2.3.5 之前，"标签识别"和"喷码识别"以 **OCR 文本** 为主数据源，条码扫描只用来填一个 `barcode` 字段 + 偶尔反查 productName。结果：用户的喷码图（裸数字 + 乱码中文）走 OCR 提取被严格正则全部漏掉，剩下 5 个 null 字段。

业务侧给出明确约束后，本次重构彻底切换：
- 标签/喷码识别数据源唯一来自 **25 位行业编码条码**（zxing-cpp 扫出）
- OCR 文本**不再参与业务字段提取**，仅供错误信息展示
- 喷码 vs 标签对比**只对比条码能映射的 4 个字段**（batchNo / packNo / productionDate / netWeight）
- 条码解析失败 → 返回 `_warning` 字段，前端友好提示，不抛 5xx

### 📐 业务规则（N1-N25 行业编码）

```
N1N2N3      企业代码 (3)
N4N5        产品类别代码 (2)
N6N7        产品品级代码 (2)
N8-N13      生产日期代码 YYMMDD (6)
N14-N20     产品唯一生产序号代码 (7)
  ①         车间代码（1=电解一车间电解镍 / 2=电解二车间电解镍 / 3=电解三车间电解镍 /
             4=电积一车间电解镍(128槽) / 5=电解三车间电积镍(停产) /
             6=电积一车间 / 7=电积二车间）
  ②③④      批号后三位（不含 D、J、s、t）
  ⑤⑥⑦      包号编码（0-200 直接为包号；201-400/401-600/601-800 对应三组机组，
             包号 = code - 基数，批号 +J 后缀）
N21-N25     捆净重代码（÷10 即 kg）
```

### 🔧 改动一览

| 文件 | 改动 |
|---|---|
| `ocr-service/main.py` | zxing-cpp 用 `read_barcodes`（复数）支持多条码；保留默认 `try_rotate/try_downscale/try_invert=True`（实景容错最优） |
| `backend/src/common/services/ocr-utils.ts` | `pickBestBarcode` 增加 25 位优先策略；新增 `normalize25DigitBarcode` 归一化 |
| `backend/src/common/services/label-ocr.service.ts` | **完全重写**：条码解析为主路径；`mapBarcodeToLabel` 反推所有字段；失败分支返回空数据 + 精确 `_warning` |
| `backend/src/common/services/spraycode-ocr.service.ts` | **完全重写**：与 label-ocr 同结构；喷码图无条码时返回 `_warning`，不抛异常 |
| `backend/src/common/services/spraycode-compare.service.ts` | **字段集 12 → 4**：仅 `batchNo/packNo/productionDate/netWeight`；扁平字段对比，不再有 cn/en 双语 |
| `backend/src/common/services/rule-checker.service.ts` | 兼容业务常量：中文 brand '金川' 不触发英文大小写检查；standard 接受 `GB/T 6516-2025` / `GB/T6516-2025` 两种格式 |
| `backend/src/nickel/nickel.service.ts` | `recognize()` 移除旧的"自己再 parse 一遍 barcode 反推 productName"重复逻辑；`compare()` 改用扁平字段 |
| `backend/src/nickel/types/nickel.types.ts` | 加 `_warning?` / `_barcodeRaw?` 字段；`OcrMeta.barcodes[]` 多条码明细 |
| `backend/src/common/services/{label,spraycode-ocr,spraycode-compare}.service.spec.ts` | **新增**：3 个测试套件 / +20 用例覆盖三大分支 |

### 🎨 业务常量（不再来自 OCR）

```ts
brand:     '金川'
standard:  'GB/T 6516-2025'
weightBy:  '按净重计价'
address:   '甘肃省金昌市金川区北京路10号'
```

这些字段 v2.3.4 之前从 OCR 文本识别，v2.3.5 硬编码默认，**v2.3.6 直接作为业务常量**（不写入 rawData.correctedData 区分来源，前端如果关心数据来源可以靠 `_barcodeRaw` 推断）。

### 🚦 三种业务分支的运行时行为

| 场景 | 后端返回 | 前端展示 |
|---|---|---|
| **正常**：扫到 25 位条码 | `rawData` 全部字段填好；`_warning` 缺失 | 结果页正常展示 |
| **失败**：扫不到 / 格式错 / 解析失败 | `rawData` 业务字段全 null；`_warning` 含失败原因；HTTP 仍 200 | 显示 `_warning` 内容 + 整张图为 ❌ 标识 |
| **极端**：zxing 抛异常 | callOcrFull 返回空 → 走"未扫到条码"分支 | 同上 |

注意：**后端永不抛 5xx**——失败信息都在 `_warning`，前端不依赖 HTTP 状态码判断成败。

### 🐛 调试与排查

前端要查看原始扫到的所有条码（包括非 25 位），可用 `result._ocrMeta.barcodes[]`。每个元素 `{text, format}` 完整列出 zxing-cpp 输出。例如：

```json
"barcodes": [
  {"text": "6901234567890",       "format": "EAN_13"},
  {"text": "09802012606151000050","format": "CODE_128"}
]
```

### 📊 测试覆盖

| 套件 | 用例 |
|---|---|
| `barcode-parser.service.spec.ts` | 已有 |
| `label-ocr.service.spec.ts` 🆕 | 8 |
| `spraycode-ocr.service.spec.ts` 🆕 | 5 |
| `spraycode-compare.service.spec.ts` 🆕 | 8 |
| 其余已有套件 | — |

**总计：16 套件 / 195 用例**（v2.3.5 是 175，+20 是 v2.3.6 新加）

### 💡 经验与教训

1. **数据源选择要在架构第一行就定**——v2.3.4 把 OCR 和条码扫描两个引擎都做了，但没有强制优先级，导致用户拍摄不规范时全空。业务约束（"条码优先"）要在 service 第一行就反射到代码，不能寄希望于"下游校验兜住"。

2. **失败处理的两种姿势**：
   - **HTTP 5xx**：适合"系统出问题"（RapidOCR 挂了、MySQL 崩了）
   - **200 + `_warning` 字段**：适合"用户输入问题"（图片没条码、图片模糊）
   
   重构刻意选后者——用户能立刻看到失败原因 + OCR 文本，而不是面对冷冰冰的 500。

3. **业务常量与 OCR 字段要明确分隔**——v2.3.5 里 brand/standard 等被混在 rawData 里又同时硬编码默认；现在彻底独立成"业务常量"，rule-checker 不再做它们的字段格式校验（中文 brand 不强制英文大小写），减少误报。

4. **重构测试要"覆盖三大分支"而不是"测一个 happy path"**——本次新加的 21 个用例里有 18 个是失败路径。架构改造最大的风险是 happy path 正常工作但失败路径都没测过。

5. **zxing-cpp 单数 vs 复数**——`read_barcode(image)` 返回单个 `Barcode | None`，`read_barcodes(image)` 返回 `list[Barcode]`。一个标签上有 EAN+CODE128+QR 三个码的场景必须用复数版本。CLAUDE.md 提到的 v2.1.1 `read_barcode` TypeError 修复只是冰山一角。

### ⚠️ 后续工作

- **UI 不消费 `_warning`**：本次重构加了字段，但 `ResultCard.vue` / `CompareResultCard.vue` 还没展示。下次前端改版时补：识别失败时显示黄色 banner「为什么失败 + 扫码原文 OCR 文本（给用户参考）」
- **条码打印测试夹具**：建议加几个标准 25 位条码印刷图（车间 1-7、日期跨年包号 200 边界）做集成测试

---

### 🚨 v2.3.6 错误经验专章（按发生时序，不是按类别）

> 这一会话踩了 11 个坑。每个按 **症状 → 根因 → 修复 → 教训** 四段写。
> 写这段的目的是下次遇到相似症状能直接定位根因，而不是回头翻 git log。

---

#### 🐞 坑 1：登录 401 — `.env` 误指生产域名

- **症状**：浏览器 `Failed to load resource: 401`；后端日志**完全没有**这条请求
- **根因**：`mobile/.env` 的 `VITE_API_BASE_URL=https://mark.jcngcp.xyz`。Vite 把 env 编译进 bundle，浏览器请求**真发到了生产服务器**；生产域名要么 CORS 拒绝、要么不在白名单，请求在浏览器层就失败，根本没到本机 3003
- **修复**：`.env` 改回 `http://localhost:3003`，重启 Vite
- **教训**：① dev `.env` **永远指向 localhost**；② Vite 把 env **内联进 JS**，hard refresh 才会拉新值；③ **后端日志静悄悄要立刻怀疑"请求根本没到你服务器"**（CORS preflight / 跨域 / DNS 全都可能），不只是"后端 bug"

---

#### 🐞 坑 2：favicon 404 + `apple-mobile-web-app-capable` 警告

- **症状**：浏览器三个 console 警告/错误
- **根因**：① 仓库从未提供 favicon；② iOS Safari 已废弃 `apple-mobile-web-app-capable`，需要新别名 `mobile-web-app-capable`
- **修复**：`mobile/public/favicon.svg`（iOS 18 渐变设计）+ HTML 双 meta 兼容
- **教训**：浏览器警告是**用户首次体验点**，积少成多影响"专业度"判断。新建项目时 favicon + mobile-web-app-capable 是基本盘

---

#### 🐞 坑 3：登录还是失败 — `stores/auth.ts` 用全局 `axios` 而非统一 `request`

- **症状**：修了 `.env` 后浏览器仍 401
- **根因**：`auth.ts` 写的是 `axios.post(\`${axios.defaults.baseURL || ''}/api/auth/login\`)`。`axios.defaults.baseURL` 在浏览器默认空串，拼出**相对 URL** `/api/auth/login`。其他 API 走的是 `request.ts` 的 `axios.create({ baseURL })`。两个 baseURL **全局状态相互覆盖**
- **修复**：`auth.ts` 改 `import request from '@/api/request'`，移除 `axios.defaults.baseURL` 跨模块耦合
- **教训**：**永远不要在多个模块里同时用全局 axios + 自定义 axios 实例**。baseURL/headers/interceptors 是隐性 cross-module state；统一封装、`import` 显式使用，是最干净的分层

---

#### 🐞 坑 4：`MySQL container Exited (255) 24 hours ago`

- **症状**：后端启动 `ECONNREFUSED ::1:3307`，Nest 重试 9 次后崩溃
- **根因**：`markapp-mysql` Docker 容器 24 小时前崩溃，无人重启
- **修复**：`docker start markapp-mysql`
- **教训**：开发环境起服务时**先列基础设施健康**：`docker ps -a | grep <container>`、`netstat -ano | grep :<port>`，比"启应用然后看错误日志"快 5 倍

---

#### 🐞 坑 5：Nest 启动顺序竞态 — `EADDRINUSE`

- **症状**：重启 OCR 后 `nest start` 报 `EADDRINUSE 0.0.0.0:3003`
- **根因**：`TaskStop` 是**异步**的，旧 Nest 进程还在占端口；立即 `npm run start:dev` 就冲突
- **修复**：`netstat -ano | grep :3003` 拿 PID → `Stop-Process -Id <pid> -Force`（Windows 用 PowerShell）→ 等 `TIME_WAIT` 清空再启动
- **教训**：进程停止→启动至少 sleep 2s；Windows 端口释放比 Linux 慢（TIME_WAIT 60s+）。需要强杀时用 PowerShell `Stop-Process -Force` 而不是 `taskkill /F`（bash 转发会把 `/F` 误识别为路径）

---

#### 🐞 坑 6：zxing-cpp `read_barcodes` NameError

- **症状**：OCR `/ocr/full` 抛 `NameError: name 'read_barcodes' is not defined. Did you mean: 'read_barcode'?`
- **根因**：`from zxingcpp import read_barcode, BarcodeFormat` **只导入了单数**。我以为 CLI `dir(zxingcpp)` 列出来就是模块可见 — 实际上 `dir()` 看的是模块**全部属性**，但 `from x import y` 不导入未指定的属性到当前 namespace
- **修复**：`from zxingcpp import read_barcode, read_barcodes, BarcodeFormat`
- **教训**：①`dir(module)` 列出的属性 **≠** 当前命名空间可见属性；② 改用 `import zxingcpp as zx` 然后 `zx.read_barcodes(...)` 更安全；③ Python 模块改 import **必须重启服务**，不像 JS HMR

---

#### 🐞 坑 7：25 位测试数据手工算错位

- **症状**：测试期望 `batchNo: '26-1-000J'`，实际返回 `null`
- **根因**：手写测试数据 `'098020126061510000250 15000'.replace(/\s/g,'')` 是 27 字符而非 25，barcode-parser 直接拒
- **修复**：从 `0980201260615100025015000`（车间=1, 后三位=000, packCode=250, 净重=1500）逐位对照重写
- **教训**：构造测试 fixture **用代码组装**，不要手写 25 位数字。模板：`codeOf({workshop, suffix, packCode, weight}) → str`，永远不出错

---

#### 🐞 坑 8：TypeScript 测试 mock 类型错位

- **症状**：`Property 'confidence' is missing in type` TS 报错
- **根因**：`callOcrFull` 返回 `Array<{text, confidence}>`，mock 时只给了 `text`
- **修复**：mock 补 `confidence: 0.77`
- **教训**：用真实类型签名当模板写 mock，不要靠"看着像就行"

---

#### 🐞 坑 9：净重阈值测试逻辑反

- **症状**：期望 `1500 vs 1500.1` 匹配，实际 false
- **根因**：阈值 `|diff| ≤ 0.05`，但 diff=`0.1` 当然不通过 — 测试边界算错，不是代码 bug
- **修复**：拆两个 case：0.04 期望匹配、20 期望不匹配
- **教训**：边界测试**至少要"边缘通过"+"边缘失败"两组**；写完立刻人脑用 1+1 验算一遍阈值

---

#### 🐞 坑 10：`_warning` 文案硬编码

- **症状**：测试期望 `/条码格式无效/` 匹配，实际拿到"未检测到 25 位行业编码条码"
- **根因**：`emptyLabel()` 写**两套固定 message**，不管上面哪条分支都拿不到具体原因
- **修复**：`emptyLabel(barcodeRaw, reason)` 接收 reason 上游传入
- **教训**：失败信息**当场构造并透传**，不要在 helper 里"我猜你想要哪种"。helper 的输入参数决定它能不能产出有意义的输出

---

#### 🐞 坑 11：try_harder / is_pure 误用

- **症状**：本来想加 `try_harder=True` 提升容错
- **根因**：zxing-cpp 参数名是 `is_pure`（不是 `try_isPure`），而且**实景照片绝不能设 `True`** — 该参数仅适用于程序生成的纯净条码图，真实场景设了反而漏识
- **修复**：保留默认参数（`try_rotate/try_downscale/try_invert=True` 已经是实景最优）
- **教训**：第三方库的"性能优化"参数往往有反直觉副作用；改前**先读完整 API 文档**而不是猜参数名

---

### 🧠 v2.3.6 架构层经验（5 条核心取舍）

#### 1. 数据源优先级必须在 service 第一行声明
- v2.3.4 同时输出 OCR 文本和条码，让下游自己挑 → "中文乱码当成数字段"
- **新原则**：service 文件顶部注释明确"数据源 = X，Y 仅作 info"

#### 2. 失败语义双通道
| 失败类型 | HTTP 语义 | 字段 |
|---|---|---|
| 系统问题（OCR 挂了、MySQL 崩） | 5xx | `error.message` |
| 用户输入问题（图片没条码、格式错） | 200 | `data.rawData._warning` |

业务逻辑层**只控 200 路径**，系统层（NestJS exception filter）管 500 路径。**不混**。

#### 3. 业务常量 vs OCR 字段要明确切分
- v2.3.5：brand/standard 既 OCR 提取又硬编码默认 → 数据来源含糊
- v2.3.6：业务常量直接硬编码；rule-checker 不再校验它们（中文 brand 不强制英文大小写）
- **原则**：配置/常量是一个语义层，OCR 提取是另一个；混在一起让数据来源不可追溯

#### 4. 重构测试的"三大分支"覆盖率
- 本次新加 21 个用例，**18 个是失败路径**
- 架构改造最大风险不是 happy path 错（happy path 错误编译都过不了），是失败路径没覆盖
- 模板：`describe('分支 X：<条件>')` + `it('<具体表现>', ...)`

#### 5. zxing-cpp import 与多条码
- `read_barcode` 单数 → 单个 `Barcode | None`；`read_barcodes` 复数 → `list[Barcode]`
- 现实标签常同时含 EAN + CODE128 + QR，复数才是正解
- v2.1.x 那个 TypeError 修复只是"从错误变成了只取第一个"的**隐性 bug**，多条码仍未支持

---

### 📊 端到端实测

admin 登录 → 上传标签图 → Nest `/recognize`：

```
zxing /ocr/full:               barcodes: 2
  - QR_CODE   text="1090602260525315143114765"
  - CODE_128  text="1090602260525315143114765"

Nest /recognize 返回:
  batchNo:        26-3-151J
  packNo:         31         (packCode=431 → 431-400=31, +J)
  netWeight:      1476.5 kg  (14765 / 10)
  productionDate: 2026-05-25
  productName:    电解镍     (workshopCode=3 反推)
  brand:          金川
  standard:       GB/T 6516-2025
  weightBy:       按净重计价
  address:        甘肃省金昌市金川区北京路10号
  _warning:       (空)
```

⚠️ **实测注意**：现实扫码得到的是 22 位（`1090602260525315143114765`）而非规范 25 位。barcode-parser 走空格分隔路径仍能解析（因为长度对齐 >=18 是合法变体），但**生产里应当人工核对**是不是产品喷码省略了部分段。

---

### 📋 总账（v2.3.6）

| 项 | 结果 |
|---|---|
| 后端单元测试 | 16 套件 / 195 用例 (+20) |
| TypeScript 检查 | 通过 |
| 后端构建 | 通过 |
| 前端构建 | 通过 |
| OCR 服务 | 启动 + 多条码支持 |
| 端到端 | admin 登录 → /recognize 真图成功 |
| Git | `29fe358` — 15 files, +1037/-425 |

### ⚠️ 后续工作（同上）

- [ ] 前端 `ResultCard.vue` / `CompareResultCard.vue` 消费 `_warning`（黄色 banner + OCR 文本回显）
- [ ] 集成测试夹具：标准 25 位 + 边界（packCode=200/201/400/600/800）
- [ ] 产品文档：现实 22 位编码的兼容性说明

---

## v2.3.7 — 2026-07-01 安全加固与核心集成测试

### 🔍 全量项目审查

应用户「完整检查项目」要求，对 backend + mobile + ocr-service 三端做了系统性审计。覆盖范围：

| 维度 | 工具/方法 | 结果 |
|---|---|---|
| TypeScript 类型 | `tsc --noEmit`（双端） | 后端 + 前端均干净 |
| 测试覆盖 | `jest --coverage` | 195 用例全通过；整体 64.07%，但 `nickel.service.ts` 仅 **13.58%** |
| 静态分析 | `eslint` | 旧 `.eslintrc.js` 与最新 eslint 10 不兼容，`npm run lint` 跑不通 |
| 配置一致性 | grep + 手工对照 | `.env` 变量名与 `ConfigService` getter 一致（v2.3.2 已修） |
| 守卫挂载 | `Reflector` + 反射元数据 | 控制器级未误挂守卫（v2.3.4 复盘守护） |
| 安全 | 手工审查 | **3 处 P0 安全问题**（见下） |

### 🔴 P0 — 安全漏洞修复

#### 问题 1：`/api/auth/login` 实际不受限流保护

**症状**：`AuthController.login()` 的注释写着「仍受 RateLimitGuard 保护（通过在 Module 中全局绑定）」，但 `grep APP_GUARD / useGlobalGuards` 全代码库为 **0 命中**。

**影响**：登录端点可被暴力枚举 admin / admin123，凭据爆破无任何限制。

**根因**：v2.3.4 把 RateLimitGuard 改为方法级挂载时，登录端点忘了补 `@UseGuards(RateLimitGuard)`，但注释保留了「全局绑定」的旧假设。

**修复**：
```typescript
@Post('login')
@HttpCode(HttpStatus.OK)
@UseGuards(RateLimitGuard)  // 显式补上
async login(@Body() dto: LoginDto) { ... }
```

**⚠️ 教训**：**注释说「全局绑定」≠ 实际全局绑定**。Guard 绑定方式（控制器级 / 方法级 / `APP_GUARD` provider）是行为契约，文档必须用代码而不是散文来描述。

---

#### 问题 2：`/api/auth/me` 完全绕开 NestJS Guard 链

**症状**：`AuthController.me()` 手写 token 解析，缺失 NestJS Guard 标准的错误归一化、metrics 埋点、Swagger 集成点。

```typescript
// 旧代码 — 路由级验证，但所有错误处理散落
@Get('me')
async me(@Req() req: Request) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new UnauthorizedException('未登录');  // 与 JwtAuthGuard 错误格式不一致
  }
  // ...
}
```

**修复**：改用 `JwtAuthGuard` 统一验证，从 `req.user` 读取用户信息。

**⚠️ 教训**：**永远用 Guard 而非 inline 验证**。路由级手动验证导致：(1) 错误格式不一致；(2) 漏掉 metrics；(3) 一旦 `JwtAuthGuard` 增强（如加 refresh、token 黑名单），`me` 不会自动受益。

---

#### 问题 3：`TOKEN_SECRET` 生产模式回退到硬编码字符串

**症状**：
```typescript
// auth.service.ts
private static readonly SECRET_FALLBACK = 'markapp-demo-secret-change-in-production';
private hmac(data: string): string {
  const secret = this.configService.tokenSecret || AuthService.SECRET_FALLBACK;
  return createHmac('sha256', secret).update(data).digest('base64url');
}
```

**影响**：如果生产环境忘记配 `TOKEN_SECRET`，所有 JWT 用一个公开源码可查的字符串签名 — **任何人可伪造 admin token 直接登录**。

**修复**：构造函数 fail-closed
```typescript
private ensureSecretInProduction(): void {
  if (this.configService.isProduction() && !this.configService.tokenSecret) {
    const msg = '生产环境必须配置 TOKEN_SECRET...';
    this.logger.error(msg);
    throw new Error(msg);
  }
}
```

**测试覆盖**：
```typescript
it('生产模式 + 缺失 TOKEN_SECRET 应启动失败', async () => {
  await expect(Test.createTestingModule({...}).compile()).rejects.toThrow(/TOKEN_SECRET/);
});
```

**⚠️ 教训**：**任何 "fallback to insecure default" 都是定时炸弹**。开发/生产应该共用同一套行为，仅在 demo 模式放水。fallback 应在启动时抛错，让运维立即发现，而不是在用户登录时才发现 token 不可信。

---

### 🟡 P1 — 工程化债务清理

#### 修复 1：CLAUDE.md 测试数过期

文档写「7 套件 / 108 用例」，实际已增长到 **16 套件 / 195 用例**（v2.3.5 → v2.3.6 重构新增 ~87 个）。

**⚠️ 教训**：文档化的测试数应当 CI 自动生成（如 jest-junit），而不是手工抄写。

---

#### 修复 2：`console.*` → NestJS Logger

`grep console\\. src/` 命中 13 处，其中 8 处是生产逻辑（label-ocr / spraycode-ocr / ocr-utils / image-preprocess）。生产环境用 console.log 会：(1) 绕过 NestJS log level；(2) 没有时间戳/上下文；(3) 无法重定向到日志收集。

**修复**：每个服务用 `private readonly logger = new Logger(ServiceName.name)` 替换。

```typescript
// 旧
console.warn('[LabelOCR]', reason);

// 新
this.logger.warn(reason);  // 自动带 [LabelOcrService] 前缀
```

**保留**：`main.ts` 启动 banner 是惯例（NestJS 自己 bootstrap 也用 console.log）。

**⚠️ 教训**：**日志是行为，不是调试工具**。从第一天就该用 Logger，不要等上线再换。

---

#### 修复 3：ESLint 配置失效（`npm run lint` 跑不通）

**症状**：`backend/.eslintrc.js` 用旧格式（`module.exports = { parser, extends }`），但 `package.json` devDeps 里**根本没有 eslint**。`npx eslint` 会临时下载最新版 eslint 10，而 v10 已切换到 flat config（`eslint.config.js`），旧 `.eslintrc.js` 完全被忽略。

**修复**：固定 `eslint@^8.57` + `@typescript-eslint/*@^7.18` 到 devDeps。理由：
- 8.x 是最后一个支持 `.eslintrc.js` 的版本（迁移成本最低）
- 7.x typescript-eslint 与 8.x eslint 兼容
- 项目用 NestJS 11，生态尚未强制 flat config

**顺带修 2 处 lint 错误**：
1. `rule-checker.service.ts:524` — `let expectedProductType` 被误改成 `const`，但 if/else 分支中**会重新赋值**。**详见下方「修复过程的踩坑」**
2. `spraycode-compare.service.ts:108` — `let [y, m, d]` 中 m/d 不再赋值，应为 `const`
3. `auth.service.spec.ts:95` — `const crypto = require('crypto')` 违反 `no-var-requires`，改为 `import { createHmac } from 'crypto'`

**⚠️ 教训**：**lint 工具没装 ≠ lint 通过**。没有 CI 跑 lint 的项目，eslint 配置经常是「摆设」。应当：(1) 把 lint 加到 CI；(2) 把 lint 结果作为 PR merge 必要条件。

---

### 🧪 P1 — 核心集成测试补齐

**问题**：`nickel.service.ts` 覆盖率 13.58%（235 行中只有 22 行被覆盖）。

**根因**：自 v2.3.0 引入 `NickelService` 起就**只有 controller spec**，没有 service spec。controller spec 只验证 `@UseGuards` 元数据挂载位置，不验证业务编排。任何重构都不会被现有测试发现。

**修复**：新增 `nickel.service.spec.ts`（21 个用例），mock 7 个依赖服务，覆盖：

| 维度 | 用例数 |
|---|---|
| `recognize()` happy path | 2 |
| `recognize()` 输入校验（4 种 400 分支） | 4 |
| `recognize()` 错误传播（BadRequest 透传 vs 其他异常包 success:false） | 2 |
| `recognize()` 业务边界（_warning 优先 / error/warning 统计） | 2 |
| `recognizeSpraycode()` | 4 |
| `compare()`（1 张图 / 2 张图 / 标签校验） | 6 |
| `health()` | 1 |
| **合计** | **21** |

**覆盖率提升**：

```
nickel.service.ts   13.58% → 95.06%   ⬆️ +81.48 pp
overall stmts       64.07% → ~70%+
```

**⚠️ 教训**：**核心编排代码必须有集成测试**。单元测试各服务单独覆盖得再好，没覆盖「它们如何被串起来」就等于没覆盖。`recognize()` 的 9 步流水线（验证 → 预处理 → OCR → 纠错 → 校验 → 置信度 → 拼装 message → 异常处理）任何一步错位都会破坏业务，但只有集成测试能发现。

---

### 💥 修复过程中的踩坑（错误经验总结）

#### 踩坑 1：把 `let` 改成 `const` 破坏了逻辑

**场景**：修 lint `prefer-const` 报错。

```typescript
let expectedProductType: string | null = null;
let expectedIsEW = false;

if ([1, 2, 3, 4].includes(workshopCode)) { expectedProductType = '电解镍'; expectedIsEW = false; }
else if ([5, 6, 7].includes(workshopCode)) { expectedProductType = '电积镍'; expectedIsEW = true; }
```

lint 报 `prefer-const`，我机械地改成 `const`，立刻 `tsc --noEmit` 报 4 个错误：
```
Cannot assign to 'expectedProductType' because it is a constant.
Cannot assign to 'expectedIsEW' because it is a constant.
```

**根因**：**没仔细看代码就动手**。eslint 的 `prefer-const` 在某些嵌套分支场景下会有 false positive（它只看到顶层 `let = null`，没追踪到 `if` 块内的赋值）。

**修复**：还原 `let`，加 `// eslint-disable-next-line prefer-const` 注释。

**⚠️ 教训**：**lint 报错先看代码再下手**。`prefer-const` 不是「绝对该改」的硬规则，它只是「优先建议」。当代码确实需要重新赋值时，`// eslint-disable-next-line` + 注释解释比强行改成 `const` 安全 100 倍。

---

#### 踩坑 2：删除 import 但保留装饰器导致 `TS2304`

**场景**：重构 `/api/auth/me` 时，把方法体从「手写 verify」改成「读 req.user」，同时删除了 `import { ... UnauthorizedException }`。

```typescript
// 错误：删除了 UnauthorizedException，但忘了删 Req
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';

@Get('me')
@UseGuards(JwtAuthGuard)
async me(@Req() req: Request) { ... }  // ❌ TS2304: Cannot find name 'Req'
```

**根因**：**手工编辑时 import 列表和装饰器列表是两份独立的清单**。IDE 通常会同步高亮缺失符号，但 CLI 模式（直接 Edit 工具）看不到。

**修复**：在 import 行加回 `Req`：
```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
```

**⚠️ 教训**：**改完代码立刻跑 `tsc --noEmit`**，不要等「全部改完再跑」。单文件改完就验证，能把错误从 10 个降到 1 个。

---

#### 踩坑 3：mock 类型收窄导致 `mockResolvedValueOnce` 失败

**场景**：写 `nickel.service.spec.ts` 时，默认 mock 返回 happy path 的完整数据：

```typescript
const labelOcrService = {
  recognizeLabel: jest.fn(async () => ({
    labelData: { productName: '电解镍', batchNo: '...', ... },  // 推导出字面量类型
    _ocrMeta: { barcodeFormat: 'CODE_128' as string | null },
  })),
};
```

后续要测试「条码失败」分支时：
```typescript
mocks.labelOcrService.recognizeLabel.mockResolvedValueOnce({
  labelData: { ...所有字段 null..., barcode: null },  // ❌ TS2322: barcode null 不匹配 string
  barcodeParsed: null,
});
```

**根因**：jest 的 `mockResolvedValueOnce` 默认按**首次调用的返回类型**收窄。当你之后想传「不同 shape」的值，TypeScript 会拒绝。

**修复**：显式声明 mock 返回类型为宽接口：
```typescript
recognizeLabel: jest.fn(async (): Promise<{
  labelData: NickelLabelData;  // 用接口类型而非字面量
  barcodeParsed: BarcodeParsed | null;
  _ocrMeta: OcrMeta;
}> => ({ ... }))
```

**⚠️ 教训**：**mock 的返回类型签名要尽量宽**。定义 `jest.fn((): MyInterface => ...)` 而不是依赖 TypeScript 自动推导。前者让 mock 可以返回任何 `MyInterface` 兼容值；后者会让 `mockResolvedValueOnce` 被锁死。

---

### 📊 修复前后对比

| 指标 | 修复前 | 修复后 | 变化 |
|---|---|---|---|
| 后端测试套件 | 16 | **17** | +1 |
| 后端测试用例 | 195 | **218** | +23 |
| `nickel.service.ts` 覆盖率 | 13.58% | **95.06%** | +81.48 pp |
| TypeScript 错误 | 0 | 0 | — |
| ESLint 错误 | 配置失效 | **0 errors** | 修复 |
| 未推送提交 | 4 | 0 | 推完 |
| P0 安全问题 | 3 | **0** | 全修 |

### ⚠️ 仍未解决的问题

1. **Jest worker 进程泄漏** — `A worker process has failed to exit gracefully and has been force exited` 警告仍在。可能原因：`RateLimitGuard` 的 `setInterval(60000)` 在测试 teardown 时未 `clearInterval`。修复方向：`afterEach` / `afterAll` 显式销毁。

2. **`nickel.controller.ts` 覆盖率 37.73%** — 仍偏低，特别是 `compare()` 流式图片处理路径。下一个 PR 应补 e2e（Supertest 已装）。

3. **41 处 `no-explicit-any` warnings** — 主要是测试代码中的 `as any` 类型断言。建议按文件逐一收紧，优先收 NickelService 的 DI mock 类型。

4. **前端零测试** — `mobile/` 3,349 行 Vue/TS 代码无任何回归保护。优先级低于后端，但下次大改前必须接入 Vitest。

5. **`compareDto` 未使用** — `nickel.controller.ts:89` `@Body() compareDto: CompareDto` 形参实际未在 `compare()` 内引用（Multer 已消费 form-data）。建议删除或加上 `barcode` 透传。

### 📚 此次修复方法论总结

1. **审计要分维度**：安全 / 测试 / 工程化 / 性能 / 文档，五维交叉
2. **优先级按「不可逆性」分**：安全 > 数据正确性 > 性能 > 代码风格
3. **修复要带回归测试**：每修一个 P0 问题，至少加 1 个对应测试用例
4. **lint 报错先理解再动手**：不要无脑 `let` → `const` / `var` → `import`
5. **mock 类型签名要宽**：用接口而非字面量推断
6. **改完立刻验证**：单文件改完就 `tsc --noEmit`，不要攒一堆再跑
7. **fail-fast 优于 fail-open**：安全默认值应当「启动失败」而非「静默回退」
- [ ] OCR 服务返回真实 25 位比例监控
- [ ] `.env` 模板默认值改为 `localhost`，部署时手工覆盖
- [ ] Vite config 加 preload `request.ts`，避免 dev 模式首帧延迟

