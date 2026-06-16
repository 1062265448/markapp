# MarkApp 开发日志

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
