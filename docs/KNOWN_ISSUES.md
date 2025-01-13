# Known Issues

## ✓ Note Relationships (Resolved)

Previous issue with chronological linking has been resolved:

1. Previous Implementation (Resolved)
   - ~~Notes were ordered purely by created_at timestamp~~
   - ~~Previous/Next links were created based on chronological order~~
   - ~~No consideration of thread relationships from nostr tags~~

2. Current Implementation
   - Uses 'e' tags with 'root' and 'reply' markers to build thread structure
   - Properly handles thread relationships through TagProcessor
   - Maintains accurate conversation flow based on nostr protocol
   - Preserves timestamps for display purposes only

3. Benefits
   - Thread context is properly maintained
   - Replies are correctly linked to parent posts
   - Conversation flow matches nostr's design
   - Simpler, more accurate relationship model

## Current Issues

1. Thread Fetching
   - ✓ Vault-wide thread fetch now functional with parallel processing
   - ✓ Improved reliability with retry mechanism
   - ✓ Better performance with concurrent batches
   - ✓ Enhanced progress tracking
   - ✓ Single note thread fetch works correctly
   - ✓ Profile-based thread fetch works correctly
   - ✓ Thread context handling improved
   - Need to investigate vault-wide reference scanning (future enhancement)

2. Cache Management
   - Need better cache invalidation strategy
   - Memory usage optimization needed
   - Cache persistence between sessions
   - ✓ Improved memory management in batch processing

3. Performance
   - Large thread fetches can be slow
   - Profile fetching could be optimized
   - ✓ Batch processing improvements implemented
   - ✓ Reduced bundle size by ~30%

4. Contact Processing
   - Contact graph initialization can be slow for large follow lists
   - Memory usage increases with contact graph size
   - ✓ Profile fetching for large contact lists optimized
   - ✓ Contact event validation improved
   - ✓ Better error handling for contact graph operations
   - ✓ Contact metadata persistence implemented

5. Fetch System Architecture
   - ✓ Contact fetching unified through ContactGraphService
   - ✓ Profile fetching integrated with contact graph
   - ✓ Contact event validation improved
   - ✓ Right-click operations migrated to UnifiedFetchProcessor
   - ✓ Legacy FetchProcessor deprecated
   - ✓ Unified metadata handling implemented

6. Integration Challenges
   - ✓ Metadata handling unified across processors
   - ✓ Event stream and batch processing unified
   - ✓ Improved state management in UnifiedFetchProcessor
   - ✓ Better error handling with event bus
   - ✓ Consistent npub/hex key handling

7. Profile Processing
   - ✓ Unified profile event handling through stream handler
   - ✓ Removed duplicate event handler in UnifiedFetchService
   - ✓ Fixed direct event emission in UnifiedFetchProcessor
   - Profile directory management needs improvement:
     * Profile updates can create duplicate files
     * Need better strategy for handling profile moves between directories
     * Profile deletion/cleanup needs improvement
   - MentionedProfileFetcher still needs refactoring:
     * Direct event emission needs to be replaced with stream handler
     * Profile moves should be handled after stream processing
     * Better error handling for profile moves
