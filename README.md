# PathView

工业机器人路径可视化工具 — 导入 CSV 路径文件，在 3D 场景中查看点位轨迹与姿态数据。

## 功能特性

- **CSV 导入**：上传路径 CSV 文件，自动匹配列名，支持手动调整列映射
- **无标题 CSV 支持**：可选择"无标题"模式，或指定任意行作为标题行，实时预览数据
- **3D 路径渲染**：Three.js 驱动的 3D 视图，显示路径线、点位标记、姿态坐标轴
- **点位大小调节**：通过滑块调整 Point Markers 大小（1%~500%）
- **姿态可视化**：支持 Rx/Ry/Rz Euler 角（ZYX 旋转顺序），显示当前点位或全部点位姿态轴
- **播放回放**：逐点/平滑/循环三种模式，可调速播放
- **视角预设**：一键切换 Front/Top/Side/Iso 视角（Z 轴朝上，符合机器人学惯例）
- **颜色自定义**：点击颜色指示灯，从 7 色 × 5 亮度面板中选取路径颜色
- **数据持久化**：SQLite 单文件数据库存储，无需额外配置

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite 8 + react-three-fiber (Three.js) |
| 后端 | Express 5 + TypeScript + better-sqlite3 + csv-parse |
| 数据库 | SQLite（单文件，随服务自建） |
| 构建 | npm workspaces + concurrently 一键启动 |

## 项目结构

```
PathView/
├── client/                    # 前端 (React + Vite)
│   └ src/
│   │   ├── api/paths.ts       # API 调用层
│   │   ├── components/
│   │   │   ├── Scene3D.tsx     # 3D 场景主组件
│   │   │   ├── PathLine.tsx    # 路径线渲染
│   │   │   ├── PathPoints.tsx  # 点位球体标记
│   │   │   ├── OrientationAxes.tsx  # 当前点位姿态轴
│   │   │   ├── PathList.tsx    # 路径列表 + 颜色选择器
│   │   │   ├── PlaybackBar.tsx # 播放控制条
│   │   │   ├── DisplayControls.tsx  # 显示开关 + 点位大小滑块
│   │   │   ├── ViewTools.tsx   # 视角预设面板
│   │   │   ├── PointDetail.tsx # 点位详情面板
│   │   │   └ ColumnMapper.tsx  # CSV 列映射对话框（含标题行选择）
│   │   ├── hooks/
│   │   │   ├── usePaths.ts     # 路径数据管理
│   │   │   ├── usePlayback.ts  # 播放状态管理
│   │   ├── types/index.ts      # TypeScript 类型定义
│   │   ├── App.tsx             # 主应用组合
│   │   ├── App.css             # 全局样式
│   │   └ vite.config.ts        # Vite 配置（含 API 代理）
│   └ package.json
├── server/                    # 后端 (Express)
│   └ src/
│   │   ├── index.ts           # 服务入口
│   │   ├── db.ts              # SQLite 初始化与迁移
│   │   ├── routes/paths.ts    # REST API 路由
│   │   ├── services/
│   │   │   ├── csvParser.ts   # CSV 解析（含 BOM 处理、标题检测）
│   │   │   ├── columnMatcher.ts  # 列名自动匹配
│   │   ├── types/index.ts     # TypeScript 类型定义
│   └ package.json
├── package.json               # workspace 根配置
└── .gitignore
```

## 快速开始

### 前置要求

- Node.js >= 18
- npm >= 9

### 安装与启动

```bash
# 克隆项目
git clone <repo-url>
cd PathView

# 安装依赖（npm workspaces 自动处理前后端）
npm install

# 一键启动前后端
npm run dev
```

启动后访问：
- 前端：http://localhost:5173
- 后端 API：http://localhost:3001/api/paths

### 其他命令

```bash
npm run dev:server   # 仅启动后端
npm run dev:client   # 仅启动前端
npm run build        # 构建前端产物
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/paths | 获取所有路径列表 |
| GET | /api/paths/:id | 获取路径详情（含全部点位） |
| POST | /api/paths | 创建路径（传入点位数据） |
| POST | /api/paths/upload | 上传 CSV 文件（返回解析结果与列映射） |
| POST | /api/paths/reparse | 重新解析 CSV（指定标题行索引） |
| PATCH | /api/paths/:id/color | 更新路径颜色 |
| DELETE | /api/paths/:id | 删除路径 |

## CSV 格式要求

- 支持带标题行或无标题行的 CSV 文件
- 带标题行：首行（或指定行）为列名，系统自动匹配 X/Y/Z/Rx/Ry/Rz
- 无标题行：列名显示为 `Column 1`、`Column 2`...，用户手动映射
- 支持 UTF-8 BOM（Excel 导出的常见格式）
- 必须包含 X、Y、Z 坐标列（列名不固定，系统自动匹配）
- 可选包含 Rx、Ry、Rz 姿态列（Euler 角，单位：度）

示例（带标题行）：

```csv
X,Y,Z,Rx,Ry,Rz
100.0,200.0,50.0,0,90,0
150.0,250.0,55.0,10,85,5
...
```

示例（无标题行）：

```csv
100.0,200.0,50.0,0,90,0
150.0,250.0,55.0,10,85,5
...
```

上传后在列映射对话框中：
- 选择"无标题"模式，列名显示为 `Column 1`、`Column 2`...
- 或选择"首行是标题"，并指定标题行位置（Row 0, Row 1...）
- 实时预览数据表格，确认后导入

## 3D 场景说明

- **坐标系**：Z 轴朝上（机器人学标准惯例），相机 up vector = (0, 0, 1)
- **姿态轴**：红色=X 轴方向，绿色=Y 轴方向，蓝色=Z 轴方向，采用 Euler ZYX 旋转顺序
- **深度缓冲**：启用对数深度缓冲 (logarithmicDepthBuffer) + 动态 near/far，避免不同尺度路径的 z-fighting
- **视角切换**：动画过渡，ease-out cubic 缓动
- **点位大小**：Display 面板提供 Size 滑块，范围 1%~500%，实时调整球体大小

## License

MIT