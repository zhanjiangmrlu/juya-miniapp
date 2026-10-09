export interface ServerClock {
  now(): Date
  remainingUntil(value: string): number
}
