import { Notice } from 'obsidian';

export const logger = {
    // Only log critical errors that need user attention
    critical: (message: string) => {
        console.error(message);
        new Notice(message);
    },
    
    // Log important operations for debugging
    debug: (message: string) => {
        if (process.env.NODE_ENV === 'development') {
            console.log(message);
        }
    }
};
