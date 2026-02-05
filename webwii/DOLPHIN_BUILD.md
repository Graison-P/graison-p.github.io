# Building Dolphin Emulator for WebAssembly

This document provides comprehensive instructions for compiling Dolphin Emulator to WebAssembly (WASM) for use in the WebWii project.

## ⚠️ Important Notice

**Building Dolphin for WASM is an extremely complex undertaking** that requires:
- Advanced C++ and build system knowledge
- Extensive Emscripten experience
- Significant modifications to Dolphin's source code
- Weeks or months of development time

This is **not a simple `cmake && make` process**. As of 2026, there is no official Dolphin WASM port, and creating one requires fundamental architectural changes.

## Prerequisites

### System Requirements
- Linux or macOS development environment (WSL2 on Windows)
- At least 16GB RAM (32GB+ recommended for builds)
- 50GB+ free disk space
- Fast internet connection (for downloading dependencies)

### Required Tools
```bash
# Install Emscripten SDK (emsdk)
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh  # Add to your .bashrc or .zshrc

# Verify installation
emcc --version  # Should show Emscripten version 3.1.50+
```

### Build Dependencies
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
    git cmake ninja-build \
    python3 python3-pip \
    nodejs npm

# macOS
brew install git cmake ninja python3 node
```

## Step 1: Clone Dolphin Repository

```bash
# Clone official Dolphin repository
git clone https://github.com/dolphin-emu/dolphin.git
cd dolphin

# Checkout a stable tag (recommended over master)
git checkout 5.0-stable
# OR use latest master (may be unstable)
# git checkout master
```

## Step 2: Understand Dolphin's Architecture

Dolphin uses the following core systems that need WASM adaptation:

### Graphics Backend
- **Native**: OpenGL, Vulkan, Direct3D
- **WASM Target**: WebGL 2.0 (via Emscripten's OpenGL ES 3.0 translation)
- **Changes Needed**: 
  - Disable Vulkan and Direct3D backends
  - Configure OpenGL backend for ES 3.0
  - Modify shader compilation for WebGL limitations
  - Handle WebGL-specific restrictions (no geometry shaders, etc.)

### Audio Backend
- **Native**: OpenAL, XAudio2, PulseAudio
- **WASM Target**: Web Audio API (via Emscripten's OpenAL implementation)
- **Changes Needed**:
  - Use Emscripten's OpenAL to Web Audio bridge
  - Configure audio buffer sizes for web latency

### Input System
- **Native**: SDL2, platform-specific APIs
- **WASM Target**: Browser Gamepad API, Keyboard Events
- **Changes Needed**:
  - Use Emscripten's SDL2 port
  - Configure gamepad mappings for web
  - Disable Wiimote Bluetooth (impossible in browser)

### File System
- **Native**: Direct OS filesystem access
- **WASM Target**: Emscripten's Virtual File System (FS)
- **Changes Needed**:
  - All file access through Emscripten FS API
  - Pre-load required data files (sys folder, etc.)
  - Implement browser-based save state storage (IndexedDB)

### Threading
- **Native**: std::thread, platform threading
- **WASM Target**: Web Workers + SharedArrayBuffer
- **Changes Needed**:
  - Enable pthreads emulation
  - Requires COOP/COEP headers on web server
  - May need to disable or limit threading for compatibility

## Step 3: Configure CMake for WASM

Create a file `dolphin/CMake/WasmToolchain.cmake`:

```cmake
# Emscripten toolchain configuration
set(CMAKE_SYSTEM_NAME Emscripten)
set(CMAKE_SYSTEM_VERSION 1)
set(CMAKE_CROSSCOMPILING TRUE)

# Compiler settings
set(CMAKE_C_COMPILER "emcc")
set(CMAKE_CXX_COMPILER "em++")
set(CMAKE_AR "emar")
set(CMAKE_RANLIB "emranlib")

# Build type
set(CMAKE_BUILD_TYPE Release)

# Emscripten-specific flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_SDL=2")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_WEBGL2=1")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s FULL_ES3=1")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s WASM=1")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ALLOW_MEMORY_GROWTH=1")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s TOTAL_MEMORY=512MB")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s ASSERTIONS=1")

# Optional: Enable threading (requires COOP/COEP headers)
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pthread")
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_PTHREADS=1")
# set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s PTHREAD_POOL_SIZE=4")

# File system support
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s FORCE_FILESYSTEM=1")

# Optimization flags
set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")
```

## Step 4: Modify Dolphin Source Code

### Required Source Modifications

#### 4.1 Disable Unsupported Backends

Edit `Source/Core/VideoBackends/CMakeLists.txt`:
```cmake
# Comment out Vulkan and D3D
# add_subdirectory(Vulkan)
# add_subdirectory(D3D)
# add_subdirectory(D3D12)

