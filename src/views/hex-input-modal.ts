import { App, Modal, Notice } from 'obsidian';

export class HexInputModal extends Modal {
    private readonly onSubmit: (hex: string) => void;

    constructor(app: App, onSubmit: (hex: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;
        
        // Clear previous content
        contentEl.empty();
        
        // Add title
        contentEl.createEl('h2', {text: 'Enter Nostr Hex Key'});
        
        // Add input field
        const inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Enter hex key...'
        });
        inputEl.style.width = '100%';
        inputEl.style.marginBottom = '10px';
        
        // Add fetch button
        const buttonEl = contentEl.createEl('button', {
            text: 'Fetch Notes'
        });
        buttonEl.style.width = '100%';
        
        // Handle button click
        buttonEl.onclick = async () => {
            const hex = inputEl.value.trim();
            
            if (!/^[0-9a-f]{64}$/i.test(hex)) {
                new Notice('Invalid hex format - must be 64 characters (0-9, a-f)');
                return;
            }
            
            new Notice('Fetching notes...');
            this.close();
            this.onSubmit(hex);
        };
        
        // Focus input
        inputEl.focus();
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
