import { afterEach, expect, it } from 'vitest'

import { dismissLoginPrompt, loginPromptTarget, promptLogin } from '@/services/login-prompt'

afterEach(() => dismissLoginPrompt())

it('retains the active login source until the user closes the prompt', () => {
  promptLogin('/sub-packages/listening/article?id=article-1')
  promptLogin('/pages/profile/index')
  expect(loginPromptTarget.value).toBe('/sub-packages/listening/article?id=article-1')
  dismissLoginPrompt()
  promptLogin('/pages/profile/index')
  expect(loginPromptTarget.value).toBe('/pages/profile/index')
})
