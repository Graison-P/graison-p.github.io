// Dolphin WASM Placeholder
// This file is a placeholder for the actual Dolphin WASM build
// Replace this with the real dolphin.js file generated from building Dolphin with Emscripten

/**
 * INSTRUCTIONS:
 * 
 * This is a stub file. To enable real Dolphin WASM emulation:
 * 
 * 1. Build Dolphin Emulator to WebAssembly using Emscripten
 *    See DOLPHIN_BUILD.md for detailed instructions
 * 
 * 2. Replace this file with the generated dolphin.js from your build
 * 
 * 3. Also place the following files in this directory:
 *    - dolphin.wasm (the WebAssembly binary)
 *    - dolphin.data (optional, contains preloaded files)
 * 
 * 4. The WebWii emulator will automatically detect and use Dolphin
 * 
 * Until then, WebWii will use RetroArch as a fallback emulator.
 */

// This stub prevents errors when dolphin.js is referenced but not yet built
console.log('[Dolphin WASM] Placeholder loaded - real Dolphin WASM not yet available');
console.log('[Dolphin WASM] See DOLPHIN_BUILD.md for build instructions');
console.log('[Dolphin WASM] Falling back to RetroArch emulation');

// The actual dolphin.js from the Emscripten build will:
// 1. Define the Module object with Emscripten runtime
// 2. Provide DolphinWasm class (via Embind)
// 3. Load dolphin.wasm automatically
// 4. Initialize the virtual file system
// 5. Setup WebGL rendering context
// 6. Provide boot, pause, resume, save state functions
