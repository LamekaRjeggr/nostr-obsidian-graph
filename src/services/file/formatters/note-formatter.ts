import { NoteFile, TagReference, TagType, GroupedReferences } from '../../../types';
import { ContentProcessor } from '../utils/text-processor';
import { YAMLProcessor } from '../utils/yaml-processor';

export interface LinkResolver {
    getTitleById(id: string): Promise<string | null>;
}


export interface ChronologicalMetadata {
    previousNote?: string;
    nextNote?: string;
}

export interface NoteFrontmatter {
    id: string;
    pubkey: string;
    author?: string;
    created: number;
    kind: number;
    nostr_tags: any[];    // Store raw nostr tags as array
    tags: string[];       // Store both inline hashtags and processed topic tags
    root?: string;
    reply_to?: string;
    mentions?: string[];
    topics?: string[];
    [key: string]: any;   // Allow additional fields
}

export class NoteFormatter {
    constructor(private linkResolver: LinkResolver) {}

    async formatNote(note: NoteFile, backlinks: string[], existingContent?: string): Promise<string> {
        // Parse existing content if provided
        const parsed = existingContent ? 
            YAMLProcessor.parse(existingContent) : 
            { frontmatter: {}, content: '' };

        // Generate required frontmatter
        const requiredFrontmatter = await this.generateRequiredFrontmatter(note);

        // Merge with existing frontmatter, preserving user-added fields
        const mergedFrontmatter = YAMLProcessor.mergeYAML(parsed.frontmatter, requiredFrontmatter);

        // Format the complete note
        const sections = [
            `# ${note.title}`,
            YAMLProcessor.stringify(mergedFrontmatter),
            ContentProcessor.cleanContent(note.content)
        ];

        // Add chronological links if they exist
        if (note.previousNote || note.nextNote) {
            sections.push(await this.formatChronologicalLinks(note));
        }

        // Add reference sections if they exist
        const references = note.references || [];
        if (references.length > 0) {
            sections.push(await this.formatReferences(references));
        }

        // Add backlinks section if they exist
        const referencedBy = note.referencedBy || [];
        if (referencedBy.length > 0) {
            sections.push(await this.formatBacklinks(referencedBy));
        }

        return sections.join('\n\n');
    }

    public async generateRequiredFrontmatter(note: NoteFile): Promise<NoteFrontmatter> {
        const frontmatter: NoteFrontmatter = {
            id: note.id,
            pubkey: `[[${note.pubkey}]]`,
            created: note.created_at,
            kind: note.kind,
            nostr_tags: note.tags,  // Store raw nostr tags as array
            tags: []  // Initialize tags array
        };

        if (note.authorName) {
            frontmatter.author = `[[${note.authorName}]]`;
        }

        // Process nostr topic tags
        const nostrTopics: Set<string> = new Set();
        note.tags.forEach((tag: string[]) => {
            const [type, value] = tag;
            if (type === 't' && value) {
                nostrTopics.add(value.toLowerCase());
            }
        });

        // Extract inline hashtags from content
        const inlineHashtags = ContentProcessor.extractHashtags(note.content);

        // Combine both types of tags, ensuring uniqueness
        const allTags = new Set([...nostrTopics, ...inlineHashtags]);
        frontmatter.tags = Array.from(allTags);

        // Add tag types to frontmatter
        const references = note.references || [];
        if (references.length > 0) {
            const grouped = this.groupReferencesByType(references);
            
            if (grouped[TagType.ROOT]?.length && grouped[TagType.ROOT][0].targetId) {
                const rootId = grouped[TagType.ROOT][0].targetId;
                const rootTitle = await this.linkResolver.getTitleById(rootId);
                frontmatter.root = `[[${rootTitle || rootId}]]`;
            }
            
            if (grouped[TagType.REPLY]?.length && grouped[TagType.REPLY][0].targetId) {
                const replyId = grouped[TagType.REPLY][0].targetId;
                const replyTitle = await this.linkResolver.getTitleById(replyId);
                frontmatter.reply_to = `[[${replyTitle || replyId}]]`;
            }

            if (grouped[TagType.MENTION]?.length) {
                frontmatter.mentions = grouped[TagType.MENTION]
                    .map((ref: TagReference) => ref.targetId)
                    .filter((id: string | undefined): id is string => id !== undefined);
            }

            if (grouped[TagType.TOPIC]?.length) {
                frontmatter.topics = grouped[TagType.TOPIC]
                    .map((ref: TagReference) => ref.targetId)
                    .filter((id: string | undefined): id is string => id !== undefined);
            }
        }

        return frontmatter;
    }

