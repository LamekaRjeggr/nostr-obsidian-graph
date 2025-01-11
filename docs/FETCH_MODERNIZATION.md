# Fetch System Modernization Plan

## Overview

Consolidate FetchProcessor and UnifiedFetchProcessor into a single, modular system that leverages Obsidian's APIs and nostr-tools effectively.

## Core Principles

1. Obsidian First
- Use Obsidian's MetadataCache for reference tracking
- Leverage Vault API for file operations
- Utilize Obsidian's graph capabilities
- Use Obsidian's event system for real-time updates

2. Simplified Architecture
- Remove weighted distribution
- Focus on direct, purpose-driven fetches
- Use nostr-tools' SimplePool efficiently

3. Modular Design
- Event handlers as plugins
- Configurable fetch options
- Clear separation of concerns

## Nostr-tools Integration

### 1. SimplePool Usage
```typescript
// Efficient relay management
const pool = new SimplePool();

// Subscription handling
const sub = pool.sub(relays, filters);
sub.on('event', (event) => {
    // Direct to Obsidian handler
    app.vault.process(event);
});

// Batch operations
const events = await pool.list(relays, filters);
```

### 2. Event Filters
```typescript
// Optimized filter combinations
interface NostrFilter {
    ids?: string[];
    authors?: string[];
    kinds?: number[];
    '#e'?: string[];  // Event references
    '#p'?: string[];  // Profile references
    since?: number;
    until?: number;
    limit?: number;
}

// Example filters
const profileFilter = {
    kinds: [0],
    authors: [pubkey]
};

const threadFilter = {
    kinds: [1],
    '#e': [eventId],
    limit: 50
};
```

### 3. Event Processing
```typescript
// Direct event to Obsidian integration
async function processEvent(event: Event) {
    switch (event.kind) {
        case 0: // Profile
            await updateProfileFrontmatter(event);
            break;
        case 1: // Note
            await createOrUpdateNote(event);
            break;
        case 3: // Contacts
            await updateGraphConnections(event);
            break;
        case 7: // Reaction
            await updateNoteFrontmatter(event);
            break;
    }
}
```

### 4. Relay Management
```typescript
// Smart relay handling
const relayPool = {
    read: ['wss://relay1.com', 'wss://relay2.com'],
    write: ['wss://relay3.com']
};

// Efficient connection management
pool.ensureRelay(url).then(() => {
    // Ready for operations
});
```

## Obsidian Integration Details

### 1. MetadataCache Usage
```typescript
// Instead of custom cache:
app.metadataCache.getCache(path).links      // For note references
app.metadataCache.getCache(path).frontmatter // For nostr metadata
app.metadataCache.getCache(path).tags       // For topic tracking

// Reference tracking via Obsidian links
[[note-id]] // Internal references
#tag       // Topics/categories
@pubkey    // Profile references
```

### 2. Vault API Integration
```typescript
// File operations
app.vault.create(path, content)    // Create notes
app.vault.modify(path, newContent) // Update notes
app.vault.delete(path)            // Remove notes

// Metadata updates
app.metadataCache.on('changed', (file) => {
    // Handle real-time updates
});
```

### 3. Graph Integration
```typescript
// Use Obsidian's graph data
app.metadataCache.resolvedLinks  // For relationship mapping
app.metadataCache.unresolvedLinks // For pending references

// Graph view integration
interface GraphData {
    nodes: {
        id: string;          // Note ID
        type: 'note' | 'profile' | 'topic';
        references: string[];
    }[];
    edges: {
        source: string;
        target: string;
        type: 'mention' | 'reply' | 'reaction';
    }[];
}
```

## Feature Integration

### 1. Contact System
```typescript
interface ContactOptions {
    include: boolean;           // Include contact fetching
    fetchProfiles: boolean;     // Fetch contact profiles
    cacheInGraph: boolean;      // Store in Obsidian graph
    linkProfiles: boolean;      // Create bidirectional links
}
```

