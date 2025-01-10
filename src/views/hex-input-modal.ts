import { App, Modal, Notice } from 'obsidian';

export class HexInputModal extends Modal {
    private readonly onSubmit: (hex: string) => void;
    private initialValue: string;

    constructor(app: App, onSubmit: (hex: string) => void, initialValue?: string) {
        super(app);
        this.onSubmit = onSubmit;
        this.initialValue = initialValue || '';
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
            placeholder: 'Enter hex key...',
            value: this.initialValue
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
        
        // Focus input and move cursor to end
        inputEl.focus();
        if (this.initialValue) {
            inputEl.setSelectionRange(this.initialValue.length, this.initialValue.length);
        }
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}
