import { NoteFile, TagReference, TagType } from '../../../types';
import { TextProcessor } from '../utils/text-processor';

export interface LinkResolver {
    getTitleById(id: string): Promise<string | null>;
}

interface GroupedReferences {
    [TagType.MENTION]?: TagReference[];
    [TagType.REPLY]?: TagReference[];
    [TagType.ROOT]?: TagReference[];
    [TagType.TOPIC]?: TagReference[];
}

export class NoteFormatter {
    constructor(private linkResolver: LinkResolver) {}

    async formatNote(note: NoteFile, backlinks: string[]): Promise<string> {
        const sections = [
            await this.formatHeader(note),
            TextProcessor.cleanContent(note.content)
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

    private async formatHeader(note: NoteFile): Promise<string> {
        const header = [
            `# ${note.title}`,
            '---',
            `id: ${note.id}`,
            `pubkey: [[${note.pubkey}]]`,  // Links via alias
            note.authorName ? `author: [[${note.authorName}]]` : '',  // Links to profile file
            `created: ${note.created_at}`,
            `kind: ${note.kind}`,
            `tags: ${JSON.stringify(note.tags)}`
        ];

        // Add tag types to frontmatter
        const references = note.references || [];
        if (references.length > 0) {
            const grouped = this.groupReferencesByType(references);
            
            if (grouped[TagType.ROOT]?.length) {
                const rootId = grouped[TagType.ROOT][0].targetId;
                const rootTitle = await this.linkResolver.getTitleById(rootId);
                header.push(`root: [[${rootTitle || rootId}]]`);
            }
            
            if (grouped[TagType.REPLY]?.length) {
                const replyId = grouped[TagType.REPLY][0].targetId;
                const replyTitle = await this.linkResolver.getTitleById(replyId);
                header.push(`reply_to: [[${replyTitle || replyId}]]`);
            }

            if (grouped[TagType.MENTION]?.length) {
                const mentions = grouped[TagType.MENTION].map(ref => ref.targetId);
                header.push(`mentions: [${mentions.join(', ')}]`);
            }

            if (grouped[TagType.TOPIC]?.length) {
                const topics = grouped[TagType.TOPIC].map(ref => ref.targetId);
                header.push(`topics: [${topics.join(', ')}]`);
            }
        }

        header.push('---', '');
        return header.filter(line => line !== '').join('\n');
    }

    private async formatChronologicalLinks(note: NoteFile): Promise<string> {
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

    private async formatReferences(references: TagReference[]): Promise<string> {
        const sections: string[] = ['\n## References'];
        
        // Group references by type
        const grouped = this.groupReferencesByType(references);

        // Add root reference if exists
        if (grouped[TagType.ROOT]?.length) {
            sections.push('### Thread Root');
            for (const ref of grouped[TagType.ROOT]) {
                const title = await this.linkResolver.getTitleById(ref.targetId);
                sections.push(`- [[${title || ref.targetId}]]`);
            }
        }

        // Add reply references
        if (grouped[TagType.REPLY]?.length) {
            sections.push('### Replying To');
            for (const ref of grouped[TagType.REPLY]) {
                const title = await this.linkResolver.getTitleById(ref.targetId);
                sections.push(`- [[${title || ref.targetId}]]`);
            }
        }

        // Add mentions
        if (grouped[TagType.MENTION]?.length) {
            sections.push('### Mentions');
            for (const ref of grouped[TagType.MENTION]) {
                const title = await this.linkResolver.getTitleById(ref.targetId);
                sections.push(`- [[${title || ref.targetId}]]`);
            }
        }

        // Add topics
        if (grouped[TagType.TOPIC]?.length) {
            sections.push('### Topics');
            for (const ref of grouped[TagType.TOPIC]) {
                sections.push(`- #${ref.targetId}`);
            }
        }

        return sections.join('\n');
    }

    private async formatBacklinks(references: TagReference[]): Promise<string> {
        const sections: string[] = ['\n## Referenced By'];
        
        // Group backlinks by type
        const grouped = this.groupReferencesByType(references);

        // Add replies to this note
        if (grouped[TagType.REPLY]?.length) {
            sections.push('### Replies');
            for (const ref of grouped[TagType.REPLY]) {
                const title = await this.linkResolver.getTitleById(ref.targetId);
                sections.push(`- [[${title || ref.targetId}]]`);
            }
        }

        // Add mentions of this note
        if (grouped[TagType.MENTION]?.length) {
            sections.push('### Mentioned In');
            for (const ref of grouped[TagType.MENTION]) {
                const title = await this.linkResolver.getTitleById(ref.targetId);
                sections.push(`- [[${title || ref.targetId}]]`);
            }
        }

        return sections.join('\n');
    }

    private groupReferencesByType(references: TagReference[]): GroupedReferences {
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
