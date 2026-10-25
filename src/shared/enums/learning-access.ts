export const LearningAuthorizationStatus = {
  NONE: 'none',
  ACTIVE: 'active',
  EXPIRED: 'expired'
} as const
export type LearningAuthorizationStatus =
  (typeof LearningAuthorizationStatus)[keyof typeof LearningAuthorizationStatus] & string
export const LearningAccessReason = {
  REQUIRED: 'learning_authorization_required',
  LOOKUP_REQUIRED: 'lookup_authorization_required'
} as const
export type LearningAccessReason =
  (typeof LearningAccessReason)[keyof typeof LearningAccessReason] & string
