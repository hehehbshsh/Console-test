let isAdmin = false;
let adminAttempts = 0;
const MAX_ADMIN_ATTEMPTS = 2;
const LOCKOUT_DURATION = 10 * 60 * 1000;
let lastAdminAttemptTime = 0;
const adminPassword = 'C0mpl3x_2001!_S3cur3_Z0n3';

// --- Theme Management ---
const themes = {
    'default': {
        name: 'Default Green',
        colors: { '--bg-color': '#000', '--text-color': '#0f0', '--accent-color': '#00f', '--error-color': '#f00', '--success-color': '#0f0', '--warning-color': '#f0f', '--button-bg': '#0f0', '--button-text': '#000', '--border-color': '#0f0', '--input-bg': '#000' },
        sounds: { success: '/sounds/success_default.mp3', error: '/sounds/error_default.mp3', redirect: '/sounds/redirect_default.mp3', admin_login: '/sounds/admin_login_default.mp3', admin_fail: '/sounds/admin_fail_default.mp3' }
    },
    'hacker': {
        name: 'Hacker Blue',
        colors: { '--bg-color': '#050a18', '--text-color': '#00ffff', '--accent-color': '#ff00ff', '--error-color': '#ff3333', '--success-color': '#33ff33', '--warning-color': '#ffff00', '--button-bg': '#00ffff', '--button-text': '#050a18', '--border-color': '#00ffff', '--input-bg': '#050a18' },
        sounds: { success: '/sounds/success_hacker.mp3', error: '/sounds/error_hacker.mp3', redirect: '/sounds/redirect_hacker.mp3', admin_login: '/sounds/admin_login_hacker.mp3', admin_fail: '/sounds/admin_fail_hacker.mp3' }
    },
    'vintage': {
        name: 'Vintage Amber',
        colors: { '--bg-color': '#201500', '--text-color': '#ffb000', '--accent-color': '#ffffff', '--error-color': '#ff6060', '--success-color': '#a0ffa0', '--warning-color': '#ffcc66', '--button-bg': '#ffb000', '--button-text': '#201500', '--border-color': '#ffb000', '--input-bg': '#201500' },
        sounds: { success: '/sounds/success_vintage.mp3', error: '/sounds/error_vintage.mp3', redirect: '/sounds/redirect_vintage.mp3', admin_login: '/sounds/admin_login_vintage.mp3', admin_fail: '/sounds/admin_fail_vintage.mp3' }
    }
};
let currentTheme = themes['default'];
let currentThemeName = 'default';
let soundEnabled = true; 

// Sound Player Function
function playSound(type) {
    if (!soundEnabled || !currentTheme || !currentTheme.sounds || !currentTheme.sounds[type]) {
        return;
    }
    const audio = new Audio(currentTheme.sounds[type]);
    audio.play().catch(e => {
        if (e.name !== 'AbortError') {
            console.warn(`Sound play failed for ${type}:`, e);
        }
    });
}

// Apply Theme Function
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) {
        if (addTextCallback) { 
             addTextCallback(`Theme "${themeName}" not found.`, 'error');
             playSound('error'); 
        }
        return false; 
    }

    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([variable, value]) => {
        root.style.setProperty(variable, value);
    });

    currentTheme = theme;
    currentThemeName = themeName;
    localStorage.setItem('systemTerminalTheme', themeName); 

    if (addTextCallback) { 
        addTextCallback(`Applied theme: ${theme.name}`, 'success');
    }
     return true; 
}

// Load Theme on Startup
function loadTheme() {
    const savedTheme = localStorage.getItem('systemTerminalTheme') || 'default';
    const soundPref = localStorage.getItem('systemTerminalSound') === 'false' ? false : true; 
    soundEnabled = soundPref;
    applyTheme(savedTheme); 
}

// Toggle Sound Function
function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('systemTerminalSound', soundEnabled); 
    addTextCallback(soundEnabled ? "Sound enabled." : "Sound disabled.", 'success');
}

// --- End Theme Management ---


// Load redirects from localStorage, with fallback to initial values
let redirects = JSON.parse(localStorage.getItem('systemTerminalRedirects')) || {
    '00xr4': { url: 'http://www.google.com', hidden: false },
    'phob:tube': { url: 'http://www.youtube.com', hidden: false },
    'coder': { url: 'https://github.com', hidden: false },
    'chirp\' \'r': { url: 'http://twitter.com', hidden: false },
    'face-social': { url: 'https://facebook.com', hidden: false },
};

