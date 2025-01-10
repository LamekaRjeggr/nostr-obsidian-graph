# Modular Processors Design

## Overview

This document outlines the modular processing system that handles nostr events and Obsidian integration. Each processor is designed to be independent and reusable, while still being able to work together seamlessly.

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

export class ReferenceProcessor {
    private tagProcessor: TagProcessor;

    constructor(app: App, metadataCache: MetadataCache) {
        this.tagProcessor = new TagProcessor();
    }

    async process(event: Event): Promise<ReferenceResult> {
        // Combine nostr tags and Obsidian references
        // Handle bi-directional linking
    }
}
```

## Integration Points

### 1. Note Handler Integration
- Uses ReferenceProcessor for comprehensive reference handling
- Combines nostr event tags with Obsidian wiki-links
- Maintains bi-directional references

### 2. File Service Integration
- Saves references in note frontmatter
- Creates markdown sections for references
- Handles file organization based on references

### 3. Fetch System Integration
- Processes references during note fetching
- Maintains reference relationships
- Updates related notes

## Next Steps

### 1. Temporal Processing
- [ ] Implement TemporalProcessor
- [ ] Handle chronological relationships
- [ ] Integrate with existing processors

```typescript
export interface TemporalResult {
    previousEvent?: string;
    nextEvent?: string;
    timestamp: number;
    obsidianLinks: {
        previous?: TFile;
        next?: TFile;
    };
}

export class TemporalProcessor {
    process(event: Event): TemporalResult;
}
```

### 2. Reaction Processing
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

### 3. Enhanced Integration
- [ ] Add processor configuration options
- [ ] Implement processor composition
- [ ] Add batch processing support

### 4. Testing & Documentation
- [ ] Add unit tests for each processor
- [ ] Document processor interactions
- [ ] Create usage examples

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
- [x] Implemented ReferenceProcessor
- [x] Integrated with note handling
- [x] Updated file service integration
- [x] Removed deprecated code

### In Progress
- [ ] Temporal processing implementation
- [ ] Reaction handling
- [ ] Enhanced configuration options
- [ ] Testing suite

### Future
- [ ] Custom processor support
- [ ] Real-time updates
- [ ] Advanced graph integration

This modular approach allows us to handle complex processing requirements while maintaining code clarity and flexibility. Each processor focuses on its specific task while working together through well-defined interfaces.
