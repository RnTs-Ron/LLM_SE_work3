# AI 旅行规划助手

这是一个基于 AI 的智能旅行规划系统，可以根据用户需求自动生成个性化的旅行计划。

## 快速开始

### 从阿里云拉取并运行镜像

```bash
# 拉取镜像
docker pull crpi-syu7xl7jm01it12d.cn-hangzhou.personal.cr.aliyuncs.com/ning_nju/llm_work3:1.0

# 运行镜像
docker run -p 3000:3000 crpi-syu7xl7jm01it12d.cn-hangzhou.personal.cr.aliyuncs.com/ning_nju/llm_work3:1.0
```

然后在浏览器中访问 `http://localhost:3000` 即可使用应用。

### 高德地图key 和 通义千问key

```bash
高德 ： 616e80454cb4254bd789854f4051aa0a

通义 ： sk-ddbe5248245142a7847eb177ac475d0c

```
### 从源码构建和运行

如果您希望从源码构建项目：

1. 克隆项目仓库
2. 进入 `frontend` 目录
3. 执行 `npm install` 安装依赖
4. 启动开发服务器：`npm run dev`

或者使用 Docker Compose 构建和运行：

```bash
docker-compose up --build
```

### 使用预构建的 Docker 镜像运行

``bash
docker run -p 3000:3000 work3-frontend
```

### 使用 Docker Compose 构建和运行

``bash
docker-compose up --build
```

## 项目概述

AI旅行规划师是一个基于Web的智能旅行规划系统，旨在通过AI技术为用户提供个性化、高效的旅行规划服务。用户可以通过自然语言交互描述旅行需求，系统将自动生成详细的旅行路线、预算分析和实时辅助功能。

## 核心功能

1. 智能旅行规划 - 根据用户输入的简单信息生成详细的旅行计划
2. 费用预算分析 - 自动生成旅行预算并跟踪实际开销
3. 地图可视化 - 结合高德地图显示路线和地点信息
4. 用户账户系统 - 注册登录和旅行计划保存
5. 多平台支持 - 响应式设计，支持桌面和移动设备

### 目标用户

- 个人旅行者
- 家庭出游用户
- 商务旅行人士
- 旅行爱好者

## 技术架构

### 前端技术栈

- **框架**：React 18
- **构建工具**：Vite
- **UI组件库**：Ant Design
- **状态管理**：React Context API
- **路由管理**：React Router v7
- **地图组件**：高德地图API
- **认证服务**：Supabase Authentication
- **数据库**：Supabase

## 项目结构

```
.
├── frontend/                 # 前端应用
│   ├── src/                  # 源代码
│   │   ├── components/       # React 组件
│   │   ├── contexts/         # React Context
│   │   ├── utils/            # 工具函数
│   │   ├── App.jsx           # 主应用组件
│   │   └── main.jsx          # 应用入口文件
│   ├── package.json          # 前端依赖配置
│   └── vite.config.js        # Vite 配置
├── supabase/                 # Supabase 配置和函数
│   └── functions/            # Edge Functions
├── README.md                 # 项目说明文档
├── docker-compose.yml        # Docker 编排配置
└── ai-travel-planner.tar     # 已构建的 Docker 镜像文件
```

## 环境变量配置

在运行项目之前，请确保配置了正确的环境变量。在 frontend 目录下创建 `.env` 文件并配置以下 Supabase 凭据：

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

注意：高德地图和通义千问的 API Key 由用户在应用的设置页面中配置，不需要在环境变量中设置。

您可以参考 frontend 目录下的 `.env.example` 文件创建您的 `.env` 文件。

## 开发环境运行

1. 安装依赖：
```bash
cd frontend
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

## 生产环境构建

构建生产版本：
```bash
npm run build
```

预览生产构建：
```bash
npm run preview
```

## Docker 部署详解

### 使用 Docker 直接构建和运行

1. 构建 Docker 镜像：
```bash
cd frontend
docker build -t ai-travel-planner .
```

2. 运行容器：
```bash
docker run -p 3000:3000 --env-file .env ai-travel-planner
```

### 使用 Docker Compose 运行（推荐）

1. 在项目根目录下运行：
```bash
docker-compose up --build
```

这将启动应用并绑定到主机的 3000 端口。

### 导出 Docker 镜像

如果您需要导出构建好的镜像以供其他环境使用：
```bash
docker save -o ai-travel-planner-frontend.tar work3-frontend
```

这样导出的镜像文件可以发送给别人，他们可以通过以下步骤使用：

1. 将 [ai-travel-planner-frontend.tar](file://d:/Code/damoxingfuzhu/work3/ai-travel-planner-frontend.tar) 文件放在一个目录中
2. 打开终端或命令提示符
3. 运行 `docker load -i ai-travel-planner-frontend.tar` 加载镜像
4. 运行 `docker run -p 3000:3000 work3-frontend` 启动容器
5. 在浏览器中访问 http://localhost:3000

## 注意事项

1. 高德地图和通义千问的 API Key 由用户在设置页面自行配置
2. 确保 `.env` 文件中包含正确的 Supabase 配置
3. 在生产环境中，建议使用 nginx 或其他 Web 服务器来提供静态文件服务
4. 请勿将包含敏感信息的 `.env` 文件提交到版本控制系统中