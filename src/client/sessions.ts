/** 会话身份的解析: 两个复制入口都从这里取目标会话. */

/**
 * 会话列表快照里本插件读得到的部分.
 * 真实快照 (dsh-api-session-controller 的 SessionListState) 还带 ids, phase 与
 * projectionsBySession, 这里只声明用得上的 byId.
 */
export interface SessionListSnapshot {
  byId: Record<string, SessionSummary | undefined>
}

/** 列表里的一行会话. */
export interface SessionSummary {
  id: string
  displayTitle: string
  blank: boolean
  updatedAt: number
}

/** 一次复制要用的目标: 会话 id 与给人看的名称. */
export interface ResolvedSession {
  id: string
  label: string
}

/** 框架给每个 slot 的标准 hook: 用选择器读会话列表快照. */
export type UseSessions = <T>(selector: (state: SessionListSnapshot) => T) => T

/**
 * 把列表快照里的一行收成复制目标.
 * 空会话 (还没有第一条消息) 与查不到的行都没有可引用的身份.
 * @param row - 该 id 在快照里对应的行.
 * @returns 会话 id 与显示标题, 或 undefined.
 */
export function sessionTarget(row: SessionSummary | undefined): ResolvedSession | undefined {
  if (row === undefined || row.blank) return undefined
  return { id: row.id, label: row.displayTitle }
}
