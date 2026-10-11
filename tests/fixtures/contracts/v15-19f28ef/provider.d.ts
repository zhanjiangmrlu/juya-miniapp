export interface components {
  schemas: {
    /** AudioReference */
    AudioReference: {
      /** Target Id */
      target_id: string
      /** Version Id */
      version_id: string
      /** Asset Id */
      asset_id: string
      /** Duration Ms */
      duration_ms: number
    }
    /** AvatarUploadCredentialResponse */
    AvatarUploadCredentialResponse: {
      /** Host */
      host: string
      /** Key */
      key: string
      /** Fields */
      fields: {
        [key: string]: string
      }
      /** Content Type */
      content_type: string
      /** Max Bytes */
      max_bytes: number
      /**
       * Expires At
       * Format: date-time
       */
      expires_at: string
      /** Policy */
      policy: string
      /** Signature */
      signature: string
      /** Access Key Id */
      access_key_id: string
    }
    /** AvatarUploadRequest */
    AvatarUploadRequest: {
      /** Content Type */
      content_type: string
    }
    /** CleanupResultRequest */
    CleanupResultRequest: {
      /** Deletion Request Id */
      deletion_request_id: string
      /** Succeeded */
      succeeded: boolean
    }
    /** ClearLearningDataRequest */
    ClearLearningDataRequest: {
      /** Confirmation */
      confirmation: string
    }
    /** ClickableSpan */
    ClickableSpan: {
      /** Start */
      start: number
      /** End */
      end: number
      /** Entry Id */
      entry_id: string
      /** Entry Version */
      entry_version: number
      /** Source Locator */
      source_locator: string
    }
    /** CompleteRequest */
    CompleteRequest: {
      /** Content Version */
      content_version: number
    }
    /** ConfirmedEntry */
    ConfirmedEntry: {
      /** Entry Id */
      entry_id: string
      /**
       * Entry Type
       * @enum {string}
       */
      entry_type: 'word' | 'chunk'
      /** Sense Id */
      sense_id: string
      /** Source Id */
      source_id: string
      /**
       * Entry Version
       * @default 1
       */
      entry_version: number
      /** English */
      english: string
      /**
       * Phonetic
       * @default
       */
      phonetic: string
      /** Meaning Zh */
      meaning_zh: string
      /**
       * Explanation
       * @default
       */
      explanation: string
      /** Source Sentence */
      source_sentence: string
      source_locator?: components['schemas']['SourceLocator'] | null
      /** Image Asset Id */
      image_asset_id?: string | null
      pronunciation?: components['schemas']['PronunciationReference'] | null
      /**
       * Legacy Incomplete
       * @default false
       */
      legacy_incomplete: boolean
      /**
       * Is Favorited
       * @default false
       */
      is_favorited: boolean
      /** Favorite Id */
      favorite_id?: string | null
    }
    /** ContactProjectionRequest */
    ContactProjectionRequest: {
      /** User Ids */
      user_ids: string[]
    }
    /** ContactSaveRequest */
    ContactSaveRequest: {
      /** Wechat Id */
      wechat_id: string
      /** Consent Version */
      consent_version: string
      /** Consent Confirmed */
      consent_confirmed: boolean
      /**
       * Source
       * @default PROFILE
       */
      source: string
    }
    /** ContactStatusRequest */
    ContactStatusRequest: {
      /** Status */
      status: string
    }
    /** CorrectionCreateRequest */
    CorrectionCreateRequest: {
      /** Reason */
      reason: string
    }
    /** CorrectionDecisionRequest */
    CorrectionDecisionRequest: {
      /** Decision */
      decision: string
    }
    /** CorrectionSearchRequest */
    CorrectionSearchRequest: {
      /** Status */
      status?: string | null
      /**
       * Page
       * @default 1
       */
      page: number
      /**
       * Page Size
       * @default 20
       */
      page_size: number
    }
    /** DialogueSentence */
    DialogueSentence: {
      /** Id */
      id?: string
      /**
       * Speaker
       * @default
       */
      speaker: string
      /**
       * English
       * @default
       */
      english: string
      /**
       * Chinese
       * @default
       */
      chinese: string
      /** Start Ms */
      start_ms?: number | null
      /** End Ms */
      end_ms?: number | null
      /** Audio Version Id */
      audio_version_id?: string | null
      /**
       * Timing Confirmed
       * @default false
       */
      timing_confirmed: boolean
      /**
       * Boundary Verified By
       * @default
       */
      boundary_verified_by: string
      /** Slice Target Id */
      slice_target_id?: string | null
      /** Slice Version */
      slice_version?: string | null
      /** Slice Dependency Hash */
      slice_dependency_hash?: string | null
      /** Clickable Spans */
      clickable_spans?: components['schemas']['ClickableSpan'][]
    }
    /** FavoriteRequest */
    FavoriteRequest: {
      /** Entry Type */
      entry_type: string
      /** Text */
      text: string
      /** Entry Stable Id */
      entry_stable_id: string
      /** Revision Id */
      revision_id: string
      /** Entry Version */
      entry_version: number
      /** Scene Id */
      scene_id: string
      /**
       * Sentence Snapshot
       * @default
       */
      sentence_snapshot: string
      /** Source Locator */
      source_locator: string
    }
    /** FavoriteSnapshotCancelResponse */
    FavoriteSnapshotCancelResponse: {
      /** Favorite Id */
      favorite_id: string
      /** Active */
      active: boolean
      /** Snapshot Version */
      snapshot_version: number
    }
    /** FavoriteSnapshotPageResponse */
    FavoriteSnapshotPageResponse: {
      /** Items */
      items: components['schemas']['FavoriteSnapshotResponse'][]
      /** Next Cursor */
      next_cursor: string | null
      /** Has More */
      has_more: boolean
    }
    /** FavoriteSnapshotResponse */
    FavoriteSnapshotResponse: {
      /**
       * Content Type
       * @enum {string}
       */
      content_type: 'dialogue' | 'word_card' | 'SCENE'
      /** Content Id */
      content_id: string
      /** Content Version */
      content_version: number | null
      /**
       * Entry Type
       * @enum {string}
       */
      entry_type: 'word' | 'chunk'
      /** Entry Id */
      entry_id: string
      /** Sense Id */
      sense_id: string
      /** Source Id */
      source_id: string
      /**
       * Schema Version
       * @constant
       */
      schema_version: 2
      /** Favorite Id */
      favorite_id: string
      /** Active */
      active: boolean
      /** Snapshot Version */
      snapshot_version: number
      /** Saved Content Version */
      saved_content_version: number | null
      /** Revision Id */
      revision_id: string | null
      /** English */
      english: string
      /** Phonetic */
      phonetic: string
      /** Meaning Zh */
      meaning_zh: string
      /** Explanation */
      explanation: string
      /** Source Sentence */
      source_sentence: string
      /** Source Title */
      source_title: string
      /** Source Locator */
      source_locator: {
        [key: string]: string | number
      }
      /** Image Asset Id */
      image_asset_id: string | null
      pronunciation: components['schemas']['PronunciationReference'] | null
      /** Legacy Incomplete */
      legacy_incomplete: boolean
      /** Missing Fields */
      missing_fields: string[]
      /**
       * Favorited At
       * Format: date-time
       */
      favorited_at: string
      /** Last Reviewed At */
      last_reviewed_at: string | null
    }
    /** FavoriteSourceResolutionResponse */
    FavoriteSourceResolutionResponse: {
      /** Saved Content Version */
      saved_content_version: number | null
      /** Target Content Version */
      target_content_version: number | null
      /**
       * Status
       * @enum {string}
       */
      status: 'EXACT' | 'UPDATED_OR_UNRESOLVED' | 'NO_ACCESS'
      locator?: components['schemas']['SourceLocator'] | null
      /** Safe Summary */
      safe_summary: {
        [key: string]: string
      }
      /**
       * Content Type
       * @enum {string}
       */
      content_type: 'dialogue' | 'word_card' | 'SCENE'
      /** Content Id */
      content_id: string
    }
    /** FeedbackCreateRequest */
    FeedbackCreateRequest: {
      /** Category */
      category: string
      /** Description */
      description: string
      /** Source */
      source?: {
        [key: string]: unknown
      }
      /** Screenshots */
      screenshots?: string[]
    }
    /** FeedbackUploadCredentialResponse */
    FeedbackUploadCredentialResponse: {
      /** Host */
      host: string
      /** Key */
      key: string
      /** Fields */
      fields: {
        [key: string]: string
      }
      /** Content Type */
      content_type: string
      /** Max Bytes */
      max_bytes: number
      /**
       * Expires At
       * Format: date-time
       */
      expires_at: string
      /** Policy */
      policy: string
      /** Signature */
      signature: string
      /** Access Key Id */
      access_key_id: string
    }
    /** HTTPValidationError */
    HTTPValidationError: {
      /** Detail */
      detail?: components['schemas']['ValidationError'][]
    }
    /** InternalMessageRequest */
    InternalMessageRequest: {
      /** Event Id */
      event_id: string
      /** Message Type */
      message_type: string
      /** Title */
      title: string
      /** Summary */
      summary: string
      /** Related Type */
      related_type?: string | null
      /** Related Id */
      related_id?: string | null
    }
    /** LearningCatalog */
    LearningCatalog: {
      /** Items */
      items?: {
        [key: string]: unknown
      }[]
      /** User Stage */
      user_stage?: ('NEW' | 'ENTITLED') | null
      /**
       * Authorization Pending
       * @default false
       */
      authorization_pending: boolean
    }
    /** LogoutRequest */
    LogoutRequest: {
      /** Session Id */
      session_id: string
    }
    /** MeResponse */
    MeResponse: {
      /** Public Id */
      public_id: string
      /** Juya Number */
      juya_number: string
      /** Status */
      status: string
      /** Nickname */
      nickname: string | null
      /** Avatar Object Key */
      avatar_object_key: string | null
      /** Avatar Url */
      avatar_url: string | null
      /** Created At */
      created_at: string | null
      /** Last Active At */
      last_active_at: string | null
      contact: components['schemas']['ProfileContactResponse'] | null
      /** Contact Prompt Eligible */
      contact_prompt_eligible: boolean
      /** Deletion */
      deletion: {
        [key: string]: unknown
      } | null
    }
    /** Paragraph */
    Paragraph: {
      /** Paragraph Id */
      paragraph_id: string
      /** English */
      english: string
    }
    /** PreviewScene */
    PreviewScene: {
      /** Public Id */
      public_id: string
      /** Title */
      title: string
      /**
       * Title En
       * @default
       */
      title_en: string
      /**
       * Title Zh
       * @default
       */
      title_zh: string
      /** Series */
      series?: string | null
      /** Cover Url */
      cover_url?: string | null
      /** Introduction */
      introduction?: string | null
      /**
       * Preview Status
       * @default PREVIEW
       * @constant
       */
      preview_status: 'PREVIEW'
    }
    /** ProfileContactResponse */
    ProfileContactResponse: {
      /** Wechat Id */
      wechat_id: string | null
      /** Self Edit Count */
      self_edit_count: number
      /** Change Pending */
      change_pending: boolean
      /** Contact Status */
      contact_status: string
      /** Can Self Edit */
      can_self_edit: boolean
      /** Requires Correction */
      requires_correction: boolean
      /** Consent Version */
      consent_version: string | null
      /** Consented At */
      consented_at: string | null
      /** Withdrawn At */
      withdrawn_at: string | null
      /** Verified At */
      verified_at: string | null
      /** Verified By */
      verified_by: string | null
      /**
       * Updated At
       * Format: date-time
       */
      updated_at: string
    }
    /** ProfileUpdate */
    ProfileUpdate: {
      /** Nickname */
      nickname?: string | null
      /** Avatar Object Key */
      avatar_object_key?: string | null
    }
    /** PronunciationReference */
    PronunciationReference: {
      /** Target Id */
      target_id: string
      /** Resource Version */
      resource_version?: string | null
      /**
       * Can Prepare
       * @default false
       */
      can_prepare: boolean
    }
    /** PronunciationRequest */
    PronunciationRequest: {
      /** Favorite Id */
      favorite_id?: string | null
      /** Content Type */
      content_type?: ('dialogue' | 'word_card' | 'short_reading') | null
      /** Content Id */
      content_id?: string | null
      /** Content Version */
      content_version?: number | null
      /** Entry Id */
      entry_id?: string | null
      /** Sense Id */
      sense_id?: string | null
      /** Source Id */
      source_id?: string | null
      /** Resource Version */
      resource_version?: string | null
    }
    /** PronunciationResponse */
    PronunciationResponse: {
      /**
       * Status
       * @enum {string}
       */
      status: 'READY' | 'PREPARING' | 'FAILED' | 'UNAVAILABLE'
      /** Url */
      url?: string | null
      /** Resource Version */
      resource_version?: string | null
      /** Task Id */
      task_id?: string | null
      /**
       * Can Retry
       * @default false
       */
      can_retry: boolean
      /** Code */
      code?: string | null
      /** Expires At */
      expires_at?: string | null
    }
    /** PublishedScene */
    PublishedScene: {
      /** Scene Id */
      scene_id: string
      /** Revision Id */
      revision_id: string
      /** Content Version */
      content_version: number
      content: components['schemas']['SceneContent']
    }
    /** PublishedSentence */
    PublishedSentence: {
      /** Sentence Id */
      sentence_id: string
      /** Speaker */
      speaker: string
      /** English */
      english: string
      /** Chinese */
      chinese: string
      /** Position */
      position: number
      /** Start Ms */
      start_ms?: number | null
      /** End Ms */
      end_ms?: number | null
      /** Slice Target Id */
      slice_target_id?: string | null
      /** Slice Version */
      slice_version?: string | null
    }
    /** ReadingCompleteResponse */
    ReadingCompleteResponse: {
      progress: components['schemas']['ReadingProgress']
      /** Created */
      created: boolean
    }
    /** ReadingDetail */
    ReadingDetail: {
      /** Content Id */
      content_id: string
      /**
       * Content Type
       * @default short_reading
       * @constant
       */
      content_type: 'short_reading'
      /** Title En */
      title_en: string
      /** Title Zh */
      title_zh: string
      /** Category */
      category: string
      /** Topic */
      topic: string
      /** Level */
      level: string
      /** Introduction */
      introduction: string
      /** Cover Url */
      cover_url?: string | null
      /**
       * Access
       * @default TRIAL
       * @enum {string}
       */
      access: 'TRIAL' | 'FORMAL' | 'LIMITED'
      /** Content Version */
      content_version: number
      /** Revision Id */
      revision_id: string
      /**
       * Schema Version
       * @default 2
       * @constant
       */
      schema_version: 2
      /** Paragraphs En */
      paragraphs_en: components['schemas']['Paragraph'][]
      /** Translation Zh */
      translation_zh: string
      whole_audio?: components['schemas']['WholeAudio'] | null
      progress?: components['schemas']['ReadingProgress'] | null
    }
    /** ReadingPageResponse */
    ReadingPageResponse: {
      /** Items */
      items: components['schemas']['ReadingPreview'][]
      /** Next Cursor */
      next_cursor: string | null
      /** Has More */
      has_more: boolean
    }
    /** ReadingPreview */
    ReadingPreview: {
      /** Content Id */
      content_id: string
      /**
       * Content Type
       * @default short_reading
       * @constant
       */
      content_type: 'short_reading'
      /** Title En */
      title_en: string
      /** Title Zh */
      title_zh: string
      /** Category */
      category: string
      /** Topic */
      topic: string
      /** Level */
      level: string
      /** Introduction */
      introduction: string
      /** Cover Url */
      cover_url?: string | null
      /**
       * Access
       * @default PREVIEW
       * @enum {string}
       */
      access: 'TRIAL' | 'FORMAL' | 'LIMITED' | 'PREVIEW' | 'NONE'
    }
    /** ReadingProgress */
    ReadingProgress: {
      /** Content Id */
      content_id: string
      /** Saved Content Version */
      saved_content_version: number
      /** Paragraph Id */
      paragraph_id?: string | null
      /**
       * Offset
       * @default 0
       */
      offset: number
      /**
       * Client Sequence
       * @default 0
       */
      client_sequence: number
      /**
       * Started At
       * Format: date-time
       */
      started_at: string
      /**
       * Last Read At
       * Format: date-time
       */
      last_read_at: string
      /** Completed At */
      completed_at?: string | null
    }
    /**
     * ReadingResourceResponse
     * @description Preserves the existing resource_id/url/expires_at signed resource shape.
     */
    ReadingResourceResponse: {
      /** Resource Id */
      resource_id: string
      /** Url */
      url: string
      /**
       * Expires At
       * Format: date-time
       */
      expires_at: string
    }
    /** RefreshRequest */
    RefreshRequest: {
      /** Refresh Token */
      refresh_token: string
    }
    /** ResolutionRequest */
    ResolutionRequest: {
      /** Action */
      action: string
      /** Reason */
      reason?: string | null
    }
    /** ResourceReference */
    ResourceReference: {
      /** Target Id */
      target_id: string
      /** Resource Version */
      resource_version: string
      /** Duration Ms */
      duration_ms: number
    }
    /** ReviewRequest */
    ReviewRequest: {
      /** Card Ids */
      card_ids: string[]
      /**
       * Snapshot Schema
       * @default 1
       * @enum {integer}
       */
      snapshot_schema: 1 | 2
    }
    /** SceneContent */
    SceneContent: {
      /**
       * Schema Version
       * @default 1
       * @enum {integer}
       */
      schema_version: 1 | 2
      /**
       * Template Type
       * @default dialogue
       * @enum {string}
       */
      template_type: 'dialogue' | 'word_card' | 'vocabulary'
      /**
       * Title En
       * @default
       */
      title_en: string
      /**
       * Title Zh
       * @default
       */
      title_zh: string
      /**
       * Summary
       * @default
       */
      summary: string
      /** Tags */
      tags?: string[]
      /** Original Image Asset Id */
      original_image_asset_id?: string | null
      /** Cover Asset Id */
      cover_asset_id?: string | null
      /**
       * Copyright
       * @default
       */
      copyright: string
      /**
       * Source
       * @default
       */
      source: string
      audio?: components['schemas']['AudioReference'] | null
      /** Dialogue */
      dialogue?: components['schemas']['DialogueSentence'][]
      /** Vocabulary */
      vocabulary?: components['schemas']['juya_miniapp_api__integrations__admin_api__content__SceneEntry'][]
      /** Chunks */
      chunks?: components['schemas']['juya_miniapp_api__integrations__admin_api__content__SceneEntry'][]
    }
    /** SceneDetail */
    SceneDetail: {
      /** Content Id */
      content_id: string
      /**
       * Content Type
       * @enum {string}
       */
      content_type: 'dialogue' | 'word_card'
      /** Content Version */
      content_version: number
      /** Revision Id */
      revision_id: string
      /**
       * Schema Version
       * @default 2
       * @constant
       */
      schema_version: 2
      /** Title En */
      title_en: string
      /** Title Zh */
      title_zh: string
      /** Dialogue */
      dialogue?: components['schemas']['PublishedSentence'][]
      /** Words */
      words?: components['schemas']['ConfirmedEntry'][]
      /** Chunks */
      chunks?: components['schemas']['ConfirmedEntry'][]
      whole_audio?: components['schemas']['ResourceReference'] | null
      /** Cover Asset Id */
      cover_asset_id?: string | null
      /** Learning Image Asset Id */
      learning_image_asset_id?: string | null
    }
    /** SceneOpenResult */
    SceneOpenResult: {
      /** Access */
      access?: ('OPEN' | 'FORMAL' | 'LIMITED' | 'PREVIEW') | null
      /** Sources */
      sources?: string[]
      /** Earliest Expires At */
      earliest_expires_at?: string | null
      /** Activated At */
      activated_at?: string | null
      /** Scene */
      scene?:
        | components['schemas']['PublishedScene']
        | components['schemas']['PreviewScene']
        | components['schemas']['SceneDetail']
        | null
      /**
       * Authorization Pending
       * @default false
       */
      authorization_pending: boolean
    }
    /** SignedResource */
    SignedResource: {
      /** Resource Id */
      resource_id: string
      /** Url */
      url: string
      /**
       * Expires At
       * Format: date-time
       */
      expires_at: string
    }
    /** SnapshotCreateReference */
    SnapshotCreateReference: {
      /**
       * Content Type
       * @enum {string}
       */
      content_type: 'dialogue' | 'word_card'
      /** Content Id */
      content_id: string
      /** Content Version */
      content_version: number
      /** Entry Type */
      entry_type?: ('word' | 'chunk') | null
      /** Entry Id */
      entry_id: string
      /** Sense Id */
      sense_id: string
      /** Source Id */
      source_id: string
    }
    /** SourceLocator */
    SourceLocator: {
      /** Sentence Id */
      sentence_id?: string | null
      /** Paragraph Id */
      paragraph_id?: string | null
    }
    /** SupplementRequest */
    SupplementRequest: {
      /** Text */
      text: string
      /** Screenshots */
      screenshots?: string[]
    }
    /** UserSearchRequest */
    UserSearchRequest: {
      /** Juya Number */
      juya_number?: string | null
      /** Nickname */
      nickname?: string | null
      /** Wechat Id */
      wechat_id?: string | null
      /**
       * Limit
       * @default 50
       */
      limit: number
    }
    /** ValidationError */
    ValidationError: {
      /** Location */
      loc: (string | number)[]
      /** Message */
      msg: string
      /** Error Type */
      type: string
      /** Input */
      input?: unknown
      /** Context */
      ctx?: Record<string, never>
    }
    /** WechatLoginRequest */
    WechatLoginRequest: {
      /** Code */
      code: string
      /** Device */
      device: string
    }
    /** WholeAudio */
    WholeAudio: {
      /** Target Id */
      target_id: string
      /** Resource Version */
      resource_version: string
      /** Duration Ms */
      duration_ms: number
    }
    /** SceneEntry */
    juya_miniapp_api__integrations__admin_api__content__SceneEntry: {
      /**
       * Entry Id
       * @default
       */
      entry_id: string
      /**
       * Entry Version
       * @default 1
       */
      entry_version: number
      /**
       * English
       * @default
       */
      english: string
      /** Variants */
      variants?: string[]
      /**
       * Phonetic
       * @default
       */
      phonetic: string
      /**
       * Chinese
       * @default
       */
      chinese: string
      /**
       * Explanation
       * @default
       */
      explanation: string
      /** Source Sentence Ids */
      source_sentence_ids?: string[]
      /** Icon Asset Id */
      icon_asset_id?: string | null
      /** Audio Target Id */
      audio_target_id?: string | null
      /** Audio Version Id */
      audio_version_id?: string | null
      /**
       * Sense Id
       * @default
       */
      sense_id: string
      /**
       * Source Id
       * @default
       */
      source_id: string
      /**
       * Source Sentence
       * @default
       */
      source_sentence: string
      /** Source Locator */
      source_locator?: {
        [key: string]: string
      } | null
      /** Pronunciation Target Id */
      pronunciation_target_id?: string | null
      /**
       * Pronunciation Text
       * @default
       */
      pronunciation_text: string
      /**
       * Reading Variant
       * @default
       */
      reading_variant: string
      /**
       * Allow Synthesis
       * @default false
       */
      allow_synthesis: boolean
      /**
       * Confirmed
       * @default false
       */
      confirmed: boolean
      /** Meaning Change */
      meaning_change?: ('wording' | 'new_sense') | null
    }
    /** SceneEntry */
    juya_miniapp_api__integrations__admin_api__schemas__SceneEntry: {
      /**
       * Entry Id
       * @default
       */
      entry_id: string
      /**
       * Entry Version
       * @default 1
       */
      entry_version: number
      /**
       * English
       * @default
       */
      english: string
      /** Variants */
      variants?: string[]
      /**
       * Phonetic
       * @default
       */
      phonetic: string
      /**
       * Chinese
       * @default
       */
      chinese: string
      /**
       * Explanation
       * @default
       */
      explanation: string
      /** Source Sentence Ids */
      source_sentence_ids?: string[]
      /** Icon Asset Id */
      icon_asset_id?: string | null
      /** Audio Target Id */
      audio_target_id?: string | null
      /** Audio Version Id */
      audio_version_id?: string | null
      /**
       * Sense Id
       * @default
       */
      sense_id: string
      /**
       * Source Id
       * @default
       */
      source_id: string
      /**
       * Source Sentence
       * @default
       */
      source_sentence: string
      /** Pronunciation Target Id */
      pronunciation_target_id?: string | null
      /**
       * Pronunciation Text
       * @default
       */
      pronunciation_text: string
      /**
       * Reading Variant
       * @default
       */
      reading_variant: string
      /**
       * Allow Synthesis
       * @default false
       */
      allow_synthesis: boolean
      /**
       * Confirmed
       * @default false
       */
      confirmed: boolean
      /** Meaning Change */
      meaning_change?: ('wording' | 'new_sense') | null
      /** Scene Id */
      scene_id: string
      /** Revision Id */
      revision_id: string
      /** Source Locator */
      source_locator: string
      /** Entry Type */
      entry_type?: string | null
      /**
       * Sentence Snapshot
       * @default
       */
      sentence_snapshot: string
    }
    /** PositionRequest */
    juya_miniapp_api__modules__learning__router__PositionRequest: {
      /** Client Sequence */
      client_sequence: number
      /** Entry Id */
      entry_id: string
      /**
       * Offset
       * @default 0
       */
      offset: number
    }
    /** PositionRequest */
    juya_miniapp_api__modules__short_reading__router__PositionRequest: {
      /** Content Version */
      content_version: number
      /** Paragraph Id */
      paragraph_id?: string | null
      /**
       * Offset
       * @default 0
       */
      offset: number
      /** Client Sequence */
      client_sequence: number
    }
  }
  responses: never
  parameters: never
  requestBodies: never
  headers: never
  pathItems: never
}
