# Known Issues

## Memory Management
1. Cache System:
   - NoteCacheManager has no size limits or eviction policy
   - Title and link caches grow unbounded
   - No cache persistence between sessions
   - Title cache and note cache can get out of sync
   - No validation between file content and cache
   - Cache not cleared on file deletions

## File Operations
2. Race Conditions:
   - FileService's saveNote/saveProfile can create duplicate files
   - No atomic operations for file updates
   - Potential conflicts during concurrent profile/note updates
   - Profile updates can break existing links
   - Backlinks not updated when notes are moved/renamed
   - No cleanup of orphaned profile files

## Event Handling
3. Relay Communication:
   - UnifiedFetchProcessor doesn't handle failed relay connections gracefully
   - No retry mechanism for failed event fetches
   - Event stream can get stuck if error occurs mid-processing
   - No timeout handling for slow relay responses

## Poll System
4. Vote Management:
   - Vote deduplication relies only on pubkey
   - No handling of poll close events
   - Vote counts can get out of sync with actual votes
   - No validation of vote option IDs
   - No expiration handling for old polls
   - Inconsistent vote state across relays

## Future Improvements
1. Cache System:
   - Implement LRU cache with size limits
   - Add cache persistence to disk
   - Add cache validation and sync mechanisms
   - Implement cache cleanup on file operations

2. File Operations:
   - Add file locking for atomic operations
   - Implement proper conflict resolution
   - Add orphaned file cleanup
   - Improve backlink maintenance

3. Event Handling:
   - Add retry mechanisms for failed fetches
   - Implement proper error recovery
   - Add timeout handling
   - Improve relay connection management

4. Poll System:
   - Implement proper vote verification
   - Add poll expiration handling
   - Improve vote state consistency
   - Add vote option validation
