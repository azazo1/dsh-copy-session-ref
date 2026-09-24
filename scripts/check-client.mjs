/**
 * 检查 Client 产物是否符合 DSH client module loader 的约定:
 * 顶层注册插件 id, 不含顶层 ESM import/export, 只 require 平台模块.
 */
import { readFile } from 'node:fs/promises'

const PLUGIN_ID = 'dsh-copy-session-ref'
const ARTIFACT = new URL('../lib/client.js', import.meta.url)
const ALLOWED_REQUIRES = new Set([
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-primitives',
])

/** 报告一处不合规并结束. */
function fail(message) {
  console.error(`check-client: ${message}`)
  process.exit(1)
}

const source = await readFile(ARTIFACT, 'utf8')

if (!source.startsWith('window.__ModuleLoader__.load(')) {
  fail('产物开头不是 window.__ModuleLoader__.load(...)')
}
if (!source.includes(`id: ${JSON.stringify(PLUGIN_ID)}`)) {
  fail(`产物没有注册 id ${JSON.stringify(PLUGIN_ID)}`)
}
if (/^\s*(?:import|export)\s/mu.test(source)) {
  fail('产物里还有顶层 ESM import/export')
}

const requires = [...source.matchAll(/require\((['"])([^'"]+)\1\)/gu)].map(match => match[2])
const unexpected = [...new Set(requires)].filter(spec => !ALLOWED_REQUIRES.has(spec))
if (unexpected.length > 0) {
  fail(`产物 require 了非平台模块: ${unexpected.join(', ')}`)
}
if (!requires.includes('@deepseek-ai/dsh-client-ui-primitives')) {
  fail('产物没有从平台模块取 ui-primitives, 配置表单会缺控件')
}

console.log(`check-client: ok (${requires.length} requires, id ${PLUGIN_ID})`)
