import { enhanceSessionMenu, isMenuForAnchor, type CopyLabels } from './menu.ts'
import { resolveSession, type ResolvedSession, type SessionList, type WorkspaceTranslate } from './sessions.ts'

/** Client factory waits for sessions and the workspace locale dictionary. */
export const inject = ['sessions', 'locale']

interface PluginContext {
  get(name: string): unknown
  effect(fn: () => (() => void) | void, label?: string): void
  locale: { bind(ns: string): WorkspaceTranslate }
}

interface Pending {
  session: ResolvedSession
  anchor: HTMLElement
}

/**
 * Watch session-row menus and inject a copy-reference action.
 * The clicked ellipsis is the identity, not the host rename/fork/archive labels.
 * @param ctx - client root context.
 */
export function apply(ctx: PluginContext): void {
  const sessions = ctx.get('sessions') as { list: SessionList } | undefined
  if (sessions === undefined) return
  const t = ctx.locale.bind('workspace')

  let pending: Pending | undefined

  const mount = (): void => {
    if (pending === undefined) return
    const labels = copyLabels(t)
    for (const node of document.querySelectorAll('[role="menu"]')) {
      if (!(node instanceof HTMLElement)) continue
      if (!isMenuForAnchor(node, pending.anchor)) continue
      if (enhanceSessionMenu(node, pending.session, labels)) pending = undefined
      return
    }
  }

  const onPointerDown = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button[aria-label]')
    if (!(button instanceof HTMLElement)) return
    const session = resolveSession(button, sessions.list, t)
    pending = session === undefined ? undefined : { session, anchor: button }
    if (pending !== undefined) queueMicrotask(mount)
  }

  const observer = new MutationObserver(mount)
  ctx.effect(() => {
    document.addEventListener('pointerdown', onPointerDown, true)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      observer.disconnect()
    }
  }, 'dsh-copy-session-ref: session menu')
}

/**
 * Copy-row strings. Default Chinese; English only when the host rename row is English.
 * @param t - ui-workspace translator, read at click time.
 * @returns visible labels.
 */
function copyLabels(t: WorkspaceTranslate): CopyLabels {
  if (t('rename') === 'Rename') {
    return { idle: 'Copy reference', done: 'Copied', fail: 'Copy failed' }
  }
  return { idle: '复制引用', done: '已复制', fail: '复制失败' }
}
