# WebWii
A Wii on the web.

# "Hold on! Nintendo is gonna sue you!"
Take it up with Libretro.

Try me. TRY ME! TRY ME YOU ███████! TRY M-

# Anyway...
WebWii is an emulated Wii on da interwebs. It now supports **Dolphin WASM** for true Wii emulation, with [RetroArch](https://web.libretro.com) as a fallback.

# Features!:
- Loading games (WAD, DOL, ISO, WBFS formats)
- BootMii NAND backups
- Save states (written to local web storage)
- **Dolphin WASM integration** (when dolphin.js is available)
- RetroArch fallback support
- Wii-esque design (kinda)

# Emulator Backends

## Dolphin WASM (Primary)
WebWii now supports Dolphin Emulator compiled to WebAssembly! This provides real Wii/GameCube emulation in the browser.

**Status**: Integration layer ready. Dolphin WASM build required (see `DOLPHIN_BUILD.md`).

To enable Dolphin WASM:
1. Build Dolphin for WebAssembly (see `DOLPHIN_BUILD.md` for instructions)
2. Place `dolphin.js`, `dolphin.wasm`, and `dolphin.data` in the `webwii/` directory
3. Uncomment the Dolphin script tag in `index.html`
4. The emulator will automatically use Dolphin if available

## RetroArch (Fallback)
RetroArch web is used as a fallback when Dolphin WASM is not available.

# Building Dolphin WASM
See **[DOLPHIN_BUILD.md](DOLPHIN_BUILD.md)** for comprehensive instructions on:
- Setting up Emscripten SDK
- Configuring Dolphin's build system
- Compiling to WebAssembly
- Known limitations and workarounds

**Note**: Building Dolphin for WASM is extremely complex and may take weeks/months. This is not a simple build process!

# ⚠⚠⚠NOTICE!!⚠⚠⚠
PLEASE USE YOUR LEGAL GAME DUMPS! I DO NOT CONDONE PIRACY!

# Technical Details

## Architecture
- `emulator.js` - Manages both Dolphin and RetroArch backends
- `dolphin-loader.js` - Handles Dolphin WASM initialization and API
- `wad-handler.js` - WAD/DOL file parsing and installation
- `bootmii-import.js` - BootMii NAND backup handling

## Browser Requirements
For full Dolphin WASM support:
- WebGL 2.0 support
- WebAssembly support (all modern browsers)
- SharedArrayBuffer support (for threading - requires COOP/COEP headers)
- Minimum 4GB RAM recommended

# License
WebWii is provided as-is for educational purposes. 

**Important**: Dolphin Emulator is licensed under GPLv2+. Any modifications or distributions of Dolphin WASM must comply with the GPL license.
