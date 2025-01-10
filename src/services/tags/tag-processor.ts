import { NostrEvent, TagType } from '../../types';

export interface TagReference {
    type: TagType;
    targetId: string;
    marker?: string;
    relayHint?: string;
    position?: number;
}

export class TagProcessor {
    processEventTags(event: NostrEvent): TagReference[] {
        const references: TagReference[] = [];
        
        event.tags.forEach((tag, index) => {
            const [type, ...params] = tag;
            
            switch (type) {
                case 'e': {
                    const [targetId, relayHint, marker] = params;
                    if (targetId) {
                        // Default to REPLY type unless explicitly marked as root
                        const refType = marker === 'root' ? TagType.ROOT : TagType.REPLY;
                        references.push({
                            type: refType,
                            targetId,
                            marker,
                            relayHint,
                            position: index
                        });
                    }
                    break;
                }
                case 'p': {
                    const [targetId, relayHint] = params;
                    if (targetId) {
                        references.push({
                            type: TagType.MENTION,
                            targetId,
                            relayHint,
                            position: index
                        });
                    }
                    break;
                }
                case 't': {
                    const [topic] = params;
                    if (topic) {
                        references.push({
                            type: TagType.TOPIC,
                            targetId: topic.toLowerCase(),
                            position: index
                        });
                    }
                    break;
                }
            }
        });

        return references.sort((a, b) => 
            (a.position || 0) - (b.position || 0)
        );
    }

    isReply(event: NostrEvent): boolean {
        return event.tags.some(tag => 
            tag[0] === 'e' && tag[2] !== 'root'
        );
    }

    getThreadContext(references: TagReference[]): {
        root?: string;
        reply?: string;
        mentions: string[];
    } {
        const mentions: string[] = [];
        let root: string | undefined;
        let reply: string | undefined;

        for (const ref of references) {
            if (ref.type === TagType.ROOT) {
                root = ref.targetId;
            } else if (ref.type === TagType.REPLY) {
                reply = ref.targetId;
            } else if (ref.type === TagType.MENTION) {
                mentions.push(ref.targetId);
            }
        }

        return { root, reply, mentions };
    }

    formatReferenceSection(references: TagReference[]): string {
        const sections: string[] = [];
        const context = this.getThreadContext(references);

        if (context.root) {
            sections.push(`Root: [[${context.root}]]`);
        }
        if (context.reply) {
            sections.push(`Reply to: [[${context.reply}]]`);
        }
        if (context.mentions.length > 0) {
            sections.push('Mentions:');
            context.mentions.forEach(mention => {
                sections.push(`- [[${mention}]]`);
            });
        }

        return sections.join('\n');
    }
}
