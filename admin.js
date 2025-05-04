import { getRedirects, setRedirects, getNonRedirectCommands, setNonRedirectCommands } from './commands.js';

let addTextCallback;

export function initAdmin(addText) {
    addTextCallback = addText;
    initAdminEventListeners();
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

    // --- Built-in commands that should not be deletable/editable via UI ---
    const PROTECTED_COMMANDS = ['h3n13-3', 'ex', 'ex-ui', 'clr', 'logout'];

    // Redirect management event listeners
    function updateRedirectList() {
        const redirects = getRedirects();
        redirectList.innerHTML = '';
        Object.entries(redirects).forEach(([key, redirect]) => {
            const redirectItem = document.createElement('div');
            redirectItem.classList.add('redirect-item');
            redirectItem.innerHTML = `
                <span>${key} -> ${redirect.url} ${redirect.hidden ? '(Hidden)' : ''}</span>
                <span class="delete-redirect">❌</span>
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
                 // Clear inputs if deleting the one being edited
                if (modalKey.value === key) {
                    modalKey.value = '';
                    modalUrl.value = '';
                    document.getElementById('hidden-toggle').checked = false;
                }
            });

            redirectList.appendChild(redirectItem);
        });
    }

    // Non-redirect management event listeners
    function updateNonRedirectList() {
        const nonRedirectCommands = getNonRedirectCommands();
        nonRedirectList.innerHTML = '';
        Object.entries(nonRedirectCommands).forEach(([key, cmd]) => {
            // Skip protected built-in commands from appearing in the editable list
            if (PROTECTED_COMMANDS.includes(key)) {
                return;
            }
            const cmdItem = document.createElement('div');
            cmdItem.classList.add('non-redirect-item');
            const hasFunction = cmd.functionBody ? '[Func]' : '';
            cmdItem.innerHTML = `
                <span>${key}: ${cmd.description || 'No description'} ${cmd.hidden ? '(Hidden)' : ''} ${hasFunction}</span>
                <span class="delete-non-redirect">❌</span>
            `;

            cmdItem.querySelector('span:first-child').addEventListener('click', () => {
                // Prevent editing protected commands even if somehow clicked (shouldn't happen now)
                if (PROTECTED_COMMANDS.includes(key)) return;
                nonRedirectKey.value = key;
                nonRedirectDescription.value = cmd.description || '';
                nonRedirectFunction.value = cmd.functionBody || '';
                document.getElementById('non-redirect-hidden-toggle').checked = cmd.hidden || false;
            });

            cmdItem.querySelector('.delete-non-redirect').addEventListener('click', () => {
                 // Prevent deleting protected commands
                if (PROTECTED_COMMANDS.includes(key)) {
                     addTextCallback(`Cannot delete protected command: ${key}`, 'error');
                     return;
                }
                const updatedCommands = {...nonRedirectCommands};
                delete updatedCommands[key];
                setNonRedirectCommands(updatedCommands);
                updateNonRedirectList();
                addTextCallback(`Deleted non-redirect command: ${key}`, 'warning');
                // Clear inputs if deleting the one being edited
                if (nonRedirectKey.value === key) {
                    nonRedirectKey.value = '';
                    nonRedirectDescription.value = '';
                    nonRedirectFunction.value = '';
                    document.getElementById('non-redirect-hidden-toggle').checked = false;
                }
            });

            nonRedirectList.appendChild(cmdItem);
        });
    }

    // Save redirect logic
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
         // Basic URL validation
        try {
             new URL(url);
        } catch {
            addTextCallback('Invalid URL format.', 'error');
            return;
        }

        const redirects = getRedirects();
        const updatedRedirects = {...redirects};
        const isUpdating = updatedRedirects.hasOwnProperty(key); // Check if key exists

        updatedRedirects[key] = { url, hidden: isHidden };
        setRedirects(updatedRedirects);
        updateRedirectList();

        if (isUpdating) {
             addTextCallback(`Updated redirect: ${key} -> ${url} ${isHidden ? '(Hidden)' : ''}`, 'success');
        } else {
             addTextCallback(`Added redirect: ${key} -> ${url} ${isHidden ? '(Hidden)' : ''}`, 'success');
        }

        modalKey.value = '';
        modalUrl.value = '';
        document.getElementById('hidden-toggle').checked = false;

    });

    // Save non-redirect logic
    nonRedirectSave.addEventListener('click', () => {
        const key = nonRedirectKey.value.trim();
        const description = nonRedirectDescription.value.trim();
        const functionBody = nonRedirectFunction.value.trim() || null; // Store null if empty
        const isHidden = document.getElementById('non-redirect-hidden-toggle').checked;

        if (!key) {
             addTextCallback('Command key is required.', 'error');
             return;
        }

        // Prevent editing/creating protected command keys via UI
        if (PROTECTED_COMMANDS.includes(key)) {
            addTextCallback(`Cannot modify protected command: ${key}`, 'error');
            return;
        }

        const nonRedirectCommands = getNonRedirectCommands();
        const updatedCommands = {...nonRedirectCommands};
        const isUpdating = updatedCommands.hasOwnProperty(key); // Check if key exists


        const commandData = {
            description: description || (isUpdating ? updatedCommands[key].description : 'No description'), // Keep old desc if updating and new is empty
            hidden: isHidden,
            functionBody: functionBody
        };

        // Basic validation for function body (check for syntax errors)
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

        nonRedirectKey.value = '';
        nonRedirectDescription.value = '';
        nonRedirectFunction.value = '';
        document.getElementById('non-redirect-hidden-toggle').checked = false;

    });

    // Admin modal tab switching
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and panels
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

            // Add active class to clicked tab and corresponding panel
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.panel}-panel`).classList.add('active');

             // Clear input fields when switching tabs
            modalKey.value = '';
            modalUrl.value = '';
            document.getElementById('hidden-toggle').checked = false;
            nonRedirectKey.value = '';
            nonRedirectDescription.value = '';
            nonRedirectFunction.value = '';
            document.getElementById('non-redirect-hidden-toggle').checked = false;

        });
    });

     // Function to clear redirect inputs
    function clearRedirectInputs() {
        modalKey.value = '';
        modalUrl.value = '';
        document.getElementById('hidden-toggle').checked = false;
    }

    // Function to clear non-redirect inputs
    function clearNonRedirectInputs() {
        nonRedirectKey.value = '';
        nonRedirectDescription.value = '';
        nonRedirectFunction.value = '';
        document.getElementById('non-redirect-hidden-toggle').checked = false;
    }


    // Modal cancel buttons
    modalCancel.addEventListener('click', () => {
        adminModal.style.display = 'none';
        clearRedirectInputs(); // Clear fields on cancel
    });

    nonRedirectCancel.addEventListener('click', () => {
        adminModal.style.display = 'none';
        clearNonRedirectInputs(); // Clear fields on cancel
    });

    // Expose update functions to be called when modal is opened
    window.updateRedirectList = updateRedirectList;
    window.updateNonRedirectList = updateNonRedirectList;
}