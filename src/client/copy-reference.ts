/**
 * 把一次 "复制会话引用" 落成剪贴板写入.
 * 会话行菜单与会话行 hover 卡片两个入口共用这里, 免得 mention 的拼法与
 * 剪贴板兜底各写一份.
 */
import { formatSessionReferenceMention } from '../mention.ts'
import type { ResolvedSession } from './sessions.ts'

/** 把会话标题变成引用里显示的名称; 规则由插件配置决定. */
export type TitleFormatter = (title: string) => string

/**
 * 拼出规范 mention 并写入剪贴板.
 * @param session - 要引用的会话.
 * @param formatTitle - 命名规则作用在标题上的格式化函数.
 * @returns 是否写入成功.
 */
export async function copySessionReference(
  session: ResolvedSession,
  formatTitle: TitleFormatter,
): Promise<boolean> {
  const mention = formatSessionReferenceMention(session.id, formatTitle(session.label))
  try {
    await writeClipboard(mention)
    return true
  } catch {
    return false
  }
}

/**
 * 复制文本到剪贴板, 没有 Clipboard API 时回落到隐藏 textarea.
 * @param text - 要复制的 mention.
 */
async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText !== undefined) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.append(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('copy failed')
}
