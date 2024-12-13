## Nostr Graph Plugin for Obsidian - User Guide

The **Nostr Graph Plugin for Obsidian** provides a robust integration between the decentralized Nostr network and the organizational capabilities of Obsidian. It enables you to fetch, organize, and visualize Nostr content, such as notes and profiles, directly within your Obsidian vault. By bridging these platforms, the plugin supports streamlined workflows for managing and analyzing Nostr data.

### Overview

The Nostr Graph Plugin simplifies the management of Nostr content by automating data fetching and organization. Users can efficiently retrieve notes, profiles, and mentions from Nostr relays, link them to related content, and visualize relationships within Obsidian’s graph view. This functionality caters to a broad range of use cases, from casual exploration to advanced data analysis.

---

## **Fork**


- **New to Nostr?** 

- **New to Obsidian?**

- **New to Both?** Get started with a primer on how Nostr functions as a decentralized protocol and how Obsidian enhances data organization.

- **Using Both Already?** Plug in your npub, follow at least one person, and explore the integration possibilities.



### Key Features

- **Retrieve Content:** Fetch notes and profiles from configurable Nostr relays.
- **Automatic Organization:** Store and link fetched data within structured directories for easy navigation.
- **Enhanced Metadata:** Enrich notes and profiles with detailed metadata fields for better search and categorization.



### Using the Plugin

#### Fetching Data
The plugin provides several commands to retrieve and organize Nostr content:

- **Fetch Notes:** Retrieves notes associated with your configured public key (npub).
- **Fetch Mentioned Profiles:** Fetches profiles mentioned within the retrieved notes.
- **Fetch Mentioned Notes:** Collects notes referenced in e-tags for comprehensive dataset creation.
![Commands.png](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/Commands.png?raw=true)

These commands are accessible via the command palette (Cmd/Ctrl+P) or hotkeys. Notifications inform you of the fetching progress and results.

#### Organizing Fetched Data
- **Notes Storage:** Notes are saved in a dedicated `nostr/notes/` directory with detailed metadata in the frontmatter.
- **Profiles Storage:** Profiles are stored in `nostr/profiles/`, with optional subdirectories for mentions.
- **Automatic Linking:** Relationships between notes, profiles, and mentions are automatically established for seamless navigation.






### What is Nostr?

**Notes and 
Other 
Stuff 
Transmitted by 
Relays**


#### A Decentralized, Open-Source Protocol for Social Media



#### Protocol

Nostr is a decentralized protocol that enables secure, censorship-resistant communication and content sharing. It operates without a central server by utilizing relays and public-private key cryptography, allowing users to freely publish, fetch, and interact with content across a distributed network.

#### Data Format

On Nostr, notes are formatted as JSON objects containing fields like the public key of the author, a Unix timestamp, event kind, tags, and content. This standardized structure ensures that notes are lightweight, interoperable, and easy to parse by relays and clients. In Obsidian, this format aligns closely with its use of frontmatter metadata, enabling seamless integration. The plugin converts Nostr notes into Markdown files, storing key information such as timestamps, tags, and relationships in the frontmatter. This approach allows users to benefit from Obsidian’s search, linking, and organizational tools while preserving the integrity of the original Nostr data.

#### Getting Started on Nostr

