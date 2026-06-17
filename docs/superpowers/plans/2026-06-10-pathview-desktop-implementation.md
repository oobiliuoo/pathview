# PathView Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a C++17/Qt5/OCCT desktop application for industrial robot path CSV visualization with 3D rendering, playback, and interactive view controls.

**Architecture:** Three-layer design — UI layer (Qt Widgets), Core layer (business logic + data), OCCT layer (3D rendering). Communication via Qt signals/slots. Path data stored in memory (no database). CSV format is fixed: X,Y,Z,Rx,Ry,Rz.

**Tech Stack:** C++17, Qt 5.13.2 (msvc2017_64), OCCT 7.x prebuilt (E:\workspace\env\OCCT), CMake + VS 2022 (x64)

---

## Project File Structure

```
E:\person\project\PathView-desktop/
├── CMakeLists.txt
├── src/
│   ├── main.cpp
│   ├── data/Path.h
│   ├── core/
│   │   ├── PathManager.h / .cpp
│   │   ├── PlaybackEngine.h / .cpp
│   │   ├── CsvImporter.h / .cpp
│   │   ├── SceneController.h / .cpp
│   │   └── GeometryBuilder.h / .cpp
│   ├── ui/
│   │   ├── MainWindow.h / .cpp
│   │   ├── Scene3DWidget.h / .cpp
│   │   ├── PlaybackBar.h / .cpp
│   │   ├── DisplayControls.h / .cpp
│   │   ├── ViewTools.h / .cpp
│   │   └── PointDetailPanel.h / .cpp
│   └── occt/
│       ├── OcctViewer.h / .cpp
│       └── OcctRenderers.h / .cpp
```

---

### Task 1: Project scaffold and CMake build

**Files:**
- Create: `E:\person\project\PathView-desktop\CMakeLists.txt`
- Create: `E:\person\project\PathView-desktop\src\main.cpp`
- Create: `E:\person\project\PathView-desktop\src\data\Path.h`

- [ ] **Step 1: Create target directories**

```powershell
$base = "E:\person\project\PathView-desktop"
$dirs = @("$base\src\data","$base\src\core","$base\src\ui","$base\src\occt","$base\build")
foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d }
```

- [ ] **Step 2: Create CMakeLists.txt**

```cmake
cmake_minimum_required(VERSION 3.16)
project(PathView VERSION 1.0.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(Qt5_DIR "C:/Qt/Qt5.13.2/5.13.2/msvc2017_64/lib/cmake/Qt5")
find_package(Qt5 REQUIRED COMPONENTS Widgets Core Gui)
set(OCCT_DIR "E:/workspace/env/OCCT")
set(OCCT_INCLUDE_DIR "${OCCT_DIR}/inc")
set(OCCT_LIBRARY_DIR "${OCCT_DIR}/lib")
file(GLOB OCCT_LIBS "${OCCT_LIBRARY_DIR}/*.lib")
set(SOURCES
    src/main.cpp src/core/PathManager.cpp src/core/PlaybackEngine.cpp
    src/core/CsvImporter.cpp src/core/SceneController.cpp
    src/core/GeometryBuilder.cpp src/ui/MainWindow.cpp
    src/ui/Scene3DWidget.cpp src/ui/PlaybackBar.cpp
    src/ui/DisplayControls.cpp src/ui/ViewTools.cpp
    src/ui/PointDetailPanel.cpp src/occt/OcctViewer.cpp
    src/occt/OcctRenderers.cpp)
set(HEADERS
    src/data/Path.h src/core/PathManager.h src/core/PlaybackEngine.h
    src/core/CsvImporter.h src/core/SceneController.h
    src/core/GeometryBuilder.h src/ui/MainWindow.h
    src/ui/Scene3DWidget.h src/ui/PlaybackBar.h
    src/ui/DisplayControls.h src/ui/ViewTools.h
    src/ui/PointDetailPanel.h src/occt/OcctViewer.h
    src/occt/OcctRenderers.h)
add_executable(${PROJECT_NAME} ${SOURCES} ${HEADERS})
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_SOURCE_DIR}/src ${OCCT_INCLUDE_DIR})
target_link_libraries(${PROJECT_NAME} PRIVATE Qt5::Widgets Qt5::Core Qt5::Gui ${OCCT_LIBS})
```

