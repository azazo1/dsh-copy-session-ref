/**
 * dsh-copy-session-ref 浏览器半区.
 *
 * 复制引用有两个入口, 都注册进宿主自己的 slot: 会话行 "..." 菜单里的
 * sidebar.workspaces.session.menu.item, 以及会话行 hover 卡片里的
 * sidebar.session.row.hover. 两者共用命名规则配置面: 规则从本插件的
 * profile 条目表单读取, 复制时作用在会话标题上.
 */
// 只做类型引入: 拉入 configForms 的 Context 合并与 slot 的类型.
import type {} from '@deepseek-ai/dsh-client-ui-plugin-manager/client'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { applyRules, PLUGIN_ID, type PluginSettings } from '../shared.ts'
import { HoverCopyRow } from './hover-row.tsx'
import { en, zh, type CopySessionRefLocaleKey } from './locales.ts'
import { MenuCopyRow } from './menu-row.tsx'
import { RulesController } from './rules-controller.ts'
import { RulesForm } from './rules-form.tsx'
import { injectStyles } from './styles.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** 本插件设置表单与复制行的文案. */
    'dsh-copy-session-ref': CopySessionRefLocaleKey
  }
}

/** 本插件字典的命名空间, 与包名一致. */
const LOCALE_NS = PLUGIN_ID

/** Client factory 等这些服务就绪后再装配. */
export const inject = ['locale', 'slots', 'configForms']

/** locale 服务用到的面. */
interface LocaleService {
  /** 注册本插件的双语字典, 返回可释放的句柄. */
  register(ns: string, dicts: Record<'zh' | 'en', Record<CopySessionRefLocaleKey, string>>): () => void
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
  effect(fn: () => (() => void) | void, label?: string): void
  locale: LocaleService
  slots: SlotsService
  configForms: ConfigFormsService
}

/**
 * 挂上命名规则表单, 并注册菜单与 hover 卡片两个复制引用入口.
 * 两个入口的会话身份都由框架给出, 插件不解析 DOM.
 * @param ctx - client root context.
 */
export function apply(ctx: PluginContext): void {
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

  // 菜单行排在宿主自己的 archive (order 400) 之后.
  ctx.effect(() => ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
    name: 'sidebar.workspaces.session.menu.item',
    id: PLUGIN_ID,
    order: 500,
    locale: LOCALE_NS,
    inject: () => ({ formatTitle }),
  }, MenuCopyRow)), 'dsh-copy-session-ref: session menu row')

  // hover 卡片行排在计划任务区块 (order 10) 前面, 即 slot 区域的第一位.
  ctx.effect(() => ctx.slots.inject('sidebar.session.row.hover', () => ctx.slots.register({
    name: 'sidebar.session.row.hover',
    id: PLUGIN_ID,
    order: 5,
    locale: LOCALE_NS,
    inject: () => ({ formatTitle }),
  }, HoverCopyRow)), 'dsh-copy-session-ref: hover card row')
}
