// Dolphin WASM Loader
// Handles initialization and management of Dolphin Emulator WebAssembly module

/**
 * Dolphin WASM Module wrapper
 * This provides a clean API for interacting with the Dolphin WASM build
 */
class DolphinLoader {
    constructor() {
        this.module = null;
        this.isReady = false;
        this.isLoading = false;
        this.dolphinInstance = null;
        this.loadCallbacks = [];
        this.errorCallbacks = [];
    }

    /**
     * Initialize Dolphin WASM module
     * @param {Object} config - Configuration options
     * @returns {Promise} Resolves when Dolphin is ready
     */
    async init(config = {}) {
        if (this.isReady) {
            console.log('Dolphin already initialized');
            return Promise.resolve();
        }

        if (this.isLoading) {
            console.log('Dolphin is already loading');
            return new Promise((resolve, reject) => {
                this.loadCallbacks.push(resolve);
                this.errorCallbacks.push(reject);
            });
        }

        this.isLoading = true;

        return new Promise((resolve, reject) => {
            this.loadCallbacks.push(resolve);
            this.errorCallbacks.push(reject);

            // Configure Emscripten Module object
            const moduleConfig = {
                // Canvas configuration
                canvas: config.canvas || document.getElementById('canvas'),
                
                // Print output
                print: (text) => {
                    console.log('[Dolphin]', text);
                },
                
                // Print errors
                printErr: (text) => {
                    console.error('[Dolphin Error]', text);
                },
                
                // Memory configuration
                TOTAL_MEMORY: config.memory || 512 * 1024 * 1024, // 512MB default
                
                // File system ready callback
                onRuntimeInitialized: () => {
                    console.log('Dolphin WASM runtime initialized');
                    this.onRuntimeReady();
                },
                
                // Loading progress
                setStatus: (text) => {
                    if (text) {
                        console.log('[Dolphin Status]', text);
                        if (config.onStatus) {
                            config.onStatus(text);
                        }
                    }
                },
                
                // Monitor loading progress
                monitorRunDependencies: (left) => {
                    console.log(`[Dolphin] Dependencies remaining: ${left}`);
                },

                // Error handler
                onAbort: (what) => {
                    console.error('[Dolphin] Aborted:', what);
                    this.isLoading = false;
                    this.notifyError(new Error('Dolphin WASM failed to load: ' + what));
                },

                // Locate file handler for .wasm and .data files
                locateFile: (path, prefix) => {
                    // Allow custom paths from config
                    if (config.basePath) {
                        return config.basePath + path;
                    }
                    return prefix + path;
                }
            };

            // Store module config globally for Dolphin to use
            // Note: The actual Dolphin WASM build will look for this
            window.Module = moduleConfig;
            this.module = moduleConfig;

            // Load dolphin.js if not already loaded
            if (typeof DolphinWasm === 'undefined') {
                this.loadDolphinScript(config.scriptPath || 'dolphin.js')
                    .catch(error => {
                        this.isLoading = false;
                        this.notifyError(error);
                    });
            } else {
                // If already loaded, just wait for runtime
                console.log('Dolphin script already loaded, waiting for runtime...');
            }
        });
    }

