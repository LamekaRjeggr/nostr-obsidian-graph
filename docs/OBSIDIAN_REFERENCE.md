# Obsidian API Reference

## Core APIs

### Plugin Base
```typescript
abstract class Plugin {
    app: App;                      // Obsidian App instance
    manifest: PluginManifest;      // Plugin metadata

    // Lifecycle
    onload(): void;               // Called when plugin loads
    onunload(): void;             // Called when plugin unloads

    // Settings
    loadData(): Promise<any>;     // Load plugin data
    saveData(data: any): Promise<void>;  // Save plugin data

    // Commands
    addCommand(command: Command): void;
    
    // Settings UI
    addSettingTab(tab: PluginSettingTab): void;
    
    // Event Registration
    registerEvent(event: EventRef): void;
}
```

### Vault Operations
```typescript
interface Vault {
    // File Operations
    create(path: string, data: string): Promise<void>;
    modify(file: TFile, data: string): Promise<void>;
    delete(file: TAbstractFile, force?: boolean): Promise<void>;
    read(file: TFile): Promise<string>;
    
    // File Queries
    getAbstractFileByPath(path: string): TAbstractFile | null;
    getFiles(): TFile[];
    getMarkdownFiles(): TFile[];
    
    // Events
    on('create', (file: TAbstractFile) => void);
    on('modify', (file: TFile) => void);
    on('delete', (file: TAbstractFile) => void);
    on('rename', (file: TAbstractFile, oldPath: string) => void);
}

// Example: Create and modify files
await vault.create('folder/note.md', '# Title\nContent');
const file = vault.getAbstractFileByPath('folder/note.md');
if (file instanceof TFile) {
    await vault.modify(file, '# New Title\nUpdated content');
}
```

### File Types
```typescript
interface TFile {
    path: string;              // File path
    name: string;              // File name
    basename: string;          // Name without extension
    extension: string;         // File extension
    parent: TFolder | null;    // Parent folder
    vault: Vault;             // Vault reference
    stat: FileStats;          // File stats
}

interface TFolder {
    path: string;              // Folder path
    name: string;              // Folder name
    parent: TFolder | null;    // Parent folder
    children: TAbstractFile[]; // Files and folders
    vault: Vault;             // Vault reference
}

interface FileStats {
    ctime: number;            // Creation time
    mtime: number;            // Modified time
    size: number;            // File size
}
```

### Metadata Cache
```typescript
interface MetadataCache {
    // File Metadata
    getFileCache(file: TFile): CachedMetadata | null;
    
    // Events
    on('changed', (file: TFile, data: string, cache: CachedMetadata) => void);
}

interface CachedMetadata {
    frontmatter?: any;         // YAML frontmatter
    headings?: HeadingCache[];  // Markdown headings
    links?: LinkCache[];       // Wiki links
    tags?: TagCache[];         // Tags
    blocks?: BlockCache[];     // Block references
}

// Example: Get file metadata
const file = vault.getAbstractFileByPath('note.md');
if (file instanceof TFile) {
    const metadata = app.metadataCache.getFileCache(file);
    const frontmatter = metadata?.frontmatter;
    const tags = metadata?.tags?.map(t => t.tag);
}
```

### Markdown Handling
```typescript
// Frontmatter
const frontmatter = `---
title: Note Title
tags: [tag1, tag2]
date: 2024-01-01
---`;

// Internal Links
const wikiLink = '[[filename]]';           // Basic link
const aliasLink = '[[filename|alias]]';    // Link with alias
const headingLink = '[[file#heading]]';    // Link to heading
const blockLink = '[[file^blockid]]';      // Link to block

// Tags
const tag = '#tag';                        // Basic tag
const nestedTag = '#tag/subtag';           // Nested tag
const spaceTag = '#"tag with spaces"';     // Tag with spaces

// Block References
const blockRef = '^blockid';               // Block identifier
const blockLink = '![[file^blockid]]';     // Block embed

// Heading Cache
interface HeadingCache {
    heading: string;           // Heading text
    level: number;            // Heading level (1-6)
    position: Pos;            // Position in file
}

// Link Cache
interface LinkCache {
    link: string;             // Link target
    displayText?: string;     // Link text
    position: Pos;            // Position in file
}

// Tag Cache
interface TagCache {
    tag: string;              // Tag name
    position: Pos;            // Position in file
}

// Example: Create note with frontmatter
const noteContent = [
    '---',
    'title: Example Note',
    'tags: [example, note]',
    'date: 2024-01-01',
    '---',
    '',
    '# Heading',
    'Content with #tag and [[link]]'
].join('\n');

await vault.create('example.md', noteContent);
```

### Workspace
```typescript
interface Workspace {
    // Active States
    activeLeaf: WorkspaceLeaf | null;
    activeFile: TFile | null;
    
    // View Management
    getLeaf(newLeaf?: boolean): WorkspaceLeaf;
    
    // Events
    on('file-open', (file: TFile | null) => void);
    on('active-leaf-change', (leaf: WorkspaceLeaf | null) => void);
}

// Example: Open file in new leaf
const leaf = app.workspace.getLeaf(true);
await leaf.openFile(file);
```

### Notifications
```typescript
class Notice {
    constructor(message: string, timeout?: number);
    setMessage(message: string): this;
    hide(): void;
}

// Example: Show notification
new Notice('File saved successfully', 3000);
```

### Commands
```typescript
interface Command {
    id: string;               // Command ID
    name: string;             // Display name
    callback(): any;         // Command function
}

// Example: Add command
this.addCommand({
    id: 'example-command',
    name: 'Example Command',
    callback: () => {
        new Notice('Command executed');
    }
});
```

### Events
```typescript
// Register event
this.registerEvent(
    app.vault.on('modify', (file: TFile) => {
        // Handle file modification
    })
);

// Clean up
onunload() {
    // Plugin events auto-cleanup
}
```

### Settings
```typescript
// Define settings interface
interface PluginSettings {
    setting1: string;
    setting2: boolean;
}

// Load settings
const DEFAULT_SETTINGS: PluginSettings = {
    setting1: 'default',
    setting2: true
};

async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}

// Save settings
async saveSettings() {
    await this.saveData(this.settings);
}
