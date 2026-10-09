<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AppButton from '@/components/app-button/app-button.vue'
import {
  preserveDraftAfterUploadFailure,
  validateFeedbackDraft
} from '@/features/feedback/feedback-form'
import { chooseFeedbackScreenshot } from '@/features/feedback/screenshot-picker'
import { uploadFeedbackImage } from '@/features/feedback/upload-service'
import { ApiError } from '@/services/http/errors'
import { getRuntimeServices } from '@/services/runtime'
import { FEEDBACK_CATEGORIES } from '@/shared/constants/feedback'
import { FeedbackCategory } from '@/shared/enums/feedback'
import { NavigationType } from '@/shared/enums/navigation'
import { navigate } from '@/shared/navigation/navigate'
import { useFeedbackDraftStore } from '@/stores/feedback-draft'

import type { FeedbackSourceScene } from '@/shared/types/feedback'
import type { FeedbackFormProps } from '@/shared/types/feedback-components'
import type { InputValueEvent } from '@/shared/types/ui'

withDefaults(defineProps<FeedbackFormProps>(), { blocked: false })

const store = useFeedbackDraftStore()
const error = ref('')
const loading = ref(false)
const sourceScenes = ref<Array<FeedbackSourceScene>>([])
const sourceOptions = computed(() => [
  { label: '首页', source: { page_label: '首页', page_path: '/pages/home/index' } },
  {
    label: '场景学习',
    source: { page_label: '场景学习', page_path: '/sub-packages/learning/index' }
  },
  {
    label: '收藏银行',
    source: { page_label: '收藏银行', page_path: '/sub-packages/favorites/index' }
  },
  {
    label: '我的学习档案',
    source: { page_label: '我的学习档案', page_path: '/sub-packages/profile/index' }
  },
  ...sourceScenes.value.map((scene) => ({
    label: scene.chinese_title || scene.title,
    source: {
      scene_id: scene.scene_id,
      scene_title: scene.chinese_title || scene.title,
      series: scene.series,
      page_path: '/sub-packages/scene/detail'
    }
  }))
])
/** 读取可选来源摘要，页面选择仍可在目录请求失败时使用 */
const loadSources = async () => {
  try {
    sourceScenes.value = (await getRuntimeServices().catalog.getCatalog()).items
  } catch {
    /* 自动携带来源及页面选择仍然可用 */
  }
}
/** 保存用户选择的相关页面或内容，event 为来源选择器事件 */
const selectSource = (event: unknown) => {
  const option = sourceOptions.value[Number((event as InputValueEvent<string>).detail.value)]
  if (option) {
    store.update({ source: option.source })
    error.value = ''
  }
}
onMounted(loadSources)
if (!store.draft.category) store.update({ category: FeedbackCategory.CONTENT })

/** 从输入事件同步反馈正文，不把敏感原文写入日志 */
const handleDescriptionInput = (event: unknown) => {
  store.update({ description: (event as InputValueEvent<string>).detail.value })
}

/** 切换反馈类别，value 为四种允许的问题类别 */
const selectCategory = (value: string) => store.update({ category: value })

/** 选择单张压缩图片，提交成功前保留本机引用 */
const chooseScreenshot = () =>
  chooseFeedbackScreenshot(
    (file) => {
      store.update({ screenshots: [file] })
      error.value = ''
    },
    (message) => {
      error.value = message
    }
  )

/** 删除草稿中的本地截图引用并保留其他表单字段 */
const removeScreenshot = () => {
  store.update({ screenshots: [] })
}

