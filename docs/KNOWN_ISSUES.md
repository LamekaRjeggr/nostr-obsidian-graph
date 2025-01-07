# Known Issues

## Current Limitations

### Profile Management
- Only supports npub format in settings (hex format will be converted)
- Profile updates might have slight delay due to relay latency
- Profile images are stored as URLs, not downloaded locally

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

### Note Navigation
If thread navigation is difficult:
1. Use Obsidian graph view to visualize connections
2. Follow reference links at bottom of notes
3. Use Obsidian search to find related notes
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
- Custom template creation
- Advanced error recovery
- Full pipeline monitoring
