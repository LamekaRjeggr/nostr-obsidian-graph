import { App, Modal, Setting, Notice } from 'obsidian';
import { NostrEvent, IVaultService } from '../interfaces';

export class SearchModal extends Modal {
    private keyword: string = '';
    private searching: boolean = false;
    
    constructor(
        app: App,
        private vaultService: IVaultService,
        private onSearch: (keyword: string) => Promise<NostrEvent[]>
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Search Nostr' });

        new Setting(contentEl)
            .setName('Keyword')
            .setDesc('Enter search term')
            .addText(text => text
                .setPlaceholder('Enter keyword...')
                .setValue(this.keyword)
                .onChange(value => this.keyword = value));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Search')
                .setCta()
                .onClick(async () => {
                    if (!this.keyword || this.searching) return;
                    
                    this.searching = true;
                    btn.setButtonText('Searching...');
                    
                    try {
                        const results = await this.onSearch(this.keyword);
                        for (const note of results) {
                            await this.vaultService.saveEvent(note);
                        }
                        this.close();
                        new Notice(`Found ${results.length} notes`);
                    } catch (error) {
                        new Notice('Search failed: ' + error.message);
                    } finally {
                        this.searching = false;
                        btn.setButtonText('Search');
                    }
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
