# Thread Fetch System Design

## Current Architecture

### Core Components
- ThreadFetchService: Central service for thread operations
- ReferenceProcessor: Manages note references and relationships
- UnifiedFetchProcessor: Handles relay communication
- FileService: Manages file operations

### Processor Interactions
- UnifiedFetchProcessor:
  - Handles bulk thread operations
  - Manages thread context through options
  - Provides batch-oriented processing
  - Better suited for large-scale operations
  - Used by ThreadFetchService

- FetchProcessor:
  - Handles interactive operations
  - Provides immediate event processing
  - Better for real-time updates
  - Used for right-click operations
  - Stream-based event handling

### Integration Points
- Thread Context:
  - Shared between processors
  - Maintained by ReferenceProcessor
  - Updated through both streams and batches
  - Critical for consistency

- Metadata Management:
  - Different approaches per processor
  - Needs careful synchronization
  - Affects thread relationship tracking
  - Impacts performance characteristics

### Working Features
- Single note thread fetch
- Profile-based thread fetch

### Issues
- Vault-wide thread fetch not functional
- Reference scanning needs improvement
- Batch processing could be more efficient

## Phase 1: Core Logic Enhancement

### Goals
1. Improve reference tracking
   ```typescript
   interface ThreadReference {
       eventId: string;
       root?: string;
       parent?: string;
       replies: string[];
       mentions: string[];
   }

   interface ThreadContext {
       references: Map<string, ThreadReference>;
       missing: Set<string>;
       complete: boolean;
   }
   ```

2. Enhance thread context handling
   - Track complete vs incomplete threads
   - Maintain thread hierarchy
   - Cache thread relationships

3. Implement efficient scanning
   - Track known vs unknown references
   - Prioritize missing references
   - Handle circular references

### Expected Outcome
- More reliable thread tracking
- Better understanding of missing content
- Foundation for vault-wide operations

## Phase 2: Fetch System Optimization

### Goals
1. Improve batch processing
   - Smart batching based on thread context
   - Prioritize important references
   - Handle partial results

2. Enhance relay operations
   - Connection pooling
   - Request deduplication
   - Retry handling

3. Add progress tracking
   - Track completion status
   - Handle partial success
   - Support cancellation

### Expected Outcome
- More efficient fetching
- Better handling of large operations
- Improved user feedback

## Phase 3: Reference System Enhancement

### Goals
1. Improve reference management
   - Efficient reference storage
   - Better cleanup handling
   - Reference validation

2. Add reference analytics
   - Track reference patterns
   - Monitor missing content
   - Generate statistics

3. Implement caching
   - Cache thread contexts
   - Cache reference data
   - Handle cache invalidation

### Expected Outcome
- Better reference handling
- More efficient operations
- Improved system understanding

## Implementation Notes

### Core Logic Focus
1. Thread context is central
   - All operations based on thread context
   - Maintain thread hierarchy
   - Track missing references

2. Reference handling is key
   - Efficient reference storage
   - Quick reference lookups
   - Proper cleanup

3. Batch operations
   - Smart batching based on context
   - Priority-based processing
   - Handle partial results

### Design Principles
1. Centralized Logic: Core operations in one place
2. Efficient Storage: Optimize data structures
3. Smart Processing: Prioritize important operations
4. Robust Recovery: Handle failures gracefully

### Testing Strategy
1. Unit tests for core logic
2. Integration tests for full flows
3. Performance benchmarks
4. Error case coverage

## Future Considerations

### Potential Enhancements
1. Advanced thread analysis
2. Predictive fetching
3. Background processing
4. Real-time updates

### Performance Goals
1. Quick single thread operations
2. Efficient batch processing
3. Minimal memory usage
4. Graceful degradation under load
