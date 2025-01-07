# Project Structure

## Directory Structure

### Source Code
```
src/
├── main.ts                 # Plugin entry point
├── interfaces.ts           # Core interfaces
├── types.ts               # Type definitions
├── settings-tab.ts        # Settings UI
└── services/
    ├── core/
    │   ├── pool.service.ts      # Nostr relay pool management
    │   ├── relay.service.ts     # Relay management
    │   ├── event.service.ts     # Event handling
    │   ├── filename.service.ts  # Filename generation
    │   ├── markdown.service.ts  # Markdown formatting
    │   ├── timestamp.service.ts # Timestamp formatting
    │   └── index.service.ts     # File indexing and lookup
    ├── nostr/
    │   ├── profile.service.ts   # Profile operations
    │   ├── note.service.ts      # Note operations
    │   └── follow.service.ts    # Follow list operations
    └── obsidian/
        └── vault.service.ts     # File system operations
```

### Data Storage
```
nostr/
  ├── user notes/         # Text note events (kind 1)
  ├── user profile/       # Profile metadata events (kind 0)
  ├── user follows/       # Contact list events (kind 3)
  └── followed profiles/  # Profile metadata of followed users (kind 0)
```

## Service Dependencies

### Core Services
- **IndexService**: No dependencies, initializes first
- **PoolService**: No dependencies
- **RelayService**: Depends on PoolService
- **EventService**: Depends on PoolService
- **KeyService**: No dependencies
- **FilenameService**: No dependencies
- **MarkdownService**: No dependencies
- **TimestampService**: No dependencies
- **FrontmatterService**: No dependencies, provides common frontmatter operations

### Obsidian Services
- **VaultService**: Depends on IndexService

### Nostr Services
- **ProfileService**: Depends on RelayService, EventService
- **NoteService**: Depends on RelayService, EventService
- **FollowService**: Depends on RelayService, EventService

## Initialization Order
1. Core Services:
   - IndexService (first, as VaultService depends on it)
   - PoolService
   - RelayService
   - EventService
   - KeyService
   - Other core services

2. Obsidian Services:
   - VaultService (after IndexService)

3. Nostr Services:
   - ProfileService
   - NoteService
   - FollowService

## Lazy Loading
- PoolService uses lazy connection pattern via nostr-tools
- Connections are only established when needed
- First fetch operation triggers connection
- Improves plugin load time

## Event Storage

Events are stored as markdown files with frontmatter in their respective directories. The content section contains the event's content, while the frontmatter contains the complete event data.

### File Structure

#### Note Files (nostr/user notes/[title].md):
```markdown
---
created: "2024-01-03T12:34:56Z"  # ISO timestamp
kind: 1
id: "..."
pubkey: "..."
nostr_tags: []
---

This is the note content

---
> [!note]- Raw Event JSON
> ```json
> {
>   "id": "...",
>   "pubkey": "...",
>   "created_at": 1704289093,
>   "kind": 1,
>   "tags": [],
>   "content": "This is the note content",
>   "sig": "..."
> }
> ```
```

#### Profile Files (nostr/user profile/[name].md):
```markdown
---
created: "2024-01-03T12:34:56Z"  # ISO timestamp
kind: 0
id: "..."
pubkey: "..."
nostr_tags: []
name: "..."
display_name: "..."
nip05: "..."
---

# Display Name

About text here...

Website: https://...
NIP-05: user@domain.com

---
> [!note]- Raw Event JSON
> ```json
> {
>   "id": "...",
>   "pubkey": "...",
>   "created_at": 1704289093,
>   "kind": 0,
>   "tags": [],
>   "content": "{\"name\":\"...\",\"display_name\":\"...\",\"about\":\"...\"}",
>   "sig": "..."
> }
> ```
```

## Settings

The plugin settings include:
- Relay configuration (URLs and enabled status)
- User's public key (npub format)
- Auto-sync settings
- Update interval

## Commands

The plugin provides commands for:
- Fetching user's profile
- Fetching user's notes
- Fetching user's follow list

## Context Menu

The plugin adds a context menu item to event files that allows:
- Refetching profile data for kind 0 events
- Refetching note data for kind 1 events
- Refetching follow list data for kind 3 events
