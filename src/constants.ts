export const EVENT_KINDS = [
    { value: 0, label: 'Metadata (0)', description: 'Profile metadata' },
    { value: 1, label: 'Text Note (1)', description: 'Short text note' },
    { value: 3, label: 'Contacts (3)', description: 'Contact list' },
    { value: 4, label: 'DM (4)', description: 'Encrypted direct message' },
    { value: 5, label: 'Delete (5)', description: 'Event deletion' },
    { value: 6, label: 'Repost (6)', description: 'Event repost' },
    { value: 7, label: 'Reaction (7)', description: 'Reaction to event' },
    { value: 40, label: 'Channel Creation (40)', description: 'Channel metadata' },
    { value: 41, label: 'Channel Message (41)', description: 'Channel message' },
    { value: 42, label: 'Channel Hide Message (42)', description: 'Hide message' },
    { value: 43, label: 'Channel Mute User (43)', description: 'Mute user' },
    { value: 44, label: 'Channel Reserved (44)', description: 'Reserved' },
] as const;
