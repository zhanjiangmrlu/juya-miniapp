import type { IdentityInput } from '@/shared/types/profile'

/** 重新获取版本时保留实际编辑和明确选择的新头像
 * @param previous 原资料基准
 * @param draft 尚未提交的头像昵称
 * @param latest 服务器当前资料
 * @param selected 用户是否主动选择过头像
 */
export const rebaseIdentity = (
  previous: IdentityInput,
  draft: IdentityInput,
  latest: IdentityInput,
  selected = false
): IdentityInput => ({
  nickname:
    (draft.nickname.trim() || '学习者') === previous.nickname ? latest.nickname : draft.nickname,
  avatar_id: selected || draft.avatar_id !== previous.avatar_id ? draft.avatar_id : latest.avatar_id
})
