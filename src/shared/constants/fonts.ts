export const REMOTE_FONTS_ENABLED = import.meta.env.VITE_REMOTE_FONTS === 'true'
export const DESIGN_FONT_FACES = {
  latin: {
    family: 'DM Sans',
    file: 'dm-sans-19b2ba846548.woff',
    style: 'normal'
  },
  serif: {
    family: 'Fraunces',
    file: 'fraunces-regular-1a07e715bff9.woff',
    style: 'normal'
  },
  serifItalic: {
    family: 'Fraunces',
    file: 'fraunces-italic-0e42d420e3d2.woff',
    style: 'italic'
  },
  chinese: {
    family: 'Juya UI Chinese',
    file: 'juya-ui-chinese-2de0b76bda1d.woff',
    style: 'normal'
  }
} as const
