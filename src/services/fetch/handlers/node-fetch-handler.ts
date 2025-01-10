import { App, TFile } from 'obsidian';
import { NostrEvent, TagType } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';
import { TagProcessor } from '../../processors/tag-processor';
import { ReferenceStore } from '../../../services/references/reference-store';
import { EventHandler, NodeFetchEvent } from '../../../experimental/event-bus/types';
import { UnifiedFetchProcessor } from '../unified-fetch-processor';
import { FetchSettings } from '../../../views/modals/types';

export class NodeFetchHandler extends BaseEventHandler implements EventHandler<NodeFetchEvent> {
    private tagProcessor: TagProcessor;
    public priority: number = ProcessingPriority.NOTE;

    constructor(
        eventService: EventService,
        private referenceStore: ReferenceStore,
        private unifiedFetchProcessor: UnifiedFetchProcessor,
        private app: App,
        private fetchSettings: FetchSettings
    ) {
        super(eventService, EventKinds.NOTE, ProcessingPriority.NOTE);
        this.tagProcessor = new TagProcessor();
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;
        
        const tagResults = this.tagProcessor.process(event);
        const references = [
            ...tagResults.references.map(id => ({ targetId: id, type: TagType.MENTION })),
            ...(tagResults.root ? [{ targetId: tagResults.root, type: TagType.ROOT }] : []),
            ...(tagResults.replyTo ? [{ targetId: tagResults.replyTo, type: TagType.REPLY }] : [])
        ];
        this.referenceStore.addReferences(event.id, references);
        
        const outgoingRefs = this.referenceStore.getOutgoingReferences(event.id);
        const incomingRefs = this.referenceStore.getIncomingReferences(event.id);
        
        await this.eventService.emitNote(event, {
            references: outgoingRefs,
            referencedBy: incomingRefs
        });
    }

    async handle(event: NodeFetchEvent): Promise<void> {
        console.log(`Processing node-based fetch for: ${event.nodeId}`);
        
        const file = this.app.vault.getAbstractFileByPath(event.nodeId);
        if (!file || !(file instanceof TFile)) {
            console.log('File not found or invalid');
            return;
        }

        const metadata = await this.app.metadataCache.getFileCache(file) || {};
        const isProfile = this.isProfileNote(metadata);

        const defaultBatchSize = 50;
        const defaultThreadLimit = 50;

        if (isProfile) {
            const pubkey = this.extractPubkey(metadata);
            if (pubkey) {
                console.log(`Processing as profile with pubkey: ${pubkey}`);
                await this.unifiedFetchProcessor.fetchWithOptions({
                    kinds: [EventKinds.NOTE],
                    limit: this.fetchSettings.hexFetch?.batchSize || defaultBatchSize,
                    author: pubkey
                });
            }
        } else {
            const eventId = this.extractEventId(metadata);
            if (eventId) {
                console.log(`Processing as note with event ID: ${eventId}`);
                await this.unifiedFetchProcessor.fetchThreadContext(
                    eventId,
                    this.fetchSettings.threadSettings?.limit || defaultThreadLimit
                );

                if (this.fetchSettings.threadSettings?.includeContext) {
                    const profileRefs = this.extractProfileRefs(metadata);
                    for (const pubkey of profileRefs) {
                        await this.unifiedFetchProcessor.fetchWithOptions({
                            kinds: [EventKinds.NOTE],
                            limit: this.fetchSettings.hexFetch?.batchSize || defaultBatchSize,
                            author: pubkey
                        });
                    }
                }
            }
        }
    }

    private isProfileNote(metadata: Record<string, any>): boolean {
        const frontmatter = metadata.frontmatter || {};
        return frontmatter.type === 'profile' || frontmatter.kind === 0;
    }

    private extractPubkey(metadata: Record<string, any>): string | null {
        const frontmatter = metadata.frontmatter || {};
        return frontmatter.pubkey || null;
    }

    private extractEventId(metadata: Record<string, any>): string | null {
        const frontmatter = metadata.frontmatter || {};
        return frontmatter.id || null;
    }

    private extractProfileRefs(metadata: Record<string, any>): string[] {
        const frontmatter = metadata.frontmatter || {};
        const tags = frontmatter.tags || [];
        return tags
            .filter((tag: any[]) => Array.isArray(tag) && tag[0] === 'p')
            .map((tag: any[]) => tag[1]);
    }
}
