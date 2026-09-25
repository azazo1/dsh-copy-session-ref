/**
 * 会话行 "..." 菜单里的 "复制引用" 行.
 *
 * 注册进 sidebar.workspaces.session.menu.item: 会话身份与行标题由 owner props
 * 给出 (宿主传的就是行上显示的标题), 关菜单用 slot 声明的 useMenuOpenState,
 * 行本身用 ui-primitives 的 MenuItemButton, 与宿主自己的 pin / rename /
 * fork / archive 同款. 复制反馈结束后才关菜单, 让 "已复制" 有机会被看到.
 */
import { IconCheckOutlineRegular, IconCopyOutlineRegular, MenuItemButton } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { useCopyFeedback } from './copy-feedback.ts'
import type { TitleFormatter } from './copy-reference.ts'
import type { CopySessionRefLocaleKey } from './locales.ts'

/** 菜单开合状态; 宿主把它作为 hookContext 交给菜单里的每一行. */
export type UseMenuOpenState = () => readonly [open: boolean, setOpen: (open: boolean) => void]

/** 注册时注入给组件的面: 命名规则取自 apply 的闭包. */
export interface MenuCopyRowInjected {
  /** 命名规则作用在标题上的格式化函数. */
  readonly formatTitle: TitleFormatter
}

/** slot 的 owner props 加上菜单 hook 与本插件字典. */
export interface MenuCopyRowProps extends MenuCopyRowInjected {
  /** 菜单所属的会话. */
  readonly sessionId: string
  /** 行上显示的标题; 宿主只在非空会话上渲染这个菜单. */
  readonly displayTitle: string
  /** 菜单开合; 复制反馈结束后用它关菜单. */
  readonly useMenuOpenState: UseMenuOpenState
  /** 本插件字典的读取函数. */
  readonly t: Translate<CopySessionRefLocaleKey>
}

/**
 * 渲染菜单里的复制引用行.
 * @param props - 会话 id, 行标题, 注入面, 菜单 hook 与字典.
 * @returns 一行菜单项.
 */
export function MenuCopyRow({ sessionId, displayTitle, formatTitle, useMenuOpenState, t }: MenuCopyRowProps) {
  const [, setMenuOpen] = useMenuOpenState()
  const { phase, run } = useCopyFeedback(() => { setMenuOpen(false) })

  const label = phase === 'done' ? t('copied') : phase === 'fail' ? t('copyFailed') : t('copy')
  return (
    <MenuItemButton
      icon={phase === 'done' ? <IconCheckOutlineRegular size={14} /> : <IconCopyOutlineRegular size={14} />}
      onSelect={() => { run({ id: sessionId, label: displayTitle }, formatTitle) }}
    >
      {label}
    </MenuItemButton>
  )
}
