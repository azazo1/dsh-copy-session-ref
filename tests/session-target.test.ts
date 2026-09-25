/** 会话行 hover 卡片的目标解析: 哪些行有可引用的身份. */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sessionTarget, type SessionSummary } from '../src/client/sessions.ts'

/**
 * 造一行会话摘要, 只写关心的字段.
 * @param partial - 要覆盖的字段.
 * @returns 补齐默认值的一行.
 */
function row(partial: Partial<SessionSummary>): SessionSummary {
  return { id: 's-1', displayTitle: '', blank: false, updatedAt: 0, ...partial }
}

describe('sessionTarget', () => {
  it('取到会话的显示标题', () => {
    assert.deepEqual(sessionTarget(row({ displayTitle: '会话 引用' })), { id: 's-1', label: '会话 引用' })
  })

  it('空会话没有可引用的身份', () => {
    assert.equal(sessionTarget(row({ blank: true })), undefined)
  })

  it('快照里没有这一行时返回 undefined', () => {
    assert.equal(sessionTarget(undefined), undefined)
  })
})
