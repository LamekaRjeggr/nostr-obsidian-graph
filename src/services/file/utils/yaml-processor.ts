import { Notice } from 'obsidian';

export interface ParsedContent {
    frontmatter: Record<string, any>;
    content: string;
}

export class YAMLProcessor {
    static readonly YAML_REGEX = /^---\n([\s\S]*?)\n---\n?([\s\S]*)?$/;

    static parse(fileContent: string): ParsedContent {
        try {
            const match = fileContent.match(this.YAML_REGEX);
            
            if (!match) {
                return {
                    frontmatter: {},
                    content: fileContent
                };
            }

            const yamlContent = match[1];
            const restContent = match[2] || '';

            // Parse YAML content into object
            const frontmatter = this.parseYAML(yamlContent);

            return {
                frontmatter,
                content: restContent.trim()
            };
        } catch (error) {
            console.error('Error parsing YAML:', error);
            new Notice('Error parsing note frontmatter');
            return {
                frontmatter: {},
                content: fileContent
            };
        }
    }

    static stringify(frontmatter: Record<string, any>): string {
        try {
            const yamlLines = Object.entries(frontmatter)
                .filter(([_, value]) => value !== undefined && value !== '')
                .map(([key, value]) => this.stringifyValue(key, value, 0));

            return ['---', ...yamlLines, '---'].join('\n');
        } catch (error) {
            console.error('Error stringifying YAML:', error);
            new Notice('Error creating note frontmatter');
            return '---\n---';
        }
    }

    private static stringifyValue(key: string, value: any, indent: number = 0): string {
        const spaces = ' '.repeat(indent);
        
        if (value === null || value === undefined) {
            return `${spaces}${key}:`;
        }

        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            return `${spaces}${key}: ${value}`;
        }

        if (Array.isArray(value)) {
            if (value.length === 0) {
                return `${spaces}${key}: []`;
            }

            // Check if array contains nested arrays (like nostr tags)
            if (value.some(item => Array.isArray(item))) {
                const lines = [`${spaces}${key}:`];
                value.forEach(item => {
                    if (Array.isArray(item)) {
                        const itemStr = item.map(subItem => 
                            typeof subItem === 'string' ? `"${subItem}"` : subItem
                        ).join(', ');
                        lines.push(`${spaces}  - [${itemStr}]`);
                    } else {
                        lines.push(`${spaces}  - ${item}`);
                    }
                });
                return lines.join('\n');
            }

            // For simple arrays
            return `${spaces}${key}:\n${value.map(item => `${spaces}  - ${item}`).join('\n')}`;
        }

        if (typeof value === 'object') {
            const lines = [`${spaces}${key}:`];
            Object.entries(value).forEach(([subKey, subValue]) => {
                lines.push(this.stringifyValue(subKey, subValue, indent + 2));
            });
            return lines.join('\n');
        }

        return `${spaces}${key}: ${value}`;
    }

    static mergeYAML(existing: Record<string, any>, required: Record<string, any>): Record<string, any> {
        // Create a new object with existing frontmatter
        const merged = { ...existing };

        // Update only the required fields, preserving other existing fields
        for (const [key, value] of Object.entries(required)) {
            merged[key] = value;
        }

        return merged;
    }

    private static parseYAML(yaml: string): Record<string, any> {
        const result: Record<string, any> = {};
        
        const lines = yaml.split('\n');
        let currentKey: string | null = null;
        let currentIndent = 0;
        let currentArray: any[] = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const indent = line.search(/\S/);

            // Handle array items
            if (trimmed.startsWith('- ')) {
                if (!currentKey) continue;

                const value = trimmed.slice(2);
                
                // Handle array notation [item1, item2]
                if (value.startsWith('[') && value.endsWith(']')) {
                    const arrayContent = value.slice(1, -1).trim();
                    const items = this.parseArrayContent(arrayContent);
                    if (!Array.isArray(result[currentKey])) {
                        result[currentKey] = [];
                    }
                    result[currentKey].push(items);
                } else {
                    if (!Array.isArray(result[currentKey])) {
                        result[currentKey] = [];
                    }
                    result[currentKey].push(value);
                }
                continue;
            }

            // Handle key-value pairs
            const match = trimmed.match(/^([^:]+):\s*(.*)$/);
            if (match) {
                currentKey = match[1].trim();
                const value = match[2].trim();
                
                if (value) {
                    // Handle array notation [item1, item2]
                    if (value.startsWith('[') && value.endsWith(']')) {
                        result[currentKey] = this.parseArrayContent(value.slice(1, -1));
                    } else {
                        result[currentKey] = value;
                    }
                } else {
                    // Start of an array or object
                    result[currentKey] = [];
                }
            }
        }

        return result;
    }

    private static parseArrayContent(content: string): any[] {
        const items: any[] = [];
        let currentItem = '';
        let inQuotes = false;
        let depth = 0;

        for (let i = 0; i < content.length; i++) {
            const char = content[i];

            if (char === '"' && content[i - 1] !== '\\') {
                inQuotes = !inQuotes;
            } else if (!inQuotes) {
                if (char === '[') depth++;
                else if (char === ']') depth--;
                else if (char === ',' && depth === 0) {
                    items.push(this.parseValue(currentItem.trim()));
                    currentItem = '';
                    continue;
                }
            }

            currentItem += char;
        }

        if (currentItem.trim()) {
            items.push(this.parseValue(currentItem.trim()));
        }

        return items;
    }

    private static parseValue(value: string): any {
        if (value.startsWith('"') && value.endsWith('"')) {
            return value.slice(1, -1);
        }
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (!isNaN(Number(value))) return Number(value);
        return value;
    }
}
