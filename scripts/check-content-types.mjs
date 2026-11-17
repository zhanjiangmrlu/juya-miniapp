/** 只读核对生产词汇双分类，fetchImpl 为 HTTP 请求适配器 */
export const checkProductionContentTypes = async ({ fetchImpl = fetch } = {}) => {
  try {
    const pages = []
    for (const type of ['illustrated', 'intensive']) {
      const url = new URL('/api/mini/v1/cards', 'https://api.juyayingyu.com')
      url.search = new URLSearchParams({
        scope: 'published',
        content_type: type,
        page: '1',
        limit: '1'
      }).toString()
      const response = await fetchImpl(url.href, {
        redirect: 'error',
        credentials: 'omit',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000)
      })
      if (response.status !== 200) throw new Error('http')
      const page = await response.json()
      if (
        page?.content_types_ready !== true ||
        !Number.isSafeInteger(page.type_published_total) ||
        page.type_published_total < 0 ||
        !Number.isSafeInteger(page.published_total) ||
        page.published_total < 0 ||
        page.total !== page.type_published_total ||
        !Array.isArray(page.items) ||
        page.items.length !== Math.min(1, page.total) ||
        page.items.some((item) => !item?.id || item.content_type !== type)
      )
        throw new Error('contract')
      pages.push(page)
    }
    if (
      pages[0].published_total !== pages[1].published_total ||
      pages[0].total + pages[1].total !== pages[0].published_total
    )
      throw new Error('counts')
    return {
      illustrated: pages[0].total,
      intensive: pages[1].total,
      publishedTotal: pages[0].published_total
    }
  } catch {
    throw new Error('生产词汇分类检查未通过，请先在生产后台核对历史分类并启用，再重试发布')
  }
}