Benefits:
- Social graph in Obsidian
- Better navigation
- Relationship context
- Native graph visualization

### 2. Stream Processing
```typescript
interface StreamOptions {
    handlers: string[];         // Enabled handlers
    useObsidianEvents: boolean; // Integrate with Obsidian events
    cacheStrategy: 'immediate' | 'batch' | 'lazy'
}
```

Components:
- ProfileHandler (uses Obsidian frontmatter)
- NoteHandler (uses Obsidian markdown)
- ContactHandler (uses Obsidian links)
- ReactionHandler (uses Obsidian metadata)

### 3. Cache Strategy
```typescript
interface CacheStrategy {
    useMetadataCache: boolean;  // Use Obsidian's metadata cache
    graphIntegration: boolean;  // Integrate with graph view
    linkStrategy: 'wikilinks' | 'mdlinks' | 'both';
    updateMode: 'realtime' | 'deferred';
}
```

Benefits:
- Native Obsidian performance
- Built-in link resolution
- Automatic graph updates

## Implementation Plan

### Phase 1: Core Refactor
1. Move to Obsidian cache
   - Convert custom caches to MetadataCache usage
   - Update reference tracking to use Obsidian links
   - Implement real-time cache updates

2. Simplify fetch options
   - Remove weighted distribution
   - Streamline API
   - Add Obsidian-specific options

### Phase 2: Handler Migration
1. Convert handlers to use Obsidian APIs
   - Profile: Use frontmatter
   - Notes: Use markdown
   - Contacts: Use links
   - Reactions: Use metadata

2. Add handler registry
   - Plugin system
   - Configuration options
   - Event hooks

### Phase 3: Contact Integration
1. Add contact fetching
   - Store as Obsidian links
   - Use graph relationships
   - Bidirectional references

2. Profile handling
   - Frontmatter metadata
   - Link relationships
   - Graph integration

### Phase 4: Cache Optimization
1. Use Obsidian's systems
   - MetadataCache for lookups
   - Resolved links for references
   - Real-time updates

2. Graph integration
   - Native visualization
   - Relationship mapping
   - Interactive navigation

## API Design

### Fetch Options
```typescript
interface FetchOptions {
    // Core options
    kinds: number[];
    limit: number;
    
    // Enhanced features
    contacts?: ContactOptions;
    stream?: StreamOptions;
    cache?: CacheStrategy;
    
    // Obsidian integration
    linkType?: 'wikilinks' | 'mdlinks';
    graphSync?: boolean;
    
    // Filters
    filter?: (event: NostrEvent) => boolean;
    since?: number;
    until?: number;
    author?: string;
    search?: string[];
}
```

### Example Usage
```typescript
// Basic fetch with Obsidian integration
const notes = await fetchProcessor.fetch({
    kinds: [EventKinds.NOTE],
    limit: 50,
    linkType: 'wikilinks',
    graphSync: true
});

// Profile fetch with contacts
const profile = await fetchProcessor.fetch({
    kinds: [EventKinds.METADATA],
    contacts: {
        include: true,
        fetchProfiles: true,
        cacheInGraph: true,
        linkProfiles: true
    },
    cache: {
        useMetadataCache: true,
        graphIntegration: true,
        updateMode: 'realtime'
    }
});
```

## Benefits

1. Native Integration
- Uses Obsidian's built-in systems
- Better performance
- Automatic graph updates
- Real-time synchronization

2. Simplified Architecture
- Remove custom caching
- Use native APIs
- Clear data flow
- Better maintainability

3. Enhanced Features
- Graph visualization
- Link resolution
- Metadata tracking
- Real-time updates

## Migration Strategy

1. Gradual Transition
- Convert caches first
- Update handlers
- Switch references
- Enable graph integration

2. Data Migration
- Convert to Obsidian format
- Update link structure
- Preserve relationships
- Maintain compatibility

3. Documentation
- API reference
- Migration guides
- Best practices
- Example implementations
