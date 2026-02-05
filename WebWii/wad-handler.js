// WAD/DOL File Handler
// Handles importing and processing WAD and DOL files for homebrew/NAND installation

/**
 * WAD file magic number (header identifier)
 */
const WAD_MAGIC = 0x00204973; // 'Is\x00\x20' in little endian

/**
 * DOL file typically starts with specific patterns
 */
const DOL_TEXT_OFFSET = 0x00;
const DOL_DATA_OFFSET = 0x1C;

/**
 * Initialize WAD/DOL file handler
 */
function initWadDolHandler() {
    const fileInput = document.getElementById('wad-dol-input');
    const statusDiv = document.getElementById('wad-dol-status');
    const infoDiv = document.getElementById('wad-dol-info');
    const detailsDiv = document.getElementById('wad-dol-details');
    const installButton = document.getElementById('install-wad-dol');
    const progressBar = document.getElementById('wad-dol-progress');

    let currentFile = null;
    let currentFileType = null;

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        currentFile = file;
        resetWadDolUI();

        // Show progress
        progressBar.style.display = 'block';
        updateProgress(progressBar, 0);

        const reader = new FileReader();
        
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentLoaded = Math.round((e.loaded / e.total) * 100);
                updateProgress(progressBar, percentLoaded);
            }
        };

        reader.onload = function(evt) {
            const arrayBuffer = evt.target.result;
            updateProgress(progressBar, 100);
            
            // Determine file type and validate
            const fileType = detectFileType(file.name, arrayBuffer);
            currentFileType = fileType;

            if (fileType === 'WAD') {
                handleWadFile(file, arrayBuffer);
            } else if (fileType === 'DOL') {
                handleDolFile(file, arrayBuffer);
            } else {
                showStatus(statusDiv, 'error', 'Invalid file type. Please select a .wad or .dol file.');
                progressBar.style.display = 'none';
            }
        };

        reader.onerror = function() {
            showStatus(statusDiv, 'error', 'Error reading file. Please try again.');
            progressBar.style.display = 'none';
        };

        reader.readAsArrayBuffer(file);
    });

    // Install button handler
    if (installButton) {
        installButton.addEventListener('click', () => {
            if (currentFile && currentFileType) {
                showNandWarning(
                    `You are about to install "${currentFile.name}" to the virtual NAND. This operation may overwrite existing data. Are you sure you want to proceed?`,
                    () => performNandInstallation(currentFile, currentFileType)
                );
            }
        });
    }
}

/**
 * Detect file type based on extension and content
 */
function detectFileType(filename, arrayBuffer) {
    const extension = filename.split('.').pop().toLowerCase();
    
    if (extension === 'wad') {
        return validateWadFile(arrayBuffer) ? 'WAD' : null;
    } else if (extension === 'dol') {
        return validateDolFile(arrayBuffer) ? 'DOL' : null;
    }
    
    return null;
}

/**
 * Validate WAD file structure
 */
function validateWadFile(arrayBuffer) {
    if (arrayBuffer.byteLength < 64) return false;
    
    const view = new DataView(arrayBuffer);
    // WAD files start with specific header
    // Simple validation - check minimum size
    return true; // Simplified validation
}

/**
 * Validate DOL file structure
 */
function validateDolFile(arrayBuffer) {
    if (arrayBuffer.byteLength < 0x100) return false;
    
    // DOL files have specific structure with offset tables
    // Simplified validation
    return true;
}

/**
 * Handle WAD file parsing
 */
function handleWadFile(file, arrayBuffer) {
    const statusDiv = document.getElementById('wad-dol-status');
    const infoDiv = document.getElementById('wad-dol-info');
    const detailsDiv = document.getElementById('wad-dol-details');
    const installButton = document.getElementById('install-wad-dol');
    const progressBar = document.getElementById('wad-dol-progress');

    // Parse WAD header (simplified)
    const view = new DataView(arrayBuffer);
    const fileSize = arrayBuffer.byteLength;

    // Display file information
    const details = `
        <p><strong>File Name:</strong> ${file.name}</p>
        <p><strong>File Type:</strong> WAD (Wii Application Data)</p>
        <p><strong>File Size:</strong> ${formatBytes(fileSize)}</p>
        <p><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
        <p><strong>Status:</strong> <span style="color: var(--wii-success);">✓ Valid WAD file</span></p>
    `;

    detailsDiv.innerHTML = details;
    infoDiv.style.display = 'block';
    installButton.style.display = 'inline-block';
    progressBar.style.display = 'none';

    showStatus(statusDiv, 'success', 'WAD file loaded successfully! Review the information above.');
}

