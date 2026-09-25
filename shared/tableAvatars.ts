/** Stable IDs: append only, so saved tables keep their artwork across updates. */
export const TABLE_AVATAR_LABELS = ['Family', 'Friends', 'Cousins', 'Couple', 'Grandparents', 'Sisters', 'Brothers', 'Colleagues', 'Neighbours', 'College friends', 'Reunion', 'Birthday', 'Festival', 'Weekend', 'Champions', 'Music club', 'Cricket club', 'Book club', 'Travel friends', 'Tea club'] as const;
export function isTableAvatarId(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < TABLE_AVATAR_LABELS.length; }
