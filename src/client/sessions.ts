/** Minimal session-list face used to resolve the clicked row. */
export interface SessionList {
  getSnapshot(): {
    ids: readonly string[]
    byId: Record<string, SessionSummary | undefined>
    current: string | undefined
  }
}

/** One listed session. */
export interface SessionSummary {
  id: string
  displayTitle: string
  blank: boolean
  updatedAt: number
}

/** Resolved target for the open session menu. */
export interface ResolvedSession {
  id: string
  label: string
}

const ZH_ACTIONS = /^会话[“"](.+)[”"]的操作$/u
const EN_ACTIONS = /^Session actions for (.+)$/u

/**
 * Read the session title encoded in the row action button aria-label.
 * @param ariaLabel - `aria-label` of the ellipsis button.
 * @returns title, or undefined when this is not a session-row action.
 */
export function titleFromActionLabel(ariaLabel: string): string | undefined {
  return ZH_ACTIONS.exec(ariaLabel)?.[1] ?? EN_ACTIONS.exec(ariaLabel)?.[1]
}

/**
 * Map the clicked session-row action button to a listed session.
 * Same-title rows are disambiguated by selected state, then by DOM order
 * among matching action buttons versus matching listed sessions.
 * @param button - the ellipsis button that opened the menu.
 * @param list - live session list snapshot source.
 * @returns session id and display label, or undefined when unresolved.
 */
export function resolveSession(button: HTMLElement, list: SessionList): ResolvedSession | undefined {
  const title = titleFromActionLabel(button.getAttribute('aria-label') ?? '')
  if (title === undefined) return undefined
  const treeitem = button.closest('[role="treeitem"]')
  if (!(treeitem instanceof HTMLElement)) return undefined

  const snap = list.getSnapshot()
  const matches = snap.ids
    .map(id => snap.byId[id])
    .filter((row): row is SessionSummary => row !== undefined && !row.blank && row.displayTitle === title)
  if (matches.length === 0) return { id: title, label: title }
  if (matches.length === 1) return { id: matches[0].id, label: title }

  const selected = treeitem.getAttribute('aria-selected') === 'true'
  if (selected) {
    const current = matches.find(row => row.id === snap.current)
    if (current !== undefined) return { id: current.id, label: title }
  }

  const sameTitleButtons = [...document.querySelectorAll('button[aria-label]')].filter((node) => {
    if (!(node instanceof HTMLElement)) return false
    if (node.closest('[role="treeitem"]') === null) return false
    return titleFromActionLabel(node.getAttribute('aria-label') ?? '') === title
  })
  const index = sameTitleButtons.indexOf(button)
  const hit = matches[index] ?? matches[0]
  return { id: hit.id, label: title }
}
