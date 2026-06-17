# PathView Desktop — C++/Qt5/OCCT 重构设计文档

**日期**: 2026-06-10
**项目**: PathView 工业机器人路径可视化桌面版
**技术栈**: C++17, Qt 5.13.2 (msvc2017_64), OCCT 7.x (E:\workspace\env\OCCT)
**构建**: CMake + Visual Studio 17 2022 (x64)
**目标目录**: E:\person\project\PathView-desktop

---

## 1. 概述

将现有的 TypeScript/React/Three.js 前端 + Express/SQLite 后端的 PathView Web 应用，重构为 C++/Qt5/OCCT 桌面应用。保留核心 3D 路径可视化能力，去掉 SQLite 持久化、路径列表管理、CSV 列自动匹配等功能，采用更精简的固定格式 CSV 导入。

### 1.1 功能范围（第一版）

| # | 功能 | 状态 |
|---|------|------|
| 1 | CSV 导入（固定格式：X,Y,Z,Rx,Ry,Rz） | ✓ |
| 2 | 3D 场景渲染（路径线、点球体、姿态轴） | ✓ |
| 3 | 播放回放（Point / Loop 模式） | ✓ |
| 4 | 视角预设（Front/Top/Side/Iso/Reset） | ✓ |
| 5 | 显示控制（开关 + 点大小） | ✓ |
| 6 | 点选择与详情面板 | ✓ |
| 7 | 路径颜色调整 | ✓ |
| — | CSV 列自动匹配（固定格式替代） | ✗ |
| — | 路径列表管理 | ✗ |
| — | SQLite 持久化（内存存储替代） | ✗ |
| — | 视角切换动画（直接切换替代） | ✗ |

### 1.2 技术选型

| 组件 | 选型 | 说明 |
|------|------|------|
| 语言 | C++17 | CMAKE_CXX_STANDARD=17 |
| UI 框架 | Qt 5.13.2 Widgets | MSVC 2017 64-bit 构建 |
| 3D 引擎 | OpenCASCADE (OCCT) | `E:\workspace\env\OCCT` 预编译库 |
| 图形驱动 | OCCT OpenGl_GraphicDriver | OpenGL 渲染 |
| 构建系统 | CMake + VS 2022 | Generator: "Visual Studio 17 2022" -A x64 |
| CSV 解析 | 手写解析器 | 固定格式，简单高效 |

---

## 2. 项目结构

```
E:\person\project\PathView-desktop/
├── CMakeLists.txt                # 顶级 CMake 配置
├── src/
│   ├── main.cpp                  # 应用入口
│   ├── data/
│   │   └── Path.h                # 纯数据结构（Path, PathPoint）
│   ├── core/
│   │   ├── PathManager.h/cpp     # 路径数据管理
│   │   ├── PlaybackEngine.h/cpp  # 播放状态机
│   │   ├── CsvImporter.h/cpp     # CSV 导入解析
│   │   ├── SceneController.h/cpp # 场景状态控制
│   │   └── GeometryBuilder.h/cpp # OCCT 几何构建工厂
│   ├── ui/
│   │   ├── MainWindow.h/cpp      # 主窗口布局
│   │   ├── Scene3DWidget.h/cpp   # OCCT 3D 视图嵌入控件
│   │   ├── PlaybackBar.h/cpp     # 播放控制条
│   │   ├── DisplayControls.h/cpp # 显示开关 + 大小滑块
│   │   ├── ViewTools.h/cpp       # 视角预设按钮
│   │   └── PointDetailPanel.h/cpp# 点详情面板
│   └── occt/
│       ├── OcctViewer.h/cpp      # OCCT 视图初始化与交互
│       └── OcctRenderers.h/cpp   # AIS 渲染对象管理
└── data/                         # 运行时数据目录（可选）
```

### 文件规模预期

每个源文件控制在 100–250 行之间，总代码量约 3000–4000 行。

---

## 3. 数据模型

### `src/data/Path.h`

