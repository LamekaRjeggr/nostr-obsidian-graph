# Event Bus Integration for Fetch Processor Migration

## Overview

The event bus system is central to the migration from FetchProcessor to UnifiedFetchProcessor. It provides:
- Type-safe event handling
- Priority-based processing
- Proper event ordering
- State management

## Event Types

```typescript
enum NostrEventType {
    PROFILE = 'PROFILE',           // kind 0
    NOTE = 'NOTE',                 // kind 1
    CONTACT = 'CONTACT',           // kind 3
    REACTION = 'REACTION',         // kind 7
    ZAP = 'ZAP',                  // kind 9735
    STREAM_READY = 'STREAM_READY', // Stream initialization
    STREAM_END = 'STREAM_END'      // Stream completion
}
```

## Event Flow

### Current Flow
```
FetchProcessor → EventStreamHandler → Individual Handlers
      ↓                                      ↓
  State Updates  ←───────────────────  Event Processing
```

### New Flow
```
UnifiedFetchProcessor → NostrEventBus → EventStreamHandler → Handlers
         ↓                    ↓               ↓                ↓
    State Updates     Event Distribution   Processing    File Operations
```

## Integration Points

### Event Bus Registration

```typescript
class UnifiedFetchProcessor {
    constructor() {
        // Core event types
        NostrEventBus.getInstance().subscribe(
            NostrEventType.PROFILE,
            this.handleProfile.bind(this)
        );
        NostrEventBus.getInstance().subscribe(
            NostrEventType.NOTE,
            this.handleNote.bind(this)
        );
        NostrEventBus.getInstance().subscribe(
            NostrEventType.CONTACT,
            this.handleContact.bind(this)
        );
        
        // Stream management
        NostrEventBus.getInstance().subscribe(
            NostrEventType.STREAM_READY,
            this.initializeStream.bind(this)
        );
        NostrEventBus.getInstance().subscribe(
            NostrEventType.STREAM_END,
            this.cleanupStream.bind(this)
        );
    }
}
```

### Stream Management

```typescript
class UnifiedFetchProcessor {
    private async initializeStream(): Promise<void> {
        NostrEventBus.getInstance().emit(NostrEventType.STREAM_READY);
        this.streamHandler = new EventStreamHandler();
        this.registerHandlers();
    }
    
    private async cleanupStream(): Promise<void> {
        await this.streamHandler.handleEOSE();
        this.streamHandler.reset();
        NostrEventBus.getInstance().emit(NostrEventType.STREAM_END);
    }
    
    private registerHandlers(): void {
        // Register in priority order
        this.streamHandler.registerHandler(
            new ProfileHandler(NostrEventBus.getInstance())
        );
        this.streamHandler.registerHandler(
            new ContactHandler(NostrEventBus.getInstance())
        );
        this.streamHandler.registerHandler(
            new NoteHandler(NostrEventBus.getInstance())
        );
    }
}
```

### Handler Integration

```typescript
class ProfileHandler implements IEventHandler {
    constructor(private eventBus: NostrEventBus) {}
    
    async process(event: NostrEvent): Promise<void> {
        // Process profile
        const metadata = JSON.parse(event.content);
        await this.profileManager.processProfile(event.pubkey, metadata);
        
        // Notify event bus
        this.eventBus.emit(NostrEventType.PROFILE, {
            pubkey: event.pubkey,
            metadata
        });
    }
}

class ContactHandler implements IEventHandler {
    constructor(private eventBus: NostrEventBus) {}
    
    async process(event: NostrEvent): Promise<void> {
        // Process contacts
        const contacts = event.tags
            .filter(tag => tag[0] === 'p')
            .map(tag => tag[1]);
            
        await this.contactManager.processContacts(event.pubkey, contacts);
        
        // Notify event bus
        this.eventBus.emit(NostrEventType.CONTACT, {
            pubkey: event.pubkey,
            contacts
        });
    }
}
```

## Migration Steps

### Phase 1: Event Bus Setup
- Add NostrEventBus instance
- Define event types
- Setup event handlers

### Phase 2: Stream Integration
- Add stream management events
- Implement stream lifecycle handlers
- Connect stream to event bus

### Phase 3: Handler Migration
- Update handlers to use event bus
- Add event emission points
- Maintain processing order

### Phase 4: State Management
- Track state through events
- Handle cleanup events
- Manage error states

### Phase 5: Legacy Support
- Bridge old and new systems
- Handle transition period
- Support rollback scenarios

## Event Ordering

### Priority Levels
1. Stream Management (STREAM_READY, STREAM_END)
2. Profile Events (kind 0)
3. Contact Events (kind 3)
4. Note Events (kind 1)
5. Reaction Events (kind 7, 9735)

### Processing Rules
- Higher priority events processed first
- Same priority processed in order
- Dependencies enforced through priorities
- Error handling per priority level

## State Management

### Event States
```typescript
enum EventState {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}
```

### State Tracking
```typescript
interface EventStateManager {
    setState(eventId: string, state: EventState): void;
    getState(eventId: string): EventState;
    clearState(eventId: string): void;
}
```

## Error Handling

### Event Bus Errors
- Emit error events
- Track failed events
- Support retry mechanisms
- Maintain error context

### Recovery Strategies
- Event reprocessing
- State restoration
- Partial rollbacks
- Error notifications
