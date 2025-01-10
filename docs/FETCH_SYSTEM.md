# Nostr Fetch System

## Overview
The fetch system provides a robust way to retrieve and process Nostr content through a unified processing chain. It handles both profiles and notes while maintaining relationships and metadata.

## Components

### 1. FetchProcessor
Core processing engine that handles:
- Event streaming
- Temporal ordering
- Reference tracking
- Metadata processing

### 2. Settings Management
Settings are persisted across sessions and control fetch behavior:

```typescript
interface FetchSettings {
    // Regular Fetch Settings
    notesPerProfile: number;    // Max notes per profile (1-500)
    batchSize: number;         // Notes per request (1-500)
    includeOwnNotes: boolean;  // Include user's own notes
}
```

Settings are saved immediately when changed and loaded on plugin start.

### 3. Batch Processing
The BatchProcessor implements an intelligent fetching strategy:
- 70% of batch size for new authors
- 30% of batch size for authors with existing notes
- Chronological ordering through TemporalEventStore
- Reference tracking through ReferenceStore

## Processing Flow

1. Right-Click Fetch:
```typescript
// For profiles (kind 0):
metadata -> FetchProcessor.processFollows()
  -> BatchProcessor.processBatch()
  -> EventStreamHandler

// For notes (kind 1):
metadata -> Extract IDs (notes & profiles)
  -> FetchProcessor.processFollows()
  -> Complete processing chain
```

2. Event Processing:
```typescript
Event -> EventStreamHandler
  -> Appropriate Handler (Note/Profile)
  -> Store Updates (Temporal/Reference)
  -> File System
```

## Settings Persistence

Settings are managed through a complete cycle:

1. Storage:
```typescript
// Saving settings
onSettingsChange -> saveSettings() -> data.json

// Loading settings
loadSettings() -> Object.assign(DEFAULT_SETTINGS, loadData())
```

2. Modal Integration:
```typescript
// Settings modal shows current values
FetchSettingsModal(currentSettings)

// Changes are saved immediately
onChange -> saveSettings() -> updateServices()
```

## Implementation Details

### 1. Fetch Limits
- Note fetching respects batchSize setting
- Profile fetching follows notesPerProfile limit
- Both limits persist across sessions

### 2. Reference Handling
- E-tags tracked for note references
- P-tags tracked for profile mentions
- Bi-directional relationships maintained

### 3. Metadata Processing
- Note titles cached
- Profile metadata preserved
- Temporal ordering maintained

## Future Enhancements

1. Enhanced Batching
- Smart batch size adjustment
- Priority-based fetching
- Adaptive rate limiting

2. Extended Settings
- Relay-specific limits
- Content type filtering
- Custom metadata fields

3. Performance Optimizations
- Improved caching
- Parallel processing
- Progressive loading
