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

Author: [pubkey](display_name.md)  # Secure linking format

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

### Secure Linking System

The plugin implements a cryptographically secure linking system that balances security with readability:

1. Link Format:
   ```markdown
   [pubkey](display_name.md)
   ```
   - Link text: Full pubkey (for verification)
   - Link target: Display name (for readability)

2. Security Features:
   - Pubkey always visible in link text
   - Profile files contain pubkey in frontmatter
   - Links verified through pubkey matching
   - Impersonation prevented by pubkey verification

3. Benefits:
   - Standard Markdown compatibility
   - Clean graph visualization
   - Cryptographic security
   - Human-readable navigation

4. Implementation:
   - NoteFileService creates secure links
   - ProfileFileService manages profile files
   - ObsidianFileService handles lookup and verification

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

## Version Control

### Git Configuration
The repository includes standard Git configuration for a TypeScript/Node.js project:

```
.gitignore        # Specifies which files Git should ignore
├── Dependencies  # node_modules/, package-lock.json
├── Build output # dist/, main.js, *.js.map, *.d.ts
├── IDE files    # .idea/, .vscode/, *.swp
├── Environment  # .env files
├── Obsidian    # data.json, .hot-reload.json
└── Temp files  # logs, coverage, cache
```

## Build Process

The plugin uses esbuild for bundling and compilation:

### Build Configuration
```javascript
// esbuild.config.mjs
{
    entryPoints: ["src/main.ts"],
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    target: "es2018",
    sourcemap: false,  // in production
    treeShaking: true,
    outfile: "main.js"
}
```

### Build Steps
1. esbuild bundles TypeScript files directly
2. External dependencies (obsidian) are excluded
3. Output is a single main.js file
4. Tree shaking removes unused code
5. Source maps included in development mode

### Development Mode
- Watch mode rebuilds on file changes
- Source maps enabled for debugging
- No minification for better debugging

### Production Build
- Tree shaking enabled
- Source maps disabled
- Code minified and optimized

## Potential Refactoring

### Service Organization

The current service architecture could be improved through better separation of concerns:

#### Core Services
- IndexService and MetadataCacheService could be reorganized:
  ```
  services/core/
  ├── index/
  │   ├── index.service.ts       # Pure indexing logic
  │   ├── cache.service.ts       # Cache management
  │   └── search.service.ts      # Search operations
  ```

#### File System Services
- VaultService responsibilities could be split:
  ```
  services/obsidian/
  ├── fs/
  │   ├── directory.service.ts   # Directory management
  │   ├── file.service.ts        # File operations
  │   └── vault.service.ts       # High-level coordination
  ```

#### Event Services
- Event handling could be more modular:
  ```
  services/nostr/events/
  ├── handlers/
  │   ├── note.handler.ts        # Note event handling
  │   ├── profile.handler.ts     # Profile event handling
  │   └── follow.handler.ts      # Follow event handling
  ├── storage/
  │   └── event.store.ts         # Event persistence
  └── event.service.ts           # Event coordination
  ```

### Benefits
- Clearer responsibility boundaries
- Easier testing and maintenance
- Better dependency management
- More flexible for future changes

This reorganization would maintain the current functionality while making the codebase more maintainable and extensible.
