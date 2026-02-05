// Disclaimer Modal Logic
// Displays a Wii-style disclaimer on first visit and stores acceptance in cookies

/**
 * Check if disclaimer has been accepted
 * @returns {boolean} True if disclaimer cookie exists
 */
function hasAcceptedDisclaimer() {
    return document.cookie.split('; ').some(cookie => cookie.startsWith('wiiDisclaimerAccepted=true'));
}

/**
 * Show the disclaimer modal
 */
function showDisclaimerModal() {
    const modal = document.getElementById('wii-disclaimer-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Hide the disclaimer modal
 */
function hideDisclaimerModal() {
    const modal = document.getElementById('wii-disclaimer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Set disclaimer acceptance cookie
 * Cookie expires in 1 year (31536000 seconds)
 */
function setDisclaimerCookie() {
    const maxAge = 31536000; // 1 year in seconds
    document.cookie = `wiiDisclaimerAccepted=true;path=/;max-age=${maxAge};SameSite=Lax`;
}

/**
 * Handle disclaimer acceptance
 */
function acceptDisclaimer() {
    setDisclaimerCookie();
    hideDisclaimerModal();
}

/**
 * Initialize disclaimer check on page load
 */
function initDisclaimer() {
    if (!hasAcceptedDisclaimer()) {
        showDisclaimerModal();
    }

    // Set up event listener for accept button
    const acceptButton = document.getElementById('accept-disclaimer');
    if (acceptButton) {
        acceptButton.addEventListener('click', acceptDisclaimer);
    }
}

// Run on DOM content loaded
document.addEventListener('DOMContentLoaded', initDisclaimer);
