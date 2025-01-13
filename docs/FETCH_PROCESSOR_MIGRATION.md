# Fetch Processor Migration Plan

## Overview

This document outlines the plan to migrate the stream-based event processing from FetchProcessor to UnifiedFetchProcessor. The key challenge is maintaining the ordered processing of interdependent events (profiles, contacts, notes, reactions) while preserving the existing functionality.

## Event Bus Integration

The migration leverages the existing NostrEventBus for event handling:

```typescript
// Current event bus usage
NostrEventBus.getInstance().subscribe(NostrEventType.REACTION, reactionProcessor);
NostrEventBus.getInstance().subscribe(NostrEventType.ZAP, reactionProcessor);
NostrEventBus.getInstance().subscribe(NostrEventType.KEYWORD_SEARCH, keywordHandler);
NostrEventBus.getInstance().subscribe(NostrEventType.HEX_FETCH, hexHandler);
NostrEventBus.getInstance().subscribe(NostrEventType.THREAD_FETCH, threadHandler);
NostrEventBus.getInstance().subscribe(NostrEventType.NODE_FETCH, nodeFetchHandler);
```

The stream handling will integrate with this system:

```typescript
class UnifiedFetchProcessor {
    constructor() {
        // Subscribe to event bus
        NostrEventBus.getInstance().subscribe(
            NostrEventType.STREAM_READY,
            this.onStreamReady.bind(this)
        );
        
        NostrEventBus.getInstance().subscribe(
            NostrEventType.STREAM_END,
            this.onStreamEnd.bind(this)
        );
    }
    
    private async onStreamReady(event: NostrEvent): Promise<void> {
        // Initialize stream handlers
        this.streamHandler = new EventStreamHandler();
        this.registerHandlers();
    }
    
    private async onStreamEnd(): Promise<void> {
        // Cleanup stream handlers
        await this.streamHandler.handleEOSE();
        this.streamHandler.reset();
    }
}
```

## Current Architecture

### Stream Processing in FetchProcessor
```typescript
// Event flow in FetchProcessor
streamHandler.registerHandler(new ProfileEventHandler(...));  // kind 0
streamHandler.registerHandler(new ContactEventHandler(...));  // kind 3
streamHandler.registerHandler(new NoteEventHandler(...));    // kind 1
streamHandler.registerHandler(new ReactionProcessor(...));   // kind 7

// Events processed in priority order:
// 1. Profiles (needed for all other events)
// 2. Contacts (needed for note context)
// 3. Notes (main content)
// 4. Reactions (depend on notes)
```

### Batch Processing in UnifiedFetchProcessor
```typescript
// Current batch approach
async fetchWithOptions(options: FetchOptions): Promise<NostrEvent[]> {
    const events = await this.relayService.subscribe([filter]);
    for (const event of events) {
        // Process without ordering
        await this.processEvent(event);
    }
    return events;
}
```

## Migration Strategy

### Phase 1: Event Stream Integration (v0.87.0)

#### Implementation
1. Add EventStreamHandler to UnifiedFetchProcessor:
```typescript
class UnifiedFetchProcessor {
    private streamHandler: EventStreamHandler;
    
    constructor() {
        this.streamHandler = new EventStreamHandler();
        // Register handlers in priority order
        this.streamHandler.registerHandler(new ProfileEventHandler(...));
        this.streamHandler.registerHandler(new ContactEventHandler(...));
        this.streamHandler.registerHandler(new NoteEventHandler(...));
        this.streamHandler.registerHandler(new ReactionProcessor(...));
    }
}
```

2. Add stream-based fetch option:
```typescript
interface FetchOptions {
    useStream?: boolean;
    onEvent?: (event: NostrEvent) => void;
}

async fetchWithOptions(options: FetchOptions): Promise<NostrEvent[]> {
    if (options.useStream) {
        return this.fetchWithStream(options);
    }
    return this.fetchWithBatch(options);
}
```

#### Validation
- [ ] Handler registration matches FetchProcessor
- [ ] Event priority ordering preserved
- [ ] EOSE handling works correctly
- [ ] Event callbacks fire properly

### Phase 2: Contact Processing (v0.87.1)

#### Implementation
1. Move contact processing to stream handler:
```typescript
class ContactEventHandler implements IEventHandler {
    kind = 3; // Contact events
    priority = 2; // After profiles, before notes
    
    async process(event: NostrEvent): Promise<void> {
        // Extract contacts from tags
        const contacts = event.tags
            .filter(tag => tag[0] === 'p')
            .map(tag => tag[1]);
            
        // Process contacts with proper ordering:
        // 1. Store contact relationships
        // 2. Queue profile fetching
        // 3. Update graph relationships
    }
}
```

2. Add contact-specific fetch method:
```typescript
async fetchContacts(hex: string): Promise<string[]> {
    const filter = {
        authors: [hex],
        kinds: [3],
        since: 0
    };
    
    const events = await this.relayService.subscribe([filter]);
    // Process through stream handler to maintain ordering
    for (const event of events) {
        await this.streamHandler.processEvent(event);
    }
    return this.contactHandler.getContacts();
}
```

#### Validation
- [ ] Contact event ordering correct
- [ ] Profile fetching triggered properly
- [ ] Graph relationships maintained
- [ ] State consistency preserved

### Phase 3: Main User Processing (v0.87.2)

