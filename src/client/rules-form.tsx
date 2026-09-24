/**
 * 规则配置表单: 在 Plugins 页面本插件的 bundle 页上编辑命名规则.
 * 表头给出列名 (启用 | 正则 | flags | 替换), 一行一条规则, 行尾是上移 / 下移 / 删除.
 * 暂存语义: 保存才写入 profile 的配置层.
 */
import {
  Button, Checkbox, IconChevronDownOutlineRegular, IconChevronUpOutlineRegular,
  IconPlusOutlineRegular, IconTrashOutlineRegular, Input, SettingsForm,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { useState } from 'react'
import { applyRules } from '../shared.ts'
import { escapeMentionLabel } from '../mention.ts'
import { formLabels, type CopySessionRefLocaleKey } from './locales.ts'
import type { RulesFormActions, RulesFormState } from './rules-controller.ts'

/** slot 注册注入给组件的面. */
export interface RulesFormProps extends RulesFormActions {
  /** 页面问的视图: summary 只给一行简介, page 给完整表单. */
  readonly view: 'summary' | 'page'
  /** 本插件字典的读取函数, 由框架按 locale 注入. */
  readonly t: Translate<CopySessionRefLocaleKey>
  /** 读取表单快照的 hook. */
  readonly useRulesForm: <S>(selector: (state: RulesFormState) => S) => S
}

/**
 * 给输入框拼上校验态类名.
 * @param name - 该字段的类名.
 * @param invalid - 是否处于校验失败状态.
 * @returns 传给 Input 的 className.
 */
function fieldClass(name: string, invalid: boolean): string {
  return invalid ? `dcsr-field ${name} dcsr-invalid` : `dcsr-field ${name}`
}

/**
 * 渲染规则表单.
 * @param props - 视图, 文案与控制器注入的快照和动作.
 * @returns 一行简介或完整表单.
 */
export function RulesForm(props: RulesFormProps) {
  const { t } = props
  const state = props.useRulesForm(snapshot => snapshot)
  // 纯界面状态: 预览用的示例标题, 不写入配置.
  const [sample, setSample] = useState(() => t('sampleDefault'))
  if (props.view === 'summary') return <>{t('summary')}</>
  const disabled = !state.writable || state.saving
  // 预览跟着草稿走, 所以未保存的编辑也能立刻看到效果.
  const previewLabel = applyRules(sample, state.rules)
  const previewWire = `@[${escapeMentionLabel(previewLabel)}](dsh-session:...)`
  return (
    <SettingsForm labels={formLabels(t)} state={state} onSave={props.save} onDiscard={props.discard}>
      <p className="dcsr-intro">{t('intro')}</p>
      <div className="dcsr-list">
        <div className="dcsr-head">
          <span className="dcsr-check dcsr-head-text">{t('enabled')}</span>
          <span className="dcsr-field dcsr-pattern dcsr-head-text">{t('pattern')}</span>
          <span className="dcsr-field dcsr-flags dcsr-head-text">{t('flags')}</span>
          <span className="dcsr-field dcsr-replacement dcsr-head-text">{t('replacement')}</span>
          <span className="dcsr-actions" />
        </div>
        {state.rules.map((rule, index) => {
          const error = rule.patternError ?? rule.flagsError
          return (
            <div className="dcsr-rule" key={rule.id}>
              <div className="dcsr-line">
                <Checkbox
                  className="dcsr-check"
                  checked={rule.enabled}
                  label={t('enabled')}
                  title={t('enabled')}
                  disabled={disabled}
                  onChange={(next) => { props.editRule(rule.id, { enabled: next }) }}
                />
                <Input
                  className={fieldClass('dcsr-pattern', rule.patternError !== undefined)}
                  value={rule.pattern}
                  placeholder={t('patternPlaceholder')}
                  title={rule.patternError ?? t('pattern')}
                  aria-label={t('pattern')}
                  aria-invalid={rule.patternError === undefined ? undefined : true}
                  disabled={disabled}
                  onChange={(event) => { props.editRule(rule.id, { pattern: event.currentTarget.value }) }}
                />
                <Input
                  className={fieldClass('dcsr-flags', rule.flagsError !== undefined)}
                  value={rule.flags}
                  placeholder={t('flagsPlaceholder')}
                  title={rule.flagsError ?? t('flags')}
                  aria-label={t('flags')}
                  aria-invalid={rule.flagsError === undefined ? undefined : true}
                  disabled={disabled}
                  onChange={(event) => { props.editRule(rule.id, { flags: event.currentTarget.value }) }}
                />
                <Input
                  className={fieldClass('dcsr-replacement', false)}
                  value={rule.replacement}
                  placeholder={t('replacementPlaceholder')}
                  title={t('replacement')}
                  aria-label={t('replacement')}
                  disabled={disabled}
                  onChange={(event) => { props.editRule(rule.id, { replacement: event.currentTarget.value }) }}
                />
                <span className="dcsr-actions">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<IconChevronUpOutlineRegular size={16} />}
                    aria-label={t('moveUp')}
                    title={t('moveUp')}
                    disabled={disabled || index === 0}
                    onClick={() => { props.moveRule(rule.id, -1) }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<IconChevronDownOutlineRegular size={16} />}
                    aria-label={t('moveDown')}
                    title={t('moveDown')}
                    disabled={disabled || index === state.rules.length - 1}
                    onClick={() => { props.moveRule(rule.id, 1) }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<IconTrashOutlineRegular size={16} />}
                    aria-label={t('remove')}
                    title={t('remove')}
                    disabled={disabled}
                    onClick={() => { props.removeRule(rule.id) }}
                  />
                </span>
              </div>
              {error === undefined ? null : <p className="dcsr-error">{t('invalidRule')}: {error}</p>}
            </div>
          )
        })}
      </div>
      <div className="dcsr-add">
        <Button
          size="sm"
          variant="outline"
          icon={<IconPlusOutlineRegular size={16} />}
          disabled={disabled}
          onClick={props.addRule}
        >
          {t('addRule')}
        </Button>
      </div>
      <div className="dcsr-preview">
        <span className="dcsr-preview-label">{t('preview')}</span>
        <Input
          className="dcsr-sample"
          value={sample}
          placeholder={t('sampleTitle')}
          title={t('sampleTitle')}
          aria-label={t('sampleTitle')}
          onChange={(event) => { setSample(event.currentTarget.value) }}
        />
        <span className="dcsr-arrow" aria-hidden="true">→</span>
        <code className="dcsr-preview-out" title={previewWire}>{`@${previewLabel}`}</code>
      </div>
    </SettingsForm>
  )
}
