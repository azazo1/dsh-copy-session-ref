/**
 * dsh-copy-session-ref 浏览器半区.
 *
 * 会话行菜单的注入与检测沿用原实现; 新增的是命名规则配置面:
 * 规则从本插件的 profile 条目表单读取, 复制时作用在会话标题上.
 */
// 只做类型引入: 拉入 configForms 的 Context 合并与 slot 的类型.
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { applyRules, PLUGIN_ID, type PluginSettings } from '../shared.ts'
import { enhanceSessionMenu, isMenuForAnchor, type CopyLabels } from './menu.ts'
import { en, zh, type CopySessionRefLocaleKey } from './locales.ts'
import { RulesController } from './rules-controller.ts'
import { RulesForm } from './rules-form.tsx'
import { injectStyles } from './styles.ts'
import { resolveSession, type ResolvedSession, type SessionList, type WorkspaceTranslate } from './sessions.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 本插件设置表单的文案. */
    'dsh-copy-session-ref': CopySessionRefLocaleKey
  }
}

/** 本插件字典的命名空间, 与包名一致. */
const LOCALE_NS = PLUGIN_ID

/** Client factory 等这些服务就绪后再装配. */
export const inject = ['sessions', 'locale', 'slots', 'configForms']

/** locale 服务用到的面. */
interface LocaleService {
  /** 注册本插件的双语字典, 返回可释放的句柄. */
  register(ns: string, dicts: Record<'zh' | 'en', Record<CopySessionRefLocaleKey, string>>): () => void
  /** 绑定一个命名空间的读取函数. */
  bind(ns: string): WorkspaceTranslate
}

/** slots 服务用到的面. */
interface SlotsService {
  /** slot 出现后再执行注册, 返回可释放的句柄. */
  inject(name: string, factory: () => () => void): () => void
  /** 注册一个 slot 条目, 返回其释放函数. */
  register(options: Record<string, unknown>, component: unknown): () => void
}

/** configForms 服务用到的面. */
interface ConfigFormsService {
  /** 取本插件 profile 条目的共享配置表单. */
  get<T>(namespace: string): ConfigForm<T>
  /** 该 profile 条目被服务期间保持注册. */
  whileServed(namespaces: readonly string[], register: (served: ReadonlySet<string>) => () => void): () => void
}

interface PluginContext {
  get(name: string): unknown
  effect(fn: () => (() => void) | void, label?: string): void
  locale: LocaleService
  slots: SlotsService
  configForms: ConfigFormsService
}

interface Pending {
  session: ResolvedSession
  anchor: HTMLElement
}

/**
 * 挂上命名规则表单, 并在会话行菜单里注入复制引用动作.
 * 被点击的 ellipsis 才是身份, 不依赖宿主给的 rename/fork/archive 文案.
 * @param ctx - client root context.
 */
export function apply(ctx: PluginContext): void {
  const sessions = ctx.get('sessions') as { list: SessionList } | undefined
  if (sessions === undefined) return
  const t = ctx.locale.bind('workspace')

  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), 'dsh-copy-session-ref: dictionaries')
  injectStyles()

  const controller = new RulesController(ctx.configForms.get<PluginSettings>(PLUGIN_ID))
  ctx.effect(() => () => {
    controller.dispose()
  }, 'dsh-copy-session-ref: rules form')

  ctx.effect(() => ctx.configForms.whileServed([PLUGIN_ID], () => ctx.slots.inject(
    'plugins.bundle.config',
    () => ctx.slots.register({
      name: 'plugins.bundle.config',
      key: PLUGIN_ID,
      locale: LOCALE_NS,
      inject: () => controller.inject(),
    }, RulesForm),
  )), 'dsh-copy-session-ref: rules page')

  const formatTitle = (title: string): string => applyRules(title, controller.rules())

  let pending: Pending | undefined

  const mount = (): void => {
    if (pending === undefined) return
    const labels = copyLabels(t)
    for (const node of document.querySelectorAll('[role="menu"]')) {
      if (!(node instanceof HTMLElement)) continue
      if (!isMenuForAnchor(node, pending.anchor)) continue
      if (enhanceSessionMenu(node, pending.session, labels, formatTitle)) pending = undefined
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
