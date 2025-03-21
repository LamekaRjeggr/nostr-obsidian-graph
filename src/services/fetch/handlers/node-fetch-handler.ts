import { App, TFile } from 'obsidian';
import { NostrEvent, TagType, NostrSettings } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { KeyService } from '../../../services/core/key-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';
import { TagProcessor } from '../../processors/tag-processor';
import { ReferenceProcessor } from '../../../services/processors/reference-processor';
import { EventHandler, NodeFetchEvent } from '../../../experimental/event-bus/types';
import { UnifiedFetchProcessor } from '../unified-fetch-processor';

export class NodeFetchHandler extends BaseEventHandler implements EventHandler<NodeFetchEvent> {
    private tagProcessor: TagProcessor;
    public priority: number = ProcessingPriority.NOTE;

    constructor(
        eventService: EventService,
        private referenceProcessor: ReferenceProcessor,
        private unifiedFetchProcessor: UnifiedFetchProcessor,
        private app: App,
        private settings: NostrSettings
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
        references.forEach(ref => {
            this.referenceProcessor.addReference(event.id, ref.targetId);
        });
        
        const outgoingRefs = this.referenceProcessor.getOutgoingReferences(event.id);
        const incomingRefs = this.referenceProcessor.getIncomingReferences(event.id);
        
        await this.eventService.emitNote(event, {
            references: outgoingRefs.map(ref => ({ targetId: ref, type: TagType.MENTION })),
            referencedBy: incomingRefs.map(ref => ({ targetId: ref, type: TagType.MENTION }))
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
                await this.unifiedFetchProcessor.fetchThreadContext(
                    pubkey,
                    this.settings.hexFetch?.batchSize || defaultBatchSize,
                    0 // kind 0 for profiles
                );
            }
        } else {
            const eventId = this.extractEventId(metadata);
            if (eventId) {
                console.log(`Processing as note with event ID: ${eventId}`);
                await this.unifiedFetchProcessor.fetchThreadContext(
                    eventId,
                    this.settings.threadSettings?.limit || defaultThreadLimit,
                    1 // kind 1 for notes
                );

                if (this.settings.threadSettings?.includeContext) {
                    const profileRefs = this.extractProfileRefs(metadata);
                    for (const pubkey of profileRefs) {
                        await this.unifiedFetchProcessor.fetchThreadContext(
                            pubkey,
                            this.settings.hexFetch?.batchSize || defaultBatchSize,
                            0 // kind 0 for profiles
                        );
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
        const pubkey = frontmatter.aliases?.[0];
        
        // Validate hex format using KeyService
        if (pubkey && KeyService.validateHex(pubkey)) {
            return pubkey;
        }
        return null;
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