```cpp
#pragma once
#include <string>
#include <vector>
#include <cstdint>

struct PathPoint {
    int32_t seq = 0;
    double x = 0.0, y = 0.0, z = 0.0;
    double rx = 0.0, ry = 0.0, rz = 0.0;  // degrees, ZYX Euler order
    bool hasOrientation = false;           // true if any rx/ry/rz != 0
};

struct Path {
    int32_t id = 0;
    std::string name;
    std::string color = "#3b82f6";
    std::vector<PathPoint> points;

    int32_t pointCount() const {
        return static_cast<int32_t>(points.size());
    }
};
```

**设计说明**:
- 纯 POD 结构，无 OCCT 或 Qt 依赖
- `hasOrientation` 标志用于决定是否显示姿态轴
- 所有 Path 数据在 PathManager 中以 `unique_ptr` 管理

---

## 4. 核心模块设计

### 4.1 PathManager

**职责**: 管理所有 Path 对象的增删改查和选中状态。

**接口**:
```cpp
class PathManager : public QObject {
    Q_OBJECT
public:
    int32_t importPath(const QString& name, std::vector<PathPoint> points);
    bool removePath(int32_t id);
    void selectPath(int32_t id);
    const Path* getPath(int32_t id) const;
    int32_t selectedPathId() const;
    void setPathColor(int32_t id, const QString& color);

signals:
    void pathAdded(int32_t id);
    void pathRemoved(int32_t id);
    void pathSelected(int32_t id);
    void pathColorChanged(int32_t id, const QString& color);

private:
    std::unordered_map<int32_t, std::unique_ptr<Path>> m_paths;
    int32_t m_selectedId = -1;
    int32_t m_nextId = 1;
};
```

**信号-槽连接**:
- `pathAdded` → `Scene3DWidget::setPathData` 触发重建场景
- `pathSelected` → `PointDetailPanel::updateSelection` 更新详情
- `pathColorChanged` → `Scene3DWidget::rebuildScene` 重新渲染

### 4.2 CsvImporter

**职责**: 解析固定格式 CSV 文件。

**固定格式定义**:
- 每行: `X,Y,Z[,Rx,Ry,Rz]`
- X, Y, Z 为必填浮点数
- Rx, Ry, Rz 为可选 Euler 角（度），缺失时设为 0.0
- 支持 UTF-8 BOM 处理
- 首行若包含非数值内容则自动跳过（视为标题行）

**接口**:
```cpp
struct CsvImportResult {
    bool ok = false;
    QString errorMsg;
    std::string fileName;
    std::vector<PathPoint> points;
};

class CsvImporter {
public:
    CsvImportResult importFromFile(const QString& filePath);
    CsvImportResult importFromString(const QString& content, const QString& name);
};
```

**解析逻辑**:
1. 读入全部文本，去除 BOM（`\xEF\xBB\xBF`）
2. 按行分割，跳过空行
3. 检查首行：若包含非数字 token → 跳过
4. 每行按逗号分割，取前 6 个值
5. X=col[0], Y=col[1], Z=col[2], Rx=col[3]/0, Ry=col[4]/0, Rz=col[5]/0
6. 设置 `hasOrientation = (Rx||Ry||Rz) != 0`

### 4.3 PlaybackEngine

**职责**: 管理路径点播放状态。

**接口**:
```cpp
class PlaybackEngine : public QObject {
    Q_OBJECT
public:
    enum class Mode { Point, Loop };
    Q_ENUM(Mode)

    void setPoints(const std::vector<PathPoint>* points);
    void play();
    void pause();
    void stop();
    void seek(double progress);     // [0.0, 1.0]
    void setSpeed(double speed);    // 播放速度倍率
    void setMode(Mode mode);

    // 状态查询
    bool isPlaying() const;
    int32_t currentIndex() const;
    double progress() const;
    double speed() const;
    Mode mode() const;

signals:
    void indexChanged(int32_t index);
    void playingChanged(bool playing);
    void finished();                // Point 模式播放完毕

private:
    QTimer* m_timer;
    const std::vector<PathPoint>* m_points = nullptr;
    int32_t m_currentIndex = 0;
    double m_speed = 1.0;
    Mode m_mode = Mode::Point;
    bool m_playing = false;
};
```

