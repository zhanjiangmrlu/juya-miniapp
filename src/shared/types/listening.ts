import type { components } from '@/shared/contracts/generated/mini-api'
export type ListeningWord = components['schemas']['TimelineWord']
export type ListeningProgress = components['schemas']['ProgressInput']
export type ListeningCategory = components['schemas']['Category']
export type ListeningTopic = components['schemas']['TopicProgress']
export type ListeningAccess = components['schemas']['LearningPermission']
export type ListeningSummary = components['schemas']['Summary']
export type ListeningArticle = components['schemas']['ArticleDetail']
export type ListeningHome = components['schemas']['Home']
export interface ListeningFrame {
  current: number
  fraction: number
  trails: { position: number; strength: number }[]
}
export interface ListeningToken {
  text: string
  start: number
  end: number
  word: boolean
}

export interface ListeningParagraph {
  tokens: ListeningToken[]
  separator: string
  start: number
}
export interface ListeningReadingRect {
  top: number
  bottom: number
}
