/** Host 与 Client 共用的命名规则定义与纯逻辑. */

/** 插件包名; Client loader 注册 id 与 profile 条目 id 共用. */
export const PLUGIN_ID = 'dsh-copy-session-ref'

/** 当前配置形状版本, 供将来判断是否需要迁移. */
export const CONFIG_VERSION = 1

/** Config 字段: 配置形状版本. */
export const VERSION_FIELD = 'version'

/** Config 字段: 有序命名替换规则. */
export const RULES_FIELD = 'rules'

/** 规则对象字段. */
export const RULE_ENABLED_FIELD = 'enabled'
export const RULE_PATTERN_FIELD = 'pattern'
export const RULE_FLAGS_FIELD = 'flags'
export const RULE_REPLACEMENT_FIELD = 'replacement'

/** 新增规则时 flags 的预填值. */
export const DEFAULT_FLAGS = 'gu'

/** 一条有序命名替换规则. */
export interface LabelRule {
  /** 关闭时该条不参与替换. */
  enabled: boolean
  /** 正则源码; 空串表示尚未填写, 该条跳过. */
  pattern: string
  /** JS 正则 flags, 例如 gu. */
  flags: string
  /** 替换文本, 支持 $1 与 $& 等 JS 替换语义. */
  replacement: string
}

/** 插件配置形状. */
export interface PluginSettings {
  /** 配置形状版本. */
  version: number
  /** 有序命名替换规则. */
  rules: LabelRule[]
}

/**
 * 内置默认规则, 顺序即执行顺序:
 * 1. 连续空白折成 `-`.
 * 2. 名称里原有的双引号转义成 `\"`, 免得和外面的包裹引号混在一起.
 * 3. 最后才用双引号把名称整个包起来, 包裹引号本身不参与上一步的转义.
 * `raw title` 变成 `"raw-title"`; `my "cool" title` 变成 `"my-\"cool\"-title"`; 空标题变成 `""`.
 * 冻结后同时作为 Host schema 默认值与 Client 兜底值, 只读.
 */
export const DEFAULT_RULES: readonly LabelRule[] = Object.freeze([
  Object.freeze({ enabled: true, pattern: '\\s+', flags: 'gu', replacement: '-' }),
  Object.freeze({ enabled: true, pattern: '"', flags: 'gu', replacement: '\\"' }),
  Object.freeze({ enabled: true, pattern: '^([\\s\\S]*)$', flags: 'u', replacement: '"$1"' }),
])

/** 一条规则的校验结果; 两级分开报, 让表单能指到具体字段. */
export interface RuleIssues {
  /** flags 本身非法时的引擎说明. */
  flags?: string
  /** pattern 与 flags 一起编译失败时的引擎说明. */
  pattern?: string
}

/**
 * 判断一条规则为何不能编译; 合法, 关闭或未填写 pattern 时两级都为空.
 * 关闭的规则与空 pattern 的规则在复制时会被跳过, 因此不算错误.
 * @param rule - 待检查的规则.
 * @returns 该规则的校验结果.
 */
export function ruleIssues(rule: LabelRule): RuleIssues {
  if (!rule.enabled || rule.pattern === '') return {}
  try {
    new RegExp('', rule.flags)
  } catch (error: unknown) {
    return { flags: describeError(error) }
  }
  try {
    new RegExp(rule.pattern, rule.flags)
  } catch (error: unknown) {
    return { pattern: describeError(error) }
  }
  return {}
}

/**
 * 该规则是否有任何校验错误.
 * @param rule - 待检查的规则.
 * @returns 是否有错误.
 */
export function hasRuleIssues(rule: LabelRule): boolean {
  const issues = ruleIssues(rule)
  return issues.flags !== undefined || issues.pattern !== undefined
}

/** 把异常收成一行说明. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 编译一条规则; 关闭, 未填写或编译失败时返回 undefined.
 * @param rule - 待编译的规则.
 * @returns 可用的正则, 或 undefined.
 */
export function compileRule(rule: LabelRule): RegExp | undefined {
  if (!rule.enabled || rule.pattern === '') return undefined
  try {
    return new RegExp(rule.pattern, rule.flags)
  } catch {
    return undefined
  }
}

/**
 * 按顺序把规则作用到会话标题上.
 * 单条规则编译失败只跳过该条, 不影响其它规则.
 * @param label - 原始会话标题.
 * @param rules - 有序规则列表.
 * @returns 替换后的名称.
 */
export function applyRules(label: string, rules: readonly LabelRule[]): string {
  let result = label
  for (const rule of rules) {
    const regex = compileRule(rule)
    if (regex === undefined) continue
    result = result.replace(regex, rule.replacement)
  }
  return result
}

/**
 * 把 settings 里读到的未知结构收成人可用的规则列表; 结构异常时回退默认规则.
 * @param value - settings 表单快照里的 rules 字段.
 * @returns 规则列表.
 */
export function decodeRules(value: unknown): LabelRule[] {
  if (!Array.isArray(value)) return DEFAULT_RULES.map(rule => ({ ...rule }))
  const rules: LabelRule[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const raw = item as Record<string, unknown>
    rules.push({
      enabled: raw[RULE_ENABLED_FIELD] !== false,
      pattern: typeof raw[RULE_PATTERN_FIELD] === 'string' ? raw[RULE_PATTERN_FIELD] : '',
      flags: typeof raw[RULE_FLAGS_FIELD] === 'string' ? raw[RULE_FLAGS_FIELD] : DEFAULT_FLAGS,
      replacement: typeof raw[RULE_REPLACEMENT_FIELD] === 'string' ? raw[RULE_REPLACEMENT_FIELD] : '',
    })
  }
  return rules
}
