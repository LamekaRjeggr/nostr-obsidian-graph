# Nostr Obsidian Graph

An Obsidian plugin for visualizing Nostr profiles and notes as a graph. This plugin allows you to connect to Nostr relays, fetch profiles and notes, and visualize them in your Obsidian vault. Currently write only with public key. The intention is to allow more focus and see where connections and communication intersect for interesting conversation. Reduction in over stimulating memes or rage porn is just a bonus. 

## Features

- Connect to multiple Nostr relays
- Fetch and store profile data
- Create markdown files for profiles and notes
- Generate network visualizations
- Configurable settings for relays and note limits
- Utilizes Public keys 

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Nostr Graph"
4. Install the plugin and enable it

## Manual Installation

1. Download the latest release
2. Extract the files to your `.obsidian/plugins/nostr-obsidian-graph/` folder
3. Reload Obsidian
4. Enable the plugin in Community Plugins settings

## Configuration

1. Enter your Nostr public key (npub format)
2. Configure relay list (default relays provided)
3. Set number of notes to fetch per profile (1-20)

## Usage

1. Open Command Palette (Ctrl/Cmd + P)
2. Search for "Fetch Nostr Profiles and Notes"
3. The plugin will:
   - Connect to configured relays
   - Fetch profile data and notes
   - Create markdown files in your vault
   - Generate network visualization

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/nostr-obsidian-graph.git

# Install dependencies
npm install

# Build
npm run build

# Development build with watch mode
npm run dev
```

## Dependencies

- [nostr-tools](https://github.com/nbd-wtf/nostr-tools) v1.17.0
- Obsidian API v0.12.0

## License

MIT License - see LICENSE file for details

## Author

LamekaRjeggr

## Version History

- 0.0.1: Initial release
  - Basic relay connectivity
  - Profile and note fetching
  - Markdown file generation
  - Network visualization

## Known Issues

- Browser console may show warnings about future compatibility with User-Agent strings and SharedArrayBuffer
- These warnings don't affect current functionality and will be addressed in future updates

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
