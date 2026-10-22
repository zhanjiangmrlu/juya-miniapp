export const DictionarySource = {
  CONTEXT: 'context',
  DICTIONARY: 'dictionary',
  MISSING: 'missing'
} as const
export type DictionarySource = (typeof DictionarySource)[keyof typeof DictionarySource] & string
