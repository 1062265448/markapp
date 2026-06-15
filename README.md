# MarkApp — 镍板标签识别 APP

基于 AI 三模型投票的镍板标签智能识别系统，支持标签识别、喷码 OCR、喷码对比等功能。

## 架构

```
markapp/
├── backend/          # NestJS 后端 API
│   └── src/
│       ├── common/         # 公共服务（AI 调用、条码解析、规则校验等）
│       ├── config/         # 配置模块
│       └── nickel/         # 镍标识别业务模块
│
└── mobile/           # Vue 3 + Capacitor 移动端
    └── src/
        ├── api/            # API 请求封装
        ├── components/     # UI 组件
        ├── composables/    # 组合式函数
        ├── views/          # 页面
        └── stores/         # Pinia 状态管理
```

## 核心功能

- **标签识别**：三模型并行识别（火山引擎 Doubao、阿里 Qwen、智谱 GLM），投票合并结果
- **喷码 OCR**：基于 RapidOCR + Qwen VL 的喷码文字识别
- **喷码对比**：喷码与标签信息一致性校验
- **规则校验**：批号、包号、日期、重量等字段的格式/范围/交叉校验
- **自动纠错**：OCR 常见字符混淆自动纠正（O→0、l→1 等）
- **置信度评分**：基于 null 字段、纠正次数、校验错误等维度的综合评分

## 环境要求

- Node.js >= 18
- npm >= 9
- Android Studio（移动端开发）

## 快速开始

### 后端

```bash
cd backend
cp .env.example .env    # 编辑 .env 填入 API Key
npm install
npm run start:dev       # 开发模式启动（默认端口 3003）
```

### 移动端

```bash
cd mobile
npm install
npm run dev             # 浏览器开发模式
npm run cap:build       # 构建并同步到 Android
```

## 环境变量

在 `backend/.env` 中配置（参见 `.env.example`）：

| 变量 | 说明 | 必填 |
|------|------|------|
| `PORT` | 服务端口 | 否（默认 3003） |
| `API_KEY` | API 认证密钥 | 否 |
| `API_KEY_ENABLED` | 是否启用 API Key 认证 | 否 |
| `QWEN_API_KEY` | 阿里 Qwen API Key | 是 |
| `VOLC_API_KEY` | 火山引擎 API Key | 是 |
| `GLM_API_KEY` | 智谱 GLM API Key | 否（可选） |
| `RAPID_OCR_URL` | RapidOCR 服务地址 | 是 |

移动端原生 API 地址通过 `VITE_NATIVE_API_URL` 环境变量配置。

## 测试

```bash
cd backend
npm test                # 运行单元测试
npm run test:cov        # 运行测试并生成覆盖率报告
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/nickel/recognize` | 标签识别（上传图片） |
| POST | `/api/nickel/spraycode` | 喷码 OCR 识别 |
| POST | `/api/nickel/compare` | 喷码对比 |
| GET | `/api/nickel/health` | 健康检查 |
| GET | `/api/nickel/history` | 历史记录（预留） |

## 技术栈

- **后端**：NestJS 11、TypeScript、Axios
- **前端**：Vue 3、Pinia、Vue Router、Capacitor 8
- **AI**：火山引擎 Doubao Vision、阿里 Qwen VL、智谱 GLM-4V
- **OCR**：RapidOCR、Qwen VL OCR
