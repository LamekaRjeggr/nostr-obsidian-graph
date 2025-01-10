import { Notice, Setting } from 'obsidian';
import { ValidationService } from '../../../services/validation-service';
import { ModalSection, ModalSectionProps, FetchSettings } from '../types';
import { NostrEventBus } from '../../../experimental/event-bus/event-bus';
import { NostrEventType } from '../../../experimental/event-bus/types';
import { CurrentFileService } from '../../../services/core/current-file-service';
import { KeyService } from '../../../services/core/key-service';

export class HexFetchSection implements ModalSection {
    private hexKey: string = '';
    private settings: FetchSettings;
    private props: ModalSectionProps;
    private currentFileService: CurrentFileService;

    constructor(settings: FetchSettings, props: ModalSectionProps) {
        this.settings = settings;
        this.props = props;
        this.currentFileService = new CurrentFileService(props.app);

        // Auto-populate hex key from current file
        const currentPubkey = this.currentFileService.getCurrentFilePubkey();
        if (currentPubkey) {
            this.hexKey = currentPubkey;
        }
    }

    createSection(container: HTMLElement): HTMLElement {
        const section = container.createDiv();

        new Setting(section)
            .setName('Hex Key')
            .setDesc('Enter hex key to fetch notes from specific author')
            .addText(text => {
                text.setValue(this.hexKey)
                    .setPlaceholder('Enter hex key...')
                    .onChange(value => {
                        this.hexKey = value;
                    });
            });

        new Setting(section)
            .setName('Hex Fetch Batch Size')
            .setDesc('Number of notes to fetch per hex request (1-500)')
            .addSlider(slider => slider
                .setLimits(1, 500, 1)
                .setValue(this.settings.hexFetch?.batchSize || 100)
                .setDynamicTooltip()
                .onChange(async value => {
                    // Initialize hexFetch if it doesn't exist
                    if (!this.settings.hexFetch) {
                        this.settings.hexFetch = { batchSize: value };
                    } else {
                        this.settings.hexFetch.batchSize = value;
                    }
                    await this.props.onSettingsChange?.(this.settings);
                }));

        const fetchButton = section.createEl('button', {
            text: 'Fetch by Hex',
            cls: 'mod-cta'
        });
        fetchButton.style.width = '100%';
        fetchButton.style.marginTop = '20px';
        fetchButton.onclick = () => {
            if (!this.hexKey) {
                new Notice('Please enter a hex key');
                return;
            }

            let hexToUse = this.hexKey;
            if (this.hexKey.startsWith('npub1')) {
                const converted = KeyService.npubToHex(this.hexKey);
                if (!converted) {
                    new Notice('Invalid npub format');
                    return;
                }
                hexToUse = converted;
            }

            if (!ValidationService.validateHex(hexToUse)) {
                new Notice('Invalid hex key format');
                return;
            }

            NostrEventBus.getInstance().publish(
                NostrEventType.HEX_FETCH,
                {
                    hexKey: hexToUse,
                    limit: this.settings.hexFetch?.batchSize || 100
                }
            );
            this.props.closeModal?.();
        };

        return section;
    }
}
