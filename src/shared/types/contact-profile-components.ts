/** ContactForm 输入属性 */
export type ContactFormProps = { management?: boolean; disabled?: boolean }

/** ContactForm 事件契约 */
export type ContactFormEmits = { submit: [wechatId: string] }
