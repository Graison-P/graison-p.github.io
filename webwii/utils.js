// Shared utility functions for WebWii

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string
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
 * @param {HTMLElement} element - Status element
 * @param {string} type - Status type (success, error, info)
 * @param {string} message - Status message
 */
function showStatus(element, type, message) {
    element.className = `status-message ${type}`;
    element.textContent = message;
    element.style.display = 'block';
}

/**
 * Update progress bar
 * @param {HTMLElement} progressBar - Progress bar element
 * @param {number} percent - Progress percentage (0-100)
 */
function updateProgress(progressBar, percent) {
    const fill = progressBar.querySelector('.progress-fill');
    if (fill) {
        fill.style.width = `${percent}%`;
    }
}

/**
 * Show NAND warning modal
 * @param {string} message - Warning message
 * @param {Function} onConfirm - Callback function on confirm
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