#### Implementation
1. Add stream-based main user processing:
```typescript
async processMainUser(hex: string): Promise<void> {
    // 1. Fetch and process profile (kind 0)
    const profileEvents = await this.fetchWithStream({
        kinds: [0],
        authors: [hex]
    });
    
    // 2. Fetch and process contacts (kind 3)
    const contacts = await this.fetchContacts(hex);
    
    // 3. Fetch and process notes (kind 1)
    await this.fetchWithStream({
        kinds: [1],
        authors: [hex, ...contacts],
        useStream: true
    });
    
    // 4. Process reactions (kind 7)
    await this.processReactions();
}
```

2. Add progress tracking:
```typescript
interface StreamProgress {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
}

private updateProgress(success: boolean): void {
    this.progress.processed++;
    if (success) this.progress.succeeded++;
    else this.progress.failed++;
}
```

#### Validation
- [ ] Event processing order correct
- [ ] Progress tracking accurate
- [ ] Error handling proper
- [ ] State consistency maintained

### Phase 4: Node-based Fetching (v0.87.3)

#### Implementation
1. Add stream-based node fetching:
```typescript
async processNodeContent(filePath: string): Promise<void> {
    const metadata = await this.fileService.getNostrMetadata(filePath);
    if (!metadata) return;
    
    if (metadata.kind === 0) {
        // Profile node: Fetch their content
        await this.processMainUser(metadata.id);
    } else {
        // Note node: Process references
        const noteIds = new Set([metadata.id]);
        const profileIds = new Set([metadata.pubkey]);
        
        // Add referenced notes and profiles
        metadata.nostr_tags?.forEach(tag => {
            if (tag[0] === 'e') noteIds.add(tag[1]);
            if (tag[0] === 'p') profileIds.add(tag[1]);
        });
        
        // Process in order: profiles -> notes -> reactions
        await this.fetchWithStream({
            kinds: [0],
            authors: Array.from(profileIds),
            useStream: true
        });
        
        await this.fetchWithStream({
            kinds: [1],
            ids: Array.from(noteIds),
            useStream: true
        });
    }
}
```

#### Validation
- [ ] Reference processing order correct
- [ ] Metadata handling accurate
- [ ] Context preservation proper
- [ ] UI updates working

### Phase 5: Cleanup & Transition (v0.88.0)

#### Implementation
1. Add feature flag with default enabled:
```typescript
const DEFAULT_SETTINGS: NostrSettings = {
    useUnifiedStreamHandling: true,
    // ...other settings
};
```

2. Add transition helpers:
```typescript
async migrateToUnifiedProcessor(): Promise<void> {
    // Clear caches to prevent stale data
    await this.clearCaches();
    
    // Transfer any necessary state
    await this.transferState();
    
    // Enable unified processing
    this.settings.useUnifiedStreamHandling = true;
    await this.saveSettings();
    
    // Notify user
    new Notice('Successfully migrated to unified processing');
}
```

3. Add deprecation warnings:
```typescript
class FetchProcessor {
    constructor() {
        console.warn(
            'FetchProcessor is deprecated and will be removed in v0.89.0. ' +
            'Please migrate to UnifiedFetchProcessor.'
        );
    }
}
```

#### Validation
- [ ] Clean state transfer
- [ ] No data corruption
- [ ] Performance maintained
- [ ] Users properly notified

## Testing & Validation

### Unit Tests
```typescript
describe('UnifiedFetchProcessor', () => {
    describe('Stream Processing', () => {
        it('processes events in correct order', async () => {
            const processor = new UnifiedFetchProcessor();
            const events = [
                makeEvent({ kind: 1 }), // Note
                makeEvent({ kind: 0 }), // Profile
                makeEvent({ kind: 3 }), // Contact
                makeEvent({ kind: 7 })  // Reaction
            ];
            
            const processed = [];
            events.forEach(e => processor.processEvent(e));
            
            expect(processed).toEqual([
                'kind0', 'kind3', 'kind1', 'kind7'
            ]);
        });
    });
});
```

### Integration Tests
```typescript
describe('Main User Processing', () => {
    it('maintains state consistency', async () => {
        const processor = new UnifiedFetchProcessor();
        await processor.processMainUser('hex');
        
        // Verify state
        expect(processor.getProfiles()).toBeDefined();
        expect(processor.getContacts()).toBeDefined();
        expect(processor.getNotes()).toBeDefined();
        expect(processor.getReactions()).toBeDefined();
    });
});
```

## Rollback Procedures

### Emergency Rollback
```typescript
async rollbackToFetchProcessor(): Promise<void> {
    // Disable unified processing
    this.settings.useUnifiedStreamHandling = false;
    await this.saveSettings();
    
    // Clear caches
    await this.clearCaches();
    
    // Reinitialize FetchProcessor
    this.processor = new FetchProcessor(
        this.settings,
        this.relayService,
        this.eventService,
        this.fileService,
        this.app
    );
    
    // Notify user
    new Notice('Rolled back to legacy processor');
}
```

## Timeline

- Phase 1 (Stream Integration): 2 weeks
- Phase 2 (Contact Processing): 2 weeks
- Phase 3 (Main User): 2 weeks
- Phase 4 (Node Fetching): 2 weeks
- Phase 5 (Cleanup): 1 week
- Buffer: 1 week

Total: 10 weeks