/** 校验、上传可选截图并提交反馈；安全拦截仅保留本地草稿供用户编辑 */
const submit = async () => {
  if (loading.value) return
  if (!store.draft.source?.scene_id && !store.draft.source?.page_label) {
    error.value = '请选择相关页面或内容'
    return
  }
  const validation = validateFeedbackDraft(store.draft)
  if (!validation.valid || !validation.normalized) {
    error.value = Object.values(validation.errors)[0] ?? '请检查反馈内容'
    return
  }

  loading.value = true
  let screenshotKey: string | undefined
  try {
    const screenshot = validation.normalized.screenshots[0]
    if (screenshot) {
      try {
        screenshotKey = await uploadFeedbackImage(getRuntimeServices().feedback, screenshot)
      } catch {
        store.update(preserveDraftAfterUploadFailure(store.draft))
        error.value = '截图上传失败，草稿已保留，可重试或删除截图后提交'
        return
      }
    }
    const created = await getRuntimeServices().feedback.create({
      category: validation.normalized.category,
      description: validation.normalized.description,
      screenshots: screenshotKey ? [screenshotKey] : [],
      source: validation.normalized.source
    })
    store.clear()
    await navigate({
      type: NavigationType.REDIRECT_TO,
      url: `/sub-packages/feedback/detail?id=${created.id}`
    })
  } catch (caught) {
    if (caught instanceof ApiError && caught.code === 'FEEDBACK_CONTENT_BLOCKED') {
      await navigate({
        type: NavigationType.REDIRECT_TO,
        url: '/sub-packages/feedback/content-blocked'
      })
      return
    }
    error.value = '暂时无法提交，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
<template>
  <view class="feedback-form">
    <view v-if="blocked" class="notice-card"
      ><text class="notice-title">内容未通过检查</text
      ><text>请修改问题说明，未提交的原文不会保存。</text></view
    >
    <view class="category-tabs"
      ><button
        v-for="category in FEEDBACK_CATEGORIES"
        :key="category.value"
        class="category-tab"
        :class="{ selected: store.draft.category === category.value }"
        @click="selectCategory(category.value)"
      >
        {{ category.label }}
      </button></view
    >
    <text class="form-label">相关页面</text
    ><picker :range="sourceOptions" range-key="label" @change="selectSource"
      ><view class="form-field source-field">{{
        store.draft.source?.scene_title ||
        store.draft.source?.page_label ||
        store.draft.source?.scene_id ||
        '请选择相关页面或内容'
      }}</view></picker
    >
    <text class="form-label">问题说明</text
    ><textarea
      class="form-field description-field"
      maxlength="300"
      :placeholder="blocked ? '请重新填写清晰的描述，最多 300 字' : '请描述遇到的问题，最多 300 字'"
      :value="store.draft.description"
      @input="handleDescriptionInput"
    />
    <text class="form-label">截图</text>
    <view v-if="store.draft.screenshots[0]" class="screenshot"
      ><image
        class="screenshot-preview"
        mode="aspectFit"
        :src="store.draft.screenshots[0].path"
      /><view
        ><text>已附加 1 张截图</text
        ><button class="screenshot-remove" @click="removeScreenshot">删除截图</button></view
      ></view
    >
    <button v-else class="form-field screenshot-add" @click="chooseScreenshot">
      可添加 1 张截图
    </button>
    <text v-if="error" class="form-error" role="alert">{{ error }}</text>
    <view class="submit-action"
      ><AppButton :loading="loading" :label="blocked ? '重新提交' : '提交反馈'" @press="submit"
    /></view>
  </view>
</template>
<style scoped lang="scss">
@use '../../profile/personal';

.feedback-form {
  display: flex;
  min-height: calc(100vh - 195px - 19.487vw - env(safe-area-inset-bottom));
  flex-direction: column;
  padding-top: 3px;

  .category-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 0;
  }

  .category-tab {
    height: 40px;
    margin: 0;
    padding: 0 4px;
    border: 1px solid #d6dfc9;
    border-radius: 11px;
    background: #fffdf7;
    color: #4e7f3b;
    font-size: 11px;
    line-height: 38px;

    &.selected {
      border-color: #4e7f3b;
      background: #4e7f3b;
      color: #fff;
    }
  }

  .category-tabs + .form-label {
    margin-top: 14px;
  }

  .form-label {
    margin-top: 9px;
  }

  .source-field {
    color: #7a8978;
  }

  .description-field {
    height: 56px;
    min-height: 56px;
  }

  .screenshot-add {
    margin: 0;
    color: #7a8978;
    text-align: left;
  }

  .screenshot {
    display: flex;
    min-height: 56px;
    align-items: center;
    padding: 8px 13px;
    border: 1px solid #d6dfc9;
    border-radius: 11px;
    background: #fffdf7;
    color: #6b7d6a;
    gap: 12px;
    font-size: 11px;

    .screenshot-preview {
      width: 60px;
      height: 60px;
    }

    .screenshot-remove {
      margin: 4px 0 0;
      padding: 0;
      background: transparent;
      color: #b4462d;
      font-size: 11px;
      line-height: 20px;
      text-align: left;
    }
  }

  .submit-action {
    margin-top: auto;
    padding-top: 16px;
  }

  .notice-card {
    min-height: 72px;
    margin-bottom: 11px;

    .notice-title {
      font-size: 15px;
    }
  }
}
</style>