To begin using Nostr, you can create a free profile through services such as [nostrplebs.com](https://nostrplebs.com) or similar platforms. Once your profile is set up and you are following at least one person, you can integrate it with the Nostr Graph Plugin by entering your public key (npub) in the plugin settings. This ensures the plugin can fetch relevant notes and profiles, allowing you to immediately start organizing and exploring Nostr content within Obsidian.

#### Customizable Configuration

Nostr relies on two key components: clients and relays. Clients are the user-facing applications that allow you to create, read, and interact with content on the Nostr network. Examples include mobile apps, web platforms, and desktop tools. Relays, on the other hand, are servers that transmit and store messages, facilitating communication between clients. Currently, there are over 50 Nostr clients available, offering various interfaces and features tailored to different needs.

---


### Graph View and Data Exploration

The Nostr Graph Plugin uses Obsidian’s powerful graph view and data handling capabilities to provide a visually way to explore relationships between notes and profiles. This feature is central to understanding the connections within your Nostr content, whether you’re mapping discussions or analyzing user interactions.

![gif.gif](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/gif.gif?raw=true)

#### Linking Pathways

The plugin automatically establishes connections between related notes and profiles. These links allow for seamless navigation between associated content, potentially making it easier to trace discussions, follow reply threads, and understand interactions.

#### Local Graph

Utilize Obsidian’s local graph feature to focus on specific notes and their immediate relationships. This is especially helpful when diving into a particular topic or conversation, as it highlights relevant connections without overwhelming the view.


#### Tag Search

With metadata integration, the plugin supports tag-based searches to filter and locate notes quickly. Users can categorize content using topics, events, or keywords, enabling efficient exploration of their vault.
![Screenshot 2024-12-11 at 2.15.26 PM 2.png](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/Screenshot%202024-12-11%20at%202.15.26%20PM.png?raw=true)

---

To install the Nostr Obsidian Graph plugin from GitHub, follow these steps:

Manual Installation:
	1.	Download the Plugin:
	•	Visit the Nostr Obsidian Graph GitHub repository.
	•	Click the “Code” button and select “Download ZIP.”
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

Alternative Method: Cloning via Git:
	1.	Open Terminal:
	•	Access your terminal application.
	2.	Navigate to Plugins Directory:
	•	Change the directory to your Obsidian vault’s .obsidian/plugins/ folder:

cd path/to/your/vault/.obsidian/plugins/


	3.	Clone the Repository:
	•	Run the following command to clone the plugin repository:

git clone https://github.com/LamekaRjeggr/nostr-obsidian-graph.git


	4.	Enable and Configure the Plugin:
	•	Restart Obsidian.
	•	Follow steps 4 and 5 from the manual installation to enable and configure the plugin.

Note: The option to install this plugin directly from Obsidian’s Community Plugins is planned for a future release.

For more information, visit the Nostr Obsidian Graph GitHub repository.

---

###

---

### Integration with Obsidian Plugins

The plugin’s functionality is enhanced by integrating with other Obsidian plugins, such as:

- **Dataview:** Transform your vault into a queryable database for organizing and analyzing Nostr metadata.
- **Juggl:** Visualize relationships and connections dynamically through an interactive graph interface.
- **Chronology:** Create timelines to track events and changes within your notes.
- **Smart Connections:** Automatically identify and link related notes and profiles for a seamless exploration experience.
- **AI Plugins:** Leverage AI-driven tools to enhance data organization, pattern recognition, and content suggestions.
- **Templater:** Automate note creation and ensure consistency in metadata structures.
- **Tag Wrangler:** Simplify tag management, ensuring consistent categorization of topics and mentions.

These tools enable users to build tailored workflows for efficient data handling and visualization.
![Screenshot 2024-12-11 at 2.51.41 PM 1.png](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/Screenshot%202024-12-11%20at%202.51.41%20PM%201.png?raw=true)

---
# Obsidian



### Metadata Overview

The plugin enriches notes and profiles with structured metadata stored in the frontmatter. This metadata facilitates efficient organization and retrieval.

#### Notes Metadata

```yaml
---
id: [Unique identifier in hex format]
pubkey: [[Public key of the author]]
author: [[Author’s name]]
created: [Unix timestamp]
created_at: [Human-readable date]
kind: [Nostr event type]
tags: [List of topics]
root: [[Root note]]
reply_to: [[Parent note]]
mentions: [Array of mentioned entities]
---
```


![frontmatter.png](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/frontmatter.png?raw=true)

#### Profiles Metadata

```yaml
---
aliases:
  - [Public key in hex format]
name: [Username]
display_name: [User’s display name]
nip05: [Verified identifier]
picture: [Profile picture URL]
---
```

![profile metadata.png](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/profile%20metadata.png?raw=true)


**Markdown:** is the core formatting language used by Obsidian, allowing for lightweight and highly readable text files. Within the Nostr Graph Plugin, Nostr notes are converted into Markdown format, ensuring seamless compatibility with Obsidian’s features, such as linking, search, and graph view.


**Frontmatter Metadata:**  Frontmatter metadata in Obsidian serves as a structured way to store information about a note, such as tags, timestamps, and note ids. The plugin uses frontmatter to preserve key Nostr data, enabling efficient organization and integration with Obsidian’s advanced metadata tools.



**Graph View:** Obsidian’s graph view provides a visual representation of the relationships between notes. When paired with the Nostr Graph Plugin, this feature helps users explore the connections between profiles, conversations, and related topics, offering insights into the structure and flow of discussions. Understand complex discussions by visualizing entire conversation threads in graph view.

![local graph discovery.gif](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/local%20graph%20discovery.gif?raw=true)

---

### Directory Structure

Fetched content is organized within the following structure:

```
nostr/
├── notes/       # Fetched notes
├── profiles/    # User profiles
│   └── mentions/  # Profiles mentioned in notes
└── replies/     # Replies to notes (optional)
```

This layout ensures clarity and simplifies navigation.

---

### Commands and Hotkeys

The plugin offers several commands to streamline content management:

- **Fetch Notes:** Retrieve notes associated with your public key.
- **Fetch Notes by Hex Key:** Fetch notes linked to a specific hex key. Auto populates target Pub key in Note or Profile.
  
![hex key modal.png](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/hex%20key%20modal.png?raw=true)


- **Fetch Mentioned Profiles:** Update profiles for users mentioned in your notes.
- **Fetch Mentioned Notes:** Collect referenced notes using Mod+Shift+N.

---

### Customization and Settings

The plugin provides extensive configuration options:

- **Nostr Public Key:** Specify your npub for personalized content fetching.
- **Relays:** Choose relays to connect to and fetch data from.
- **Notes Per Profile:** Limit the number of notes fetched per profile.
- **Fetch Batch Size:** Define the number of notes retrieved in a single request.
- **Auto Update:** Enable or disable periodic data updates.
- **Update Interval:** Set the time interval (in seconds) for auto-updates.
- **Reply Directory:** Save replies in a separate directory for better organization.

![nostr graph settings 1.png](https://github.com/LamekaRjeggr/nostr-obsidian-graph/blob/master/user%20guide/nostr%20graph%20settings.png?raw=true)

---

### Additional Tools

The Nostr Graph Plugin integrates seamlessly with other Nostr-focused plugins to extend its functionality:

- **==Nostr Writer==:** This plugin allows users to draft and publish notes directly to Nostr relays from within Obsidian. It complements the Nostr Graph Plugin by providing content creation tools that integrate with the organizational features offered by this plugin.

- **==Nostr Commentr== (Upcoming):** A dedicated plugin for adding comments to Nostr notes. By accepting your nsec key, it provides a modal that enables you to comment on any open note displayed in Obsidian. This makes interacting with Nostr content more interactive and streamlined.


### Support and Feedback

For assistance or to report issues, visit the plugin’s [GitHub repository](#). The development team actively addresses feedback and continuously improves the plugin.

Harness the capabilities of the Nostr Graph Plugin to effectively manage and analyze your Nostr content within Obsidian.

