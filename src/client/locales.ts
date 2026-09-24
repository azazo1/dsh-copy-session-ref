/** 设置表单的文案字典. 菜单项文案仍沿用 workspace 字典, 不在此处. */
import type { SettingsFormLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'

/** 本插件字典的 key 全集. */
export type CopySessionRefLocaleKey =
  | 'summary'
  | 'intro'
  | 'enabled'
  | 'pattern'
  | 'flags'
  | 'replacement'
  | 'patternPlaceholder'
  | 'flagsPlaceholder'
  | 'replacementPlaceholder'
  | 'addRule'
  | 'moveUp'
  | 'moveDown'
  | 'remove'
  | 'invalidRule'
  | 'preview'
  | 'sampleTitle'
  | 'sampleDefault'
  | 'unavailable'
  | 'readOnly'
  | 'saveFailed'
  | 'save'
  | 'saving'

/** 英文文案. */
export const en: Record<CopySessionRefLocaleKey, string> = {
  summary: 'Naming rules for copied session references',
  intro: 'One rule per row, left to right: pattern, flags and replacement text. The leading checkbox enables the rule and the trailing buttons reorder or remove it. Rules run in order over the session title; an empty pattern skips that rule, and one that does not compile is skipped when copying.',
  enabled: 'Enabled',
  pattern: 'Pattern',
  flags: 'Flags',
  replacement: 'Replace with',
  patternPlaceholder: 'Regular expression',
  flagsPlaceholder: 'flags, e.g. gu',
  replacementPlaceholder: 'replacement, $1 and $& work',
  addRule: 'Add rule',
  moveUp: 'Move up',
  moveDown: 'Move down',
  remove: 'Remove',
  invalidRule: 'Invalid regular expression',
  preview: 'Preview',
  sampleTitle: 'Sample title',
  sampleDefault: 'raw session title',
  unavailable: 'This plugin is not loaded, so it cannot be configured right now.',
  readOnly: 'This deployment stores settings read-only.',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  save: 'Save',
  saving: 'Saving...',
}

/** 中文文案. */
export const zh: Record<CopySessionRefLocaleKey, string> = {
  summary: '复制引用时的命名规则',
  intro: '每行一条规则, 从左到右依次是正则, flags 与替换文本; 行首勾选启用, 行尾调整顺序或删除. 规则按顺序作用在会话标题上, 正则留空表示跳过该条, 编译失败的规则在复制时同样跳过.',
  enabled: '启用',
  pattern: '正则',
  flags: 'flags',
  replacement: '替换为',
  patternPlaceholder: '正则表达式',
  flagsPlaceholder: 'flags, 例如 gu',
  replacementPlaceholder: '替换文本, 可用 $1 与 $&',
  addRule: '新增规则',
  moveUp: '上移',
  moveDown: '下移',
  remove: '删除',
  invalidRule: '正则无效',
  preview: '预览',
  sampleTitle: '示例标题',
  sampleDefault: '会话 引用 命名',
  unavailable: '该插件当前未加载, 暂时无法配置.',
  readOnly: '本部署的设置为只读.',
  saveFailed: '本部署没有接受这些值, 已保留供你修改.',
  save: '保存',
  saving: '保存中...',
}

/**
 * 表单外框需要的文案.
 * @param t - 本插件字典的读取函数.
 * @returns SettingsForm 的 labels.
 */
export function formLabels(t: Translate<CopySessionRefLocaleKey>): SettingsFormLabels {
  return {
    unavailable: t('unavailable'),
    readOnly: t('readOnly'),
    saveFailed: t('saveFailed'),
    save: t('save'),
    saving: t('saving'),
  }
}
