import { App, Modal, Setting, ButtonComponent, Notice, SliderComponent } from 'obsidian';
import { FileService } from '../../services/core/file-service';
import { CurrentFileService } from '../../services/core/current-file-service';
import { UnifiedFetchProcessor } from '../../services/fetch/unified-fetch-processor';
import { ValidationService } from '../../services/validation-service';
import { EventKinds } from '../../services/core/base-event-handler';
import { NostrEventBus } from '../../experimental/event-bus/event-bus';
import { NostrEventType } from '../../experimental/event-bus/types';

interface HexFetchModalSettings {
    hexKey: string;
    limit: number;
}

export class HexFetchModal extends Modal {
    private settings: HexFetchModalSettings = {
        hexKey: '',
        limit: 50
    };
    private fetchButton: ButtonComponent;

    constructor(
        app: App,
        private fetchProcessor: UnifiedFetchProcessor,
        private fileService: FileService,
        private currentFileService: CurrentFileService
    ) {
        super(app);
    }

    private async initializeFromCurrentFile() {
        const currentFile = this.app.workspace.getActiveFile();
        if (currentFile) {
            try {
                const metadata = await this.fileService.getNostrMetadata(currentFile.path);
                if (metadata?.pubkey) {
                    // Remove [[ and ]] from pubkey if present
                    const cleanPubkey = metadata.pubkey.replace(/[\[\]]/g, '');
                    this.settings.hexKey = cleanPubkey;
                }
            } catch (error) {
                console.error('Error getting note metadata:', error);
            }
        }
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        await this.initializeFromCurrentFile();
        contentEl.style.padding = '20px';
        contentEl.style.width = '400px';

        // Title
        const title = contentEl.createEl('h2', { text: 'Fetch Notes by Hex Key' });
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';

        // Hex Key Input
        new Setting(contentEl)
            .setName('Hex Key')
            .setDesc('Enter the hex key to fetch notes for')
            .addText(text => text
                .setPlaceholder('Enter hex key...')
                .setValue(this.settings.hexKey)
                .onChange(value => {
                    this.settings.hexKey = value;
                    // Update button state based on hex key validity
                    if (this.fetchButton) {
                        this.fetchButton.setDisabled(!ValidationService.validateHex(value));
                    }
                }));

        // Note Limit Slider
        const limitContainer = contentEl.createDiv();
        limitContainer.style.marginTop = '20px';
        limitContainer.style.marginBottom = '20px';

        const limitLabel = limitContainer.createDiv();
        limitLabel.style.marginBottom = '10px';
        limitLabel.textContent = `Number of Notes: ${this.settings.limit}`;

        const slider = new SliderComponent(limitContainer)
            .setLimits(1, 200, 1)
            .setValue(this.settings.limit)
            .onChange(value => {
                this.settings.limit = value;
                limitLabel.textContent = `Number of Notes: ${value}`;
            });

        slider.sliderEl.style.width = '100%';

        // Fetch Button
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.marginTop = '20px';

        this.fetchButton = new ButtonComponent(buttonContainer)
            .setButtonText('Fetch Notes')
            .setDisabled(!ValidationService.validateHex(this.settings.hexKey))
            .onClick(async () => {
                if (!ValidationService.validateHex(this.settings.hexKey)) {
                    new Notice('Invalid hex key format');
                    return;
                }

                try {
                    this.fetchButton.setDisabled(true);
                    this.fetchButton.setButtonText('Fetching...');

                    // Publish hex fetch event
                    await NostrEventBus.getInstance().publish(NostrEventType.HEX_FETCH, {
                        hexKey: this.settings.hexKey,
                        limit: this.settings.limit
                    });

                    new Notice(`Successfully fetched notes for hex key`);
                    this.close();
                } catch (error) {
                    console.error('Error fetching notes:', error);
                    new Notice(`Error fetching notes: ${error.message}`);
                    this.fetchButton.setDisabled(false);
                    this.fetchButton.setButtonText('Fetch Notes');
                }
            });

        // Style the button
        const buttonEl = this.fetchButton.buttonEl;
        buttonEl.style.backgroundColor = 'var(--interactive-accent)';
        buttonEl.style.color = 'var(--text-on-accent)';
        buttonEl.style.padding = '8px 16px';
        buttonEl.style.borderRadius = '4px';
        buttonEl.style.cursor = 'pointer';
        buttonEl.style.border = 'none';
        buttonEl.style.width = '150px';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
