/** 暂停入口但保留原实现，恢复时与 API 对应开关一起发布 */
export const LEARNING_FEATURES = {
  authorization: false,
  dictionary: false,
  listeningSync: false
} as const
