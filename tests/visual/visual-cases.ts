export const VISUAL_VIEWPORTS = [
  { height: 812, name: 'iphone-375', width: 375 },
  { height: 844, name: 'iphone-390', width: 390 },
  { height: 1024, name: 'tablet-768', width: 768 }
] as const

export const VISUAL_CASES = [
  { design: 'M01', path: '/pages/home/index' },
  { design: 'M05', path: '/pages/learning/index' },
  { design: 'M06', path: '/pages/scene/detail?sceneId=scene-castle' },
  { design: 'M09', path: '/pages/scene/dialogue?sceneId=scene-castle' },
  { design: 'M19', path: '/pages/favorites/index' },
  { design: 'M25', path: '/pages/scene/completed?sceneId=scene-castle' },
  { design: 'M27', path: '/pages/profile/index' },
  { design: 'M32', path: '/pages/entitlement/index' },
  { design: 'M38', path: '/pages/feedback/messages' },
  { design: 'M39', path: '/pages/feedback/index' },
  { design: 'M40', path: '/pages/feedback/create' },
  { design: 'M44', path: '/pages/account/index' },
  { design: 'M47', path: '/pages/account/deletion-pending' }
] as const
