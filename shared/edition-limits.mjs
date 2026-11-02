import limits from './edition-limits.json' with {type:'json'}
export const EDITION_TARGET = limits.target
export const EDITION_AUDIT_BELOW = limits.auditBelow
export const EDITION_FLOOR = limits.floor
export const editionStoryCount = (entries = []) => Array.isArray(entries) ? entries.filter(e=>e.desk !== 'bubbel').length : 0
export const hasEditionMinimum = count => Number.isInteger(count) && count >= EDITION_FLOOR
