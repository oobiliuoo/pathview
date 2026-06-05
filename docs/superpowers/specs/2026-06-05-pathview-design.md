# PathView — 机器人路径展示网页设计

## 概述

PathView 是一个机器人路径可视化 Web 应用，支持导入 CSV 路径文件，在 3D 视图中显示路径点位和姿态数据，提供路径回放动画和多路径对比功能。主要面向工业机械臂（6轴）的路径数据查看场景。

## 技术栈

- **前端**: React + Vite + TypeScript + react-three-fiber (Three.js)
- **后端**: Express + TypeScript + better-sqlite3
- **数据库**: SQLite（单文件，零配置）
- **部署**: 本地/单机运行

## 架构

```
浏览器 (React SPA)
├── 3D 视图 (react-three-fiber)
├── 控制面板 (回放/显示切换)
└── 列映射对话框 (CSV列→字段)
        │
        │ REST API
        │
Express 后端
├── CSV 上传与解析
├── 路径 CRUD API
├── 列映射配置存储
├── SQLite 数据持久化
└── 静态文件托管 (build 产物)
```

## 页面布局

三栏布局：

- **左栏 (280px)** — 路径列表（多路径管理，颜色区分）、导入 CSV 按钮、显示控制开关（姿态坐标轴/路径线段/点位标记）
- **中间 (flex)** — 3D 主视图（旋转/平移/缩放）+ 底部回放控制条
- **右栏 (260px)** — 选中点位的详细数据（位置 XYZ + 姿态 RxRyRz）

## CSV 列映射流程

列名不固定，用户需映射到标准字段：

1. 用户点击"导入 CSV"，选择文件上传
2. 后端解析 CSV，返回列名列表和前 3 行预览数据
3. 前端根据列名关键词自动推测映射（如 pos_x→X, rot_x→Rx, angle_z→Rz 等）
4. 用户确认或调整映射，姿态字段（Rx/Ry/Rz）可选
5. 确认后后端按映射提取数据，存入数据库

自动推测规则：列名包含关键词时匹配，不区分大小写：
- X: x, pos_x, px, position_x
- Y: y, pos_y, py, position_y
- Z: z, pos_z, pz, position_z
- Rx: rx, rot_x, roll
- Ry: ry, rot_y, pitch
- Rz: rz, rot_z, yaw

## 3D 视图

### 路径渲染

- **路径线段** — 连接相邻点位的线段，每条路径独立颜色（8色板自动分配）
- **点位标记** — 球体标记每个路径点，hover 时高亮
- **姿态坐标轴** — 根据欧拉角 Rx/Ry/Rz 旋转标准 RGB 坐标轴，轴长度可配置，可切换显示/隐藏
- **当前回放点** — 黄色脉冲标记

### 视图交互

- 左键旋转、右键平移、滚轮缩放
- 点击点位显示详细数据（右栏）
- 世界坐标轴参考系常驻显示

## 回放动画

### 控制元素

- 播放/暂停、前进一个点、后退一个点、停止
- 进度条（可拖拽跳转）
- 当前点序号显示（如 45 / 128）
- 速度选择：0.25x / 0.5x / 1x / 2x / 4x

### 回放模式

- **逐点** — 跳到每个点停顿片刻
- **平滑** — 线性插值在点间平滑过渡
- **循环** — 到末尾自动重头

### 相机跟踪

- 可选开启，回放时相机自动跟随当前点移动

## 多路径对比

- 同时加载多条路径，各自独立颜色
- 左栏路径列表可独立切换显示/隐藏
- 可删除单条路径
- 回放时选择活动路径

## 数据模型

### paths 表

| 列 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增主键 |
| name | TEXT NOT NULL | 路径名称 |
| source_file | TEXT | 源文件名 |
| has_orientation | BOOLEAN | 是否含姿态数据 |
| point_count | INTEGER | 点位数量 |
| color | TEXT | 显示颜色（hex） |
| created_at | DATETIME | 创建时间 |

### path_points 表

| 列 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增主键 |
| path_id | INTEGER FK | 关联路径，ON DELETE CASCADE |
| seq | INTEGER NOT NULL | 点序号 |
| x | REAL NOT NULL | X 坐标 |
| y | REAL NOT NULL | Y 坐标 |
| z | REAL NOT NULL | Z 坐标 |
| rx | REAL | Rx 欧拉角（可选） |
| ry | REAL | Ry 欧拉角（可选） |
| rz | REAL | Rz 欧拉角（可选） |

