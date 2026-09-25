/**
 * 会话行 hover 卡片里的 "复制引用" 行.
 *
 * 注册进 sidebar.session.row.hover, 会话身份由框架的 useSessions 给出.
 * 卡片本体是宿主的 role="button", 点它会复制会话标题, 所以这一行点击时
 * 阻断冒泡, 只写自己的引用, 不去改宿主行为.
 * 卡片表面在深浅主题下都是 #2C2C2E, 因此配色跟着卡片用字面浅灰.
 */
import { IconCheckOutlineRegular, IconCopyOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { useCopyFeedback } from './copy-feedback.ts'
import type { TitleFormatter } from './copy-reference.ts'
import type { CopySessionRefLocaleKey } from './locales.ts'
import { sessionTarget, type UseSessions } from './sessions.ts'

/** 注册时注入给组件的面: 命名规则取自 apply 的闭包. */
export interface HoverCopyRowInjected {
  /** 命名规则作用在标题上的格式化函数. */
  readonly formatTitle: TitleFormatter
}

/** slot 的 owner props 加上标准 hook 与本插件字典. */
export interface HoverCopyRowProps extends HoverCopyRowInjected {
  /** 卡片所属的会话. */
  readonly sessionId: string
  /** 会话列表选择器. */
  readonly useSessions: UseSessions
  /** 本插件字典的读取函数. */
  readonly t: Translate<CopySessionRefLocaleKey>
}

/**
 * 渲染复制引用行; 没有可引用的会话时不占位.
 * @param props - 会话 id, 注入面, 标准 hook 与字典.
 * @returns 可点击的一行, 或 null.
 */
export function HoverCopyRow({ sessionId, formatTitle, useSessions, t }: HoverCopyRowProps) {
  const { phase, run } = useCopyFeedback()
  const target = sessionTarget(useSessions(state => state.byId[sessionId]))
  if (target === undefined) return null

  const label = phase === 'done' ? t('copied') : phase === 'fail' ? t('copyFailed') : t('copy')
  return (
    <button
      type="button"
      className="dcsr-hover-copy"
      aria-label={t('copyAria', { name: target.label })}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        run(target, formatTitle)
      }}
    >
      <span className="dcsr-hover-copy-icon" aria-hidden="true">
        {phase === 'done' ? <IconCheckOutlineRegular size={12} /> : <IconCopyOutlineRegular size={12} />}
      </span>
      <span>{label}</span>
    </button>
  )
}
