/** 并行重新读取撤回注销后需要恢复的服务端投影。 */
export async function reloadAfterDeletionRevoke(
  loaders: Array<() => Promise<unknown>>
): Promise<void> {
  await Promise.all(loaders.map(async (load) => load()))
}
