// BootMii Backup Import Handler
// Handles importing and validating BootMii NAND backup files (nand.bin)

/**
 * Standard BootMii backup size (512MB)
 */
const BOOTMII_STANDARD_SIZE = 512 * 1024 * 1024; // 512MB in bytes

/**
 * Tolerance for file size check (allow some variation)
 */
const SIZE_TOLERANCE = 1024 * 1024; // 1MB tolerance

/**
 * Initialize BootMii backup handler
 */
function initBootMiiHandler() {
    const fileInput = document.getElementById('bootmii-input');
    const statusDiv = document.getElementById('bootmii-status');
    const infoDiv = document.getElementById('bootmii-info');
    const detailsDiv = document.getElementById('bootmii-details');
    const restoreButton = document.getElementById('restore-bootmii');
    const progressBar = document.getElementById('bootmii-progress');

    let currentBackup = null;

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        currentBackup = file;
        resetBootMiiUI();

        // Show progress
        progressBar.style.display = 'block';
        updateBootMiiProgress(progressBar, 0);

        // Validate file size first
        const sizeValid = validateBackupSize(file.size);
        
        if (!sizeValid.isValid) {
            showBootMiiStatus(statusDiv, 'error', sizeValid.message);
            progressBar.style.display = 'none';
            return;
        } else if (sizeValid.isWarning) {
            showBootMiiStatus(statusDiv, 'info', sizeValid.message);
        }

        const reader = new FileReader();
        
        reader.onprogress = (e) => {
            if (e.lengthComputable) {
                const percentLoaded = Math.round((e.loaded / e.total) * 100);
                updateBootMiiProgress(progressBar, percentLoaded);
            }
        };

        reader.onload = function(evt) {
            const arrayBuffer = evt.target.result;
            updateBootMiiProgress(progressBar, 100);
            
            // Validate and parse backup
            validateAndParseBackup(file, arrayBuffer);
        };

        reader.onerror = function() {
            showBootMiiStatus(statusDiv, 'error', 'Error reading backup file. Please try again.');
            progressBar.style.display = 'none';
        };

        // Read file in chunks for large files
        reader.readAsArrayBuffer(file);
    });

    // Restore button handler
    if (restoreButton) {
        restoreButton.addEventListener('click', () => {
            if (currentBackup) {
                showNandWarning(
                    `You are about to restore the BootMii backup "${currentBackup.name}". This will REPLACE all current NAND data. This action cannot be undone. Are you sure you want to proceed?`,
                    () => performBackupRestore(currentBackup)
                );
            }
        });
    }
}

/**
 * Validate backup file size
 */
function validateBackupSize(size) {
    const difference = Math.abs(size - BOOTMII_STANDARD_SIZE);
    
    if (difference > SIZE_TOLERANCE * 10) {
        return {
            isValid: false,
            isWarning: false,
            message: `Error: File size (${formatBytes(size)}) does not match standard BootMii backup size (${formatBytes(BOOTMII_STANDARD_SIZE)}). This may not be a valid backup file.`
        };
    } else if (difference > SIZE_TOLERANCE) {
        return {
            isValid: true,
            isWarning: true,
            message: `Warning: File size (${formatBytes(size)}) differs slightly from standard BootMii backup size (${formatBytes(BOOTMII_STANDARD_SIZE)}). Proceeding with validation...`
        };
    }
    
    return {
        isValid: true,
        isWarning: false,
        message: ''
    };
}

/**
 * Validate and parse BootMii backup
 */