**播放行为**:
- **Point 模式**: 每次 tick `currentIndex++`，到达末尾时发射 `finished` 并停止
- **Loop 模式**: 每次 tick `currentIndex++`，到达末尾时回绕到 0
- Tick 间隔: `1000 / (10 * speed)` ms，即 10 fps × 倍率
- `seek(progress)`: 计算 `index = floor(progress * (n-1))`

**信号连接**:
- `indexChanged` → `Scene3DWidget::highlightPoint` 更新高亮和姿态轴
- `indexChanged` → `PlaybackBar` 更新进度条
- `indexChanged` → `PointDetailPanel` 更新点数据

### 4.4 SceneController

**职责**: 集中管理所有与 3D 显示相关的开关和参数状态，解耦 UI 操作与 OCCT 渲染。

**接口**:
```cpp
class SceneController : public QObject {
    Q_OBJECT
public:
    enum class ViewPreset { Front, Top, Side, Iso, Reset };

    // 显示控制
    void setShowLine(bool show);
    void setShowPoints(bool show);
    void setShowCurrentAxes(bool show);
    void setShowAllAxes(bool show);
    void setPointSize(double size);   // 0.01 ~ 5.0, default 1.0

    // 视角
    void applyViewPreset(ViewPreset preset);

    // 点选择
    void selectPoint(int32_t index);

    // 状态查询
    bool showLine() const;
    bool showPoints() const;
    bool showCurrentAxes() const;
    bool showAllAxes() const;
    double pointSize() const;
    int32_t selectedPointIndex() const;

signals:
    void displayChanged();            // 任一显示开关或点大小变化
    void viewPresetApplied(ViewPreset preset);
    void pointSelected(int32_t index);

private:
    bool m_showLine = true;
    bool m_showPoints = true;
    bool m_showCurrentAxes = true;
    bool m_showAllAxes = false;
    double m_pointSize = 1.0;
    int32_t m_selectedPointIndex = -1;
};
```

**显示更新流程**:
1. UI 控件触发 `SceneController::setXxx()`
2. SceneController 发射 `displayChanged()`
3. `Scene3DWidget::updateDisplay(ctrl)` 读取新状态
4. 对每个 AIS_Shape 调用 `SetVisibility()`, `SetColor()`, `SetWidth()` 等
5. 若点大小变化，重建球体（`rebuildScene()`）
6. 调用 `m_view->Redraw()`

### 4.5 GeometryBuilder

**职责**: 纯静态工厂类，封装所有 OCCT 几何构建逻辑，不持有状态。

**接口**:
```cpp
class GeometryBuilder {
public:
    // 构建路径线 (Polyline)
    // 使用 BRepBuilderAPI_MakePolygon 连接所有点
    static Handle(AIS_Shape) buildPathLine(
        const std::vector<PathPoint>& points,
        const Quantity_Color& color,
        double lineWidth = 2.0);

    // 构建单个点球体
    // 使用 BRepPrimAPI_MakeSphere + 平移变换
    static Handle(AIS_Shape) buildPointSphere(
        const gp_Pnt& position,
        double radius,
        const Quantity_Color& color);

    // 构建当前点的姿态轴 (X红 / Y绿 / Z蓝, 三线段)
    // 使用 Euler ZYX → gp_Quaternion → 三段 BRepBuilderAPI_MakeEdge
    static Handle(AIS_Shape) buildOrientationAxes(
        const gp_Pnt& origin,
        double rxDeg, double ryDeg, double rzDeg,
        double axisLength);

    // 批量构建：为每个点生成球体
    static std::vector<Handle(AIS_Shape)> buildAllPointSpheres(
        const std::vector<PathPoint>& points,
        double radius,
        const Quantity_Color& color);

    // 批量构建：为每个带姿态的点生成姿态轴
    static std::vector<Handle(AIS_Shape)> buildAllOrientationAxes(
        const std::vector<PathPoint>& points,
        double axisLength);

    // 颜色工具：hex字符串 → Quantity_Color
    static Quantity_Color hexToColor(const QString& hex);
};
```