- [ ] **Step 3: Create src/data/Path.h**

```cpp
#pragma once
#include <string>
#include <vector>
#include <cstdint>
struct PathPoint {
    int32_t seq = 0;
    double x = 0.0, y = 0.0, z = 0.0;
    double rx = 0.0, ry = 0.0, rz = 0.0;
    bool hasOrientation = false;
};
struct Path {
    int32_t id = 0;
    std::string name;
    std::string color = "#3b82f6";
    std::vector<PathPoint> points;
    int32_t pointCount() const { return static_cast<int32_t>(points.size()); }
};
```

- [ ] **Step 4: Create stub main.cpp**

```cpp
#include <QApplication>
#include "ui/MainWindow.h"
int main(int argc, char* argv[]) {
    QApplication app(argc, argv);
    app.setApplicationName("PathView");
    app.setApplicationVersion("1.0.0");
    MainWindow window;
    window.resize(1280, 800);
    window.show();
    return app.exec();
}
```

- [ ] **Step 5: Create stub MainWindow.h/.cpp**

```cpp
// MainWindow.h
#pragma once
#include <QMainWindow>
class MainWindow : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget* parent = nullptr);
    ~MainWindow() override = default;
};
// MainWindow.cpp
#include "MainWindow.h"
MainWindow::MainWindow(QWidget* parent) : QMainWindow(parent) {}
```

- [ ] **Step 6: Build verification**

```powershell
cd E:\person\project\PathView-desktop
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
```

Expected: Build succeeds, `build/Release/PathView.exe` exists.

---

### Task 2: CsvImporter

**Files:** `src/core/CsvImporter.h`, `src/core/CsvImporter.cpp`

- [ ] **Step 1: CsvImporter.h**

```cpp
#pragma once
#include <string>
#include <vector>
#include "data/Path.h"
struct CsvImportResult {
    bool ok = false;
    std::string errorMsg;
    std::string fileName;
    std::vector<PathPoint> points;
};
class CsvImporter {
public:
    CsvImportResult importFromFile(const std::string& filePath);
    CsvImportResult importFromString(const std::string& content, const std::string& name);
private:
    CsvImportResult parseLines(const std::vector<std::string>& lines, const std::string& name);
    bool isHeaderLine(const std::string& firstToken) const;
    static std::string trim(const std::string& s);
    static std::vector<std::string> split(const std::string& s, char delimiter);
};
```

- [ ] **Step 2: CsvImporter.cpp** — Parse CSV with fixed format X,Y,Z,Rx,Ry,Rz. Auto-detect header. Strip BOM. Use `std::strtod` for numeric parsing.

