/**
 * Host 半区: 只声明命名规则的 Config, 让 Plugins 页面能编辑规则.
 * 复制行为本身在 Client 半区完成.
 */
import type { Context, Volatile } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import {
  CONFIG_VERSION, DEFAULT_FLAGS, DEFAULT_RULES, PLUGIN_ID, RULES_FIELD, VERSION_FIELD,
  type LabelRule,
} from './shared.ts'

export const name = PLUGIN_ID

/** Host 与 Client 共用的配置形状. 两个字段都是 volatile, 改动不需要重挂插件. */
export interface Config {
  /** 配置形状版本. */
  version: Volatile<number>
  /** 有序命名替换规则. */
  rules: Volatile<LabelRule[]>
}

/** 规则与版本号的 schema; 默认规则写在这里, 不另存一份. */
export const Config: Schema<{ version?: number; rules?: LabelRule[] }, Config> = Schema.object({
  [VERSION_FIELD]: Schema.number().default(CONFIG_VERSION).volatile(),
  [RULES_FIELD]: Schema.array(Schema.object({
    enabled: Schema.boolean().default(true),
    pattern: Schema.string().default(''),
    flags: Schema.string().default(DEFAULT_FLAGS),
    replacement: Schema.string().default(''),
  })).default(DEFAULT_RULES.map(rule => ({ ...rule }))).volatile(),
})

/**
 * 命名规则由 Client 半区读取并生效, Host 侧只报告一次装配结果.
 * @param ctx - Host 插件上下文.
 * @param config - Loader 校验后的行配置.
 */
export function apply(ctx: Context, config: Config): void {
  ctx.logger.info('dsh-copy-session-ref: 命名规则 %d 条', config.rules.get().length)
}
