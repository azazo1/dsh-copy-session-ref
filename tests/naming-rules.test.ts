/** 命名规则与 mention 转义的纯函数测试. */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { escapeMentionLabel, formatSessionReferenceMention } from '../src/mention.ts'
import {
  DEFAULT_RULES, applyRules, decodeRules, hasRuleIssues, ruleIssues, type LabelRule,
} from '../src/shared.ts'

/** 造一条规则, 只写关心的字段. */
function rule(partial: Partial<LabelRule>): LabelRule {
  return { enabled: true, pattern: '', flags: 'gu', replacement: '', ...partial }
}

/**
 * 把我们拼出的 wire 形式交给 Host 的解析规则, 还原出语义上的名称.
 * 正则与反转义照抄 Host 侧 packages/context/session-reference/src/uri.ts.
 * @param label - 规则算出的名称.
 * @returns Host 解析后模型侧会看到的名称.
 */
function roundTripThroughHost(label: string): string {
  const pattern = /@\[((?:\\.|[^\\\]])*)\]\((dsh-session:[^\s)]*)\)|(dsh-session:[A-Za-z0-9_-]+)/gu
  const parsed = [...formatSessionReferenceMention('sess-1', label).matchAll(pattern)]
  assert.equal(parsed.length, 1)
  return parsed[0][1]?.replace(/\\(.)/gu, '$1') ?? ''
}

describe('applyRules', () => {
  it('把默认规则跑成引号包裹的横线名称', () => {
    assert.equal(applyRules('raw title', DEFAULT_RULES), '"raw-title"')
  })

  it('空标题也得到一对引号', () => {
    assert.equal(applyRules('', DEFAULT_RULES), '""')
  })

  it('连续空白与首尾空白一起折成一个横线', () => {
    assert.equal(applyRules('  多  空格 标题 ', DEFAULT_RULES), '"-多-空格-标题-"')
  })

  it('默认规则转义名称里原有的双引号, 包裹引号不参与转义', () => {
    assert.equal(applyRules('my "cool" title', DEFAULT_RULES), '"my-\\"cool\\"-title"')
  })

  it('默认规则不影响没有引号的标题', () => {
    assert.equal(applyRules('plain title', DEFAULT_RULES), '"plain-title"')
  })

  it('按顺序应用规则, 后面的规则看到前面规则的结果', () => {
    const rules = [
      rule({ pattern: 'a', flags: 'gu', replacement: 'b' }),
      rule({ pattern: 'b', flags: 'gu', replacement: 'c' }),
    ]
    assert.equal(applyRules('aaa', rules), 'ccc')
  })

  it('跳过未启用的规则', () => {
    const rules = [rule({ enabled: false, pattern: 'a', flags: 'gu', replacement: 'b' })]
    assert.equal(applyRules('aaa', rules), 'aaa')
  })

  it('跳过 pattern 为空的规则', () => {
    assert.equal(applyRules('abc', [rule({ pattern: '', replacement: 'x' })]), 'abc')
  })

  it('跳过编译失败的规则, 其余规则照常生效', () => {
    const rules = [
      rule({ pattern: '(', flags: 'gu', replacement: 'x' }),
      rule({ pattern: 'a', flags: 'gu', replacement: 'b' }),
    ]
    assert.equal(applyRules('aaa', rules), 'bbb')
  })

  it('把标题替换成空串是允许的结果', () => {
    assert.equal(applyRules('title', [rule({ pattern: '^.*$', flags: 'u', replacement: '' })]), '')
  })

  it('支持 $1 与 $& 替换语义', () => {
    assert.equal(applyRules('ab', [rule({ pattern: '^(a)(b)$', flags: 'u', replacement: '$2$1' })]), 'ba')
    assert.equal(applyRules('ab', [rule({ pattern: 'b', flags: 'gu', replacement: '[$&]' })]), 'a[b]')
  })
})

describe('ruleIssues', () => {
  it('合法规则没有问题', () => {
    assert.deepEqual(ruleIssues(rule({ pattern: '\\s+', flags: 'gu', replacement: '-' })), {})
  })

  it('未启用的规则不报错, 即使正则非法', () => {
    assert.deepEqual(ruleIssues(rule({ enabled: false, pattern: '(' })), {})
    assert.equal(hasRuleIssues(rule({ enabled: false, pattern: '(' })), false)
  })

  it('空 pattern 不报错', () => {
    assert.deepEqual(ruleIssues(rule({ pattern: '' })), {})
  })

  it('flags 非法时归到 flags 上', () => {
    const issues = ruleIssues(rule({ pattern: 'a', flags: 'gg' }))
    assert.equal(typeof issues.flags, 'string')
    assert.equal(issues.pattern, undefined)
    assert.equal(hasRuleIssues(rule({ pattern: 'a', flags: 'gg' })), true)
  })

  it('pattern 非法时归到 pattern 上', () => {
    const issues = ruleIssues(rule({ pattern: '(', flags: 'gu' }))
    assert.equal(typeof issues.pattern, 'string')
    assert.equal(issues.flags, undefined)
  })
})

describe('escapeMentionLabel', () => {
  it('只转义反斜杠与右方括号', () => {
    assert.equal(escapeMentionLabel('a]b\\c'), 'a\\]b\\\\c')
    assert.equal(escapeMentionLabel('"quoted" [kept]'), '"quoted" [kept\\]')
  })

  it('把换行与制表符折成空格', () => {
    assert.equal(escapeMentionLabel('a\r\nb\tc'), 'a b c')
  })

  it('保留双引号与左方括号', () => {
    assert.equal(escapeMentionLabel('"raw title"'), '"raw title"')
  })
})

describe('formatSessionReferenceMention', () => {
  it('拼出规范 mention', () => {
    const mention = formatSessionReferenceMention('sess-1', '"raw-title"')
    assert.match(mention, /^@\["raw-title"\]\(dsh-session:[A-Za-z0-9_-]+\)$/u)
  })

  it('标签里的反斜杠与右方括号被转义后仍能被 Host 解析回原名', () => {
    const label = 'a]b\\c'
    assert.equal(roundTripThroughHost(label), label)
  })

  it('带引号的名称经 wire 形式往返后仍是规则算出的名称', () => {
    const label = applyRules('my "cool" title', DEFAULT_RULES)
    assert.equal(label, '"my-\\"cool\\"-title"')
    assert.equal(roundTripThroughHost(label), label)
  })
})

describe('decodeRules', () => {
  it('结构异常时回退默认规则', () => {
    assert.deepEqual(decodeRules(undefined), DEFAULT_RULES.map(item => ({ ...item })))
    assert.deepEqual(decodeRules('nope'), DEFAULT_RULES.map(item => ({ ...item })))
  })

  it('空数组表示一条规则都不要', () => {
    assert.deepEqual(decodeRules([]), [])
  })

  it('补全缺失字段并丢掉非对象项', () => {
    const decoded = decodeRules([{ pattern: 'a' }, 3, null])
    assert.deepEqual(decoded, [{ enabled: true, pattern: 'a', flags: 'gu', replacement: '' }])
  })

  it('解出的默认规则是不可变的共享值的安全副本', () => {
    const decoded = decodeRules(undefined)
    decoded[0].pattern = 'changed'
    assert.notEqual(DEFAULT_RULES[0].pattern, 'changed')
  })
})
