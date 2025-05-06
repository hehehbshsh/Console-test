import { 
    getRedirects, 
    setRedirects, 
    getNonRedirectCommands, 
    setNonRedirectCommands, 
    getThemes, 
    applyTheme, 
    toggleSound, 
    getCurrentThemeName, 
    isSoundEnabled,
    getAdminAccounts, 
    setAdminAccounts, 
    checkIsAdmin,     
    checkIsSuperAdmin 
} from './commands.js';

let addTextCallback;

export function initAdmin(addText) {
    addTextCallback = addText;
    initAdminEventListeners();
}

function updateAdminAccountList() {
    const adminAccounts = getAdminAccounts();
    const adminAccountList = document.getElementById('admin-account-list');
    adminAccountList.innerHTML = ''; // Clear existing list

    Object.keys(adminAccounts).forEach(username => {
        const accountItem = document.createElement('div');
        accountItem.classList.add('admin-account-item');
        accountItem.innerHTML = `
            <span>${username}</span>
            <span class="delete-admin-account" data-username="${username}" title="Delete Admin Account">❌</span>
        `;

        accountItem.querySelector('.delete-admin-account').addEventListener('click', (e) => {
            const userToDelete = e.target.dataset.username;
            const currentAccounts = getAdminAccounts();
            if (currentAccounts[userToDelete]) {
                delete currentAccounts[userToDelete];
                setAdminAccounts(currentAccounts);
                updateAdminAccountList(); // Refresh the list
                addTextCallback(`Admin account '${userToDelete}' deleted.`, 'warning');
            }
        });

        adminAccountList.appendChild(accountItem);
    });
}

