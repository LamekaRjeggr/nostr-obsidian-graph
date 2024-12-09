# Nostr Graph Plugin for Obsidian

This plugin integrates Nostr with Obsidian, allowing you to fetch and organize your Nostr content within Obsidian's vault structure.

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
- Direct hex key fetching support (notes only, no contacts included)

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Nostr Graph"
4. Install and enable the plugin

## Note Structure

### Frontmatter
Each note includes frontmatter with the following fields:
```yaml
---
id: [note ID in hex]
pubkey: [[pubkey in hex]]  # Links via alias to profile
author: [[Author Name]]    # Links to profile by name
created: [unix timestamp]
kind: [nostr event kind]
tags: [raw tag array]
root: [[root note]] # Optional, for thread roots
reply_to: [[parent note]] # Optional, for replies
mentions: [array of mentioned IDs] # Optional
topics: [array of topic tags] # Optional
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

### Sections
Notes are organized with the following sections:
1. Content: The main note content
2. Chronological Links: Previous/Next notes in sequence
3. References: Thread roots, replies, mentions, and topics
4. Referenced By: Notes that reference this note

## Directory Structure

```
nostr/
├── notes/     # Original posts
├── profiles/  # Profile information
└── replies/   # Reply posts (optional)
```

## Commands

1. **Fetch Notes**
   - Fetches notes for configured npub
   - Includes notes from contacts
   - Uses settings for relay configuration
   - Maintains chronological order

2. **Fetch Notes by Hex Key**
   - Fetches notes for any hex key
   - Only fetches notes from specified key (no contacts)
   - Direct hex input without conversion
   - Same processing pipeline as npub fetch

3. **Clear Notes**
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

## Profile Linking

The plugin uses Obsidian's alias system to enable flexible linking:

1. **Pubkey Links**
   - Store pubkeys as aliases in profile frontmatter
   - Allow linking via `[[pubkey]]` syntax
   - Automatically resolves to profile file

2. **Name Links**
   - Use display names for profile filenames
   - Enable linking via `[[Author Name]]` syntax
   - More readable in graph view

3. **Bi-directional Links**
   - Both pubkey and name links point to same profile
   - Maintains technical accuracy with human readability
   - Improves graph visualization

## Support

For issues and feature requests, please use the GitHub repository's issue tracker. There are plenty of issues and help is welcome. :)
