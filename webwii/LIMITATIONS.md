# Dolphin WASM Known Limitations

This document outlines the known limitations, challenges, and workarounds for running Dolphin Emulator in WebAssembly.

## Critical Limitations

### 1. Performance
**Issue**: WASM is significantly slower than native code
- **Expected Performance**: 30-70% of native Dolphin speed
- **Impact**: 
  - Complex games may not reach playable framerates
  - GameCube games generally work better than Wii games
  - Lower-end devices will struggle
- **Workarounds**:
  - Use interpreter instead of JIT (slower but more compatible)
  - Reduce internal resolution
  - Disable enhancements (AA, AF, etc.)
  - Test with simpler games/homebrew first

### 2. JIT Recompiler
**Issue**: Dynamic code generation restricted in WASM
- **Status**: May not work or require special browser flags
- **Impact**: Must use interpreter (3-5x slower than JIT)
- **Workaround**: 
  - Compile with interpreter only
  - Some browsers support WASM SIMD which helps
  - Consider AOT compilation of game code (experimental)

### 3. Memory Limitations
**Issue**: Browser memory limits constrain emulation
- **Browser Limits**: 
  - Typical maximum: 2GB WASM memory
  - Some browsers: 4GB on 64-bit systems
- **Impact**:
  - May crash with memory-intensive games
  - Texture cache must be smaller
  - Can't load large game assets all at once
- **Workarounds**:
  - Increase TOTAL_MEMORY in build (up to browser limit)
  - Enable ALLOW_MEMORY_GROWTH (performance cost)
  - Reduce texture cache size
  - Implement texture streaming

### 4. Threading
**Issue**: Web Workers have limitations vs native threads
- **Requirements**:
  - SharedArrayBuffer (blocked by default in many browsers)
  - COOP/COEP HTTP headers must be set:
    ```
    Cross-Origin-Opener-Policy: same-origin
    Cross-Origin-Embedder-Policy: require-corp
    ```
- **Impact**:
  - Multi-threaded rendering may not work
  - Audio sync issues possible
  - Performance hit from single-threaded mode
- **Workarounds**:
  - Disable threading for maximum compatibility
  - Use single-threaded builds
  - Set up COOP/COEP headers on server

## Hardware/Input Limitations

### 5. Wiimote/Controller Support
**Issue**: No Bluetooth passthrough in browsers
- **What Doesn't Work**:
  - Real Wiimote connection
  - Bluetooth device pairing
  - Infrared sensor bar
  - Motion Plus extension
- **What Works**:
  - Keyboard input (emulated Wiimote)
  - Gamepad API (standard controllers)
  - Mouse for pointer emulation
- **Workarounds**:
  - Map Wiimote buttons to keyboard/gamepad
  - Use mouse for IR pointer
  - Provide on-screen touch controls (mobile)

### 6. GameCube Controllers
**Issue**: Native GameCube controller adapter won't work
- **What Works**:
  - Browser Gamepad API (Xbox, PS, Switch Pro, etc.)
  - Keyboard mapping
- **Workarounds**:
  - Use standard USB controller
  - Configure button mappings in emulator

### 7. Real Wii Hardware Features
**Issue**: Several Wii-specific features impossible in browser
- **Not Supported**:
  - WiiConnect24 (network services)
  - USB devices (storage, keyboards, etc.)
  - SD card slot access (real SD cards)
  - Wii Speak microphone
- **Workarounds**:
  - Virtual SD card via Emscripten FS
  - Use browser file picker for "SD card" files
  - No workaround for WiiConnect24

## Graphics Limitations

### 8. WebGL vs OpenGL
**Issue**: WebGL 2.0 is subset of OpenGL ES 3.0
- **Missing Features**:
  - Geometry shaders
  - Compute shaders
  - Some texture formats
  - Transform feedback
  - Multiple render targets (limited)
- **Impact**:
  - Some visual effects won't render correctly
  - Lower quality graphics vs native
  - Shader compilation errors possible
- **Workarounds**:
  - Use WebGL 2.0 compatible shaders only
  - Disable unsupported enhancements
  - Provide fallback rendering paths