```cpp
#include "CsvImporter.h"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cmath>

std::string CsvImporter::trim(const std::string& s) {
    auto start = s.begin();
    while (start != s.end() && std::isspace(*start)) ++start;
    auto end = s.end();
    while (end != start && std::isspace(*(end-1))) --end;
    return std::string(start, end);
}

std::vector<std::string> CsvImporter::split(const std::string& s, char delimiter) {
    std::vector<std::string> tokens;
    std::stringstream ss(s);
    std::string token;
    while (std::getline(ss, token, delimiter)) {
        tokens.push_back(trim(token));
    }
    return tokens;
}

bool CsvImporter::isHeaderLine(const std::string& firstToken) const {
    if (firstToken.empty()) return false;
    char* end = nullptr;
    std::strtod(firstToken.c_str(), &end);
    return end == firstToken.c_str() || (*end != '\0' && *end != '.');
}

CsvImportResult CsvImporter::importFromFile(const std::string& filePath) {
    std::ifstream file(filePath);
    if (!file.is_open()) return {false, "Cannot open file: " + filePath, "", {}};
    std::stringstream buffer; buffer << file.rdbuf();
    std::string content = buffer.str();
    auto pos = filePath.find_last_of("/\\");
    std::string name = (pos != std::string::npos) ? filePath.substr(pos + 1) : filePath;
    return importFromString(content, name);
}

CsvImportResult CsvImporter::importFromString(const std::string& content, const std::string& name) {
    std::string data = content;
    if (data.size() >= 3 && static_cast<unsigned char>(data[0]) == 0xEF && static_cast<unsigned char>(data[1]) == 0xBB && static_cast<unsigned char>(data[2]) == 0xBF) data = data.substr(3);
    std::vector<std::string> lines;
    std::stringstream ss(data); std::string line;
    while (std::getline(ss, line)) { line = trim(line); if (!line.empty()) lines.push_back(line); }
    if (lines.empty()) return {false, "CSV file has no data rows", name, {}};
    return parseLines(lines, name);
}

CsvImportResult CsvImporter::parseLines(const std::vector<std::string>& lines, const std::string& name) {
    std::vector<PathPoint> points;
    size_t startLine = 0;
    auto firstTokens = split(lines[0], ',');
    if (!firstTokens.empty() && isHeaderLine(firstTokens[0])) startLine = 1;
    for (size_t i = startLine; i < lines.size(); ++i) {
        auto tokens = split(lines[i], ',');
        if (tokens.size() < 3) continue;
        char* end = nullptr;
        PathPoint pt; pt.seq = static_cast<int32_t>(points.size());
        pt.x = std::strtod(tokens[0].c_str(), &end);
        pt.y = std::strtod(tokens[1].c_str(), &end);
        pt.z = std::strtod(tokens[2].c_str(), &end);
        if (tokens.size() >= 4) pt.rx = std::strtod(tokens[3].c_str(), &end);
        if (tokens.size() >= 5) pt.ry = std::strtod(tokens[4].c_str(), &end);
        if (tokens.size() >= 6) pt.rz = std::strtod(tokens[5].c_str(), &end);
        pt.hasOrientation = (std::abs(pt.rx) > 1e-9 || std::abs(pt.ry) > 1e-9 || std::abs(pt.rz) > 1e-9);
        points.push_back(pt);
    }
    if (points.empty()) return {false, "No valid data points found", name, {}};
    return {true, "", name, points};
}
```

---

### Task 3: PathManager

**Files:** `src/core/PathManager.h`, `src/core/PathManager.cpp`

- [ ] **Step 1: PathManager.h**

```cpp
#pragma once
#include <QObject>
#include <unordered_map>
#include <memory>
#include "data/Path.h"
class PathManager : public QObject {
    Q_OBJECT
public:
    explicit PathManager(QObject* parent = nullptr);
    int32_t importPath(const std::string& name, std::vector<PathPoint> points);
    bool removePath(int32_t id);
    void selectPath(int32_t id);
    const Path* getPath(int32_t id) const;
    int32_t selectedPathId() const;
    void setPathColor(int32_t id, const std::string& color);
signals:
    void pathAdded(int32_t id);
    void pathRemoved(int32_t id);
    void pathSelected(int32_t id);
    void pathColorChanged(int32_t id, const std::string& color);
private:
    std::unordered_map<int32_t, std::unique_ptr<Path>> m_paths;
    int32_t m_selectedId = -1;
    int32_t m_nextId = 1;
};
```

- [ ] **Step 2: PathManager.cpp** — Implements CRUD operations. `importPath` creates a Path with auto-incremented ID. `selectPath` emits `pathSelected`. `setPathColor` updates in-place.

---

### Task 4: PlaybackEngine

**Files:** `src/core/PlaybackEngine.h`, `src/core/PlaybackEngine.cpp`

- [ ] **Step 1: PlaybackEngine.h** — Enums `Mode { Point, Loop }`. Public API: `setPoints()`, `play()`, `pause()`, `stop()`, `seek()`, `setSpeed()`, `setMode()`. Signals: `indexChanged`, `playingChanged`, `finished`.

