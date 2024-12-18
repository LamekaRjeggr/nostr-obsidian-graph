# Nostr Graph Plugin for Obsidian

This plugin integrates Nostr with Obsidian, allowing you to fetch and organize your Nostr content within Obsidian's vault structure.

![Demo](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/readme%20gif.gif?raw=true)


Compatibility

	This plugin has only been tested on macOS. Compatibility with other operating systems is currently unverified.

## Features

- Fetch notes from Nostr relays (up to 500 notes per batch)
- Store profiles and notes in organized directories
- Smart profile linking system
  - Link to profiles via both pubkey and display name
  - Automatic bi-directional linking
  - Better graph visualization
- Automatic linking between related notes
- Configurable auto-update
- Reply separation support
- Direct hex key fetching support
  - Auto-population from current note/profile
  - Notes only, no contacts included
  - Debug logging for troubleshooting
- Profile mention fetching support
  - Fetch profiles for users mentioned in notes
  - Automatic profile linking for mentions
  - Command palette integration
- Note mention fetching support
  - Fetch referenced notes from e-tags
  - Hotkey support (Mod+Shift+N)
  - Automatic note linking
- Complete nostr tag preservation
  - Raw nostr tags stored in frontmatter
  - Compatible with Obsidian's metadata system
  - Topic tags integrated with Obsidian's tagging
- Human-readable timestamps
  - Preserves Unix timestamps for API compatibility
  - Adds formatted dates in frontmatter
  - Native JavaScript date formatting
- Customizable relay configuration
  - Add/remove relays as needed
  - Enable/disable individual relays
  - Validation for proper relay URLs
  - At least one relay must remain active
- Reaction tracking
  - Track likes from kind 7 events
  - Track zaps from kind 9735 events
  - Frontmatter fields for reaction counts

## Installation


To install the Nostr Obsidian Graph plugin from GitHub, follow these steps:

Manual Installation: 1. Download the Plugin: • Visit the Nostr Obsidian Graph GitHub repository. • Click the “Code” button and select “Download ZIP.”

2.	Extract the Files:
•	Locate the downloaded ZIP file on your computer and extract its contents to a folder.

3.	Copy to Obsidian Plugins Folder:
•	Navigate to your Obsidian vault folder.
•	Within the vault, go to the .obsidian/plugins/ directory.
•	Copy the extracted plugin folder into the plugins directory.
•	Ensure the folder is named nostr-obsidian-graph.

4.	Enable the Plugin in Obsidian:
•	Open Obsidian.
•	Go to Settings > Community Plugins.
•	Enable the “Nostr Obsidian Graph” plugin.

5.	Configure the Plugin:
•	In Obsidian, navigate to Settings > Nostr Obsidian Graph to adjust the plugin’s settings to your preference.
Alternative Method: Cloning via Git: 1. Open Terminal: • Access your terminal application. 2. Navigate to Plugins Directory: • Change the directory to your Obsidian vault’s .obsidian/plugins/ folder:

cd path/to/your/vault/.obsidian/plugins/

3.	Clone the Repository:
•	Run the following command to clone the plugin repository:
git clone https://github.com/LamekaRjeggr/nostr-obsidian-graph.git

4.	Enable and Configure the Plugin:
•	Restart Obsidian.
•	Follow steps 4 and 5 from the manual installation to enable and configure the plugin.
Note: The option to install this plugin directly from Obsidian’s Community Plugins is planned for a future release.

For more information, visit the Nostr Obsidian Graph GitHub repository.


Install via Obsidian Community Plugins (Coming Soon)

## Note Structure

### Frontmatter
Each note includes frontmatter with the following fields:
```yaml
---
id: [note ID in hex]
pubkey: [[pubkey in hex]]  # Links via alias to profile
author: [[Author Name]]    # Links to profile by name
created: [unix timestamp]
created_at: [human readable date]  # e.g. "December 9, 2023, 12:30 PM"
kind: [nostr event kind]
nostr_tags:               # Raw nostr tags array
  - ["e", "event_id", "relay_url", "marker"]
  - ["p", "pubkey", "relay_url"]
  - ["t", "topic"]
tags:                     # Obsidian-compatible topic tags
  - topic1
  - topic2
root: [[root note]]       # Optional, for thread roots
reply_to: [[parent note]] # Optional, for replies
mentions: [array of mentioned IDs] # Optional
topics: [array of topic tags] # Optional
likes: [number]          # Count of '+' reactions
zaps: [number]          # Count of zap events
zap_amount: [number]    # Total amount of sats received
---
```

### Profile Structure
Profile files are structured to support both pubkey and name-based linking:
```yaml
---
aliases:
  - [pubkey in hex]  # Enables linking via pubkey
name: [username]
display_name: [display name]
nip05: [NIP-05 identifier]
picture: [avatar URL]
---
```

### Directory Structure

```
nostr/
├── notes/     # Original posts
├── profiles/  # Profile information
│   └── mentions/  # Mentioned profiles
└── replies/   # Reply posts (optional)
```

## Commands

1. **Fetch Notes**
   - Fetches notes for configured npub
   - Includes notes from contacts
   - Uses settings for relay configuration
   - Maintains chronological order
   - Shows progress notifications

2. **Fetch Notes by Hex Key**
   - Auto-populates hex key from current note/profile
   - Fetches notes for any hex key
   - Only fetches notes from specified key (no contacts)
   - Same processing pipeline as npub fetch
   - Debug logging for troubleshooting

3. **Fetch Mentioned Profiles**
   - Fetches profiles for users mentioned in notes
   - Uses existing mentions from notes
   - Updates profile information
   - Creates profile files with proper linking

4. **Fetch Mentioned Notes** (Mod+Shift+N)
   - Fetches notes referenced in e-tags
   - Scans both notes and replies directories
   - Creates note files with proper linking
   - Shows progress notifications

5. **Clear Notes**
   - Resets note cache
   - Clears profile data
   - Maintains file structure

## Settings

- Nostr Public Key: Your npub
- Notes Per Profile: Maximum notes to fetch per profile
- Fetch Batch Size: Notes per fetch request (1-500)
- Auto Update: Enable automatic updates
- Update Interval: Time between updates (in seconds)
- Include Own Notes: Include your posts
- Separate Reply Notes: Enable reply directory
- Profile Naming: Use public key or display name for profile filenames
- Relay Configuration: Add, remove, or toggle relays

## Support

Are you finding value in the plugin?

Lightning contributions can be sent to: `syntaxerrs@strike.me`

Care to contribute or help? Visit our [GitHub repository](https://github.com/LamekaRjeggr/nostr-obsidian-graph.git)

## Development

### Architecture

The plugin uses a modular architecture with clear separation of concerns:

1. **Core Layer**
- Interfaces define contracts for components
- Handlers process different event types
- Services provide core functionality

2. **Service Layer**
- Temporal services manage chronological ordering
- Reference services handle note relationships
- Event system coordinates communication
- File services manage vault integration

3. **Component Organization**
- Each component has a single responsibility
- Clear interfaces for dependency management
- Proper error handling throughout

For detailed architecture information, see [STRUCTURE.md](STRUCTURE.md).

### Contributing

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`
4. For development: `npm run dev`

See [CHANGELOG.md](CHANGELOG.md) for version history and recent changes.