### 9. Graphics Performance
**Issue**: WebGL overhead and browser rendering
- **Impact**:
  - Additional frame latency
  - Lower fillrate than native
  - Shader compilation stutters
- **Workarounds**:
  - Reduce internal resolution (2x native max recommended)
  - Disable per-pixel lighting
  - Use shader cache (if available)
  - Pre-compile common shaders

### 10. Texture Formats
**Issue**: Limited texture format support
- **Impact**: Some games may have corrupted textures
- **Workarounds**:
  - Convert textures to supported formats
  - Implement format conversion in shaders

## Audio Limitations

### 11. Audio Latency
**Issue**: Web Audio API has inherent latency
- **Typical Latency**: 20-50ms (vs 5-10ms native)
- **Impact**:
  - Audio-visual sync issues
  - Rhythm games unplayable
- **Workarounds**:
  - Increase audio buffer size (reduces stuttering, increases latency)
  - Use AudioWorklet (lower latency than ScriptProcessor)
  - Allow user to adjust A/V sync offset

### 12. Audio Threading
**Issue**: Audio processing in separate context
- **Impact**: 
  - CPU overhead for audio thread communication
  - Possible audio dropouts
- **Workarounds**:
  - Use larger audio buffer
  - Monitor audio queue depth

## File System Limitations

### 13. Virtual File System
**Issue**: All files must be in virtual memory
- **Impact**:
  - Large games consume RAM
  - Slow initial load times
  - Can't access arbitrary files on user's disk
- **Workarounds**:
  - Use IndexedDB for persistent storage
  - Implement lazy loading of game assets
  - Compress assets in .data file
  - Allow user to select ROM file each session

### 14. Save Data Persistence
**Issue**: Browser storage can be cleared
- **Risk**: Save files and states can be lost
- **Workarounds**:
  - Use IndexedDB with syncfs
  - Provide export/import save data
  - Warn users about browser data clearing
  - Auto-export saves to downloads folder

### 15. File Size Limits
**Issue**: Browsers may limit file/storage sizes
- **Typical Limits**:
  - IndexedDB: 50MB-unlimited (varies by browser)
  - File API: 2GB+ for read, browser-dependent for write
- **Impact**: Large games may not fit
- **Workarounds**:
  - Request persistent storage permission
  - Stream game files instead of loading entirely
  - Compress game files

## Network Limitations

### 16. No Raw Socket Access
**Issue**: Can't create TCP/UDP sockets directly
- **Impact**:
  - No local network multiplayer
  - No GameSpy/WFC emulation
  - No NetPlay
- **Workarounds**:
  - Use WebSocket server as proxy
  - Implement online multiplayer via WebRTC
  - Currently: No multiplayer support

### 17. CORS Restrictions
**Issue**: Cross-origin resource sharing restrictions
- **Impact**: Can't load assets from other domains without CORS headers
- **Workarounds**:
  - Host all assets on same domain
  - Configure CORS headers on CDN
  - Use CORS proxy (not recommended for production)

## Browser-Specific Issues

### 18. Safari/iOS Limitations
**Issue**: Safari has additional restrictions
- **Problems**:
  - No SharedArrayBuffer (no threading)
  - Lower memory limits
  - Different WebGL behavior
  - Audio policy requires user gesture
- **Workarounds**:
  - Single-threaded builds for Safari
  - Reduce memory usage
  - Require user interaction before audio

### 19. Mobile Browser Issues
**Issue**: Mobile has reduced capabilities
- **Problems**:
  - Much lower performance
  - Smaller memory available
  - Battery drain
  - Touch controls needed
- **Workarounds**:
  - Create mobile-optimized build
  - Add touch screen controls
  - Reduce resolution and features
  - Warn users about battery usage

### 20. Firefox WebAssembly SIMD
**Issue**: SIMD support varies by browser
- **Status**: Chrome/Edge good, Firefox partial, Safari limited
- **Impact**: Vector operations slower in some browsers
- **Workarounds**:
  - Detect SIMD support at runtime
  - Provide SIMD and non-SIMD builds
  - Use feature detection

## Build System Challenges

### 21. Large Binary Size
**Issue**: Dolphin WASM is very large (20-50MB+)
- **Impact**:
  - Long download times
  - Users may abandon before load
  - CDN costs