function initAdminEventListeners() {
    const adminModal = document.getElementById('admin-modal');
    const redirectList = document.getElementById('redirect-list');
    const modalKey = document.getElementById('modal-key');
    const modalUrl = document.getElementById('modal-url');
    const modalSave = document.getElementById('modal-save');
    const modalCancel = document.getElementById('modal-cancel');

    const nonRedirectList = document.getElementById('non-redirect-list');
    const nonRedirectKey = document.getElementById('non-redirect-key');
    const nonRedirectDescription = document.getElementById('non-redirect-description');
    const nonRedirectFunction = document.getElementById('non-redirect-function');
    const nonRedirectSave = document.getElementById('non-redirect-save');
    const nonRedirectCancel = document.getElementById('non-redirect-cancel');

    const themeOptionsContainer = document.getElementById('theme-options');
    const soundToggle = document.getElementById('sound-toggle');
    const appearanceCloseBtn = document.getElementById('appearance-close');

    const superAdminPanel = document.getElementById('super-admin-panel');
    const adminAccountList = document.getElementById('admin-account-list');
    const adminUsernameInput = document.getElementById('admin-username');
    const adminPasswordInput = document.getElementById('admin-password');
    const addAdminBtn = document.getElementById('add-admin-btn');
    const superAdminCloseBtn = document.getElementById('super-admin-close');
    const superAdminTab = document.getElementById('super-admin-tab');

    const PROTECTED_COMMANDS = ['h3n13-3', 'ex', 'ex-ui', 'clr', 'logout', 'theme', 'sound', 'su-adm'];

    function updateRedirectList() {
        const redirects = getRedirects();
        redirectList.innerHTML = '';
        Object.entries(redirects).forEach(([key, redirect]) => {
            const redirectItem = document.createElement('div');
            redirectItem.classList.add('redirect-item');
            redirectItem.innerHTML = `
                <span>${key} -> ${redirect.url} ${redirect.hidden ? '(Hidden)' : ''}</span>
                <span class="delete-redirect" title="Delete Redirect">❌</span>
            `;

            redirectItem.querySelector('span:first-child').addEventListener('click', () => {
                modalKey.value = key;
                modalUrl.value = redirect.url;
                document.getElementById('hidden-toggle').checked = redirect.hidden;
            });

            redirectItem.querySelector('.delete-redirect').addEventListener('click', () => {
                const updatedRedirects = {...redirects};
                delete updatedRedirects[key];
                setRedirects(updatedRedirects);
                updateRedirectList();
                addTextCallback(`Deleted redirect: ${key}`, 'warning');
                if (modalKey.value === key) {
                    clearRedirectInputs();
                }
            });

            redirectList.appendChild(redirectItem);
        });
    }

    function updateNonRedirectList() {
        const nonRedirectCommands = getNonRedirectCommands();
        nonRedirectList.innerHTML = '';
        Object.entries(nonRedirectCommands).forEach(([key, cmd]) => {
            if (PROTECTED_COMMANDS.includes(key)) {
                return;
            }
            const cmdItem = document.createElement('div');
            cmdItem.classList.add('non-redirect-item');
            const hasFunction = cmd.functionBody ? '[Func]' : '';
            cmdItem.innerHTML = `
                <span>${key}: ${cmd.description || 'No description'} ${cmd.hidden ? '(Hidden)' : ''} ${hasFunction}</span>
                <span class="delete-non-redirect" title="Delete Command">❌</span>
            `;

            cmdItem.querySelector('span:first-child').addEventListener('click', () => {
                nonRedirectKey.value = key;
                nonRedirectDescription.value = cmd.description || '';
                nonRedirectFunction.value = cmd.functionBody || '';
                document.getElementById('non-redirect-hidden-toggle').checked = cmd.hidden || false;
            });

            cmdItem.querySelector('.delete-non-redirect').addEventListener('click', () => {
                if (PROTECTED_COMMANDS.includes(key)) {
                    addTextCallback(`Cannot delete protected command: ${key}`, 'error');
                    return;
                }
                const updatedCommands = {...nonRedirectCommands};
                delete updatedCommands[key];
                setNonRedirectCommands(updatedCommands);
                updateNonRedirectList();
                addTextCallback(`Deleted non-redirect command: ${key}`, 'warning');
                if (nonRedirectKey.value === key) {
                    clearNonRedirectInputs();
                }
            });

            nonRedirectList.appendChild(cmdItem);
        });
    }

    function updateAppearancePanel() {
        themeOptionsContainer.innerHTML = '';
        const availableThemes = getThemes();
        const currentTheme = getCurrentThemeName();

        Object.entries(availableThemes).forEach(([key, theme]) => {
            const radioId = `theme-${key}`;
            const label = document.createElement('label');
            label.htmlFor = radioId;
            
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.id = radioId;
            radio.name = 'theme-selection';
            radio.value = key;
            radio.checked = key === currentTheme;

            radio.addEventListener('change', () => {
                if (radio.checked) {
                    applyTheme(key); 
                }
            });

            label.appendChild(radio);
            label.appendChild(document.createTextNode(` ${theme.name}`));
            themeOptionsContainer.appendChild(label);
        });

        soundToggle.checked = isSoundEnabled();
    }

    soundToggle.addEventListener('change', () => {
        toggleSound(); 
        soundToggle.checked = isSoundEnabled(); 
    });

    modalSave.addEventListener('click', () => {
        const key = modalKey.value.trim();
        const url = modalUrl.value.trim();
        const isHidden = document.getElementById('hidden-toggle').checked;

        if (!key) {
            addTextCallback('Command key is required.', 'error');
            return;
        }
        if (!url) {
            addTextCallback('URL is required for redirects.', 'error');
            return;
        }
        try {
            new URL(url);
        } catch {
            addTextCallback('Invalid URL format.', 'error');
            return;
        }

        const redirects = getRedirects();
        const updatedRedirects = {...redirects};
        const isUpdating = updatedRedirects.hasOwnProperty(key); 

        updatedRedirects[key] = { url, hidden: isHidden };
        setRedirects(updatedRedirects);
        updateRedirectList();

        if (isUpdating) {
            addTextCallback(`Updated redirect: ${key} -> ${url} ${isHidden ? '(Hidden)' : ''}`, 'success');
        } else {
            addTextCallback(`Added redirect: ${key} -> ${url} ${isHidden ? '(Hidden)' : ''}`, 'success');
        }

        clearRedirectInputs();
    });

    nonRedirectSave.addEventListener('click', () => {
        const key = nonRedirectKey.value.trim();
        const description = nonRedirectDescription.value.trim();
        const functionBody = nonRedirectFunction.value.trim() || null; 
        const isHidden = document.getElementById('non-redirect-hidden-toggle').checked;

        if (!key) {
            addTextCallback('Command key is required.', 'error');
            return;
        }

        if (PROTECTED_COMMANDS.includes(key)) {
            addTextCallback(`Cannot modify protected command: ${key}`, 'error');
            return;
        }

        const nonRedirectCommands = getNonRedirectCommands();
        const updatedCommands = {...nonRedirectCommands};
        const isUpdating = updatedCommands.hasOwnProperty(key); 

        const commandData = {
            description: description || (isUpdating ? updatedCommands[key].description : 'No description'), 
            hidden: isHidden,
            functionBody: functionBody
        };

        if (commandData.functionBody) {
            try {
                new Function('addText', commandData.functionBody);
            } catch (e) {
                addTextCallback(`Invalid function syntax: ${e.message}`, 'error');
                return;
            }
        }

        updatedCommands[key] = commandData;
        setNonRedirectCommands(updatedCommands);
        updateNonRedirectList();

        if (isUpdating) {
            addTextCallback(`Updated non-redirect command: ${key} ${isHidden ? '(Hidden)' : ''}`, 'success');
        } else {
            addTextCallback(`Added non-redirect command: ${key} ${isHidden ? '(Hidden)' : ''}`, 'success');
        }

        clearNonRedirectInputs();
    });

    addAdminBtn.addEventListener('click', () => {
        const username = adminUsernameInput.value.trim();
        const password = adminPasswordInput.value.trim();

        if (!username || !password) {
            addTextCallback('Username and password cannot be empty.', 'error');
            // Optionally play an error sound here if desired
            return;
        }

        // Basic validation (could add more complex rules)
        if (username.includes(' ') || password.includes(' ')) {
            addTextCallback('Username and password cannot contain spaces.', 'error');
            return;
        }
        // Check if user is trying to add the super admin account
        if (username.toLowerCase() === 'admin') {
             addTextCallback('Cannot create an admin account with the reserved username "admin".', 'error');
             return;
        }

        const currentAccounts = getAdminAccounts();

        if (currentAccounts.hasOwnProperty(username)) {
            addTextCallback(`Admin username '${username}' already exists.`, 'error');
            return;
        }

        currentAccounts[username] = password;
        setAdminAccounts(currentAccounts); // Save the updated accounts
        updateAdminAccountList(); // Refresh the list in the UI
        addTextCallback(`Admin account '${username}' created successfully.`, 'success');
        // Optionally play a success sound

        // Clear the input fields
        adminUsernameInput.value = '';
        adminPasswordInput.value = '';
    });

    superAdminCloseBtn.addEventListener('click', () => {
         adminModal.style.display = 'none';
         // Clear inputs when closing
         adminUsernameInput.value = '';
         adminPasswordInput.value = '';
    });

    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const panelId = `${tab.dataset.panel}-panel`;
            
            if (tab.classList.contains('active')) return;

            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPanel = document.getElementById(panelId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            } else {
                console.error("Panel not found for tab:", tab.dataset.panel);
            }

            if (panelId === 'redirect-panel') {
                clearRedirectInputs();
            } else if (panelId === 'non-redirect-panel') {
                clearNonRedirectInputs();
            } else if (panelId === 'super-admin-panel') { // Ensure list updates when switching to super admin tab
                updateAdminAccountList();
                adminUsernameInput.value = ''; // Clear inputs on tab switch too
                adminPasswordInput.value = '';
            }
            
            if (panelId === 'appearance-panel') {
                updateAppearancePanel();
            }

        });
    });

    function clearRedirectInputs() {
        modalKey.value = '';
        modalUrl.value = '';
        document.getElementById('hidden-toggle').checked = false;
    }

    function clearNonRedirectInputs() {
        nonRedirectKey.value = '';
        nonRedirectDescription.value = '';
        nonRedirectFunction.value = '';
        document.getElementById('non-redirect-hidden-toggle').checked = false;
    }

    modalCancel.addEventListener('click', () => {
        adminModal.style.display = 'none';
        clearRedirectInputs();
    });

    nonRedirectCancel.addEventListener('click', () => {
        adminModal.style.display = 'none';
        clearNonRedirectInputs();
    });

    appearanceCloseBtn.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });

    window.updateRedirectList = updateRedirectList;
    window.updateNonRedirectList = updateNonRedirectList;
    window.updateAppearancePanel = updateAppearancePanel;
    window.updateAdminAccountList = updateAdminAccountList; // Make sure this is available
}