- [ ] **Step 2: PlaybackEngine.cpp** — QTimer-driven at 1000/(10*speed) ms interval. `onTick()` increments index, wraps for Loop mode, stops for Point mode at end. `seek()` clamps [0,1] to index. `setSpeed()` restarts timer if playing.

---

### Task 5: SceneController

**Files:** `src/core/SceneController.h`, `src/core/SceneController.cpp`

- [ ] **Step 1: SceneController.h** — Enum `ViewPreset { Front, Top, Side, Iso, Reset }`. Display state: showLine/showPoints/showCurrentAxes/showAllAxes (bool), pointSize (double). Signals: `displayChanged`, `viewPresetApplied`, `pointSelected`.

- [ ] **Step 2: SceneController.cpp** — Each setter checks for actual change before emitting `displayChanged()`. `pointSize` clamped to [0.01, 5.0].

---

### Task 6: GeometryBuilder

**Files:** `src/core/GeometryBuilder.h`, `src/core/GeometryBuilder.cpp`

- [ ] **Step 1: GeometryBuilder.h** — Static factory class. Key methods: `buildPathLine()`, `buildPointSphere()`, `buildOrientationAxes()`, `buildAllPointSpheres()`, `buildAllOrientationAxes()`, `hexToColor()`, `computeBounds()`.

- [ ] **Step 2: GeometryBuilder.cpp**

Key implementation details:
- `buildPathLine`: `BRepBuilderAPI_MakePolygon` → `AIS_Shape`
- `buildPointSphere`: `BRepPrimAPI_MakeSphere` → `BRepBuilderAPI_Transform` (translate) → `AIS_Shape`
- `buildOrientationAxes`: Euler ZYX (degrees) → `gp_Quaternion` → 3x `BRepBuilderAPI_MakeEdge` → `TopoDS_Compound` → `AIS_Shape`
- `hexToColor`: Parse "#rrggbb" → `Quantity_Color(r,g,b, Quantity_TOC_RGB)`
- `computeBounds`: Min/max of all points, returns center and diagonal

---

### Task 7: OcctViewer

**Files:** `src/occt/OcctViewer.h`, `src/occt/OcctViewer.cpp`

- [ ] **Step 1: OcctViewer.h** — Wraps `V3d_Viewer`, `V3d_View`, `AIS_InteractiveContext`. Methods: `init(HWND)`, mouse interaction (`startRotation/rotation/pan/zoom`), `setViewPreset()`, `detectPoint()`.

- [ ] **Step 2: OcctViewer.cpp** — Init: `OpenGl_GraphicDriver` → `V3d_Viewer` → `V3d_View` (set Z-up, black background) → `AIS_InteractiveContext`. View preset uses `SetEyeAndCenter()`. Point detection uses `SelectDetected()` + `UserIndex()`.

---

### Task 8: OcctRenderers

**Files:** `src/occt/OcctRenderers.h`, `src/occt/OcctRenderers.cpp`

- [ ] **Step 1: OcctRenderers.h** — Manages groups of AIS_Shape objects: pathLine, pointSpheres, currentMarker, currentAxes, allAxes. Methods: `update*()`, `remove*()`, `setGroupVisible()`, `clearAll()`.

- [ ] **Step 2: OcctRenderers.cpp** — Each `update*` removes old and creates new geometry. `setGroupVisible` uses `Display/Erase`. `clearAll` removes everything.

---

### Task 9: Scene3DWidget

**Files:** `src/ui/Scene3DWidget.h`, `src/ui/Scene3DWidget.cpp`

- [ ] **Step 1: Scene3DWidget.h** — QWidget subclass embedding OCCT view. Holds OcctViewer, OcctRenderers. Handles mouse events (rotate/pan/zoom). Methods: `setPathData()`, `highlightPoint()`, `updateDisplay()`, `initOcct()`, `applyViewPreset()`. Signal: `pointClicked`.

