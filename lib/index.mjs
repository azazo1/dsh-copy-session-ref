import Schema from "@deepseek-ai/schemastery";
//#region src/shared.ts
/** Host 与 Client 共用的命名规则定义与纯逻辑. */
/** 插件包名; Client loader 注册 id 与 profile 条目 id 共用. */
const PLUGIN_ID = "dsh-copy-session-ref";
/** Config 字段: 配置形状版本. */
const VERSION_FIELD = "version";
/** Config 字段: 有序命名替换规则. */
const RULES_FIELD = "rules";
/**
* 内置默认规则: 先把连续空白折成 `-`, 再用双引号把名称包起来.
* `raw title` 变成 `"raw-title"`; 空标题变成 `""`.
* 冻结后同时作为 Host schema 默认值与 Client 兜底值, 只读.
*/
const DEFAULT_RULES = Object.freeze([Object.freeze({
	enabled: true,
	pattern: "\\s+",
	flags: "gu",
	replacement: "-"
}), Object.freeze({
	enabled: true,
	pattern: "^([\\s\\S]*)$",
	flags: "u",
	replacement: "\"$1\""
})]);
//#endregion
//#region src/index.ts
const name = PLUGIN_ID;
/** 规则与版本号的 schema; 默认规则写在这里, 不另存一份. */
const Config = Schema.object({
	[VERSION_FIELD]: Schema.number().default(1).volatile(),
	[RULES_FIELD]: Schema.array(Schema.object({
		enabled: Schema.boolean().default(true),
		pattern: Schema.string().default(""),
		flags: Schema.string().default("gu"),
		replacement: Schema.string().default("")
	})).default(DEFAULT_RULES.map((rule) => ({ ...rule }))).volatile()
});
/**
* 命名规则由 Client 半区读取并生效, Host 侧只报告一次装配结果.
* @param ctx - Host 插件上下文.
* @param config - Loader 校验后的行配置.
*/
function apply(ctx, config) {
	ctx.logger.info("dsh-copy-session-ref: 命名规则 %d 条", config.rules.get().length);
}
//#endregion
export { Config, apply, name };
