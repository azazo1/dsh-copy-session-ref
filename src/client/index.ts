import { enhanceSessionMenu } from './menu.ts'
import { resolveSession, type SessionList } from './sessions.ts'

/** Client factory waits for the sessions service. */
export const inject = ['sessions']

interface PluginContext {
  get(name: string): unknown
  effect(fn: () => (() => void) | void, label?: string): void
}

/**
 * Watch session-row menus and inject a copy-reference action.
 * @param ctx - client root context.
 */
export function apply(ctx: PluginContext): void {
  const sessions = ctx.get('sessions') as { list: SessionList } | undefined
  if (sessions === undefined) return
  let pending: ReturnType<typeof resolveSession>

  const onPointerDown = (event: Event): void => {
    const target = event.target
    if (!(target instanceof Element)) return
    const button = target.closest('button[aria-label]')
    if (!(button instanceof HTMLElement)) return
    pending = resolveSession(button, sessions.list)
  }

  const scan = (): void => {
    if (pending === undefined) return
    for (const node of document.querySelectorAll('[role="menu"]')) {
      if (node instanceof HTMLElement) enhanceSessionMenu(node, pending)
    }
  }

  const observer = new MutationObserver(scan)
  ctx.effect(() => {
    document.addEventListener('pointerdown', onPointerDown, true)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      observer.disconnect()
    }
  }, 'dsh-copy-session-ref: session menu')
}