# Keep only OpenGL
add_subdirectory(OGL)
add_subdirectory(Software)
```

#### 4.2 Configure Build Options

Edit `CMakeLists.txt` to add WASM-specific options:
```cmake
# Add after project() declaration
if(EMSCRIPTEN)
    option(ENABLE_ANALYTICS "Enable analytics" OFF)
    option(ENABLE_AUTOUPDATE "Enable auto-update" OFF)
    option(ENABLE_DISCORD_PRESENCE "Enable Discord Rich Presence" OFF)
    option(ENABLE_EVDEV "Enable evdev support" OFF)
    option(ENABLE_LLVM "Enable LLVM support" OFF)
    
    # Force single-threaded for web compatibility
    option(ENABLE_GENERIC "Enable generic build" ON)
    
    # Use OpenGL backend only
    set(USE_OPENGL ON)
endif()
```

#### 4.3 Add WASM Entry Point

Create `Source/Core/DolphinWasm/Main.cpp`:
```cpp
#include <emscripten.h>
#include <emscripten/bind.h>
#include "Core/Core.h"
#include "Core/State.h"
#include "UICommon/UICommon.h"

using namespace emscripten;

class DolphinWasm {
public:
    DolphinWasm() {
        UICommon::Init();
    }
    
    ~DolphinWasm() {
        UICommon::Shutdown();
    }
    
    bool BootFile(const std::string& filepath) {
        Core::SetState(Core::State::Paused);
        return Core::Boot(filepath);
    }
    
    void Pause() {
        Core::SetState(Core::State::Paused);
    }
    
    void Resume() {
        Core::SetState(Core::State::Running);
    }
    
    void Stop() {
        Core::Stop();
    }
    
    void SaveState(int slot) {
        State::Save(slot);
    }
    
    void LoadState(int slot) {
        State::Load(slot);
    }
};

EMSCRIPTEN_BINDINGS(dolphin_module) {
    class_<DolphinWasm>("DolphinWasm")
        .constructor<>()
        .function("bootFile", &DolphinWasm::BootFile)
        .function("pause", &DolphinWasm::Pause)
        .function("resume", &DolphinWasm::Resume)
        .function("stop", &DolphinWasm::Stop)
        .function("saveState", &DolphinWasm::SaveState)
        .function("loadState", &DolphinWasm::LoadState);
}
```

## Step 5: Build Dolphin WASM

```bash
# Navigate to Dolphin directory
cd dolphin

# Create build directory
mkdir build-wasm
cd build-wasm

# Configure with CMake
emcmake cmake .. \
    -DCMAKE_TOOLCHAIN_FILE=../CMake/WasmToolchain.cmake \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_QT=OFF \
    -DENABLE_TESTS=OFF \
    -DENABLE_BENCHMARKS=OFF \
    -G Ninja

# Build (this will take 30-60+ minutes)
ninja

# If successful, you should see:
# - dolphin.js
# - dolphin.wasm
# - dolphin.data (optional, contains Sys folder)
```

### Expected Build Outputs

After a successful build, you should have:

```
build-wasm/
├── dolphin.js          # JavaScript glue code (~500KB-2MB)
├── dolphin.wasm        # WebAssembly binary (~20-50MB)
└── dolphin.data        # Preloaded files (Sys folder, ~5-10MB)
```

## Step 6: Optimize for Web

### Size Optimization
```bash
# Rebuild with aggressive optimization
emcmake cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_CXX_FLAGS="-O3 -flto" \
    ...

# Further compress with wasm-opt (from binaryen)
wasm-opt -O3 -o dolphin-optimized.wasm dolphin.wasm
```

### Split Large Files
If `dolphin.wasm` is too large (>50MB), consider:
```bash
# Enable dynamic linking
# Add to CMake flags: -s MAIN_MODULE=1
```

## Known Issues and Limitations

### Critical Limitations

1. **No Wiimote Support**
   - Bluetooth passthrough impossible in browser
   - Motion controls require alternate input method (mouse/keyboard)
   - Workaround: Emulated Wiimote via keyboard/gamepad

2. **Performance**
   - WASM is slower than native (expect 30-70% of native speed)
   - JIT recompiler may not work in WASM
   - Use interpreter mode (slower but compatible)

3. **Memory Constraints**
   - Browsers limit WASM memory (typically 2GB max)
   - May struggle with larger games
   - Texture cache size must be reduced

4. **Threading**
   - Requires SharedArrayBuffer (blocked by default in many browsers)
   - Need to set COOP/COEP headers:
     ```
     Cross-Origin-Opener-Policy: same-origin
     Cross-Origin-Embedder-Policy: require-corp
     ```

5. **GPU Features**
   - WebGL 2.0 lacks features of OpenGL 4.x
   - No geometry shaders
   - No compute shaders
   - Limited texture formats

### Common Build Errors

#### Error: "Cannot find OpenGL"
```bash
# Solution: Use Emscripten's OpenGL emulation
# Add to CMake flags: -s USE_WEBGL2=1 -s FULL_ES3=1
```

#### Error: "std::thread not supported"
```bash
# Solution: Disable threading or enable pthreads emulation
# Add to CMake flags: -pthread -s USE_PTHREADS=1
```

#### Error: "Out of memory during build"
```bash
# Solution: Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"
```

## Testing the Build

### 1. Create Test HTML
```html
<!DOCTYPE html>
<html>
<head>
    <title>Dolphin WASM Test</title>
