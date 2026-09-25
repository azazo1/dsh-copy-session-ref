/**
 * 行内复制反馈: 会话行菜单与 hover 卡片两个入口共用.
 * 点击后写剪贴板, 行内短暂显示结果, 再复位.
 */
import { useEffect, useRef, useState } from 'react'
import { copySessionReference, type TitleFormatter } from './copy-reference.ts'
import type { ResolvedSession } from './sessions.ts'

/** 复制结果在行内停留的时间, 两个入口一致. */
export const COPY_FEEDBACK_MS = 500

/** 行内状态: 平时显示动作名, 复制后短暂显示结果. */
export type CopyPhase = 'idle' | 'done' | 'fail'

/** 行内反馈的面. */
export interface CopyFeedback {
  /** 当前状态. */
  readonly phase: CopyPhase
  /** 复制一次. */
  readonly run: (target: ResolvedSession, formatTitle: TitleFormatter) => void
}

/**
 * 复制引用并给出行内反馈.
 * @param onSettled - 反馈结束时的收尾动作; 菜单行用它关掉菜单.
 * @returns 当前状态与触发复制的函数.
 */
export function useCopyFeedback(onSettled?: () => void): CopyFeedback {
  const [phase, setPhase] = useState<CopyPhase>('idle')
  const timer = useRef<number | undefined>(undefined)
  // 行随菜单或卡片卸载, 留在队列里的复位定时器要一起收掉.
  useEffect(() => () => { window.clearTimeout(timer.current) }, [])
  return {
    phase,
    run: (target, formatTitle) => {
      window.clearTimeout(timer.current)
      void copySessionReference(target, formatTitle).then((ok) => {
        setPhase(ok ? 'done' : 'fail')
        timer.current = window.setTimeout(() => {
          setPhase('idle')
          onSettled?.()
        }, COPY_FEEDBACK_MS)
      })
    },
  }
}
