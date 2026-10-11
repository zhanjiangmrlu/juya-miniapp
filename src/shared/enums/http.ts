/** 请求方法 */
export const HttpMethod = {
  DELETE: 'DELETE',
  GET: 'GET',
  POST: 'POST',
  PATCH: 'PATCH',
  PUT: 'PUT'
} as const

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod] & string
