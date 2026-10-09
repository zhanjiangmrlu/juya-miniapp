const migratedPages = new Set([
  'pages/home/first-visit',
  'pages/home/today-task',
  'pages/learning/explore',
  'pages/learning/no-access',
  'pages/scene/detail',
  'pages/scene/dialogue',
  'pages/scene/vocabulary',
  'pages/scene/chunks',
  'pages/scene/audio-failed',
  'pages/scene/restore-position',
  'pages/scene/return-source',
  'pages/scene/shadowing',
  'pages/scene/completed',
  'pages/favorites/phrases',
  'pages/favorites/detail',
  'pages/favorites/sources',
  'pages/favorites/review-front',
  'pages/favorites/review-back',
  'pages/favorites/history',
  'pages/profile/contact-prompt',
  'pages/profile/contact-edit',
  'pages/profile/contact-manage',
  'pages/profile/contact-correction',
  'pages/entitlement/index',
  'pages/entitlement/pending',
  'pages/entitlement/active',
  'pages/entitlement/ending',
  'pages/entitlement/ended',
  'pages/entitlement/exception',
  'pages/feedback/messages',
  'pages/feedback/index',
  'pages/feedback/create',
  'pages/feedback/detail',
  'pages/feedback/resolution',
  'pages/feedback/content-blocked',
  'pages/account/index',
  'pages/account/clear-confirm',
  'pages/account/delete-confirm',
  'pages/account/deletion-pending',
  'pages/compat/index'
])

const mainPages = new Set([
  '/sub-packages/learning/index',
  '/sub-packages/favorites/index',
  '/sub-packages/profile/index'
])

/** 将已知旧页面地址映射到当前主包或子包，url 为原始导航地址，查询参数和片段保持原样 */
export const normalizePageUrl = (url: string): string => {
  const suffixIndex = url.search(/[?#]/)
  const pathname = suffixIndex < 0 ? url : url.slice(0, suffixIndex)
  if (mainPages.has(pathname)) return '/pages/' + url.slice('/sub-packages/'.length)
  if (!pathname.startsWith('/') || !migratedPages.has(pathname.slice(1))) return url
  return '/sub-packages/' + url.slice('/pages/'.length)
}
