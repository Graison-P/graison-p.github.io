// Emulator Integration
// Handles both RetroArch and Dolphin WASM integration for Wii emulation
// RetroArch Module object is provided by the external libretro.js library
// Dolphin WASM is loaded via dolphin-loader.js

let emulatorReady = false;
let currentROM = null;
let statusCheckInterval = null;
let emulatorType = 'retroarch'; // 'retroarch' or 'dolphin'
let dolphinLoader = null;

/**
 * Initialize emulator when page loads
 */
function initEmulator() {
    const romInput = document.getElementById('rom-input');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Handle ROM file selection
    if (romInput) {
        romInput.addEventListener('change', handleROMLoad);
    }

    // Fullscreen button
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Pause button
    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }

    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', resetEmulator);
    }

    // Determine which emulator to use
    // If Dolphin loader is available, prefer it; otherwise use RetroArch
    if (typeof DolphinLoader !== 'undefined') {
        emulatorType = 'dolphin';
        initDolphin();
    } else {
        emulatorType = 'retroarch';
        checkRetroArchStatus();
    }
}

/**
 * Initialize Dolphin WASM emulator
 */
function initDolphin() {
    console.log('Initializing Dolphin WASM...');
    
    dolphinLoader = new DolphinLoader();
    
    const canvas = document.getElementById('canvas');
    const statusDiv = document.getElementById('emulator-status');
    
    dolphinLoader.init({
        canvas: canvas,
        onStatus: (text) => {
            if (statusDiv) {
                showStatus(statusDiv, 'info', text);
            }
        }
    })
    .then(() => {
        emulatorReady = true;
        console.log('Dolphin WASM ready');
        if (statusDiv) {
            showStatus(statusDiv, 'success', 'Dolphin emulator ready! Load a ROM to start.');
        }
    })
    .catch(error => {
        console.error('Failed to initialize Dolphin:', error);
        if (statusDiv) {
            showStatus(statusDiv, 'error', 
                'Dolphin WASM not available. Using RetroArch fallback...');
        }
        // Fallback to RetroArch
        emulatorType = 'retroarch';
        checkRetroArchStatus();
    });
}

/**
 * Check RetroArch availability
 */
function checkRetroArchStatus() {
    // RetroArch web takes time to load
    statusCheckInterval = setInterval(() => {
        if (typeof Module !== 'undefined' && Module.canvas) {
            emulatorReady = true;
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
            console.log('RetroArch ready');
        }
    }, 500);

    // Stop checking after 30 seconds
    setTimeout(() => {
        if (statusCheckInterval) {
            clearInterval(statusCheckInterval);
            statusCheckInterval = null;
        }
        if (!emulatorReady) {
            console.warn('RetroArch not loaded - emulation features may be limited');
        }
    }, 30000);
}

// Cleanup on page unload
window.addEventListener('unload', () => {
    if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
    }
});

/**
 * Handle ROM file loading
 */
function handleROMLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    currentROM = file;
    const statusDiv = document.getElementById('emulator-status');
    const placeholder = document.getElementById('emulator-placeholder');
    const container = document.getElementById('emulator-container');

    showStatus(statusDiv, 'info', `Loading ${file.name}...`);

    // Read the ROM file
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const romData = new Uint8Array(e.target.result);
        
        // Show emulator canvas
        if (placeholder) placeholder.style.display = 'none';
        if (container) container.style.display = 'block';

        // Try to load ROM into appropriate emulator
        if (emulatorReady) {
            if (emulatorType === 'dolphin') {
                loadROMIntoDolphin(file.name, romData);
            } else {
                loadROMIntoRetroArch(file.name, romData);
            }
            showStatus(statusDiv, 'success', `${file.name} loaded! Use keyboard/gamepad to play.`);
        } else {
            // Fallback: Show that ROM is ready but emulator isn't fully loaded
            showStatus(statusDiv, 'info', 
                `${file.name} ready. ${emulatorType === 'dolphin' ? 'Dolphin' : 'RetroArch'} is still loading - please wait...`);
            
            // Try again when emulator is ready
            let waitForEmulator = setInterval(() => {
                if (emulatorReady) {
                    clearInterval(waitForEmulator);
                    if (emulatorType === 'dolphin') {
                        loadROMIntoDolphin(file.name, romData);
                    } else {
                        loadROMIntoRetroArch(file.name, romData);
                    }
                    showStatus(statusDiv, 'success', 
                        `${file.name} loaded! Use keyboard/gamepad to play.`);
                }
            }, 1000);

            // Clear interval after 20 seconds
            setTimeout(() => {
                if (waitForEmulator) {
                    clearInterval(waitForEmulator);
                }
            }, 20000);
        }
    };

    reader.onerror = function() {
        showStatus(statusDiv, 'error', 'Error loading ROM file.');
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Load ROM into Dolphin WASM
 * @param {string} filename - ROM filename
 * @param {Uint8Array} data - ROM data
 */
function loadROMIntoDolphin(filename, data) {
    try {
        if (!dolphinLoader || !dolphinLoader.ready()) {
            console.error('Dolphin not ready');
            return;
        }

        // Boot the ROM using Dolphin loader
        dolphinLoader.bootROM(filename, data)
            .then(success => {
                if (success) {
                    console.log('ROM successfully booted in Dolphin:', filename);
                } else {
                    console.error('Failed to boot ROM in Dolphin:', filename);
                }
            })
            .catch(error => {
                console.error('Error booting ROM in Dolphin:', error);
            });
    } catch (error) {
        console.error('Error loading ROM into Dolphin:', error);
    }
}

/**
 * Load ROM into RetroArch
 * Note: Module is the global Emscripten/RetroArch object
 */
function loadROMIntoRetroArch(filename, data) {
    try {
        if (typeof Module === 'undefined' || !Module.FS) {
            console.error('RetroArch filesystem not available');
            return;
        }

        // Write ROM to virtual filesystem
        const romPath = '/tmp/' + filename;
        Module.FS.writeFile(romPath, data);

        // ROM loaded to virtual filesystem
        console.log('ROM loaded to virtual filesystem:', romPath);
    } catch (error) {
        console.error('Error loading ROM:', error);
    }
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * Toggle pause/resume
 */
function togglePause() {
    const pauseBtn = document.getElementById('pause-btn');
    if (!pauseBtn) return;

    if (emulatorType === 'dolphin' && dolphinLoader) {
        // Use Dolphin pause/resume
        if (pauseBtn.textContent === 'Pause') {
            dolphinLoader.pause();
            pauseBtn.textContent = 'Resume';
        } else {
            dolphinLoader.resume();
            pauseBtn.textContent = 'Pause';
        }
    } else {
        // Use RetroArch pause/resume
        if (typeof Module !== 'undefined' && Module.pauseMainLoop) {
            if (pauseBtn.textContent === 'Pause') {
                Module.pauseMainLoop();
                pauseBtn.textContent = 'Resume';
            } else {
                Module.resumeMainLoop();
                pauseBtn.textContent = 'Pause';
            }
        } else {
            console.log('Pause/Resume not available');
        }
    }
}

/**
 * Reset emulator
 */
function resetEmulator() {
    if (emulatorType === 'dolphin' && dolphinLoader) {
        // Stop and restart with Dolphin
        dolphinLoader.stop();
        if (currentROM) {
            const statusDiv = document.getElementById('emulator-status');
            showStatus(statusDiv, 'info', 'Resetting...');
            
            // Reload the ROM
            const reader = new FileReader();
            reader.onload = function(e) {
                const romData = new Uint8Array(e.target.result);
                loadROMIntoDolphin(currentROM.name, romData);
            };
            reader.readAsArrayBuffer(currentROM);
        }
    } else if (typeof Module !== 'undefined' && Module._reset) {
        Module._reset();
    } else {
        // Reload current ROM
        if (currentROM) {
            const statusDiv = document.getElementById('emulator-status');
            showStatus(statusDiv, 'info', 'Resetting...');
            
            // Trigger a reload
            const event = new Event('change');
            const romInput = document.getElementById('rom-input');
            if (romInput) {
                // Re-read the current file
                const dt = new DataTransfer();
                dt.items.add(currentROM);
                romInput.files = dt.files;
                handleROMLoad({ target: romInput });
            }
        }
    }
}

/**
 * Link emulator to WAD/DOL handler
 * This allows installed WADs to be loaded into the emulator
 */
function loadWADIntoEmulator(wadFile, wadData) {
    const statusDiv = document.getElementById('emulator-status');
    const placeholder = document.getElementById('emulator-placeholder');
    const container = document.getElementById('emulator-container');

    showStatus(statusDiv, 'info', `Loading ${wadFile.name} into emulator...`);

    // Show emulator
    if (placeholder) placeholder.style.display = 'none';
    if (container) container.style.display = 'block';

    // Load into appropriate emulator
    if (emulatorReady) {
        if (emulatorType === 'dolphin') {
            loadROMIntoDolphin(wadFile.name, wadData);
        } else {
            loadROMIntoRetroArch(wadFile.name, wadData);
        }
        showStatus(statusDiv, 'success', `${wadFile.name} loaded into emulator!`);
    } else {
        showStatus(statusDiv, 'info', `${emulatorType === 'dolphin' ? 'Dolphin' : 'RetroArch'} is loading... Please wait.`);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initEmulator);
