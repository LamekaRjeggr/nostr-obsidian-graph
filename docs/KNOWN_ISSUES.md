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
   - Vault-wide thread fetch is not functional
   - Single note thread fetch works correctly
   - Profile-based thread fetch works correctly
   - Need to investigate vault-wide reference scanning

2. Cache Management
   - Need better cache invalidation strategy
   - Memory usage optimization needed
   - Cache persistence between sessions

3. Performance
   - Large thread fetches can be slow
   - Profile fetching could be optimized
   - Batch processing improvements needed

4. Fetch System Architecture
   - Parallel fetch implementations with overlapping functionality
   - Duplicated contact fetching logic across components
   - Separate batching strategies in different processors
   - Right-click operations tied to legacy FetchProcessor
   - Complex metadata handling split across processors

5. Integration Challenges
   - Metadata handling differences between processors
   - Event stream vs batch processing trade-offs
   - Complex state management in UnifiedFetchProcessor
   - Performance implications of different approaches
   - Error handling inconsistencies
