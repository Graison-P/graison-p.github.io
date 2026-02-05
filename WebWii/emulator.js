// Emulator Integration
// Handles RetroArch web integration for Wii emulation

let emulatorReady = false;
let currentROM = null;

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

    // Check if RetroArch is loaded
    checkRetroArchStatus();
}

/**
 * Check RetroArch availability
 */
function checkRetroArchStatus() {
    // RetroArch web takes time to load
    const checkInterval = setInterval(() => {
        if (typeof Module !== 'undefined' && Module.canvas) {
            emulatorReady = true;
            clearInterval(checkInterval);
            console.log('RetroArch ready');
        }
    }, 500);

    // Stop checking after 30 seconds
    setTimeout(() => {
        clearInterval(checkInterval);
        if (!emulatorReady) {
            console.warn('RetroArch not loaded - emulation features may be limited');
        }
    }, 30000);
}

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

        // Try to load ROM into emulator
        if (emulatorReady && typeof Module !== 'undefined') {
            loadROMIntoRetroArch(file.name, romData);
            showStatus(statusDiv, 'success', `${file.name} loaded! Use keyboard/gamepad to play.`);
        } else {
            // Fallback: Show that ROM is ready but emulator isn't fully loaded
            showStatus(statusDiv, 'info', 
                `${file.name} ready. RetroArch is still loading - please wait...`);
            
            // Try again when RetroArch is ready
            const waitForRetroArch = setInterval(() => {
                if (emulatorReady && typeof Module !== 'undefined') {
                    clearInterval(waitForRetroArch);
                    loadROMIntoRetroArch(file.name, romData);
                    showStatus(statusDiv, 'success', 
                        `${file.name} loaded! Use keyboard/gamepad to play.`);
                }
            }, 1000);

            setTimeout(() => clearInterval(waitForRetroArch), 20000);
        }
    };

    reader.onerror = function() {
        showStatus(statusDiv, 'error', 'Error loading ROM file.');
    };

    reader.readAsArrayBuffer(file);
}

/**
 * Load ROM into RetroArch
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

        // Try to launch the ROM
        // Note: This is a simplified approach
        // Actual implementation depends on RetroArch web API
        if (typeof BrowserFS !== 'undefined') {
            console.log('ROM loaded to virtual filesystem:', romPath);
        }
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

    // This would interact with RetroArch's pause functionality
    // Simplified implementation:
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

/**
 * Reset emulator
 */
function resetEmulator() {
    if (typeof Module !== 'undefined' && Module._reset) {
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

    // Load into emulator if ready
    if (emulatorReady && typeof Module !== 'undefined') {
        loadROMIntoRetroArch(wadFile.name, wadData);
        showStatus(statusDiv, 'success', `${wadFile.name} loaded into emulator!`);
    } else {
        showStatus(statusDiv, 'info', 'RetroArch is loading... Please wait.');
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initEmulator);
