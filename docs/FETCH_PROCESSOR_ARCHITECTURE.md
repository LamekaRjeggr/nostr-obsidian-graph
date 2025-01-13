# Fetch Processor Architecture Migration

## Current System

### FetchProcessor
- Stream-based event processing
- Real-time event handling through EventStreamHandler
- Priority-based event ordering
- Maintains state between operations
- Handles contact fetching and processing
- Manages main user content fetching
- Supports node-based fetching

### UnifiedFetchProcessor
- Options-based batch processing
- Thread context support
- Enhanced metadata handling
- Tag-based processing

## Migration Path

### Phase 1: Event Stream Support

Add stream capabilities to UnifiedFetchProcessor:

```typescript
class UnifiedFetchProcessor {
    private streamHandler: EventStreamHandler;
    
    constructor() {
        this.streamHandler = new EventStreamHandler();
        // Register handlers in priority order
        this.streamHandler.registerHandler(new ProfileHandler());
        this.streamHandler.registerHandler(new ContactHandler());
        this.streamHandler.registerHandler(new NoteHandler());
        this.streamHandler.registerHandler(new ReactionHandler());
    }
}
```

### Phase 2: Contact Processing

Move contact handling to UnifiedFetchProcessor:

```typescript
class UnifiedFetchProcessor {
    async fetchContacts(hex: string): Promise<string[]> {
        const filter = {
            authors: [hex],
            kinds: [3],
            since: 0
        };
        
        const events = await this.relayService.subscribe([filter]);
        for (const event of events) {
            await this.streamHandler.processEvent(event);
        }
        return this.contactHandler.getContacts();
    }
}
```

### Phase 3: Main User Processing

Add main user support:

```typescript
class UnifiedFetchProcessor {
    async processMainUser(hex: string): Promise<void> {
        // 1. Fetch profile
        await this.fetchWithStream({
            kinds: [0],
            authors: [hex]
        });
        
        // 2. Fetch contacts
        const contacts = await this.fetchContacts(hex);
        
        // 3. Fetch notes
        await this.fetchWithStream({
            kinds: [1],
            authors: [hex, ...contacts]
        });
    }
}
```

### Phase 4: Node-based Fetching

Add node fetching support:

```typescript
class UnifiedFetchProcessor {
    async processNodeContent(filePath: string): Promise<void> {
        const metadata = await this.fileService.getNostrMetadata(filePath);
        if (!metadata) return;
        
        if (metadata.kind === 0) {
            await this.processMainUser(metadata.id);
        } else {
            const noteIds = new Set([metadata.id]);
            const profileIds = new Set([metadata.pubkey]);
            
            metadata.nostr_tags?.forEach(tag => {
                if (tag[0] === 'e') noteIds.add(tag[1]);
                if (tag[0] === 'p') profileIds.add(tag[1]);
            });
            
            await this.fetchWithStream({
                kinds: [0],
                authors: Array.from(profileIds)
            });
            
            await this.fetchWithStream({
                kinds: [1],
                ids: Array.from(noteIds)
            });
        }
    }
}
```

### Phase 5: State Management

Add state tracking:

```typescript
class UnifiedFetchProcessor {
    private progress = {
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0
    };
    
    private updateProgress(success: boolean): void {
        this.progress.processed++;
        if (success) this.progress.succeeded++;
        else this.progress.failed++;
    }
    
    async fetchWithProgress(options: FetchOptions): Promise<void> {
        const events = await this.fetchWithStream(options);
        this.progress.total = events.length;
        
        for (const event of events) {
            try {
                await this.processEvent(event);
                this.updateProgress(true);
            } catch (error) {
                this.updateProgress(false);
                console.error('Error processing event:', error);
            }
        }
    }
}
```

## Component Dependencies

### Event Flow
```
RelayService → EventStreamHandler → Handlers → FileService
     ↑                                            ↓
     └────────────── EventEmitter ───────────────┘
```

### Data Flow
```
Profile Events → Contact Events → Note Events → Reactions
     ↓              ↓               ↓             ↓
  Profiles      Contacts         Notes      Reactions
     ↓              ↓               ↓             ↓
     └──────────────── Reference Graph ──────────┘
```

### State Management
```
Settings → UnifiedFetchProcessor → Progress Updates
   ↓              ↓                      ↓
Cache         Event State           User Interface
```

## Migration Strategy

1. Parallel Operation
- Keep both processors running
- Route new requests based on feature flag
- Monitor performance and errors

2. Gradual Transition
- Start with low-risk operations
- Validate each phase
- Roll back on issues

3. Final Switch
- Enable unified processor by default
- Remove legacy processor
- Clean up old code

## Rollback Plan

1. Immediate Rollback
- Disable feature flag
- Clear affected caches
- Revert to FetchProcessor

2. Partial Rollback
- Identify problematic component
- Route specific operations back
- Fix issues in isolation