    public async formatChronologicalLinks(note: NoteFile | ChronologicalMetadata): Promise<string> {
        const links = ['\n## Chronological Links'];
        
        if (note.previousNote) {
            const prevTitle = await this.linkResolver.getTitleById(note.previousNote);
            links.push(`Previous: [[${prevTitle || note.previousNote}]]`);
        }
        
        if (note.nextNote) {
            const nextTitle = await this.linkResolver.getTitleById(note.nextNote);
            links.push(`Next: [[${nextTitle || note.nextNote}]]`);
        }
        
        return links.join('\n');
    }

    public async formatReferences(references: TagReference[]): Promise<string> {
        const sections: string[] = ['\n## References'];
        
        // Group references by type
        const grouped = this.groupReferencesByType(references);

        // Add root reference if exists
        if (grouped[TagType.ROOT]?.length) {
            sections.push('### Thread Root');
            for (const ref of grouped[TagType.ROOT]) {
                if (ref.targetId) {
                    const title = await this.linkResolver.getTitleById(ref.targetId);
                    sections.push(`- [[${title || ref.targetId}]]`);
                }
            }
        }

        // Add reply references
        if (grouped[TagType.REPLY]?.length) {
            sections.push('### Replying To');
            for (const ref of grouped[TagType.REPLY]) {
                if (ref.targetId) {
                    const title = await this.linkResolver.getTitleById(ref.targetId);
                    sections.push(`- [[${title || ref.targetId}]]`);
                }
            }
        }

        // Add mentions
        if (grouped[TagType.MENTION]?.length) {
            sections.push('### Mentions');
            for (const ref of grouped[TagType.MENTION]) {
                if (ref.targetId) {
                    const title = await this.linkResolver.getTitleById(ref.targetId);
                    sections.push(`- [[${title || ref.targetId}]]`);
                }
            }
        }

        // Add topics
        if (grouped[TagType.TOPIC]?.length) {
            sections.push('### Topics');
            for (const ref of grouped[TagType.TOPIC]) {
                if (ref.targetId) {
                    sections.push(`- #${ref.targetId}`);
                }
            }
        }

        return sections.join('\n');
    }

    public async formatBacklinks(references: TagReference[]): Promise<string> {
        const sections: string[] = ['\n## Referenced By'];
        
        // Group backlinks by type
        const grouped = this.groupReferencesByType(references);

        // Add replies to this note
        if (grouped[TagType.REPLY]?.length) {
            sections.push('### Replies');
            for (const ref of grouped[TagType.REPLY]) {
                if (ref.targetId) {
                    const title = await this.linkResolver.getTitleById(ref.targetId);
                    sections.push(`- [[${title || ref.targetId}]]`);
                }
            }
        }

        // Add mentions of this note
        if (grouped[TagType.MENTION]?.length) {
            sections.push('### Mentioned In');
            for (const ref of grouped[TagType.MENTION]) {
                if (ref.targetId) {
                    const title = await this.linkResolver.getTitleById(ref.targetId);
                    sections.push(`- [[${title || ref.targetId}]]`);
                }
            }
        }

        return sections.join('\n');
    }

    public groupReferencesByType(references: TagReference[]): GroupedReferences {
        return references.reduce((groups: GroupedReferences, ref) => {
            const type = ref.type;
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type]!.push(ref);
            return groups;
        }, {});
    }
}
