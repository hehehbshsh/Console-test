import { processCommand, initCommands } from './commands.js';
import { initAdmin } from './admin.js';

export function initTerminal() {
    const commandInput = document.getElementById('command-input');
    const consoleElement = document.getElementById('console');
    const executeBtn = document.getElementById('execute-btn');

    function addText(text, className = '') {
        const p = document.createElement('p');
        // Use innerHTML to render the ASCII art correctly
        if (text.includes('<br>')) {
            p.innerHTML = text;
        } else {
            p.textContent = text;
        }
        consoleElement.insertBefore(p, document.getElementById('input-line'));
        if (className) {
            p.className = className;
        }
        // Scroll logic slightly improved
        // Use requestAnimationFrame for smoother scrolling, especially during rapid output
        requestAnimationFrame(() => {
             consoleElement.scrollTop = consoleElement.scrollHeight;
        });
    }

    // Initialize commands (this will now also load the theme)
    initCommands(addText);
    initAdmin(addText); // Keep this for admin UI interactions

    executeBtn.addEventListener('click', () => {
        const command = commandInput.value.trim();
        if (command) { // Only process if there is a command
             addText(`> ${command}`);
             processCommand(command); // processCommand will handle sound effects
             commandInput.value = '';
        }
        commandInput.focus(); // Always refocus
    });

    commandInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission/newline
            const command = commandInput.value.trim();
             if (command) { // Only process if there is a command
                 addText(`> ${command}`);
                 processCommand(command); // processCommand will handle sound effects
                 commandInput.value = '';
             }
        }
    });
}