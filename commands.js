let isAdmin = null; // Store username of logged-in admin, or null
let isSuperAdmin = false;
let adminAttempts = 0;
const MAX_ADMIN_ATTEMPTS = 2; // For regular admins
const LOCKOUT_DURATION = 10 * 60 * 1000; // For regular admins
let lastAdminAttemptTime = 0;
const superAdminUsername = 'admin';
const superAdminPassword = '2@@1';
let superAdminAttempted = sessionStorage.getItem('superAdminAttempted') === 'true'; // Persists only for the session
let nullInitiativeCounter = 0;

// Store regular admin accounts: { username: password }
let adminAccounts = JSON.parse(localStorage.getItem('systemTerminalAdmins')) || {};

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

export function applyTheme(themeName) {
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
        const isCalledFromCommand = new Error().stack.includes('processCommand');
        if (isCalledFromCommand) {
            addTextCallback(`Applied theme: ${theme.name}`, 'success');
        }
    }
    setTimeout(() => playSound('success'), 50);
    return true;
}

function loadTheme() {
    const savedTheme = localStorage.getItem('systemTerminalTheme') || 'default';
    const soundPref = localStorage.getItem('systemTerminalSound') === 'false' ? false : true;
    soundEnabled = soundPref;
    applyTheme(savedTheme);
}

export function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('systemTerminalSound', soundEnabled);
    if (addTextCallback) {
        const isCalledFromCommand = new Error().stack.includes('processCommand');
        if (isCalledFromCommand) {
            addTextCallback(soundEnabled ? "Sound enabled." : "Sound disabled.", 'success');
        }
    }
    if (soundEnabled) {
        playSound('success');
    }
}

export function getThemes() {
    return themes;
}

export function getCurrentThemeName() {
    return currentThemeName;
}

export function isSoundEnabled() {
    return soundEnabled;
}

let redirects = JSON.parse(localStorage.getItem('systemTerminalRedirects')) || {
    '00xr4': { url: 'http://www.google.com', hidden: false },
    'phob:tube': { url: 'http://www.youtube.com', hidden: false },
    'coder': { url: 'https://github.com', hidden: false },
    'chirp\' \'r': { url: 'http://twitter.com', hidden: false },
    'face-social': { url: 'https://facebook.com', hidden: false },
};

const defaultNonRedirectCommands = {
    'h3n13-3': { description: 'Show available system commands', hidden: false, functionBody: null },
    'ex': { description: 'Login as admin: ex [username] [password] | ex super [password]', hidden: false, functionBody: null },
    'ex-ui': { description: 'Open admin command management UI (Admin Only)', hidden: true, functionBody: null },
    'clr': { description: 'Clear terminal screen', hidden: false, functionBody: null },
    'logout': { description: 'Log out from admin/super admin session', hidden: true, functionBody: null },
    'theme': { description: 'List themes or set theme [themename]', hidden: false, functionBody: null },
    'sound': { description: 'Toggle sound effects on/off', hidden: false, functionBody: null },
    'su-adm': { description: 'Manage admin accounts (Super Admin Only)', hidden: true, functionBody: null }
};

let loadedNonRedirectCommands = JSON.parse(localStorage.getItem('systemTerminalNonRedirects')) || {};
// Ensure the hidden easter egg command cannot be modified or viewed
if (loadedNonRedirectCommands['run.null.Initiative.class']) {
    delete loadedNonRedirectCommands['run.null.Initiative.class'];
    // Update local storage to remove it permanently
    localStorage.setItem('systemTerminalNonRedirects', JSON.stringify(loadedNonRedirectCommands));
}
let nonRedirectCommands = { ...loadedNonRedirectCommands, ...defaultNonRedirectCommands };

