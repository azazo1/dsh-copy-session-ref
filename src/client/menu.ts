import { formatSessionReferenceMention } from '../mention.ts'
import type { ResolvedSession } from './sessions.ts'

const ITEM_ATTR = 'data-dsh-copy-session-ref'
const COPY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor"/><path d="M10.5 5.5V3.5A1 1 0 0 0 9.5 2.5h-6A1 1 0 0 0 2.5 3.5v6a1 1 0 0 0 1 1h2" stroke="currentColor"/></svg>'

const SESSION_MENU_LABELS = new Set([
  '重命名',
  'Rename',
  '分叉会话',
  'Fork session',
  '归档会话',
  'Archive session',
])

/**
 * Whether this portaled menu is a session-row action menu.
 * @param menu - a `[role=menu]` element.
 * @returns true when rename / fork / archive are all present.
 */
export function isSessionMenu(menu: Element): boolean {
  const labels = [...menu.querySelectorAll('[role="menuitem"]')]
    .map(node => node.textContent?.trim() ?? '')
    .filter(label => label !== '')
  if (labels.some(label => label === '复制引用' || label === 'Copy reference' || label === '已复制' || label === 'Copied')) {
    return labels.filter(label => SESSION_MENU_LABELS.has(label)).length >= 3
  }
  return labels.includes('重命名') && labels.includes('分叉会话') && labels.includes('归档会话')
    || labels.includes('Rename') && labels.includes('Fork session') && labels.includes('Archive session')
}

/**
 * Append a copy-reference row to an open session menu.
 * @param menu - portaled `[role=menu]`.
 * @param session - session resolved from the ellipsis click.
 */
export function enhanceSessionMenu(menu: HTMLElement, session: ResolvedSession): void {
  if (menu.querySelector(`[${ITEM_ATTR}]`) !== null) return
  if (!isSessionMenu(menu)) return
  const sample = menu.querySelector('[role="menuitem"]')
  if (!(sample instanceof HTMLElement)) return
  const wrap = sample.parentElement
  const list = wrap?.parentElement
  if (wrap === null || list === undefined || list === null) return

  const cloneWrap = wrap.cloneNode(true) as HTMLElement
  cloneWrap.setAttribute(ITEM_ATTR, '')
  const button = cloneWrap.querySelector('[role="menuitem"]')
  if (!(button instanceof HTMLButtonElement)) return
  button.removeAttribute('aria-haspopup')
  button.removeAttribute('aria-expanded')
  button.disabled = false

  const spans = [...button.querySelectorAll(':scope > span')]
  const labelSpan = spans.at(-1) ?? button
  const iconSpan = spans.length > 1 ? spans[0] : undefined
  const chinese = [...menu.querySelectorAll('[role="menuitem"]')]
    .some(node => node.textContent?.trim() === '重命名')
  const idleLabel = chinese ? '复制引用' : 'Copy reference'
  const doneLabel = chinese ? '已复制' : 'Copied'
  const failLabel = chinese ? '复制失败' : 'Copy failed'
  labelSpan.textContent = idleLabel
  if (iconSpan !== undefined) iconSpan.innerHTML = COPY_SVG

  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    void copyMention(session, labelSpan, idleLabel, doneLabel, failLabel)
  })
  list.append(cloneWrap)
}

/**
 * Write the canonical mention and briefly confirm on the menu row.
 * @param session - copied session.
 * @param labelSpan - visible label node.
 * @param idleLabel - original label.
 * @param doneLabel - success label.
 * @param failLabel - failure label.
 */
async function copyMention(
  session: ResolvedSession,
  labelSpan: Element,
  idleLabel: string,
  doneLabel: string,
  failLabel: string,
): Promise<void> {
  const mention = formatSessionReferenceMention(session.id, session.label)
  try {
    await writeClipboard(mention)
    labelSpan.textContent = doneLabel
  } catch {
    labelSpan.textContent = failLabel
  }
  window.setTimeout(() => {
    labelSpan.textContent = idleLabel
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  }, 500)
}

/**
 * Copy text to the clipboard, falling back to a hidden textarea.
 * @param text - mention to copy.
 */
async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText !== undefined) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.append(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('copy failed')
}