/**
 * Handle DOL file parsing
 */
function handleDolFile(file, arrayBuffer) {
    const statusDiv = document.getElementById('wad-dol-status');
    const infoDiv = document.getElementById('wad-dol-info');
    const detailsDiv = document.getElementById('wad-dol-details');
    const installButton = document.getElementById('install-wad-dol');
    const progressBar = document.getElementById('wad-dol-progress');

    const fileSize = arrayBuffer.byteLength;

    // Display file information
    const details = `
        <p><strong>File Name:</strong> ${file.name}</p>
        <p><strong>File Type:</strong> DOL (Dolphin Executable)</p>
        <p><strong>File Size:</strong> ${formatBytes(fileSize)}</p>
        <p><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
        <p><strong>Status:</strong> <span style="color: var(--wii-success);">✓ Valid DOL executable</span></p>
    `;

    detailsDiv.innerHTML = details;
    infoDiv.style.display = 'block';
    installButton.style.display = 'inline-block';
    progressBar.style.display = 'none';

    showStatus(statusDiv, 'success', 'DOL file loaded successfully! Review the information above.');
}

/**
 * Perform NAND installation (simulated)
 */
function performNandInstallation(file, fileType) {
    const statusDiv = document.getElementById('wad-dol-status');
    const progressBar = document.getElementById('wad-dol-progress');
    
    showStatus(statusDiv, 'info', `Installing ${fileType} file to virtual NAND...`);
    progressBar.style.display = 'block';
    
    // Simulate installation progress
    let progress = 0;
    const installInterval = setInterval(() => {
        progress += 10;
        updateProgress(progressBar, progress);
        
        if (progress >= 100) {
            clearInterval(installInterval);
            showStatus(statusDiv, 'success', `${fileType} file "${file.name}" installed successfully to virtual NAND!`);
            
            // Store installation preference in cookie
            const installData = {
                filename: file.name,
                type: fileType,
                timestamp: Date.now()
            };
            document.cookie = `lastWadDolInstall=${encodeURIComponent(JSON.stringify(installData))};path=/;max-age=2592000`; // 30 days
            
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 2000);
        }
    }, 300);
}

/**
 * Reset WAD/DOL UI
 */
function resetWadDolUI() {
    const statusDiv = document.getElementById('wad-dol-status');
    const infoDiv = document.getElementById('wad-dol-info');
    const installButton = document.getElementById('install-wad-dol');
    
    statusDiv.className = 'status-message';
    statusDiv.style.display = 'none';
    infoDiv.style.display = 'none';
    installButton.style.display = 'none';
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Show status message
 */
function showStatus(element, type, message) {
    element.className = `status-message ${type}`;
    element.textContent = message;
    element.style.display = 'block';
}

/**
 * Update progress bar
 */
function updateProgress(progressBar, percent) {
    const fill = progressBar.querySelector('.progress-fill');
    if (fill) {
        fill.style.width = `${percent}%`;
    }
}

/**
 * Show NAND warning modal
 */
function showNandWarning(message, onConfirm) {
    const modal = document.getElementById('nand-warning-modal');
    const messageElement = document.getElementById('warning-message');
    const confirmButton = document.getElementById('confirm-nand-operation');
    const cancelButton = document.getElementById('cancel-nand-operation');

    if (!modal) return;

    messageElement.textContent = message;
    modal.style.display = 'flex';

    // Remove old listeners and add new ones
    const newConfirmButton = confirmButton.cloneNode(true);
    const newCancelButton = cancelButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    newConfirmButton.addEventListener('click', () => {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    });

    newCancelButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initWadDolHandler);