### column_mappings 表

| 列 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增主键 |
| path_id | INTEGER FK | 关联路径，ON DELETE CASCADE |
| field | TEXT NOT NULL | 标准字段名（x/y/z/rx/ry/rz） |
| csv_column | TEXT NOT NULL | CSV 原始列名 |

## REST API

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /api/paths/upload | 上传 CSV，返回列名 + 预览数据 |
| POST | /api/paths | 确认映射，创建路径（含点位数据） |
| GET | /api/paths | 获取所有路径列表 |
| GET | /api/paths/:id | 获取路径详情 + 所有点位 |
| DELETE | /api/paths/:id | 删除路径（级联删除点位和映射） |
| GET | /api/paths/:id/points | 获取路径点位（支持分页，?page=&limit=） |

### POST /api/paths/upload

请求：multipart/form-data，字段 file 为 CSV 文件
响应：
```json
{
  "columns": ["pos_x", "pos_y", "pos_z", "rot_x", "rot_y", "rot_z", "speed"],
  "preview": [
    {"pos_x": 100.0, "pos_y": -50.0, "pos_z": 300.0, ...},
    {"pos_x": 105.0, "pos_y": -48.0, "pos_z": 302.0, ...}
  ],
  "suggestedMapping": {
    "x": "pos_x", "y": "pos_y", "z": "pos_z",
    "rx": "rot_x", "ry": "rot_y", "rz": "rot_z"
  },
  "rowCount": 128
}
```

### POST /api/paths

请求：
```json
{
  "name": "路径1",
  "sourceFile": "robot_path_001.csv",
  "mapping": {
    "x": "pos_x", "y": "pos_y", "z": "pos_z",
    "rx": "rot_x", "ry": "rot_y", "rz": "rot_z"
  },
  "fileId": "临时文件标识"
}
```

响应：创建的路径对象（含 id）

## 项目结构

```
PathView/
├── client/                  # 前端 React 应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── Scene3D.tsx          # 3D场景容器
│   │   │   ├── PathLine.tsx         # 路径线段渲染
│   │   │   ├── PathPoints.tsx       # 点位标记
│   │   │   ├── OrientationAxes.tsx  # 姿态坐标轴
│   │   │   ├── PlaybackBar.tsx      # 回放控制条
│   │   │   ├── PathList.tsx         # 左栏路径列表
│   │   │   ├── PointDetail.tsx      # 右栏点位详情
│   │   │   ├── DisplayControls.tsx  # 显示控制开关
│   │   │   └── ColumnMapper.tsx     # 列映射对话框
│   │   ├── hooks/
│   │   │   ├── usePaths.ts          # 路径数据 hook
│   │   │   └── usePlayback.ts       # 回放控制 hook
│   │   ├── api/
│   │   │   └── paths.ts             # API 调用封装
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript 类型定义
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── server/                  # 后端 Express 应用
│   ├── src/
│   │   ├── index.ts                # 入口，Express 配置
│   │   ├── db.ts                   # SQLite 初始化与查询
│   │   ├── routes/
│   │   │   └── paths.ts            # 路径相关路由
│   │   ├── services/
│   │   │   ├── csvParser.ts        # CSV 解析
│   │   │   └── columnMatcher.ts    # 列名自动匹配
│   │   └── types/
│   │       └── index.ts            # TypeScript 类型定义
│   ├── tsconfig.json
│   └── package.json
├── data/                    # SQLite 数据库文件目录
├── uploads/                 # 临时上传目录
└── package.json             # 根 package.json（workspace）
```

## 姿态坐标轴实现

使用欧拉角 Rx/Ry/Rz（ZYX 内旋顺序）构建旋转矩阵，应用到 Three.js 的 ArrowHelper 或自定义坐标轴几何体：

1. 创建三个方向向量 (1,0,0), (0,1,0), (0,0,1)
2. 应用欧拉角旋转：`Euler(rx, ry, rz, 'ZYX')`
3. 在每个点位渲染旋转后的三色短轴
4. 轴长度默认为路径包围盒对角线的 2%，可通过 UI 调整

## 错误处理

- CSV 解析失败：返回具体错误行号和原因
- 列映射冲突：同一 CSV 列不能映射到多个字段
- 文件过大：限制单文件 50MB，超过提示
- 数据库写入失败：事务回滚，返回 500