**姿态轴实现细节**:
```
Euler ZYX (度) → gp_EulerAngles → gp_Quaternion
→ X轴 (1,0,0) 旋转 → gp_Dir → BRepBuilderAPI_MakeEdge(原点, 旋转后端点)
→ Y轴 (0,1,0) 旋转 → gp_Dir → BRepBuilderAPI_MakeEdge(原点, 旋转后端点)
→ Z轴 (0,0,1) 旋转 → gp_Dir → BRepBuilderAPI_MakeEdge(原点, 旋转后端点)
```

---

## 5. UI 模块设计

### 5.1 MainWindow

**布局**: `QMainWindow` + 中央 `QSplitter` 三栏布局

```
┌────────────────────────────────────────────────────────────────┐
│ [QMenuBar]  File > Import CSV   |   Playback > Play/Pause/Stop  │
├──────────┬────────────────────────────────┬────────────────────┤
│ 左侧面板  │         中央3D场景               │   右侧面板          │
│ (15%)    │         (55%)                  │   (30%)            │
│          │                                │                    │
│ 无内容    │   Scene3DWidget                │ DisplayControls   │
│ (预留)   │   (OCCT V3d_View 嵌入)         │  - Current Axes ☑ │
│          │                                │  - All Axes ☐     │
│          │                                │  - Path Line ☑    │
│          │                                │  - Markers ☑      │
│          │                                │  - Size [====] 100%│
│          │                                │                    │
│          │                                │ ViewTools          │
│          │                                │  [F] [T] [S] [I] [R]│
│          │                                │                    │
│          │                                │ PointDetail        │
│          ├────────────────────────────────┤  Seq: 42           │
│          │    PlaybackBar                 │  X: 100.0  Y: 200.0│
│          │  [▶] [⏸] [⏹]  [===========]   │  Z: 50.0           │
│          │  Speed: [1x▼]  Mode: [Point▼]  │  Rx: 0.0 Ry: 90.0 │
├──────────┴────────────────────────────────┴────────────────────┤
│ [QStatusBar]  Loaded: robot_path.csv  |  1024 points  | Ready  │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Scene3DWidget

**OCCT 视图嵌入方式**:
1. 初始化 `Graphic3d_GraphicDriver` (OpenGl)
2. 创建 `V3d_Viewer` + `V3d_View`
3. 调用 `m_view->SetWindow()` 绑定到 `HWND`
4. 设置 Z-up: `m_view->SetUp(gp_Dir(0,0,1))`
5. 在 `resizeEvent` 中更新视口
6. 鼠标事件委托给 `V3d_View::StartRotation/Rotation/Pan/Zoom`

**交互事件处理**:

| Qt 事件 | OCCT 处理 | 行为 |
|---------|-----------|------|
| `mousePressEvent` (左键) | `V3d_View::StartRotation(x, y)` | 开始旋转 |
| `mouseMoveEvent` (左键按下) | `V3d_View::Rotation(x, y)` | 连续旋转 |
| `mousePressEvent` (中键) | `V3d_View::StartZoom(x, y)` | 开始缩放 |
| `mouseMoveEvent` (中键) | `V3d_View::Zoom(x, y)` | 连续缩放 |
| `mousePressEvent` (右键) | `V3d_View::Pan(x, y)` | 开始平移 |
| `wheelEvent` | `V3d_View::Zoom(0, 0, delta, 0)` | 滚轮缩放 |
| `mouseDoubleClickEvent` (左键) | `AIS_InteractiveContext::SelectDetected()` | 点选择 |

**选择-索引映射**: 为每个点球体的 AIS_Shape 设置 `SetUserIndex(index)`，选择时通过 `GetSelected()->UserIndex()` 获取 PathPoint 序号。

### 5.3 PlaybackBar

**控件组成** (QWidget 水平布局):
- QPushButton: Play (`▶`)
- QPushButton: Pause (`⏸`)
- QPushButton: Stop (`⏹`)
- QSlider: 进度条 (0~1000)
- QComboBox: Speed (0.5x, 1x, 2x, 4x)
- QComboBox: Mode (Point, Loop)

**逻辑**:
- 进度条与 PlaybackEngine::progress() 双向绑定
- 拖拽进度条 → `seek(progress)`
- Play/Pause/Stop → 对应引擎方法
- Speed/Mode 变化 → 引擎参数更新

### 5.4 DisplayControls

**控件组成** (QGroupBox):
- QCheckBox: "Current Axes"
- QCheckBox: "All Point Axes"
- QCheckBox: "Path Line"
- QCheckBox: "Point Markers"
- QSlider + QLabel: "Size (100%)" (范围 1~500, 整数映射到 0.01~5.0)

### 5.5 ViewTools

**控件组成** (QGroupBox + QButtonGroup):
- 5个 QPushButton 或 QToolButton: Front / Top / Side / Iso / Reset
- 每个按钮连接到 `SceneController::applyViewPreset()`

### 5.6 PointDetailPanel

**控件组成** (QGroupBox + QFormLayout):
- QLabel: "Point #42 of 1024"
- QLabel: "X: 100.00"
- QLabel: "Y: 200.00"
- QLabel: "Z: 50.00"
- QLabel: "Rx: 0.00°" (若 hasOrientation)
- QLabel: "Ry: 90.00°"
- QLabel: "Rz: 0.00°"

---

## 6. OCCT 视图层

### 6.1 OcctViewer

**初始化流程**:
```cpp
bool OcctViewer::init(HWND hWnd) {
    // 1. 创建图形驱动
    auto driver = new OpenGl_GraphicDriver(
        Handle(Aspect_DisplayConnection)());

    // 2. 创建 Viewer
    m_viewer = new V3d_Viewer(driver);
    m_viewer->SetComputedMode(false);
    m_viewer->SetDefaultLights();
    m_viewer->SetLightOn();

    // 3. 创建 View
    m_view = m_viewer->CreateView();
    m_view->SetWindow(hWnd, new Aspect_WindowRMCocoa());  // Win32: Aspect_WindowWin32
    m_view->SetBackgroundColor(Quantity_NOC_BLACK);
    m_view->SetUp(gp_Dir(0, 0, 1));    // Z-up
    m_view->SetTwist(0.0);

    // 4. 创建交互上下文
    m_context = new AIS_InteractiveContext(m_viewer);
    m_context->SetDisplayMode(AIS_Shaded, Standard_True);

    return true;
}
```

**视角预设实现**:
```cpp
void OcctViewer::setViewPreset(
    SceneController::ViewPreset preset,
    const gp_Pnt& center,
    double diagonal)
{
    double dist = diagonal * 1.5;
    gp_Pnt eye;
    switch (preset) {
        case SceneController::ViewPreset::Front:
            eye = gp_Pnt(center.X(), center.Y() - dist, center.Z());
            break;
        case SceneController::ViewPreset::Top:
            eye = gp_Pnt(center.X(), center.Y(), center.Z() + dist);
            break;
        case SceneController::ViewPreset::Side:
            eye = gp_Pnt(center.X() - dist, center.Y(), center.Z());
            break;
        case SceneController::ViewPreset::Iso:
        case SceneController::ViewPreset::Reset:
            eye = gp_Pnt(center.X() + dist*0.7, center.Y() - dist*0.7, center.Z() + dist*0.5);
            break;
    }
    m_view->SetEyeAndCenter(eye, center);
    m_view->Redraw();
}
```

### 6.2 OcctRenderers

**职责**: 管理 Scene3DWidget 中所有 AIS 渲染对象的创建、更新、移除。

**接口**:
```cpp
class OcctRenderers {
public:
    explicit OcctRenderers(const Handle(AIS_InteractiveContext)& ctx);