</head>
<body>
    <canvas id="canvas" width="640" height="480"></canvas>
    <script>
        var Module = {
            canvas: document.getElementById('canvas'),
            onRuntimeInitialized: function() {
                console.log('Dolphin WASM loaded!');
            }
        };
    </script>
    <script src="dolphin.js"></script>
</body>
</html>
```

### 2. Serve with Local Server
```bash
# Python 3
python3 -m http.server 8000

# OR use emrun (handles COOP/COEP headers automatically)
emrun --browser firefox test.html
```

### 3. Test with Homebrew ROM
- Use small homebrew ROMs first (e.g., Wii Homebrew Browser)
- Avoid commercial games until basic functionality works
- Check browser console for errors

## Integration with WebWii

Once you have working WASM binaries, copy them to the WebWii project:

```bash
# Copy build outputs
cp build-wasm/dolphin.js /path/to/webwii/dolphin.js
cp build-wasm/dolphin.wasm /path/to/webwii/dolphin.wasm
cp build-wasm/dolphin.data /path/to/webwii/dolphin.data

# The WebWii integration layer (dolphin-loader.js) will handle loading
```

## Fallback Strategies

If full Dolphin WASM proves impossible, consider:

### Option 1: GameCube-Only Mode
- Simpler than Wii (no motion controls, simpler hardware)
- Better performance
- Still provides retro gaming experience

### Option 2: Alternative Emulators
- **WebRetro**: Fork of RetroArch with better web support
- **em-fceux**: NES emulator (much simpler)
- Research other WASM emulator projects

### Option 3: Server-Side Emulation
- Run Dolphin on server
- Stream video to browser (WebRTC, WebSocket)
- Lower client requirements but needs server infrastructure

### Option 4: RetroArch Cores
- RetroArch has some GameCube cores (experimental)
- May support subset of games
- Already has web builds available

## Additional Resources

### Documentation
- [Emscripten Documentation](https://emscripten.org/docs/)
- [Dolphin Developer Wiki](https://dolphin-emu.org/docs/developer/)
- [WebAssembly Specification](https://webassembly.org/specs/)

### Example Projects
- [DOSBox-X WASM](https://github.com/joncampbell123/dosbox-x/wiki/WebAssembly)
- [MAME WASM](https://github.com/lrusso/MAME/)
- [RetroArch Web](https://github.com/libretro/RetroArch/tree/master/pkg/emscripten)

### Community
- Dolphin Forums: https://forums.dolphin-emu.org/
- Emscripten Discord: https://discord.gg/emscripten
- r/EmuDev: https://reddit.com/r/EmuDev

## License Notice

Dolphin Emulator is licensed under GPLv2+. Any modifications or distributions must:
- Include full source code
- Maintain GPL license
- Credit original authors
- Document changes made

WebWii's Dolphin integration must also be GPL-licensed.

## Troubleshooting

### Build fails with "undefined reference"
- Likely missing library or incorrect link order
- Check CMakeLists.txt for missing dependencies
- Ensure all Emscripten libraries are properly linked

### WASM runs but crashes immediately
- Check browser console for specific error
- Verify memory limits (increase TOTAL_MEMORY)
- Test with ASSERTIONS=1 for detailed error messages

### Black screen / no rendering
- Verify WebGL 2.0 is enabled in browser
- Check canvas element is properly set in Module object
- Enable WebGL debugging in browser

### Audio not working
- Verify Web Audio API is available
- Check browser permissions for audio
- Test with simple audio first

## Estimated Timeline

- **Initial research and setup**: 1-2 weeks
- **Build system configuration**: 1-2 weeks  
- **Core modifications**: 4-8 weeks
- **Graphics backend adaptation**: 2-4 weeks
- **Audio/Input systems**: 1-2 weeks
- **Testing and debugging**: 4-8+ weeks
- **Total**: 3-6 months minimum for experienced developers

## Conclusion

Building Dolphin for WASM is a major undertaking requiring significant expertise and time. This guide provides a roadmap, but expect numerous challenges and iterations. Consider starting with simpler emulators or using existing web-based solutions as alternatives.

**Good luck, and remember to join the Dolphin and Emscripten communities for support!**