function validateAndParseBackup(file, arrayBuffer) {
    const statusDiv = document.getElementById('bootmii-status');
    const infoDiv = document.getElementById('bootmii-info');
    const detailsDiv = document.getElementById('bootmii-details');
    const restoreButton = document.getElementById('restore-bootmii');
    const progressBar = document.getElementById('bootmii-progress');

    // Perform basic validation
    const validation = performBackupValidation(arrayBuffer);

    if (!validation.isValid) {
        showBootMiiStatus(statusDiv, 'error', validation.message);
        progressBar.style.display = 'none';
        return;
    }

    // Extract backup information
    const backupInfo = extractBackupInfo(file, arrayBuffer);

    // Display backup information
    const warnings = validation.warnings.length > 0 
        ? `<p><strong>Warnings:</strong></p><ul>${validation.warnings.map(w => `<li style="color: var(--wii-warning);">${w}</li>`).join('')}</ul>`
        : '';

    const details = `
        <p><strong>File Name:</strong> ${file.name}</p>
        <p><strong>File Type:</strong> BootMii NAND Backup</p>
        <p><strong>File Size:</strong> ${formatBytes(backupInfo.size)}</p>
        <p><strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
        <p><strong>Validation:</strong> <span style="color: var(--wii-success);">✓ Backup appears valid</span></p>
        ${warnings}
        <p style="margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid var(--wii-warning); color: #856404;">
            <strong>⚠️ Important:</strong> Restoring this backup will replace all current NAND data. Make sure you have a current backup before proceeding.
        </p>
    `;

    detailsDiv.innerHTML = details;
    infoDiv.style.display = 'block';
    restoreButton.style.display = 'inline-block';
    progressBar.style.display = 'none';

    showBootMiiStatus(statusDiv, 'success', 'BootMii backup loaded and validated successfully!');
}

/**
 * Perform backup validation
 */
function performBackupValidation(arrayBuffer) {
    const warnings = [];
    
    // Check if buffer is not empty
    if (arrayBuffer.byteLength === 0) {
        return {
            isValid: false,
            message: 'Error: Backup file is empty.',
            warnings: []
        };
    }

    // Basic header check (simplified)
    const view = new DataView(arrayBuffer);
    
    // BootMii backups typically have specific patterns
    // This is a simplified validation
    
    // Check for all zeros (corrupted backup)
    let hasData = false;
    for (let i = 0; i < Math.min(1024, arrayBuffer.byteLength); i += 4) {
        if (view.getUint32(i, true) !== 0) {
            hasData = true;
            break;
        }
    }
    
    if (!hasData) {
        warnings.push('First 1KB of backup appears to be empty. This may indicate a corrupted backup.');
    }

    return {
        isValid: true,
        message: '',
        warnings: warnings
    };
}

/**
 * Extract backup information
 */
function extractBackupInfo(file, arrayBuffer) {
    return {
        name: file.name,
        size: arrayBuffer.byteLength,
        lastModified: file.lastModified,
        type: 'BootMii NAND Backup'
    };
}

/**
 * Perform backup restore (simulated)
 */
function performBackupRestore(file) {
    const statusDiv = document.getElementById('bootmii-status');
    const progressBar = document.getElementById('bootmii-progress');
    
    showBootMiiStatus(statusDiv, 'info', 'Restoring BootMii backup to virtual NAND...');
    progressBar.style.display = 'block';
    
    // Simulate restore progress
    let progress = 0;
    const restoreInterval = setInterval(() => {
        progress += 5;
        updateBootMiiProgress(progressBar, progress);
        
        if (progress >= 100) {
            clearInterval(restoreInterval);
            showBootMiiStatus(statusDiv, 'success', `BootMii backup "${file.name}" restored successfully!`);
            
            // Store restore information in cookie
            const restoreData = {
                filename: file.name,
                size: file.size,
                timestamp: Date.now()
            };
            document.cookie = `lastBootMiiRestore=${encodeURIComponent(JSON.stringify(restoreData))};path=/;max-age=2592000`; // 30 days
            
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 2000);
        }
    }, 200);
}

/**
 * Reset BootMii UI
 */
function resetBootMiiUI() {
    const statusDiv = document.getElementById('bootmii-status');
    const infoDiv = document.getElementById('bootmii-info');
    const restoreButton = document.getElementById('restore-bootmii');
    
    statusDiv.className = 'status-message';
    statusDiv.style.display = 'none';
    infoDiv.style.display = 'none';
    restoreButton.style.display = 'none';
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
function showBootMiiStatus(element, type, message) {
    element.className = `status-message ${type}`;
    element.textContent = message;
    element.style.display = 'block';
}

/**
 * Update progress bar
 */
function updateBootMiiProgress(progressBar, percent) {
    const fill = progressBar.querySelector('.progress-fill');
    if (fill) {
        fill.style.width = `${percent}%`;
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initBootMiiHandler);
