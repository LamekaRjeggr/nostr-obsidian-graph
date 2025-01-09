# Known Issues

## Current Limitations

### Profile Management
- Profile updates might have slight delay due to relay latency
- Profile images are stored as URLs, not downloaded locally
- Profile links use secure format: [pubkey](display_name.md)
  - Ensures cryptographic verification
  - Maintains readable graph display
- Supports both hex and npub formats for:
  - Profile fetching
  - Reply searching
  - User identification

### Pipeline System
- Templates cannot be modified at runtime
- No error recovery for failed operations in a template
- Subscription events are logged but not fully processed yet

### Relay Handling
- No automatic relay discovery
- No relay performance metrics
- All relays treated with equal priority

### Data Storage
- No compression for stored profiles
- No cleanup of outdated profiles
- No conflict resolution for concurrent updates

### Note Handling
- Basic thread reconstruction only
- No automatic thread aggregation
- References require manual navigation
- No visual thread indicators
- Limited handling of deleted notes

## Workarounds

### Profile Updates
If a profile isn't updating:
1. Try disabling and re-enabling the relay
2. Use "Sync Profile" command manually
3. Check relay connection status

### Relay Connections
If relays aren't connecting:
1. Ensure relay URLs start with "wss://"
2. Try removing and re-adding the relay
3. Check relay status in settings

### Template Operations
If a template operation fails:
1. Operation results are preserved up to the failure
2. Retry the operation manually
3. Check console for detailed error messages

### Finding Content
The search modal provides several ways to find content:
1. General Search
   - Use keywords to find specific posts
   - Filter by time range
2. Reply Search
   - Find replies to any user (hex or npub)
   - Find replies to specific notes
3. Profile Fetch
   - Get profile info directly
   - Works with both hex and npub

Additional navigation methods:
1. Use Obsidian graph view
   - Profile nodes show display names
   - Links maintain cryptographic security
2. Follow reference links in notes
3. Browse by profile or thread
4. Check note frontmatter for raw nostr_tags

## Future Solutions

### Short Term
- Add relay health checks
- Implement basic error recovery
- Add profile cleanup options
- Improve thread visualization
- Add thread navigation UI

### Medium Term
- Implement template validation
- Add relay performance tracking
- Add conflict resolution

### Long Term
- Custom templates
- Advanced error recovery
- Full pipeline monitoring

## Code Organization

### Service Refactoring Opportunities

#### Index Services
- IndexService and MetadataCacheService have overlapping responsibilities
- Could be consolidated or better separated
- Need clearer separation of concerns between caching and indexing

#### Vault Service
- Currently handles multiple event types and directory management
- Could be split into more focused services:
  - Directory management service
  - Event type specific services
  - File system operations service

#### Note File Service
- Combines file operations with follow status checking
- Potential improvements:
  - Separate follow status checking into dedicated service
  - Extract file path generation logic
  - Split content generation from file operations

#### Main Service Organization
- Service initialization could be more modular
- Command handling could be separated
- Event handling could be better organized

### Future Improvements
- Create dedicated directory management service
- Split event handling by type
- Implement better service dependency management
- Add service lifecycle management