// Load non-redirect commands from localStorage, with fallback to initial values
let nonRedirectCommands = JSON.parse(localStorage.getItem('systemTerminalNonRedirects')) || {
    'h3n13-3': { description: 'Show available system commands', hidden: false, functionBody: null },
    'ex': { description: 'Add/Edit redirects with admin password', hidden: false, functionBody: null },
    'ex-ui': { description: 'Open admin command management UI', hidden: false, functionBody: null },
    'clr': { description: 'Clear terminal screen', hidden: false, functionBody: null },
    'logout': { description: 'Revoke current admin permissions', hidden: true, functionBody: null },
    'theme': { description: 'List themes or set theme [themename]', hidden: false, functionBody: null }, 
    'sound': { description: 'Toggle sound effects on/off', hidden: false, functionBody: null } 
};

let addTextCallback;

export function initCommands(addText) {
    addTextCallback = addText;
    loadTheme(); 
}

export function getRedirects() {
    return redirects;
}

export function getNonRedirectCommands() {
    return nonRedirectCommands;
}

export function setRedirects(newRedirects) {
    redirects = newRedirects;
    localStorage.setItem('systemTerminalRedirects', JSON.stringify(redirects));
}

export function setNonRedirectCommands(newCommands) {
    nonRedirectCommands = newCommands;
    localStorage.setItem('systemTerminalNonRedirects', JSON.stringify(nonRedirectCommands));
}

const commandHistory = [];
const RATE_LIMIT_WINDOW = 3000; 
const MAX_COMMANDS_PER_WINDOW = 2;

function isRateLimited() {
    const now = Date.now();
    const recentCommands = commandHistory.filter(time => now - time < RATE_LIMIT_WINDOW);
    return recentCommands.length >= MAX_COMMANDS_PER_WINDOW;
}

function isPasswordComplex(password) {
    return (
        password.length >= 15 && 
        /[A-Z]{2,}/.test(password) && 
        /[a-z]{2,}/.test(password) && 
        /[0-9]{2,}/.test(password) && 
        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{2,}/.test(password)
    );
}