    // 路径线
    void updatePathLine(const std::vector<PathPoint>& points, const QString& color);
    void removePathLine();

    // 点球体
    void updatePointSpheres(const std::vector<PathPoint>& points, double radius, const QString& color);
    void removePointSpheres();

    // 姿态轴
    void updateCurrentAxes(const PathPoint& point, double axisLength);
    void removeCurrentAxes();
    void updateAllAxes(const std::vector<PathPoint>& points, double axisLength);
    void removeAllAxes();

    // 当前点高亮
    void updateCurrentMarker(const PathPoint& point, double radius);

    // 可见性
    void setVisible(const QString& group, bool visible); // group: "line","spheres","axes","allAxes","marker"

private:
    Handle(AIS_InteractiveContext) m_context;
    Handle(AIS_Shape) m_pathLine;
    std::vector<Handle(AIS_Shape)> m_pointSpheres;
    Handle(AIS_Shape) m_currentMarker;
    Handle(AIS_Shape) m_currentAxes;
    std::vector<Handle(AIS_Shape)> m_allAxes;
};
```

---

## 7. 关键数据流

### 7.1 应用启动

```
main()
  └→ QApplication
  └→ MainWindow 创建
       └→ Scene3DWidget 创建
            └→ OcctViewer::init(hwnd)  // OCCT 初始化
       └→ PathManager 创建
       └→ PlaybackEngine 创建
       └→ SceneController 创建
       └→ 连接信号-槽
  └→ MainWindow::show()
