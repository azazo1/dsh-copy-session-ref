import Schema from "@deepseek-ai/schemastery";
import { Context, Volatile } from "@deepseek-ai/cordis";
//#region src/shared.d.ts
/** 一条有序命名替换规则. */
interface LabelRule {
  /** 关闭时该条不参与替换. */
  enabled: boolean;
  /** 正则源码; 空串表示尚未填写, 该条跳过. */
  pattern: string;
  /** JS 正则 flags, 例如 gu. */
  flags: string;
  /** 替换文本, 支持 $1 与 $& 等 JS 替换语义. */
  replacement: string;
}
//#endregion
//#region src/index.d.ts
declare const name = "dsh-copy-session-ref";
/** Host 与 Client 共用的配置形状. 两个字段都是 volatile, 改动不需要重挂插件. */
interface Config {
  /** 配置形状版本. */
  version: Volatile<number>;
  /** 有序命名替换规则. */
  rules: Volatile<LabelRule[]>;
}
/** 规则与版本号的 schema; 默认规则写在这里, 不另存一份. */
declare const Config: Schema<{
  version?: number;
  rules?: LabelRule[];
}, Config>;
/**
 * 命名规则由 Client 半区读取并生效, Host 侧只报告一次装配结果.
 * @param ctx - Host 插件上下文.
 * @param config - Loader 校验后的行配置.
 */
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, apply, name };