# Nostr Graph Plugin for Obsidian

Connect your Obsidian vault to the Nostr network and visualize relationships between notes, profiles, and conversations.

## Features

- Fetch and store Nostr profiles as markdown files
- Build user graphs with contacts and notes
- Real-time updates through relay subscriptions
- Configurable relay connections
- Auto-sync capabilities
- Note synchronization with references
- Thread tracking and linking
- Profile mentions with links
- Obsidian graph integration

## Setup

1. Install the plugin
2. Open settings and configure:
   - Enter your npub (NIP-19 format)
   - Add/enable relays
   - Configure sync options

## Commands

### `Sync Profile`
Fetches a single profile:
- Gets user metadata (kind 0)
- Saves as markdown with frontmatter
- Updates on changes

### `Fetch User Graph`
Builds a complete user graph:
- Gets user profile
- Fetches contact list
- Gets profiles of contacts
- Retrieves user notes
- Enables real-time updates

### `Sync All Profiles`
Syncs all profiles in vault:
- Updates existing profiles
- Processes in batches
- Shows progress

## Directory Structure

```
nostr/
├── profiles/           # User profiles with metadata
├── notes/             # Nostr notes with references
└── replies/           # Reply events and threads
```

Notes are stored with:
- Complete nostr metadata
- Thread references
- Profile mentions
- Obsidian links

## Templates

The plugin uses templates to define what data to fetch:

```typescript
// User Graph Template
{
    operations: [
        userProfile,     // Kind 0
        contactList,     // Kind 3
        contactProfiles, // Kind 0
        userNotes       // Kind 1
    ]
}
```

## Auto Sync

Enable auto-sync in settings to:
- Keep profiles up to date
- Get real-time updates
- Maintain graph connections

## Coming Soon

- Graph visualization
- Search capabilities
- Custom note templates
- Advanced filtering

## Contributing

See STRUCTURE.md for architecture details and contribution guidelines.

## Documentation

### Core References
- [NDK Reference](NDK_REFERENCE.md) - NDK API reference
- [Obsidian Reference](OBSIDIAN_REFERENCE.md) - Obsidian API reference
- [Structure](STRUCTURE.md) - Pipeline architecture details

### Development
- [Known Issues](KNOWN_ISSUES.md) - Current limitations
- [Roadmap](ROADMAP.md) - Planned features

## Development

### Setup
```bash
git clone https://github.com/user/nostr-obsidian-graph
cd nostr-obsidian-graph
npm install
```

### Build
```bash
npm run build
```

### Watch
```bash
npm run dev
```