Object.keys(defaultNonRedirectCommands).forEach(key => {
    if (nonRedirectCommands[key]) {
        nonRedirectCommands[key].description = defaultNonRedirectCommands[key].description;
        nonRedirectCommands[key].hidden = defaultNonRedirectCommands[key].hidden;
        nonRedirectCommands[key].functionBody = defaultNonRedirectCommands[key].functionBody;
    } else {
        nonRedirectCommands[key] = { ...defaultNonRedirectCommands[key] };
    }
});

localStorage.setItem('systemTerminalNonRedirects', JSON.stringify(nonRedirectCommands));

let addTextCallback;

function updateCommandVisibility() {
    if (nonRedirectCommands['logout']) {
        nonRedirectCommands['logout'].hidden = !isAdmin && !isSuperAdmin;
    }
    if (nonRedirectCommands['ex-ui']) {
        nonRedirectCommands['ex-ui'].hidden = !isAdmin;
    }
    if (nonRedirectCommands['su-adm']) {
        nonRedirectCommands['su-adm'].hidden = !isSuperAdmin;
    }
}

export function initCommands(addText) {
    addTextCallback = addText;
    loadTheme();
    updateCommandVisibility();
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
    nonRedirectCommands = { ...nonRedirectCommands, ...newCommands };
    Object.keys(defaultNonRedirectCommands).forEach(key => {
        if (nonRedirectCommands[key]) {
            nonRedirectCommands[key].description = defaultNonRedirectCommands[key].description;
            nonRedirectCommands[key].functionBody = defaultNonRedirectCommands[key].functionBody;
        } else {
            nonRedirectCommands[key] = { ...defaultNonRedirectCommands[key] };
        }
    });
    updateCommandVisibility();
    localStorage.setItem('systemTerminalNonRedirects', JSON.stringify(nonRedirectCommands));
}

export function getAdminAccounts() {
    return adminAccounts;
}

export function setAdminAccounts(newAccounts) {
    adminAccounts = newAccounts;
    localStorage.setItem('systemTerminalAdmins', JSON.stringify(adminAccounts));
}

const commandHistory = [];
const RATE_LIMIT_WINDOW = 3000;
const MAX_COMMANDS_PER_WINDOW = 2;

function isRateLimited() {
    const now = Date.now();
    const recentCommands = commandHistory.filter(time => now - time < RATE_LIMIT_WINDOW);
    return recentCommands.length >= MAX_COMMANDS_PER_WINDOW;
}

