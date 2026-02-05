// Disclaimer Modal Logic
// Displays a Wii-style warning screen on first visit and stores acceptance in cookies

/**
 * Check if disclaimer has been accepted
 * @returns {boolean} True if disclaimer cookie exists
 */
function hasAcceptedDisclaimer() {
    return document.cookie.split('; ').some(cookie => cookie.startsWith('wiiDisclaimerAccepted=true'));
}

/**
 * Show the disclaimer modal with fade-in
 */
function showDisclaimerModal() {
    const modal = document.getElementById('wii-disclaimer-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Trigger reflow to ensure animation plays
        void modal.offsetWidth;
    }
}

/**
 * Hide the disclaimer modal with fade-out
 */
function hideDisclaimerModal() {
    const modal = document.getElementById('wii-disclaimer-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 500);
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
 * Play Wii click sound
 */
function playWiiClickSound() {
    const sound = document.getElementById('wii-click-sound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(err => {
            // Ignore errors if sound can't play (browser restrictions)
            console.log('Sound play prevented:', err);
        });
    }
}

/**
 * Handle disclaimer acceptance
 */
function acceptDisclaimer() {
    playWiiClickSound();
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

    // Set up event listener for clicking anywhere on the modal
    const modal = document.getElementById('wii-disclaimer-modal');
    if (modal) {
        modal.addEventListener('click', acceptDisclaimer);
    }
}

// Run on DOM content loaded
document.addEventListener('DOMContentLoaded', initDisclaimer);