- [ ] **Step 2: Scene3DWidget.cpp** — OCCT initialized lazily after widget is shown (HWND required). Mouse: Left=rotate, Middle=zoom, Right=pan. Click detection (no significant mouse movement) triggers `detectPoint()`. Double-click also selects. `rebuildScene()` clears and recreates all geometry based on SceneController state.

---

### Task 10: MainWindow

**Files:** `src/ui/MainWindow.h`, `src/ui/MainWindow.cpp`

- [ ] **Step 1: MainWindow.h** — QMainWindow with MenuBar (File > Import CSV), 3-panel QSplitter (left=empty, center=Scene3DWidget+PlaybackBar, right=DisplayControls+ViewTools+PointDetailPanel), StatusBar.

- [ ] **Step 2: MainWindow.cpp** — Connects all signals: PathManager→scene, PlaybackEngine→scene+UI, DisplayControls→SceneController→scene, ViewTools→SceneController→scene, PlaybackBar→PlaybackEngine. Late OCCT init via `QTimer::singleShot(0, ...)` after show().

---

### Task 11: PlaybackBar

**Files:** `src/ui/PlaybackBar.h`, `src/ui/PlaybackBar.cpp`

- [ ] **Step 1: PlaybackBar.h** — Horizontal layout: Play/Pause button, Stop button, QSlider (0-1000), index label, Speed combo (0.5x/1x/2x/4x), Mode combo (Point/Loop).

- [ ] **Step 2: PlaybackBar.cpp** — Signals: `playClicked`, `pauseClicked`, `stopClicked`, `seekRequested(progress)`, `speedChanged(double)`, `modeChanged(int)`. Slider drag pauses auto-update via `m_sliderDragging` flag.

---

### Task 12: DisplayControls, ViewTools, PointDetailPanel

**Files:** `src/ui/DisplayControls.h/.cpp`, `src/ui/ViewTools.h/.cpp`, `src/ui/PointDetailPanel.h/.cpp`

- [ ] **Step 1: DisplayControls** — QGroupBox with checkboxes (Path Line, Point Markers, Current Axes, All Point Axes) and Size slider (1-500 → 0.01-5.0). Signals for each toggle and pointSizeChanged.

- [ ] **Step 2: ViewTools** — QGroupBox with 5 QPushButtons (F/T/S/I/R). Signal `viewPresetSelected(SceneController::ViewPreset)`.

- [ ] **Step 3: PointDetailPanel** — QGroupBox with QFormLayout. 7 QLabel rows: Point #, X, Y, Z, Rx, Ry, Rz. `showPoint()` fills labels, `clear()` resets to "—".

---

### Task 13: Integration wiring

- [ ] **Step 1: Add `initOcct()` and `applyViewPreset()` to Scene3DWidget** (if not already done)
- [ ] **Step 2: Wire ViewPreset signal** in MainWindow to call `Scene3DWidget::applyViewPreset`
- [ ] **Step 3: Fix PlaybackBar progress** — accept double (0.0-1.0), map to slider 0-1000
- [ ] **Step 4: Ensure PlaybackEngine indexChanged** correctly updates both scene highlight and point detail

---

### Task 14: Build and test

- [ ] **Step 1: Full rebuild and fix compilation errors**

```powershell
cd E:\person\project\PathView-desktop
cmake --build build --config Release 2>&1
```

- [ ] **Step 2: Create test CSV**

```csv
X,Y,Z,Rx,Ry,Rz
100,200,50,0,90,0
150,250,55,10,85,5
200,300,60,20,80,10
250,350,65,30,75,15
300,400,70,40,70,20
```

- [ ] **Step 3: Run and verify** — Launch app, import CSV, verify:
  - 3D view shows path line + spheres
  - Mouse rotate/pan/zoom works
  - Playback advances through points
  - Loop mode wraps around
  - Display toggles work
  - View presets change camera
  - Point click shows detail panel
  - Size slider changes sphere size
