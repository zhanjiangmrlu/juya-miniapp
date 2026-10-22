import type { LearningQueue, LearningQueuePage, LearningQueuePorts } from '@/shared/types/learning'

/** 按固定服务端索引推进本人来源快照，分页失败保留游标
 * @param ports 本人会话请求与账号读取端口
 */
export const createLearningQueue = (ports: LearningQueuePorts) => {
  let queue: LearningQueue | null = null,
    owner: string | null = null,
    current = '',
    offset: number | null = 0,
    generation = 0,
    pending: { id: string; nextOffset: number | null } | null = null
  const visited = new Set<string>()
  /** 结束会话或单卡进入时释放来源，不能把旧队列带给分享接收者 */
  const clear = () => {
    generation++
    queue = null
    owner = null
    current = ''
    offset = 0
    visited.clear()
    pending = null
  }
  /** 绑定已由幂等接口创建的本人来源快照
   * @param value 服务端快照标识、来源和条数
   * @param cardId 点击卡片编号
   */
  const attach = (value: LearningQueue, cardId: string) => {
    const previous = { queue, owner, current, offset, pending, visited: [...visited] }
    clear()
    queue = value
    owner = ports.userId()
    current = cardId
    visited.add(cardId)
    const run = generation
    /** 首次原生进入失败时还原原来源，不能覆盖后来建立的新来源 */
    return () => {
      if (run !== generation || current !== cardId) return
      clear()
      queue = previous.queue
      owner = previous.owner
      current = previous.current
      offset = previous.offset
      pending = previous.pending
      for (const id of previous.visited) visited.add(id)
    }
  }
  /** 检查详情路由与当前账号是否确实属于该次来源
   * @param id 来源快照标识，直接单卡进入为空
   * @param cardId 该详情当前卡片编号
   */
  const matches = (id: string, cardId: string) =>
    Boolean(id && queue?.id === id && owner && owner === ports.userId() && current === cardId)
  /** 读取下一张有效卡，当前完成与后续关系变化由服务器判断 */
  const next = async (): Promise<string | null> => {
    if (!queue || !owner || owner !== ports.userId())
      throw new Error('账号已变化，请重新进入来源列表')
    const run = generation,
      expectedOwner = owner,
      id = queue.id
    let cursor = offset
    while (cursor !== null) {
      const page: LearningQueuePage = await ports.request<LearningQueuePage>(
        `/api/mini/v1/learning-queues/${encodeURIComponent(id)}?offset=${cursor}&limit=1`
      )
      if (run !== generation || expectedOwner !== ports.userId())
        throw new Error('账号或来源已变化，请重新进入来源列表')
      if (page.next_offset !== null && page.next_offset <= cursor)
        throw new Error('来源列表暂未更新，请重试')
      cursor = page.next_offset
      const candidate = page.items.find((item) => item.available && !visited.has(item.card_id))
      if (candidate) {
        pending = { id: candidate.card_id, nextOffset: cursor }
        return candidate.card_id
      }
    }
    offset = null
    pending = null
    return null
  }
  /** 下一张正文读取成功后才提交游标，原生跳转失败可撤回
   * @param cardId 刚确认可读的下一张稳定编号
   */
  const commit = (cardId: string) => {
    if (!pending || pending.id !== cardId || owner !== ports.userId())
      throw new Error('来源已变化，请重新进入列表')
    const previous = { current, offset },
      run = generation
    current = cardId
    offset = pending.nextOffset
    pending = null
    visited.add(cardId)
    /** 导航失败时恢复原详情的来源位置，不改变任何学习成绩 */
    return () => {
      if (generation === run && current === cardId) {
        current = previous.current
        offset = previous.offset
        visited.delete(cardId)
      }
    }
  }
  /** 读取原始来源用于完成按钮和结束说明 */
  const source = () => queue?.source || null
  return { attach, matches, next, commit, clear, source }
}
