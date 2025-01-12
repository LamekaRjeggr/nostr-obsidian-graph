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

1. Cache Management
   - Need better cache invalidation strategy
   - Memory usage optimization needed
   - Cache persistence between sessions

2. Performance
   - Large thread fetches can be slow
   - Profile fetching could be optimized
   - Batch processing improvements needed
