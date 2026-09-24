/** 规则表单的暂存控制器: 编辑只落本地草稿, 保存才写回 settings. */
import { createSnapshotStore, type SnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SettingsFormShell } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  DEFAULT_FLAGS, RULES_FIELD, decodeRules, hasRuleIssues, ruleIssues, type LabelRule, type PluginSettings,
} from '../shared.ts'

/** 一行正在编辑的规则: 规则本体加上只存在于界面里的稳定 id. */
interface DraftRow extends LabelRule {
  /** React key 用的稳定 id, 不写入配置. */
  readonly id: number
}

/** 组件读到的一行: 规则本体加上校验结果. */
export interface RuleRow extends LabelRule {
  readonly id: number
  /** pattern 相关错误说明, 没有时是 undefined. */
  readonly patternError: string | undefined
  /** flags 相关错误说明, 没有时是 undefined. */
  readonly flagsError: string | undefined
}

/** 组件读到的表单快照. */
export interface RulesFormState extends SettingsFormShell {
  /** 当前展示的规则行. */
  readonly rules: readonly RuleRow[]
}

/** 规则编辑动作. */
export interface RulesFormActions {
  /** 末尾追加一条空规则. */
  addRule: () => void
  /** 改动一行的部分字段. */
  editRule: (id: number, patch: Partial<LabelRule>) => void
  /** 把一行上移或下移一位. */
  moveRule: (id: number, delta: number) => void
  /** 删除一行. */
  removeRule: (id: number) => void
  /** 写入草稿. */
  save: () => void
  /** 丢弃草稿. */
  discard: () => void
}

/** 通过 slot 注册注入给组件的面. */
export interface RulesFormFace extends RulesFormActions {
  hooks: {
    /** 组件通过 useRulesForm 读取的快照. */
    rulesForm: SnapshotStore<RulesFormState>
  }
}

/**
 * 把一行移到相邻位置.
 * @param rows - 当前行.
 * @param id - 要移动的行的 id.
 * @param delta - -1 上移, 1 下移.
 * @returns 新行数组; 越界时原样返回.
 */
function moveRow(rows: DraftRow[], id: number, delta: number): DraftRow[] {
  const index = rows.findIndex(row => row.id === id)
  const target = index + delta
  if (index < 0 || target < 0 || target >= rows.length) return rows
  const next = [...rows]
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row)
  return next
}

/** 草稿规则写回配置时的纯对象形态. */
function toRule(row: DraftRow): LabelRule {
  return {
    enabled: row.enabled,
    pattern: row.pattern,
    flags: row.flags,
    replacement: row.replacement,
  }
}

/** 命名规则的暂存表单. */
export class RulesController {
  private readonly form: ConfigForm<PluginSettings>
  private readonly store: SnapshotStore<RulesFormState>
  private readonly unsubscribe: () => void
  private rows: DraftRow[]
  private nextId = 1
  private edited = false
  private saving = false
  private failed = false
  private baseline: number | undefined

  /** @param form - 本插件 profile 条目的共享配置表单. */
  constructor(form: ConfigForm<PluginSettings>) {
    this.form = form
    this.rows = this.rowsFrom(this.savedRules())
    this.store = createSnapshotStore(this.projection())
    this.unsubscribe = form.subscribe(() => {
      // 没有本地草稿时, 配置变化 (含其它页面写入) 直接反映到界面上.
      if (!this.edited) this.rows = this.rowsFrom(this.savedRules())
      this.publish()
    })
  }

  /**
   * 复制时使用的规则: 只认已保存的值, 表单里未保存的编辑不参与.
   * @returns 规则列表.
   */
  rules(): LabelRule[] {
    return this.savedRules()
  }

  /**
   * 构造 slot 注册要注入的面.
   * @returns 快照 hook 与编辑动作.
   */
  inject(): RulesFormFace {
    return { hooks: { rulesForm: this.store }, ...this.actions() }
  }

  /** 释放对配置表单的订阅. */
  dispose(): void {
    this.unsubscribe()
  }

  /** 保存草稿; 有非法规则或不可写时不做任何事. */
  async save(): Promise<void> {
    const snapshot = this.form.getSnapshot()
    if (!this.edited || this.saving || !snapshot.writable) return
    if (this.rows.some(row => hasRuleIssues(row))) return
    this.saving = true
    this.failed = false
    this.publish()
    try {
      const landed = await this.form.mutate(
        [{ op: 'set', path: [RULES_FIELD], value: this.rows.map(toRule) }],
        this.baseline,
      )
      if (landed) {
        this.edited = false
        this.baseline = undefined
      } else {
        // 写入被拒时草稿保留; 清掉旧修订号, 让下一次保存按最新修订重试.
        this.baseline = undefined
      }
      this.failed = !landed
    } catch {
      this.failed = true
    } finally {
      this.saving = false
      this.publish()
    }
  }

  /** 丢弃草稿, 回到已保存的规则. */
  discard(): void {
    this.edited = false
    this.failed = false
    this.baseline = undefined
    this.rows = this.rowsFrom(this.savedRules())
    this.publish()
  }

  private actions(): RulesFormActions {
    return {
      addRule: () => {
        this.mutateRows(rows => [...rows, {
          id: this.nextId++,
          enabled: true,
          pattern: '',
          flags: DEFAULT_FLAGS,
          replacement: '',
        }])
      },
      editRule: (id, patch) => {
        this.mutateRows(rows => rows.map(row => row.id === id ? { ...row, ...patch } : row))
      },
      moveRule: (id, delta) => {
        this.mutateRows(rows => moveRow(rows, id, delta))
      },
      removeRule: (id) => {
        this.mutateRows(rows => rows.filter(row => row.id !== id))
      },
      save: () => {
        void this.save()
      },
      discard: () => {
        this.discard()
      },
    }
  }

  private mutateRows(next: (rows: DraftRow[]) => DraftRow[]): void {
    this.baseline ??= this.form.getSnapshot().revision
    this.edited = true
    this.failed = false
    this.rows = next(this.rows)
    this.publish()
  }

  private savedRules(): LabelRule[] {
    return decodeRules(this.form.getSnapshot().value?.[RULES_FIELD])
  }

  private rowsFrom(rules: readonly LabelRule[]): DraftRow[] {
    return rules.map(rule => ({ ...rule, id: this.nextId++ }))
  }

  private projection(): RulesFormState {
    const snapshot = this.form.getSnapshot()
    return {
      available: snapshot.status === 'ready',
      writable: snapshot.writable,
      dirty: this.edited,
      invalid: this.rows.some(row => hasRuleIssues(row)),
      saving: this.saving,
      failed: this.failed,
      rules: this.rows.map((row) => {
        const issues = ruleIssues(row)
        return {
          ...toRule(row),
          id: row.id,
          patternError: issues.pattern,
          flagsError: issues.flags,
        }
      }),
    }
  }

  private publish(): void {
    this.store.set(this.projection())
  }
}
