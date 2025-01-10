# Nostr Fetch System

## Overview
The fetch system provides a robust way to retrieve and process Nostr content through a unified processing chain. It handles both profiles and notes while maintaining relationships and metadata.

## Architecture

### 1. Base Layer (UnifiedFetchProcessor)
Core processing engine that handles:
- Event streaming and relay connections
- Filter management and options
- Basic event fetching
- Foundation for other handlers
- Optional file saving control via skipSave option

### 2. Thread Layer (ThreadFetchHandler)
Specialized handler for conversation threads:
- Parallel and sequential fetching:
  * Root and parent notes fetched in parallel
  * Target event fetched independently
  * Replies fetched in parallel batches
- Thread relationship maintenance:
  * Root-to-reply chains preserved
  * Bi-directional references maintained
  * Temporal ordering respected
- Reference tracking:
  * E-tags for note references
  * P-tags for profile mentions
  * Implicit relationships inferred

### 3. Node Layer (NodeFetchHandler)
Context-aware processing with parallel operations:
- Profile Mode:
  * Parallel author notes fetching
  * Batch processing with hex fetch settings
  * Concurrent metadata updates
  * Profile relationship tracking
- Note Mode:
  * Parallel thread context retrieval
  * Concurrent referenced content fetching
  * Simultaneous profile reference resolution
  * Bi-directional relationship maintenance
- Shared Resources:
  * Connection pool management
  * Cache coordination
  * Reference store synchronization

### 4. Keyword Search Layer (KeywordSearchHandler)
Specialized handler for text-based content search:
- NIP-50 search integration:
  * Server-side text search via relay filters
  * Multiple keyword support
  * Efficient result filtering
- Advanced filtering capabilities:
  * Time range filtering (week/month/year/custom)
  * Content type filtering (text/media/mentions)
  * Social scope filtering (follows/follows-of-follows)
- File handling:
  * Controlled file saving with error handling
  * Progress tracking and notifications
  * Safe path handling via Obsidian API

## Implementation Details

### 1. Settings Management
Settings are persisted across sessions:
```typescript
interface FetchSettings {
    notesPerProfile: number;    // Max notes per profile (1-500)
    batchSize: number;         // Notes per request (1-500)
    includeOwnNotes: boolean;  // Include user's own notes
}

interface FetchOptions {
    kinds: number[];          // Event kinds to fetch
    limit: number;            // Max events to fetch
    filter?: Function;        // Custom filter function
    since?: number;          // Start timestamp
    until?: number;          // End timestamp
    author?: string;         // Author hex key
    search?: string[];       // NIP-50 search terms
    skipSave?: boolean;      // Skip auto-saving results
}
```

### 2. Batch Processing
Intelligent fetching strategy:
- 70% of batch size for new authors
- 30% of batch size for existing authors
- Chronological ordering via TemporalEventStore
- Reference tracking via ReferenceStore

### 3. Processing Flow
```typescript
// Profile Processing (kind 0)
metadata -> FetchProcessor.processFollows()
  -> BatchProcessor.processBatch()
  -> EventStreamHandler

// Note Processing (kind 1)
metadata -> Extract IDs -> FetchProcessor
  -> Complete processing chain

// Keyword Search Processing
keywords -> NIP-50 search -> Filter chain
  -> Handler-controlled saving -> File system
```

### 4. Event Processing
```typescript
Event -> EventStreamHandler
  -> Handler (Note/Profile/Search)
  -> Store Updates
  -> File System
```

## Current Limitations

### 1. Fetch Coordination
- Potential race conditions between parallel fetches
- No built-in fetch deduplication
- Limited coordination between different fetch layers

### 2. Resource Management
- Memory usage can grow with large thread fetches
- No automatic cleanup of unused references
- Relay connection pooling could be improved

### 3. Error Handling
- Limited retry mechanisms for failed fetches
- Incomplete error propagation between layers
- Basic error recovery strategies

### 4. Performance
- Sequential processing in thread fetching can be slow
- No request batching across different handlers
- Limited use of caching between fetch operations

### 5. Scalability
- Thread depth not effectively limited
- Profile fetching can become resource-intensive
- No rate limiting per relay

## Future Enhancements

### 1. Fetch Optimization
- Smart batch size adjustment
- Priority-based fetching
- Adaptive rate limiting
- Request deduplication

### 2. Resource Management
- Improved memory management
- Automatic reference cleanup
- Better connection pooling

### 3. Error Handling
- Robust retry mechanisms
- Comprehensive error propagation
- Advanced recovery strategies

### 4. Performance
- Parallel processing where safe
- Cross-handler request batching
- Enhanced caching system

### 5. Scalability
- Configurable thread depth limits
- Resource usage controls
- Per-relay rate limiting
