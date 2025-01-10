# Enhanced Thread Fetch Design

## Objective
Create a comprehensive note graph by fetching and linking all related content when right-clicking a note, including:
- Thread context (root, replies)
- Mentioned notes
- Author profiles
- Mentioned profiles
- Bi-directional relationships

## Process Flow

```typescript
interface NoteContext {
    // Core note data
    id: string;                  // Note event ID
    content: string;            // Note content
    author: string;            // Author's pubkey
    createdAt: number;        // Timestamp
    
    // Relationships
    root?: string;           // Root note in thread
    replyTo?: string;       // Direct parent note
    replies: string[];     // Notes replying to this
    
    // References
    mentionedNotes: string[];      // e-tags
    mentionedProfiles: string[];  // p-tags
    
    // Metadata
    reactions: {
        likes: number;
        zaps: number;
    };
}

interface GraphRelationship {
    from: string;          // Source node ID
    to: string;           // Target node ID
    type: 'reply' | 'mention' | 'author' | 'root';  // Relationship type
    metadata?: any;      // Additional context
}

class EnhancedThreadFetcher {
    /**
     * Main entry point when right-clicking a note
     */
    async fetchThreadGraph(noteId: string): Promise<void> {
        // 1. Get initial note context
        const noteContext = await this.getNoteContext(noteId);
        
        // 2. Build relationship graph
        const relationships: GraphRelationship[] = [];
        
        // 3. Process thread context
        if (noteContext.root) {
            // Get root note and its context
            const rootContext = await this.getNoteContext(noteContext.root);
            relationships.push({
                from: noteId,
                to: noteContext.root,
                type: 'root'
            });
            
            // Get all replies in thread
            const threadReplies = await this.getThreadReplies(noteContext.root);
            for (const reply of threadReplies) {
                relationships.push({
                    from: reply.replyTo || noteContext.root,
                    to: reply.id,
                    type: 'reply'
                });
            }
        }
        
        // 4. Process mentioned notes
        for (const mentionedNote of noteContext.mentionedNotes) {
            const mentionContext = await this.getNoteContext(mentionedNote);
            relationships.push({
                from: noteId,
                to: mentionedNote,
                type: 'mention'
            });
        }
        
        // 5. Process profiles
        // Author profile
        await this.fetchProfile(noteContext.author);
        relationships.push({
            from: noteContext.author,
            to: noteId,
            type: 'author'
        });
        
        // Mentioned profiles
        for (const profile of noteContext.mentionedProfiles) {
            await this.fetchProfile(profile);
            // Get recent notes from mentioned profiles
            const profileNotes = await this.getRecentProfileNotes(profile);
            for (const note of profileNotes) {
                relationships.push({
                    from: profile,
                    to: note.id,
                    type: 'author'
                });
            }
        }
        
        // 6. Save to vault with relationship metadata
        await this.saveToVault(noteContext, relationships);
    }
    
    /**
     * Get comprehensive context for a note
     */
    private async getNoteContext(noteId: string): Promise<NoteContext> {
        // Use UnifiedFetchProcessor with enhanced options
        const event = await this.unifiedFetcher.fetchCompleteNote(noteId);
        
        // Extract relationships from tags
        const context: NoteContext = {
            id: event.id,
            content: event.content,
            author: event.pubkey,
            createdAt: event.created_at,
            replies: [],
            mentionedNotes: [],
            mentionedProfiles: []
        };
        
        // Process tags for relationships
        for (const tag of event.tags) {
            if (tag[0] === 'e') {
                if (tag[3] === 'root') {
                    context.root = tag[1];
                } else if (tag[3] === 'reply') {
                    context.replyTo = tag[1];
                } else {
                    context.mentionedNotes.push(tag[1]);
                }
            } else if (tag[0] === 'p') {
                context.mentionedProfiles.push(tag[1]);
            }
        }
        
        return context;
    }
    
    /**
     * Save note with relationship metadata
     */
    private async saveToVault(
        context: NoteContext,
        relationships: GraphRelationship[]
    ): Promise<void> {
        // Create frontmatter with relationships
        const frontmatter = {
            id: context.id,
            author: context.author,
            created_at: context.createdAt,
            root: context.root,
            reply_to: context.replyTo,
            replies: context.replies,
            mentioned_notes: context.mentionedNotes,
            mentioned_profiles: context.mentionedProfiles,
            relationships: relationships.map(r => ({
                from: r.from,
                to: r.to,
                type: r.type
            }))
        };
        
        // Save to appropriate directory based on type
        await this.fileService.saveNote(context, frontmatter);
    }
}
```

## Implementation Notes

1. Event Bus Integration
   - Subscribe to note fetch events
   - Emit relationship events for graph updates
   - Handle profile fetch events

2. Caching Strategy
   - Cache fetched profiles
   - Cache note contexts
   - Cache relationship data

3. Graph View Integration
   - Update graph on new relationships
   - Show relationship types
   - Interactive node exploration

4. Performance Considerations
   - Batch fetch related notes
   - Parallel profile fetching
   - Progressive relationship loading

## Future Enhancements

1. Extended Context
   - Fetch quote reposts
   - Include reaction context
   - Add zap relationships

2. Advanced Filtering
   - Time-based filtering
   - Relationship type filtering
   - Author-based filtering

3. Graph Features
   - Relationship strength indicators
   - Temporal view options
   - Community detection
