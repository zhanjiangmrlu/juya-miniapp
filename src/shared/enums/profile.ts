export const LeaveChoice = { CONTINUE: 'continue', SAVE: 'save', DISCARD: 'discard' } as const
export type LeaveChoice = (typeof LeaveChoice)[keyof typeof LeaveChoice] & string