export function processCommand(command) {
    // This is a hidden easter egg command.
    if (command === 'run.null.Initiative.class') {
        nullInitiativeCounter++;
        if (nullInitiativeCounter >= 3) {
            nullInitiativeCounter = 0; // Reset counter
            addTextCallback('Null Initiative Protocol Activated...', 'warning');
            playSound('redirect');
            setTimeout(() => {
                window.location.href = 'https://derealization.vercel.app/';
                setTimeout(() => {
                    // This may be blocked by the browser.
                    window.close();
                }, 500);
            }, 1000);
        }
        return; // Always return to hide the command and prevent fall-through.
    } else {
        // Reset if any other command is entered.
        nullInitiativeCounter = 0;
    }

    if (isRateLimited()) {
        const waitTime = Math.pow(2, commandHistory.length - MAX_COMMANDS_PER_WINDOW) * 1000;
        addTextCallback(`Too many commands. Wait ${waitTime / 1000} seconds.`, 'error');
        playSound('error');
        return;
    }
    commandHistory.push(Date.now());
    while (commandHistory.length > MAX_COMMANDS_PER_WINDOW * 3) {
        commandHistory.shift();
    }

    const parts = command.trim().split(/\s+/);
    const cmdKey = parts[0];
    const args = parts.slice(1);

    if (cmdKey === 'ex') {
        if (args.length === 2 && args[0].toLowerCase() === 'super') {
            if (superAdminAttempted) {
                addTextCallback('Super Admin login attempt already used for this session.', 'error');
                playSound('admin_fail');
                return;
            }
            superAdminAttempted = true;
            sessionStorage.setItem('superAdminAttempted', 'true');

            if (args[1] === superAdminPassword) {
                isSuperAdmin = true;
                isAdmin = null;
                updateCommandVisibility();
                playSound('admin_login');
                addTextCallback('Super Admin privileges granted for this session.', 'success');
                addTextCallback('Use "su-adm" to manage admin accounts.', 'accent');
                addTextCallback('Use "logout" command to revoke privileges manually.', 'accent');
            } else {
                playSound('admin_fail');
                addTextCallback('Super Admin authentication failed. Access denied for this session.', 'error');
            }
            return;
        } else if (args.length === 2) {
            const username = args[0];
            const password = args[1];
            const now = Date.now();

            if (now - lastAdminAttemptTime < LOCKOUT_DURATION && adminAttempts >= MAX_ADMIN_ATTEMPTS) {
                const remainingLockout = Math.ceil((LOCKOUT_DURATION - (now - lastAdminAttemptTime)) / 1000);
                addTextCallback(`Admin access locked for user attempts. Try again in ${remainingLockout} seconds.`, 'error');
                playSound('admin_fail');
                return;
            }

            if (adminAccounts[username] && adminAccounts[username] === password) {
                isAdmin = username;
                isSuperAdmin = false;
                adminAttempts = 0;
                updateCommandVisibility();
                playSound('admin_login');
                addTextCallback(`Admin privileges granted for user: ${username}. Session timeout in 5 minutes.`, 'success');
                addTextCallback('Use "ex-ui" to manage commands/appearance.', 'accent');
                addTextCallback('Use "logout" command to revoke privileges manually.', 'accent');

                setTimeout(() => {
                    if (isAdmin === username) {
                        isAdmin = null;
                        updateCommandVisibility();
                        addTextCallback(`Admin session for ${username} expired. Re-authentication required.`, 'warning');
                        playSound('admin_fail');
                    }
                }, 5 * 60 * 1000);

            } else {
                adminAttempts++;
                lastAdminAttemptTime = now;
                playSound('admin_fail');
                if (adminAttempts >= MAX_ADMIN_ATTEMPTS) {
                    addTextCallback(`Maximum login attempts reached for user: ${username}. Account locked.`, 'error');
                } else {
                    addTextCallback('Authentication failed. Attempt logged.', 'error');
                }
            }
            return;
        } else {
            addTextCallback('Invalid command format. Use "ex [username] [password]" or "ex super [password]".', 'error');
            playSound('error');
            return;
        }
    }

    if (cmdKey === 'h3n13-3') {
        addTextCallback('Available system commands:', 'accent');
        const allCommands = { ...redirects, ...nonRedirectCommands };

        Object.entries(allCommands).forEach(([key, item]) => {
            let description = '';
            let isRedirect = redirects.hasOwnProperty(key);
            let cmdData = isRedirect ? redirects[key] : nonRedirectCommands[key];
            let isHidden = cmdData.hidden;

            let showCommand = !isHidden || (isAdmin && isHidden) || (isSuperAdmin && isHidden);

            if (key === 'ex-ui' && !isAdmin) showCommand = false;
            if (key === 'su-adm' && !isSuperAdmin) showCommand = false;
            if (key === 'logout' && !isAdmin && !isSuperAdmin) showCommand = false;

            if (showCommand) {
                if (isRedirect) {
                    description = `- ${key} - Redirect to ${cmdData.url}`;
                } else {
                    description = `- ${key} - ${cmdData.description || 'No description'}`;
                    if (cmdData.functionBody) description += ' (Custom Function)';
                }
                if (isHidden) description += ' (Hidden)';
                addTextCallback(description, 'accent');
            }
        });
        playSound('success');
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
            document.getElementById('super-admin-tab').style.display = 'none';
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            document.querySelector('.admin-tab[data-panel="redirect"]').classList.add('active');
            document.getElementById('redirect-panel').classList.add('active');

            if (window.updateRedirectList) window.updateRedirectList();
            if (window.updateNonRedirectList) window.updateNonRedirectList();
            if (window.updateAppearancePanel) window.updateAppearancePanel();
            playSound('success');
        } else {
            addTextCallback('Admin privileges required for "ex-ui". Use "ex [username] [password]".', 'error');
            playSound('error');
        }
    } else if (cmdKey === 'su-adm') {
        if (isSuperAdmin) {
            const adminModal = document.getElementById('admin-modal');
            adminModal.style.display = 'flex';
            document.getElementById('super-admin-tab').style.display = 'block';

            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('super-admin-tab').classList.add('active');
            document.getElementById('super-admin-panel').classList.add('active');

            if (window.updateAdminAccountList) window.updateAdminAccountList();
            playSound('success');
        } else {
            addTextCallback('Super Admin privileges required for "su-adm". Use "ex super [password]".', 'error');
            playSound('error');
        }
    } else if (cmdKey === 'logout') {
        if (isAdmin || isSuperAdmin) {
            const loggedOutUser = isAdmin || 'Super Admin';
            isAdmin = null;
            isSuperAdmin = false;
            updateCommandVisibility();
            addTextCallback(`Privileges revoked for ${loggedOutUser}.`, 'warning');
            playSound('admin_fail');
        } else {
            addTextCallback('Not currently logged in.', 'error');
            playSound('error');
        }
    } else if (redirects[cmdKey] && (!redirects[cmdKey].hidden || isAdmin || isSuperAdmin)) {
        addTextCallback(`Redirecting to ${cmdKey}...`, 'success');
        playSound('redirect');
        setTimeout(() => {
            window.location.href = redirects[cmdKey].url;
        }, 1000);
    } else if (nonRedirectCommands[cmdKey] && (!nonRedirectCommands[cmdKey].hidden || isAdmin || isSuperAdmin)) {
        const cmdData = nonRedirectCommands[cmdKey];

        let canExecute = true;
        if (cmdKey === 'ex-ui' && !isAdmin) canExecute = false;
        if (cmdKey === 'su-adm' && !isSuperAdmin) canExecute = false;
        if (!canExecute) {
            addTextCallback(`Unknown command: ${command}`, 'error');
            playSound('error');
            return;
        }

        if (cmdKey === 'theme') {
            if (args.length === 0) {
                addTextCallback('Available themes:', 'accent');
                Object.keys(themes).forEach(themeName => {
                    addTextCallback(`- ${themeName}: ${themes[themeName].name}`, 'accent');
                });
                playSound('success');
            } else {
                applyTheme(args[0]);
            }
            return;
        } else if (cmdKey === 'sound') {
            toggleSound();
            return;
        }

        if (!['h3n13-3', 'theme', 'sound', 'clr', 'ex-ui', 'su-adm', 'logout'].includes(cmdKey)) {
            addTextCallback(`Executing: ${cmdKey}`, 'success');
        }

        if (cmdData.functionBody) {
            try {
                const customFunction = new Function('addText', 'playSound', 'isAdmin', 'isSuperAdmin', cmdData.functionBody);
                customFunction(addTextCallback, playSound, isAdmin, isSuperAdmin);
                playSound('success');
            } catch (e) {
                addTextCallback(`Error executing command "${cmdKey}": ${e.message}`, 'error');
                playSound('error');
                console.error(`Error in command "${cmdKey}":`, e);
            }
        } else {
            if (!['clr', 'h3n13-3', 'ex-ui', 'su-adm', 'logout'].includes(cmdKey)) {
                addTextCallback(cmdData.description || `Command ${cmdKey} executed.`, 'accent');
                playSound('success');
            }
        }
    } else if (command) {
        addTextCallback(`Unknown command: ${command}`, 'error');
        playSound('error');
    }
}

export function checkIsAdmin() {
    return isAdmin;
}

export function checkIsSuperAdmin() {
    return isSuperAdmin;
}