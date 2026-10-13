import type { WordImageController } from '@/shared/types/scene'
import type { InjectionKey } from 'vue'

export const WORD_IMAGE_CONTROLLER_KEY: InjectionKey<WordImageController> = Symbol('word-images')
