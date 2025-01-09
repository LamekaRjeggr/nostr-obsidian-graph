# Nostr Graph Plugin for Obsidian

Turn your Obsidian vault into a personal Nostr reader! This plugin lets you save your Nostr content (posts, profiles, and conversations) as regular markdown files that you can read, search, and organize in Obsidian.

## What is Nostr?

Nostr is a simple, open protocol for global social networks. Think of it like email, but for social media - anyone can participate, and no single company controls it. When you use Nostr:
- Your posts can reach anyone on the network
- You own your data and connections
- You can switch between different apps (like this plugin!)
- No central authority can lock you out

## What This Plugin Does

### For Your Content
- Saves your Nostr posts as markdown files
- Organizes everything neatly in folders
- Keeps your content in sync with Nostr
- Lets you read and search offline

### For Following Others
- Saves posts from people you follow
- Keeps track of your follow list
- Downloads profile information
- Shows connections in Obsidian's graph view

### Smart Features
- Updates automatically in the background
- Shows threads and conversations
- Works with multiple Nostr relays
- Keeps all the technical details in the background

## How Your Files Are Organized

```
nostr/
├── user notes/         # Your posts
├── user profile/       # Your profile info
├── user follows/       # People you follow
└── followed profiles/  # Their profile info
```

## Getting Started

1. Download the latest release
2. Put it in your vault's plugins folder: `.obsidian/plugins/nostr-obsidian-graph/`
3. Restart Obsidian
4. Turn on the plugin in Settings → Community plugins
5. Set up your account:
   - Add your public key (starts with npub)
   - Add some relays (they start with wss://)
   - Choose your sync settings
   - Pick how often to update

## What You Can Do

### Profile Stuff
- Get your profile info
- Update your follow list
- Download profiles you follow

### Post Stuff
- Download your posts
- Search through posts
- Keep everything up to date

### Quick Actions
Right-click any Nostr file to:
- Refresh the content
- Get new replies
- Update profiles
- Update follow lists

## Current Limitations

- Only works with npub keys (not hex)
- Basic thread display for now
- Manual relay setup needed
- Updates might take a moment
- Files aren't compressed
- Some errors need manual fixes

## Quick Fixes

### If Profiles Won't Update
1. Turn the relay off and on
2. Try the "Sync Profile" command
3. Check if relay is connected

### If Relays Won't Connect
1. Make sure they start with "wss://"
2. Try removing and adding again
3. Look in the settings

### Finding Posts
Try these methods:
1. Use Obsidian's graph view
2. Click the links in posts
3. Search in Obsidian
4. Look at the note details

## Coming Soon

### Soon
- Better relay connections
- Faster updates
- Profile cleanup tools
- Thread viewing improvements
- Better navigation

### Later
- Template customization
- Relay performance tools
- Conflict handling

### Future
- Custom templates
- Better error handling
- Full system monitoring

## Want to Help?

Check out [STRUCTURE.md](STRUCTURE.md) for technical details and how to contribute.

## More Info

### Documentation
- [STRUCTURE.md](STRUCTURE.md) - How everything works
- [OBSIDIAN_REFERENCE.md](OBSIDIAN_REFERENCE.md) - Obsidian details
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) - Problems and solutions
