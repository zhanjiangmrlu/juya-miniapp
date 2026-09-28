import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { UserProfile } from '@/shared/contracts/profile'
const ACCESS_TOKEN_KEY = 'juya.access-token'
const REFRESH_TOKEN_KEY = 'juya.refresh-token'
export const useSessionStore = defineStore('session', () => {
  const accessToken = ref<string>()
  const profile = ref<UserProfile>()
  const refreshToken = ref<string>()
  const refreshing = ref(false)
  const isAuthenticated = computed(() => Boolean(accessToken.value))
  function restore() {
    accessToken.value = uni.getStorageSync(ACCESS_TOKEN_KEY) || undefined
    refreshToken.value = uni.getStorageSync(REFRESH_TOKEN_KEY) || undefined
  }
  function saveTokens(tokens: { access_token: string; refresh_token: string }) {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    uni.setStorageSync(ACCESS_TOKEN_KEY, tokens.access_token)
    uni.setStorageSync(REFRESH_TOKEN_KEY, tokens.refresh_token)
  }
  function clear() {
    accessToken.value = undefined
    refreshToken.value = undefined
    profile.value = undefined
    uni.removeStorageSync(ACCESS_TOKEN_KEY)
    uni.removeStorageSync(REFRESH_TOKEN_KEY)
  }
  return {
    accessToken,
    clear,
    isAuthenticated,
    profile,
    refreshing,
    refreshToken,
    restore,
    saveTokens
  }
})
