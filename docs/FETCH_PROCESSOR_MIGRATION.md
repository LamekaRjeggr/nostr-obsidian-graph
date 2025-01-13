# Fetch System Guide

## Components

### UnifiedFetchProcessor (New)
- Bulk operations with proper event ordering
- Contact graph support
- Profile data integration
- Thread context handling

### FetchProcessor (Legacy)
- Interactive operations (right-click menu)
- Stream-based processing
- Being phased out

## Event System

### Event Types
```typescript
enum NostrEventType {
    PROFILE = 'PROFILE',     // kind 0
    NOTE = 'NOTE',          // kind 1
    CONTACT = 'CONTACT',    // kind 3
    REACTION = 'REACTION',  // kind 7
    ZAP = 'ZAP'            // kind 9735
}
```

### Event Flow
```
RelayService → EventBus → EventStreamHandler → Handlers → FileService
     ↓            ↓              ↓               ↓            ↓
Profiles → Contacts → Notes → Reactions → Reference Graph → State Updates
```

### Priority Order
1. Profile events (kind 0)
2. Contact events (kind 3)
3. Note events (kind 1)
4. Reaction events (kind 7, 9735)

## Usage Examples

### Basic Fetch
```typescript
// Fetch notes with proper ordering
await fetchWithOptions({
    kinds: [EventKinds.NOTE],
    limit: 100
});
```

### User Content
```typescript
// Fetch user's content with contacts
await fetchWithOptions({
    kinds: [EventKinds.NOTE],
    author: userPubkey,
    contacts: {
        include: true,
        fetchProfiles: true,
        linkInGraph: true
    }
});
```

### Thread Context
```typescript
// Fetch thread with replies
await fetchThreadContext(eventId, {
    limit: 50,
    fetchReplies: true
});
```

### Search
```typescript
// Search with NIP-50
await fetchWithOptions({
    kinds: [EventKinds.NOTE],
    search: ['keyword'],
    limit: 100
});
```

### Node Content
```typescript
// Fetch content for a specific node
await processNodeContent(filePath, {
    fetchReferences: true,
    includeProfiles: true
});
```

## Best Practices

1. Event Ordering
   - Always fetch profiles before notes
   - Initialize contact graph before profile fetches
   - Process reactions after notes

2. Performance
   - Use appropriate limits (max 500 for bulk)
   - Enable batch processing for large fetches
   - Consider memory with large contact lists

3. Error Handling
   - Validate relay responses
   - Check event data integrity
   - Handle timeouts gracefully

4. State Management
   - Clear caches when switching processors
   - Monitor memory usage
   - Track operation progress

## Migration Phases

### Phase 1: Core Infrastructure (30%)
Success Criteria:
- [ ] Event bus implementation complete
- [ ] Basic event handling working
- [ ] File operations functional
- [ ] Core interfaces defined
Verification:
- All core tests passing
- Basic event flow working
- File operations verified

### Phase 2: Contact Processing (60%) ✓
Success Criteria:
- [x] Contact graph integration complete
- [x] Profile data handling working
- [x] Event validation implemented
- [x] Stream processing functional
Verification:
- Contact graph tests passing
- Profile fetching working
- Event validation verified

### Phase 3: Feature Migration (80%) (Next)
Success Criteria:
- [ ] Right-click operations migrated
- [ ] Legacy processor deprecated
- [ ] Settings system migrated
- [ ] Thread context handling complete
Verification:
- All features working in new system
- No legacy code dependencies
- Settings migration tested

### Phase 4: Performance & Polish (100%)
Success Criteria:
- [ ] Profile queue optimization complete
- [ ] Cache management improved
- [ ] Memory usage optimized
- [ ] Error recovery implemented
Verification:
- Performance benchmarks passing
- Memory usage within targets
- Error handling verified

## Progress Tracking

### Current Phase: 3 (Feature Migration)
Completed:
- Event bus implementation
- Basic event handling
- File operations
- Core interfaces
- Contact graph integration
- Profile data handling
- Event validation
- Stream processing

In Progress:
- Right-click operations migration
- Legacy processor deprecation
- Settings system migration

Remaining:
- Thread context handling
- Performance optimization
- Error recovery system

## Troubleshooting

1. Missing Profiles
   - Check event ordering
   - Verify contact graph initialization
   - Ensure profile fetch limits

2. Incomplete Threads
   - Check reference processing
   - Verify thread context
   - Validate event markers

3. Performance Issues
   - Reduce fetch limits
   - Enable batch processing
   - Clear caches if needed
