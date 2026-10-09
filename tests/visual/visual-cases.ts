export const VISUAL_VIEWPORTS = [
  { height: 812, name: 'iphone-375', width: 375 },
  { height: 844, name: 'iphone-390', width: 390 },
  { height: 1024, name: 'tablet-768', width: 768 }
] as const

export const VISUAL_CASES = [
  { design: 'M01', nodeId: '2478:5', path: '/pages/home/index', state: 'default' },
  { design: 'M01S', nodeId: '2479:14', path: '/pages/home/index', state: 'S' },
  { design: 'M02', nodeId: '2479:70', path: '/sub-packages/home/first-visit', state: 'default' },
  { design: 'M03', nodeId: '2479:126', path: '/sub-packages/home/today-task', state: 'default' },
  { design: 'M05', nodeId: '2479:182', path: '/sub-packages/learning/index', state: 'default' },
  { design: 'M05S', nodeId: '2479:241', path: '/sub-packages/learning/index', state: 'S' },
  { design: 'M06', nodeId: '2479:300', path: '/sub-packages/learning/explore', state: 'default' },
  { design: 'M07', nodeId: '2479:358', path: '/sub-packages/learning/no-access', state: 'default' },
  {
    design: 'M08',
    nodeId: '2479:419',
    path: '/sub-packages/scene/detail?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M09',
    nodeId: '2479:473',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M09S',
    nodeId: '2479:549',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'S'
  },
  {
    design: 'M09T',
    nodeId: '2479:641',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'T'
  },
  {
    design: 'M09U',
    nodeId: '2479:733',
    path: '/sub-packages/scene/detail?sceneId=scene-coffee-shop',
    state: 'U'
  },
  {
    design: 'M12',
    nodeId: '2479:787',
    path: '/sub-packages/scene/vocabulary?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M13',
    nodeId: '2479:841',
    path: '/sub-packages/scene/chunks?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M14',
    nodeId: '2479:895',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M15',
    nodeId: '2479:975',
    path: '/sub-packages/scene/audio-failed?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M16',
    nodeId: '2479:1035',
    path: '/sub-packages/scene/completed?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M17',
    nodeId: '2479:1089',
    path: '/sub-packages/scene/restore-position?sceneId=scene-coffee-shop',
    state: 'default'
  },
  {
    design: 'M18',
    nodeId: '2479:1143',
    path: '/sub-packages/scene/return-source?sceneId=scene-coffee-shop',
    state: 'default'
  },
  { design: 'M19', nodeId: '2480:245', path: '/sub-packages/favorites/index', state: 'default' },
  { design: 'M20', nodeId: '2480:299', path: '/sub-packages/favorites/phrases', state: 'default' },
  {
    design: 'M21',
    nodeId: '2480:353',
    path: '/sub-packages/favorites/detail?id=favorite-latte',
    state: 'default'
  },
  {
    design: 'M22',
    nodeId: '2480:407',
    path: '/sub-packages/favorites/sources?id=favorite-latte',
    state: 'default'
  },
  {
    design: 'M23',
    nodeId: '2480:461',
    path: '/sub-packages/favorites/review-front?id=favorite-latte',
    state: 'default'
  },
  {
    design: 'M24',
    nodeId: '2480:515',
    path: '/sub-packages/favorites/review-back?id=favorite-latte',
    state: 'default'
  },
  { design: 'M25', nodeId: '2480:569', path: '/sub-packages/favorites/history', state: 'default' },
  { design: 'M27', nodeId: '2480:626', path: '/sub-packages/profile/index', state: 'default' },
  {
    design: 'M28',
    nodeId: '2480:680',
    path: '/sub-packages/profile/contact-prompt',
    state: 'default'
  },
  {
    design: 'M29',
    nodeId: '2480:734',
    path: '/sub-packages/profile/contact-edit',
    state: 'default'
  },
  {
    design: 'M30',
    nodeId: '2480:788',
    path: '/sub-packages/profile/contact-manage',
    state: 'default'
  },
  {
    design: 'M31',
    nodeId: '2480:842',
    path: '/sub-packages/profile/contact-correction',
    state: 'default'
  },
  { design: 'M32', nodeId: '2480:899', path: '/sub-packages/entitlement/index', state: 'default' },
  {
    design: 'M33',
    nodeId: '2480:953',
    path: '/sub-packages/entitlement/pending',
    state: 'default'
  },
  {
    design: 'M34',
    nodeId: '2480:1007',
    path: '/sub-packages/entitlement/active',
    state: 'default'
  },
  {
    design: 'M35',
    nodeId: '2480:1061',
    path: '/sub-packages/entitlement/ending',
    state: 'default'
  },
  { design: 'M36', nodeId: '2480:1115', path: '/sub-packages/entitlement/ended', state: 'default' },
  {
    design: 'M37',
    nodeId: '2480:1169',
    path: '/sub-packages/entitlement/exception',
    state: 'default'
  },
  { design: 'M38', nodeId: '2480:1226', path: '/sub-packages/feedback/messages', state: 'default' },
  { design: 'M39', nodeId: '2480:1280', path: '/sub-packages/feedback/index', state: 'default' },
  { design: 'M40', nodeId: '2480:1334', path: '/sub-packages/feedback/create', state: 'default' },
  {
    design: 'M41',
    nodeId: '2480:1388',
    path: '/sub-packages/feedback/detail?id=feedback-001',
    state: 'default'
  },
  {
    design: 'M42',
    nodeId: '2480:1442',
    path: '/sub-packages/feedback/resolution?id=feedback-001',
    state: 'default'
  },
  {
    design: 'M43',
    nodeId: '2480:1496',
    path: '/sub-packages/feedback/content-blocked',
    state: 'default'
  },
  { design: 'M44', nodeId: '2480:1553', path: '/sub-packages/account/index', state: 'default' },
  {
    design: 'M45',
    nodeId: '2480:1607',
    path: '/sub-packages/account/clear-confirm',
    state: 'default'
  },
  {
    design: 'M46',
    nodeId: '2480:1661',
    path: '/sub-packages/account/delete-confirm',
    state: 'default'
  },
  {
    design: 'M47',
    nodeId: '2480:1715',
    path: '/sub-packages/account/deletion-pending',
    state: 'default'
  },
  {
    design: 'M09P0',
    nodeId: '2507:569',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'P0'
  },
  {
    design: 'M09P1',
    nodeId: '2507:653',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'P1'
  },
  {
    design: 'M09P2',
    nodeId: '2507:737',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'P2'
  },
  {
    design: 'M09P3',
    nodeId: '2507:821',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'P3'
  },
  {
    design: 'M09P4',
    nodeId: '2507:905',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'P4'
  },
  {
    design: 'M09P5',
    nodeId: '2507:989',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'P5'
  },
  {
    design: 'M14P1',
    nodeId: '2508:638',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'P1'
  },
  {
    design: 'M14P2',
    nodeId: '2508:732',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'P2'
  },
  {
    design: 'M14P3',
    nodeId: '2508:826',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'P3'
  },
  {
    design: 'M14P4',
    nodeId: '2508:920',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'P4'
  },
  {
    design: 'M14P5',
    nodeId: '2508:1014',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'P5'
  },
  {
    design: 'M14PR',
    nodeId: '2508:1108',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'PR'
  },
  {
    design: 'M09I2',
    nodeId: '2510:713',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'I2'
  },
  {
    design: 'M09I3',
    nodeId: '2510:797',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'I3'
  },
  {
    design: 'M09I4',
    nodeId: '2510:881',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'I4'
  },
  {
    design: 'M09I5',
    nodeId: '2510:965',
    path: '/sub-packages/scene/dialogue?sceneId=scene-coffee-shop',
    state: 'I5'
  },
  {
    design: 'M14I2',
    nodeId: '2510:1049',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'I2'
  },
  {
    design: 'M14I3',
    nodeId: '2510:1143',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'I3'
  },
  {
    design: 'M14I4',
    nodeId: '2510:1237',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'I4'
  },
  {
    design: 'M14I5',
    nodeId: '2510:1331',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'I5'
  },
  {
    design: 'M14IR',
    nodeId: '2510:1425',
    path: '/sub-packages/scene/shadowing?sceneId=scene-coffee-shop',
    state: 'IR'
  }
] as const
