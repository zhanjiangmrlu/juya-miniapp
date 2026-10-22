import { expect, it, vi } from 'vitest'

import { createLearningQueue } from '@/services/learning-queue'

/** 创建包含服务端状态的固定索引队列页
 * @param id 稳定卡片编号
 * @param available 是否仍满足来源关系和当前发布状态
 * @param offset 下一页固定索引
 */
const row = (id: string, available: boolean, offset: number | null) => ({
  items: [
    {
      card_id: id,
      available,
      state: { completed: true, today_completed: true, favorite: true, started: true }
    }
  ],
  total: 3,
  offset: 0,
  next_offset: offset
})

it('keeps snapshot order across pages and skips invalid rows without treating them as the end', async () => {
  const request = vi
    .fn()
    .mockResolvedValueOnce(row('current', false, 1))
    .mockResolvedValueOnce(row('gone', false, 2))
    .mockResolvedValueOnce(row('next', true, null))
  const queue = createLearningQueue({ request, userId: () => 'owner' })
  queue.attach({ id: 'q', source: 'favorites', total: 3 }, 'current')
  expect(await queue.next()).toBe('next')
  queue.commit('next')
  expect(request.mock.calls.map((call) => call[0])).toEqual(
    [0, 1, 2].map((offset) => `/api/mini/v1/learning-queues/q?offset=${offset}&limit=1`)
  )
  expect(await queue.next()).toBe(null)
})

it('retries the same offset after a pagination failure and keeps completed favorites eligible', async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(row('review', true, null))
  const queue = createLearningQueue({ request, userId: () => 'owner' })
  queue.attach({ id: 'q', source: 'favorites', total: 1 }, 'current')
  await expect(queue.next()).rejects.toThrow('offline')
  expect(await queue.next()).toBe('review')
  expect(request.mock.calls[0]![0]).toBe(request.mock.calls[1]![0])
})

it('refuses a queue owned by a previous account and ignores its late response', async () => {
  let owner = 'first',
    finish: (value: ReturnType<typeof row>) => void = () => undefined
  const request = vi.fn().mockImplementation(
    () =>
      new Promise<ReturnType<typeof row>>((resolve) => {
        finish = resolve
      })
  )
  const queue = createLearningQueue({ request, userId: () => owner })
  queue.attach({ id: 'q', source: 'learning', total: 1 }, 'current')
  const pending = queue.next()
  owner = 'second'
  finish(row('private-next', true, null))
  await expect(pending).rejects.toThrow('账号')
  expect(queue.matches('q', 'current')).toBe(false)
})

it('does not inherit a queue for a direct single-card entry', () => {
  const queue = createLearningQueue({ request: vi.fn(), userId: () => 'owner' })
  queue.attach({ id: 'q', source: 'records', total: 1 }, 'current')
  expect(queue.matches('', 'current')).toBe(false)
  expect(queue.matches('q', 'different')).toBe(false)
})

it('keeps the same next candidate until its body is confirmed and restores the cursor on navigation failure', async () => {
  const request = vi.fn().mockResolvedValue(row('next', true, null))
  const queue = createLearningQueue({ request, userId: () => 'owner' })
  queue.attach({ id: 'q', source: 'favorites', total: 1 }, 'current')
  expect(await queue.next()).toBe('next')
  expect(queue.matches('q', 'current')).toBe(true)
  expect(await queue.next()).toBe('next')
  const rollback = queue.commit('next')
  expect(queue.matches('q', 'next')).toBe(true)
  rollback()
  expect(queue.matches('q', 'current')).toBe(true)
  expect(await queue.next()).toBe('next')
})