```

### 7.2 CSV 导入

```
用户: File → Import CSV
  → MainWindow 打开 QFileDialog
  → CsvImporter::importFromFile(path)
  → 返回 CsvImportResult{ok, points, fileName}
  → PathManager::importPath(fileName, points)
    → 创建 Path{id, name, points}
    → 发射 pathAdded(id)
  → MainWindow::onPathAdded(id)
    → Scene3DWidget::setPathData(manager->getPath(id))
      → 计算中心点和对角线
      → OcctRenderers 重建所有几何
      → V3d_View::FitAll()
    → PlaybackEngine::setPoints(&path->points)
    → PointDetailPanel::clear()
    → StatusBar: "Loaded: {name} | {n} points"
```

### 7.3 播放

```
用户: 点击 Play
  → PlaybackBar → PlaybackEngine::play()
    → QTimer 启动
  → 每 tick: currentIndex++
    → 发射 indexChanged(newIndex)
  → Scene3DWidget::highlightPoint(newIndex)
    → 更新当前标记球体位置
    → 更新当前姿态轴位置
    → V3d_View::Redraw()
  → PointDetailPanel::showPoint(path->points[newIndex])
  → PlaybackBar 更新进度条

用户: 点击 Stop
  → PlaybackEngine::stop()
    → QTimer 停止
    → currentIndex = 0
    → 发射 indexChanged(0)
```

### 7.4 显示控制

```
用户: 取消勾选 "Path Line"
  → DisplayControls
    → SceneController::setShowLine(false)
      → 发射 displayChanged()
    → Scene3DWidget::updateDisplay(ctrl)
      → OcctRenderers::setVisible("line", false)
      → V3d_View::Redraw()

用户: 拖动 Size 滑块到 200%
  → DisplayControls
    → SceneController::setPointSize(2.0)
      → 发射 displayChanged()
    → Scene3DWidget::updateDisplay(ctrl)
      → 计算新半径 = baseRadius * 2.0
      → OcctRenderers::removePointSpheres()
      → OcctRenderers::updatePointSpheres(..., newRadius, ...)
      → V3d_View::Redraw()
