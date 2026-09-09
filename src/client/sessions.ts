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

/** ui-workspace locale lookup. */
export type WorkspaceTranslate = (key: string, params?: Record<string, unknown>) => string

/**
 * Map the clicked session-row action button to a listed session.
 * Matches DSH's own `actions.session.aria` copy so language switches follow
 * the host dictionary. Same-title rows are disambiguated by selected state,
 * then by DOM order among matching action buttons.
 * @param button - the ellipsis button that opened the menu.
 * @param list - live session list snapshot source.
 * @param t - ui-workspace translator.
 * @returns session id and display label, or undefined when unresolved.
 */
export function resolveSession(
  button: HTMLElement,
  list: SessionList,
  t: WorkspaceTranslate,
): ResolvedSession | undefined {
  const aria = button.getAttribute('aria-label')
  if (aria === null || aria === '') return undefined
  const treeitem = button.closest('[role="treeitem"]')
  if (!(treeitem instanceof HTMLElement)) return undefined

  const snap = list.getSnapshot()
  const matches = snap.ids
    .map(id => snap.byId[id])
    .filter((row): row is SessionSummary => (
      row !== undefined
      && !row.blank
      && t('actions.session.aria', { name: row.displayTitle }) === aria
    ))
  if (matches.length === 0) return undefined
  if (matches.length === 1) return { id: matches[0].id, label: matches[0].displayTitle }

  const selected = treeitem.getAttribute('aria-selected') === 'true'
  if (selected) {
    const current = matches.find(row => row.id === snap.current)
    if (current !== undefined) return { id: current.id, label: current.displayTitle }
  }

  const sameTitleButtons = [...document.querySelectorAll('button[aria-label]')].filter((node) => {
    if (!(node instanceof HTMLElement)) return false
    if (node.closest('[role="treeitem"]') === null) return false
    return node.getAttribute('aria-label') === aria
  })
  const index = sameTitleButtons.indexOf(button)
  const hit = matches[index] ?? matches[0]
  return { id: hit.id, label: hit.displayTitle }
}