- **Workarounds**:
  - Aggressive optimization (O3, LTO)
  - Strip debug symbols
  - Use wasm-opt for further compression
  - Use Brotli/Gzip compression
  - Consider dynamic linking (split into modules)

### 22. Compile Time
**Issue**: Building Dolphin WASM takes very long
- **Typical Time**: 30-90+ minutes on modern hardware
- **Impact**: Slow development iteration
- **Workarounds**:
  - Use ccache/sccache
  - Build only necessary components
  - Use pre-built dependencies
  - Develop/test features in native build first

### 23. Emscripten Version Compatibility
**Issue**: Dolphin may not compile with latest Emscripten
- **Impact**: May need specific Emscripten version
- **Workarounds**:
  - Pin Emscripten version in build docs
  - Test with multiple Emscripten versions
  - Upstream patches to Dolphin

## Game Compatibility

### 24. Not All Games Will Work
**Issue**: Some games incompatible with WASM constraints
- **Problem Games**:
  - Games requiring heavy JIT
  - Memory-intensive games
  - Games with complex graphics features
  - Games requiring precise timing
- **Workarounds**:
  - Maintain compatibility list
  - Focus on GameCube vs Wii
  - Test homebrew first
  - Provide warnings for incompatible games

### 25. Save State Compatibility
**Issue**: Save states may not work across builds
- **Problem**: Binary layout changes break states
- **Workarounds**:
  - Version save states
  - Warn about incompatibility
  - Export/import SRAM instead

## Security and Privacy

### 26. Code Injection
**Issue**: User-provided game files could contain exploits
- **Risk**: Malicious ROM files
- **Workarounds**:
  - Validate file headers
  - Run in sandboxed iframe
  - Warn users about untrusted files
  - Use browser's built-in WASM sandbox

### 27. Data Privacy
**Issue**: Games may contain personal information
- **Considerations**:
  - Save data stored in browser
  - No server upload by default
  - Clear privacy policy needed
- **Best Practices**:
  - Don't upload user data without permission
  - Allow export/delete of all data
  - Comply with GDPR/privacy laws

## Deployment Challenges

### 28. Server Configuration
**Issue**: Special headers needed for full functionality
- **Required Headers** (for threading):
  ```
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  ```
- **Impact**: May break embedding in iframes
- **Workarounds**:
  - Provide both threaded and non-threaded versions
  - Document header requirements
  - Offer hosted version with headers

### 29. CDN Compatibility
**Issue**: Some CDNs don't support required headers
- **Problems**: Cloudflare, some AWS configs
- **Workarounds**:
  - Configure CDN properly
  - Use edge workers to add headers
  - Host on platform with header support

## Recommendations

### For Best Compatibility
1. Start with single-threaded builds
2. Test with GameCube homebrew before commercial games
3. Target WebGL 2.0 minimum
4. Reduce internal resolution to 2x native max
5. Use interpreter, not JIT
6. Implement comprehensive error handling
7. Provide clear user feedback about limitations

### For Best Performance
1. Use latest Emscripten with SIMD
2. Enable threading on supported browsers
3. Pre-compile shaders
4. Use texture compression
5. Implement asset streaming
6. Profile and optimize hot paths
7. Consider native build for comparison

### For Best User Experience
1. Show loading progress clearly
2. Explain limitations upfront
3. Provide compatibility list
4. Allow configuration of graphics/audio
5. Implement save data export/import
6. Add helpful error messages
7. Test on multiple browsers/devices

## Conclusion

Dolphin WASM is a challenging but possible project. Many limitations exist, but with proper workarounds and user education, a functional Wii emulator in the browser is achievable.

**Realistic Expectations**:
- GameCube homebrew: Good compatibility
- Simple Wii games: Moderate compatibility
- Complex Wii games: Low compatibility
- Performance: 30-50% of native

**Key Success Factors**:
- Start small (homebrew, simple games)
- Iterate based on user feedback
- Maintain compatibility database
- Regular testing across browsers
- Active community support

For the latest status and discussions, see:
- Dolphin Forums: https://forums.dolphin-emu.org/
- Emscripten Issues: https://github.com/emscripten-core/emscripten/issues
- WebWii Project: (this repository)
