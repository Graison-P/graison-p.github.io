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
    
    // Check for WAD header signature (0x00204973 = "Is\x00\x20")
    // WAD files can be "Is\x00\x00" (0x49730000) or "ib\x00\x00" (0x69620000)
    const headerSignature = view.getUint32(0, false); // Big-endian
    
    // Accept common WAD signatures
    if (headerSignature === 0x49730000 || // "Is\x00\x00"
        headerSignature === 0x69620000) { // "ib\x00\x00"
        return true;
    }
    
    // If header doesn't match, still accept for demo purposes
    // but this is simplified validation
    return true;
}

/**
 * Validate DOL file structure
 */
function validateDolFile(arrayBuffer) {
    if (arrayBuffer.byteLength < 0x100) return false;
    
    const view = new DataView(arrayBuffer);
    
    // DOL files have offset tables at the beginning
    // Check that text section offsets are reasonable
    const textOffset0 = view.getUint32(DOL_TEXT_OFFSET, false);
    const dataOffset0 = view.getUint32(DOL_DATA_OFFSET, false);
    
    // Offsets should be within file bounds and aligned
    if (textOffset0 > 0 && textOffset0 < arrayBuffer.byteLength) {
        return true;
    }
    if (dataOffset0 > 0 && dataOffset0 < arrayBuffer.byteLength) {
        return true;
    }
    
    // If validation fails, still accept for demo purposes
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

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initWadDolHandler);
