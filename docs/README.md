# Nostr Graph Plugin for Obsidian

A powerful Obsidian plugin that connects your vault to the Nostr network, enabling you to store and visualize your Nostr content (notes, profiles, and conversations) as markdown files while maintaining bidirectional synchronization with the network.

## Features

### Core Functionality
- Fetch and store Nostr events as markdown files with complete metadata
- Real-time synchronization with Nostr relays
- Automatic directory organization for different event types
- Bidirectional updates between Obsidian and Nostr

### Content Management
- Store text notes (kind 1) with thread context
- Maintain user profiles (kind 0) with metadata
- Track contact lists (kind 3) and relationships
- Preserve complete event data in frontmatter
- Link profiles and notes with Obsidian references

### Integration Features
- Obsidian graph visualization support
- Command palette integration
- Context menu for quick actions
- Real-time relay subscriptions
- Auto-sync capabilities

## Directory Structure

```
nostr/
├── user notes/         # Text note events (kind 1)
├── user profile/       # Profile metadata events (kind 0)
├── user follows/       # Contact list events (kind 3)
└── followed profiles/  # Profile metadata of followed users (kind 0)
```

## Installation

Coming soon to Obsidian Community Plugins!

For now, you can install manually:
1. Download the latest release from GitHub
2. Extract the files to your vault's `.obsidian/plugins/nostr-obsidian-graph/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins
5. Configure the plugin:
   - Enter your public key (npub format)
   - Add/enable relay connections
   - Configure sync preferences
   - Set update intervals

## Commands

### Profile Management
- `Fetch Profile`: Get user metadata (kind 0)
- `Fetch Follow List`: Get user's contact list (kind 3)
- `Fetch Follow Profiles`: Get profiles of followed users

### Note Management
- `Fetch Notes`: Get user's recent notes
- `Search Nostr Notes`: Search through notes
- `Sync All`: Update all stored content

### Context Menu
Right-click on any Nostr file to:
- Refresh profile data
- Update note content
- Fetch new replies
- Update follow lists

## Current Limitations

- Only supports npub format in settings
- Basic thread reconstruction
- No automatic relay discovery
- Profile updates may have slight delay
- No compression for stored data
- Limited error recovery in templates

## Workarounds

### Profile Updates
If profiles aren't updating:
1. Disable and re-enable the relay
2. Use "Sync Profile" command
3. Check relay connection status

### Relay Connections
If relays aren't connecting:
1. Ensure URLs start with "wss://"
2. Remove and re-add the relay
3. Check settings status

### Note Navigation
For better thread navigation:
1. Use Obsidian graph view
2. Follow reference links
3. Use Obsidian search
4. Check note frontmatter

## Coming Soon

### Short Term
- Relay health checks
- Basic error recovery
- Profile cleanup options
- Thread visualization
- Thread navigation UI

### Medium Term
- Template validation
- Relay performance tracking
- Conflict resolution

### Long Term
- Custom template creation
- Advanced error recovery
- Full pipeline monitoring

## Contributing

See [STRUCTURE.md](STRUCTURE.md) for architecture details and contribution guidelines.

## Documentation

### Core References
- [STRUCTURE.md](STRUCTURE.md) - Architecture and implementation details
- [OBSIDIAN_REFERENCE.md](OBSIDIAN_REFERENCE.md) - Obsidian API usage
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) - Current limitations and workarounds