```

---

## 8. CMake 配置

```cmake
cmake_minimum_required(VERSION 3.16)
project(PathView VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

# ── Qt5 ──
set(Qt5_DIR "C:/Qt/Qt5.13.2/5.13.2/msvc2017_64/lib/cmake/Qt5")
find_package(Qt5 REQUIRED COMPONENTS Widgets Core Gui)

# ── OCCT ──
set(OCCT_DIR "E:/workspace/env/OCCT")
set(OCCT_INCLUDE_DIR "${OCCT_DIR}/inc")
set(OCCT_LIBRARY_DIR "${OCCT_DIR}/lib")
file(GLOB OCCT_LIBS "${OCCT_LIBRARY_DIR}/*.lib")

# ── Sources ──
set(SOURCES
    src/main.cpp
    src/core/PathManager.cpp
    src/core/PlaybackEngine.cpp
    src/core/CsvImporter.cpp
    src/core/SceneController.cpp
    src/core/GeometryBuilder.cpp
    src/ui/MainWindow.cpp
    src/ui/Scene3DWidget.cpp
    src/ui/PlaybackBar.cpp
    src/ui/DisplayControls.cpp
    src/ui/ViewTools.cpp
    src/ui/PointDetailPanel.cpp
    src/occt/OcctViewer.cpp
    src/occt/OcctRenderers.cpp
)

set(HEADERS
    src/data/Path.h
    src/core/PathManager.h
    src/core/PlaybackEngine.h
    src/core/CsvImporter.h
    src/core/SceneController.h
    src/core/GeometryBuilder.h
    src/ui/MainWindow.h
    src/ui/Scene3DWidget.h
    src/ui/PlaybackBar.h
    src/ui/DisplayControls.h
    src/ui/ViewTools.h
    src/ui/PointDetailPanel.h
    src/occt/OcctViewer.h
    src/occt/OcctRenderers.h
)

add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})

target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_SOURCE_DIR}/src
    ${OCCT_INCLUDE_DIR}
)

target_link_libraries(${PROJECT_NAME} PRIVATE
    Qt5::Widgets Qt5::Core Qt5::Gui
    ${OCCT_LIBS}
)
```

**构建命令**:
```powershell
cd E:\person\project\PathView-desktop
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
```

---

## 9. 关键依赖

| 依赖 | 类型 | 如何获取 |
|------|------|----------|
| Qt 5.13.2 | 已安装 | `C:\Qt\Qt5.13.2\5.13.2\msvc2017_64` |
| OCCT 预编译库 | 已提供 | `E:\workspace\env\OCCT` (inc + bin + lib) |
| VS 2022 | 已安装 | `C:\Program Files\Microsoft Visual Studio\2022\Community` |
| CMake 4.1.2 | 已安装 | PATH 中可用 |
| Windows SDK | 已安装 | VS 2022 附带 |

**OCCT 必需的链接库**:
- TKernel.lib, TKMath.lib — 基础和数学
- TKG2d.lib, TKG3d.lib — 几何库
- TKGeomBase.lib, TKGeomAlgo.lib — 几何算法
- TKBRep.lib, TKTopAlgo.lib — 拓扑与拓扑算法
- TKPrim.lib — 基本图元 (球体等)
- TKService.lib, TKV3d.lib — 可视化
- TKOpenGl.lib — OpenGL 驱动

---

## 10. 未涵盖的功能（后续迭代）

| 功能 | 说明 |
|------|------|
| 视角切换动画 | 使用 OCCT AIS_AnimationCamera + QPropertyAnimation |
| 路径标注/测量 | 距离、角度测量工具 |
| 多路径叠加 | 同时显示多条路径，颜色区分 |
| 路径导出 | 导出为 CSV 或其他格式 |
| 截面分析 | 沿路径切面查看 |
| 碰撞检测 | OCCT BRepExtrema_DistShapeShape |
| 大数据优化 | 点云模式、LOD 显示 |

---

## 11. 设计决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| CSV 格式 | 固定 X,Y,Z,Rx,Ry,Rz | 去除列映射复杂性，满足固定数据源 |
| 数据存储 | 内存 + unique_ptr | 无需持久化，简化架构 |
| 路径列表 | 移除 | 第一版只处理单条路径 |
| 观察者通信 | Qt 信号-槽 | 天然松耦合，与 OCCT 无关 |
| 点大小调节 | 重建球体 | 简单直接，万点级性能可接受 |
| 视角切换 | 直接 SetEyeAndCenter | 无动画，实现简单 |
| OCCT 窗口嵌入 | QWidget::winId | 标准做法，OCCT 示例广泛使用 |
| 颜色格式 | hex字符串 "#rrggbb" | 与当前 Web 版兼容 |
| 播放 tick 间隔 | 固定 1000/(10*speed) ms | 10fps，足够用于路径导航 |
