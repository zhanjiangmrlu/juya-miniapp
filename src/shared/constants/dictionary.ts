// 与统一API的正文词边界规则同步；缩写句点属于原词，普通句末句点不属于原词
export const DICTIONARY_TOKEN_PATTERN = String.raw`(?:[A-Za-z]+\.){2,}|(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc)\.|[A-Za-z]+(?:['’\-][A-Za-z]+)*`
