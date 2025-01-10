# Modular Processors Design

## Overview

The modular processor system provides a clean, maintainable way to handle nostr events and Obsidian integration. Each processor is designed to be independent and reusable, while still being able to work together seamlessly.

## Current Implementation

### 1. Tag Processor
```typescript
// src/services/processors/tag-processor.ts
export interface TagResult {
    references: string[];    // NIP-01 e tags
    root?: string;          // Thread root
    replyTo?: string;       // Direct reply
    topics: string[];       // NIP-12 t tags
}

export class TagProcessor {
    process(event: Event): TagResult {
        // Process nostr event tags
        // Extract references, thread context, and topics
    }
}
```

### 2. Reference Processor
```typescript
// src/services/processors/reference-processor.ts
export interface ReferenceResult {
    nostr: {
        outgoing: string[];     // Events we reference
        incoming: string[];     // Events referencing us
    };
    obsidian: {
        files: TFile[];         // Related Obsidian files
        links: string[];        // Wiki-style links
    };
    metadata: {
        root?: string;          // Root note in thread
        replyTo?: string;       // Direct reply reference
        topics: string[];       // Topic tags
    };
}

export class ReferenceProcessor implements IReference {
    process(event: Event): Promise<ReferenceResult>;
    addReference(from: string, to: string): void;
    getOutgoingReferences(eventId: string): string[];
    getIncomingReferences(eventId: string): string[];
    // ... other IReference methods
}
```

### 3. Temporal Processor
```typescript
// src/services/processors/temporal-processor.ts
export interface TemporalResult {
    timestamp: number;
    chronological: {
        previousEvent?: string;
        nextEvent?: string;
    };
    obsidian: {
        previousFile?: TFile;
        nextFile?: TFile;
    };
    metadata: {
        created_at: string;
        created: number;
    };
}

export class TemporalProcessor {
    process(event: Event): Promise<TemporalResult>;
}
```

## Integration Points

### 1. Note Handler Integration
```typescript
export class NoteEventHandler extends BaseEventHandler {
    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;
    private temporalProcessor: TemporalProcessor;

    async process(event: NostrEvent): Promise<void> {
        // Process references and temporal data
        const [refResults, temporalResults] = await Promise.all([
            this.referenceProcessor.process(event),
            this.temporalProcessor.process(event)
        ]);
        
        // Create metadata and save note
        const metadata = {
            ...refResults.metadata,
            ...temporalResults.metadata
        };
        
        await this.fileService.saveNote(event, metadata);
    }
}
```

### 2. File Service Integration
- Saves references in note frontmatter
- Creates markdown sections for references
- Handles file organization based on references

### 3. Fetch System Integration
- Processes references during note fetching
- Maintains reference relationships
- Updates related notes

## Next Steps

### 1. Reaction Processing
- [ ] Implement ReactionProcessor
- [ ] Handle likes, zaps, and replies
- [ ] Update note metadata

```typescript
export interface ReactionResult {
    likes: number;
    zaps: {
        count: number;
        amount: number;
    };
    replies: string[];
}

export class ReactionProcessor {
    process(event: Event): ReactionResult;
}
```

### 2. Testing & Documentation
- [ ] Add unit tests for each processor
- [ ] Document processor interactions
- [ ] Create usage examples

### 3. Enhanced Integration
- [ ] Add processor configuration options
- [ ] Implement processor composition
- [ ] Add batch processing support

## Benefits

1. Modularity
- Each processor handles a specific concern
- Processors can be used independently
- Easy to test and maintain

2. Flexibility
- Mix and match processors as needed
- Easy to extend with new processors
- Configure processing options

3. Integration
- Seamless nostr and Obsidian integration
- Consistent reference handling
- Maintainable codebase

## Migration Status

### Completed
- [x] Implemented TagProcessor
- [x] Implemented ReferenceProcessor with IReference interface
- [x] Implemented TemporalProcessor
- [x] Integrated with note handling
- [x] Updated file service integration
- [x] Removed deprecated ReferenceStore
- [x] Migrated all services to use new processors

### In Progress
- [ ] Reaction handling
- [ ] Enhanced configuration options
- [ ] Testing suite

### Future
- [ ] Custom processor support
- [ ] Real-time updates
- [ ] Advanced graph integration

This modular approach allows us to handle complex processing requirements while maintaining code clarity and flexibility. Each processor focuses on its specific task while working together through well-defined interfaces.