    /**
     * Load Dolphin JavaScript file
     * @param {string} scriptPath - Path to dolphin.js
     * @returns {Promise}
     */
    loadDolphinScript(scriptPath) {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
            if (existingScript) {
                console.log('Dolphin script already in DOM');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = scriptPath;
            script.async = true;
            
            script.onload = () => {
                console.log('Dolphin script loaded successfully');
                resolve();
            };
            
            script.onerror = () => {
                const error = new Error(`Failed to load Dolphin script: ${scriptPath}`);
                reject(error);
            };
            
            document.body.appendChild(script);
        });
    }

    /**
     * Called when Emscripten runtime is ready
     */
    onRuntimeReady() {
        try {
            // Create Dolphin instance using Emscripten bindings
            if (typeof DolphinWasm !== 'undefined') {
                this.dolphinInstance = new DolphinWasm();
                console.log('Dolphin instance created');
            } else if (this.module && this.module.ccall) {
                // Fallback: Module has ccall but no DolphinWasm class
                console.log('Using ccall interface for Dolphin');
            } else {
                throw new Error('Dolphin WASM module not found or incomplete');
            }

            this.isReady = true;
            this.isLoading = false;
            
            // Setup file system directories
            this.setupFileSystem();
            
            // Notify all waiting callbacks
            this.notifyReady();
        } catch (error) {
            console.error('Error initializing Dolphin:', error);
            this.isLoading = false;
            this.notifyError(error);
        }
    }

    /**
     * Setup virtual file system directories
     */
    setupFileSystem() {
        if (!this.module || !this.module.FS) {
            console.warn('File system not available');
            return;
        }

        try {
            const FS = this.module.FS;
            
            // Create standard directories
            const dirs = ['/roms', '/saves', '/states', '/user'];
            
            dirs.forEach(dir => {
                try {
                    FS.mkdir(dir);
                    console.log(`Created directory: ${dir}`);
                } catch (e) {
                    // Directory may already exist
                    if (!e.message.includes('exists')) {
                        console.warn(`Could not create ${dir}:`, e.message);
                    }
                }
            });

            // Setup IndexedDB persistence for saves (if available)
            if (FS.syncfs) {
                FS.mount(FS.filesystems.IDBFS, {}, '/saves');
                FS.mount(FS.filesystems.IDBFS, {}, '/states');
                
                // Load existing data from IndexedDB
                FS.syncfs(true, (err) => {
                    if (err) {
                        console.warn('Could not sync filesystem from IndexedDB:', err);
                    } else {
                        console.log('Filesystem synced from IndexedDB');
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up file system:', error);
        }
    }

    /**
     * Boot a ROM file
     * @param {string} filename - Name of the ROM file
     * @param {Uint8Array} data - ROM file data
     * @returns {Promise<boolean>} Success status
     */
    async bootROM(filename, data) {
        if (!this.isReady) {
            throw new Error('Dolphin is not ready. Call init() first.');
        }

        try {
            // Write ROM to virtual filesystem
            const romPath = `/roms/${filename}`;
            this.module.FS.writeFile(romPath, data);
            console.log(`ROM written to: ${romPath}`);

            // Boot the file
            if (this.dolphinInstance && this.dolphinInstance.bootFile) {
                const success = this.dolphinInstance.bootFile(romPath);
                if (success) {
                    console.log(`Successfully booted: ${filename}`);
                    return true;
                } else {
                    console.error(`Failed to boot: ${filename}`);
                    return false;
                }
            } else if (this.module.ccall) {
                // Fallback: use ccall
                this.module.ccall('BootManager_BootFile', 'number', ['string'], [romPath]);
                console.log(`Boot initiated for: ${filename}`);
                return true;
            } else {
                throw new Error('No boot method available');
            }
        } catch (error) {
            console.error('Error booting ROM:', error);
            throw error;
        }
    }

    /**
     * Pause emulation
     */
    pause() {
        if (!this.isReady) return;

        if (this.dolphinInstance && this.dolphinInstance.pause) {
            this.dolphinInstance.pause();
        } else if (this.module.pauseMainLoop) {
            this.module.pauseMainLoop();
        }
        console.log('Emulation paused');
    }

    /**
     * Resume emulation
     */
    resume() {
        if (!this.isReady) return;

        if (this.dolphinInstance && this.dolphinInstance.resume) {
            this.dolphinInstance.resume();
        } else if (this.module.resumeMainLoop) {
            this.module.resumeMainLoop();
        }
        console.log('Emulation resumed');
    }

    /**
     * Stop emulation
     */
    stop() {
        if (!this.isReady) return;

        if (this.dolphinInstance && this.dolphinInstance.stop) {
            this.dolphinInstance.stop();
        } else if (this.module.ccall) {
            this.module.ccall('Core_Stop', null, [], []);
        }
        console.log('Emulation stopped');
    }

    /**
     * Save state to slot
     * @param {number} slot - Save slot (0-9)
     */
    saveState(slot = 0) {
        if (!this.isReady) return;

        if (this.dolphinInstance && this.dolphinInstance.saveState) {
            this.dolphinInstance.saveState(slot);
            console.log(`State saved to slot ${slot}`);
            
            // Sync to IndexedDB
            if (this.module.FS && this.module.FS.syncfs) {
                this.module.FS.syncfs(false, (err) => {
                    if (err) console.error('Error syncing save state:', err);
                });
            }
        }
    }

    /**
     * Load state from slot
     * @param {number} slot - Save slot (0-9)
     */
    loadState(slot = 0) {
        if (!this.isReady) return;

        if (this.dolphinInstance && this.dolphinInstance.loadState) {
            this.dolphinInstance.loadState(slot);
            console.log(`State loaded from slot ${slot}`);
        }
    }

    /**
     * Notify all callbacks that Dolphin is ready
     */
    notifyReady() {
        this.loadCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in load callback:', error);
            }
        });
        this.loadCallbacks = [];
        this.errorCallbacks = [];
    }

    /**
     * Notify all error callbacks
     */
    notifyError(error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                console.error('Error in error callback:', err);
            }
        });
        
        // Also notify load callbacks with rejection
        this.loadCallbacks = [];
        this.errorCallbacks = [];
    }

    /**
     * Check if Dolphin is ready
     * @returns {boolean}
     */
    ready() {
        return this.isReady;
    }

    /**
     * Get the underlying Module object
     * @returns {Object}
     */
    getModule() {
        return this.module;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DolphinLoader;
}

// Also make available globally
window.DolphinLoader = DolphinLoader;
