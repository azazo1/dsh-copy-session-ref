import { formatSessionReferenceMention } from '../mention.ts'
import type { ResolvedSession } from './sessions.ts'

const ITEM_ATTR = 'data-dsh-copy-session-ref'
const COPY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor"/><path d="M10.5 5.5V3.5A1 1 0 0 0 9.5 2.5h-6A1 1 0 0 0 2.5 3.5v6a1 1 0 0 0 1 1h2" stroke="currentColor"/></svg>'
const ANCHOR_GAP_PX = 160

export interface CopyLabels {
  idle: string
  done: string
  fail: string
}

/** 把会话标题变成引用里显示的名称; 规则由插件配置决定. */
export type TitleFormatter = (title: string) => string

/**
 * Whether this portaled menu has been placed next to the session ellipsis.
 * Hidden measure frames at 0,0 are ignored.
 * @param menu - a `[role=menu]` element.
 * @returns true when the menu is visible with a real box.
 */
export function isPlacedMenu(menu: HTMLElement): boolean {
  if (getComputedStyle(menu).visibility === 'hidden') return false
  const box = menu.getBoundingClientRect()
  return box.width > 0 && box.height > 0
}

/**
 * Whether a placed portal menu belongs to the clicked session action button.
 * @param menu - placed `[role=menu]`.
 * @param anchor - the ellipsis that opened it.
 * @returns true when the menu sits next to the button.
 */
export function isMenuForAnchor(menu: HTMLElement, anchor: HTMLElement): boolean {
  if (!isPlacedMenu(menu)) return false
  const menuBox = menu.getBoundingClientRect()
  const anchorBox = anchor.getBoundingClientRect()
  const dx = Math.max(anchorBox.left - menuBox.right, menuBox.left - anchorBox.right, 0)
  const dy = Math.max(anchorBox.top - menuBox.bottom, menuBox.top - anchorBox.bottom, 0)
  return Math.hypot(dx, dy) <= ANCHOR_GAP_PX
}

/**
 * Append a copy-reference row to an open session menu.
 * @param menu - portaled `[role=menu]`.
 * @param session - session resolved from the ellipsis click.
 * @param labels - visible copy-row strings.
 * @param formatTitle - naming-rule formatter applied to the session title.
 * @returns true when the menu already has the row or a row was inserted.
 */
export function enhanceSessionMenu(
  menu: HTMLElement,
  session: ResolvedSession,
  labels: CopyLabels,
  formatTitle: TitleFormatter,
): boolean {
  if (menu.querySelector(`[${ITEM_ATTR}]`) !== null) return true
  const sample = menu.querySelector('[role="menuitem"]')
  if (!(sample instanceof HTMLElement)) return false
  const wrap = sample.parentElement
  const list = wrap?.parentElement
  if (wrap === null || list === undefined || list === null) return false

  const cloneWrap = wrap.cloneNode(true) as HTMLElement
  cloneWrap.setAttribute(ITEM_ATTR, '')
  const button = cloneWrap.querySelector('[role="menuitem"]')
  if (!(button instanceof HTMLButtonElement)) return false
  button.removeAttribute('aria-haspopup')
  button.removeAttribute('aria-expanded')
  button.disabled = false

  const spans = [...button.querySelectorAll(':scope > span')]
  const labelSpan = spans.at(-1) ?? button
  const iconSpan = spans.length > 1 ? spans[0] : undefined
  labelSpan.textContent = labels.idle
  if (iconSpan !== undefined) iconSpan.innerHTML = COPY_SVG

  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    void copyMention(session, labelSpan, labels, formatTitle)
  })
  list.append(cloneWrap)
  return true
}

/**
 * Write the canonical mention and briefly confirm on the menu row.
 * @param session - copied session.
 * @param labelSpan - visible label node.
 * @param labels - copy-row strings.
 * @param formatTitle - naming-rule formatter applied to the session title.
 */
async function copyMention(
  session: ResolvedSession,
  labelSpan: Element,
  labels: CopyLabels,
  formatTitle: TitleFormatter,
): Promise<void> {
  const mention = formatSessionReferenceMention(session.id, formatTitle(session.label))
  try {
    await writeClipboard(mention)
    labelSpan.textContent = labels.done
  } catch {
    labelSpan.textContent = labels.fail
  }
  window.setTimeout(() => {
    labelSpan.textContent = labels.idle
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
