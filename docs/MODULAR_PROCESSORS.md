# Modular Processors Design

## Overview

The modular processor system provides a clean, maintainable way to handle nostr events and Obsidian integration. Each processor is designed to be independent and reusable, while still being able to work together seamlessly.

## Current Implementation

### 1. Tag Processor
```typescript
// src/services/processors/tag-processor.ts
export interface TagResult {
    // Core tag data
    mentions: string[];      // NIP-01 p tags
    references: string[];    // NIP-01 e tags
    topics: string[];       // NIP-12 t tags
    
    // Thread context
    root?: string;         // Root note in thread
    replyTo?: string;     // Direct reply reference
    
    // Additional context
    relayHints: Map<string, string>;  // tag id -> relay hint
}

export class TagProcessor {
    process(event: Event): TagResult;
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

### 4. Reaction Processing
The reaction system uses a streamlined approach focused on like reactions:

#### Architecture
```typescript
// Core Components:
// - TagProcessor: Extract reaction targets
// - FileService: Handle frontmatter updates
// - EventBus: Coordinate reaction events

// Flow:
Reaction Event -> TagProcessor (extract target) 
                  -> Batch Updates (1 second window)
                  -> FileService (update frontmatter)
                  -> EventBus (notify subscribers)
```

#### Integration Points
1. TagProcessor
   - Extracts target note IDs from e-tags
   - Validates reaction events (kind 7)
   - Handles relay hints for reaction routing

2. FileService
   - Manages like counts in frontmatter
   - Handles file operations through Obsidian API
   - Provides race condition handling
   ```typescript
   interface NoteMeta {
       likes: number;
   }
   ```

3. EventBus
   - Coordinates reaction events
   - Notifies subscribers of updates
   - Handles event timeouts and errors

4. Obsidian Integration
   - Uses MetadataCache for efficient frontmatter access
   - Leverages Vault API for file operations
   - Batches updates for better performance

#### Benefits
1. Simplified Architecture
   - Focused on essential functionality (likes)
   - Uses Obsidian's native capabilities
   - Reduces code complexity

2. Better Performance
   - Batched frontmatter updates
   - Reduced file operations
   - Efficient event handling

3. Improved Reliability
   - Built-in race condition handling
   - Consistent state management
   - Better error recovery

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

### 1. Testing & Documentation
- [ ] Add unit tests for each processor
- [ ] Document processor interactions
- [ ] Create usage examples

### 2. Enhanced Integration
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
- [x] Simplified reaction handling to focus on likes
- [x] Implemented batched reaction updates
- [x] Removed legacy reaction store

### In Progress
- [ ] Configuration options
- [ ] Testing suite

### Future
- [ ] Custom processor support
- [ ] Real-time updates
- [ ] Advanced graph integration

This modular approach allows us to handle complex processing requirements while maintaining code clarity and flexibility. Each processor focuses on its specific task while working together through well-defined interfaces.