export function processCommand(command) {
    if (isRateLimited()) {
        const waitTime = Math.pow(2, commandHistory.length - MAX_COMMANDS_PER_WINDOW) * 1000;
        addTextCallback(`Too many commands. Wait ${waitTime/1000} seconds.`, 'error');
        playSound('error'); 
        return;
    }
    commandHistory.push(Date.now());
    while (commandHistory.length > MAX_COMMANDS_PER_WINDOW * 3) {
        commandHistory.shift();
    }

    const parts = command.split(' ');
    const cmdKey = parts[0];
    const args = parts.slice(1); 

    if (cmdKey === 'ex' && parts.length >= 2) { 
        const now = Date.now();
        if (now - lastAdminAttemptTime < LOCKOUT_DURATION && adminAttempts >= MAX_ADMIN_ATTEMPTS) {
            const remainingLockout = Math.ceil((LOCKOUT_DURATION - (now - lastAdminAttemptTime)) / 1000);
            addTextCallback(`Admin access locked. Try again in ${remainingLockout} seconds.`, 'error');
            return;
        }

        if (parts[1] !== adminPassword || !isPasswordComplex(parts[1])) {
            adminAttempts++;
            lastAdminAttemptTime = now;

            if (adminAttempts >= MAX_ADMIN_ATTEMPTS) {
                addTextCallback('Security breach detected. System locked indefinitely.', 'error');
                setTimeout(() => {
                    adminAttempts = 0;
                }, LOCKOUT_DURATION * 2);
                return;
            }

            addTextCallback('Authentication failed. Attempt logged.', 'error');
            return;
        }

        isAdmin = true;
        adminAttempts = 0;
        if (nonRedirectCommands['logout']) {
            nonRedirectCommands['logout'].hidden = false; 
        }
        addTextCallback('Admin privileges granted. Session timeout in 5 minutes.', 'success');
        addTextCallback('Use "logout" command to revoke privileges manually.', 'accent');

        const adminTimeout = setTimeout(() => {
            if (isAdmin) { 
                isAdmin = false;
                if (nonRedirectCommands['logout']) {
                    nonRedirectCommands['logout'].hidden = true; 
                }
                addTextCallback('Admin session expired. Re-authentication required.', 'warning');
            }
        }, 5 * 60 * 1000); 

        try {
            const potentialUrl = parts[2];
            if (potentialUrl && potentialUrl.includes('.') && (potentialUrl.startsWith('http://') || potentialUrl.startsWith('https://'))) {
                new URL(potentialUrl); 
                addTextCallback(`Redirect authorization in progress...`, 'success');
                setTimeout(() => {
                    redirects[potentialUrl] = { url: potentialUrl, hidden: false };
                    localStorage.setItem('systemTerminalRedirects', JSON.stringify(redirects));
                    addTextCallback(`Redirect established: ${potentialUrl}`, 'success');
                    if (window.updateRedirectList) window.updateRedirectList(); 
                }, 1000); 
            } else {
                addTextCallback(`Command '${parts[2]}' ignored during admin login.`, 'warning');
            }

        } catch {
            addTextCallback('Invalid URL format provided with login.', 'error');
        }
        return; 
    } else if (cmdKey === 'ex') {
        addTextCallback('Invalid command format. Please use "ex [password] [optional_url_to_add]"', 'error');
        return;
    }

    if (cmdKey === 'h3n13-3') {
        addTextCallback('Available system commands:', 'accent');
        Object.entries(redirects).forEach(([key, redirect]) => {
            if (!redirect.hidden || isAdmin) {
                addTextCallback(`- ${key} - Redirect to ${redirect.url}${isAdmin && redirect.hidden ? ' (Hidden)' : ''}`, 'accent');
            }
        });
        Object.entries(nonRedirectCommands).forEach(([key, cmd]) => {
            if (key === 'logout') {
                if (isAdmin) { 
                    addTextCallback(`- ${key} - ${cmd.description}`, 'accent');
                }
            } else if (!cmd.hidden || isAdmin) { 
                const funcIndicator = cmd.functionBody ? '(Custom Function)' : '';
                addTextCallback(`- ${key} - ${cmd.description} ${funcIndicator}${isAdmin && cmd.hidden ? ' (Hidden)' : ''}`, 'accent');
            }
        });
    } else if (cmdKey === 'clr') {
        const inputLine = document.getElementById('input-line');
        const consoleElement = document.getElementById('console');
        const logoLines = Array.from(consoleElement.querySelectorAll('p')).slice(0, 4);
        consoleElement.innerHTML = '';
        logoLines.forEach(line => consoleElement.appendChild(line));
        consoleElement.appendChild(inputLine);
        document.getElementById('command-input').focus();

    } else if (cmdKey === 'ex-ui') {
        if (isAdmin) {
            const adminModal = document.getElementById('admin-modal');
            adminModal.style.display = 'flex';
            if (window.updateRedirectList) window.updateRedirectList(); 
            if (window.updateNonRedirectList) window.updateNonRedirectList(); 
        } else {
            addTextCallback('Admin privileges required for "ex-ui". Use "ex [password]".', 'error');
        }

    } else if (cmdKey === 'logout') {
        if (isAdmin) {
            isAdmin = false;
            if (nonRedirectCommands['logout']) {
                nonRedirectCommands['logout'].hidden = true; 
            }
            addTextCallback('Admin privileges revoked.', 'warning');
        } else {
            addTextCallback('Not currently in admin mode.', 'error');
        }

    } else if (redirects[cmdKey] && (!redirects[cmdKey].hidden || isAdmin)) {
        addTextCallback(`Redirecting to ${cmdKey}...`, 'success');
        setTimeout(() => {
            window.location.href = redirects[cmdKey].url;
        }, 1000);

    } else if (nonRedirectCommands[cmdKey] && (!nonRedirectCommands[cmdKey].hidden || isAdmin)) {
        const cmdData = nonRedirectCommands[cmdKey];
        addTextCallback(`Executing: ${cmdKey}`, 'success');
        if (cmdData.functionBody) {
            try {
                const customFunction = new Function('addText', cmdData.functionBody);
                customFunction(addTextCallback);
            } catch (e) {
                addTextCallback(`Error executing command "${cmdKey}": ${e.message}`, 'error');
                console.error(`Error in command "${cmdKey}":`, e);
            }
        } else {
            if (!['clr', 'ex-ui', 'ex', 'h3n13-3', 'logout'].includes(cmdKey)) {
                addTextCallback(cmdData.description, 'accent');
            }
        }

    } else if (cmdKey === 'theme') {
        if (args.length === 0) {
            addTextCallback('Available themes:', 'accent');
            Object.keys(themes).forEach(themeName => {
                addTextCallback(`- ${themeName}: ${themes[themeName].name}`, 'accent');
            });
        } else {
            applyTheme(args[0]);
        }

    } else if (cmdKey === 'sound') {
        toggleSound();
    }

    else if (command) { 
        addTextCallback(`Unknown command: ${command}`, 'error');
    }
}

export function getObfuscatedCommands() {
    const obfuscatedRedirects = Object.fromEntries(
        Object.entries(redirects)
            .filter(([_, redirect]) => !redirect.hidden || isAdmin)
            .map(([key, redirect]) => [btoa(key), redirect])
    );

    const obfuscatedNonRedirects = Object.fromEntries(
        Object.entries(nonRedirectCommands)
            .filter(([_, cmd]) => !cmd.hidden || isAdmin)
            .map(([key, cmd]) => [btoa(key), cmd])
    );

    return {
        redirects: obfuscatedRedirects,
        nonRedirects: obfuscatedNonRedirects
    };
}