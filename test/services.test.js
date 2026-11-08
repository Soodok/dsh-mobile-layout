'use strict'

/**
 * 服务绑定器（bindServices）与特征自省（describeService）的单元测试。
 *
 * 覆盖动态包通道的关键前提：没有 `ctx.inject` 时，服务获取必须退化为
 * `ctx.get` 轮询，并且超时只降级、不抛错。
 */

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

function loadClient() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'client.js'), 'utf8')
  let captured
  const sandbox = {
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          captured = factory(() => ({}))
        },
      },
    },
    console: { warn() {}, error() {}, log() {} },
  }
  vm.createContext(sandbox)
  vm.runInContext(source, sandbox, { filename: 'lib/client.js' })
  return captured
}

const api = loadClient().__test
const { resolveServiceBundle, bindServices, describeService } = api

test('resolveServiceBundle：齐活 / 缺失 / ctx 不可用三种情形', () => {
  const full = { get: (name) => (name === 'a' ? { id: 'A' } : name === 'b' ? { id: 'B' } : null) }
  const ok = resolveServiceBundle(full, ['a', 'b'])
  assert.equal(ok.complete, true)
  assert.equal(Array.from(ok.missing).length, 0)
  assert.equal(ok.services.a.id, 'A')

  const partial = resolveServiceBundle(full, ['a', 'c'])
  assert.equal(partial.complete, false)
  assert.equal(Array.from(partial.missing).join(','), 'c')

  assert.equal(resolveServiceBundle(null, ['a']).complete, false)
  assert.equal(resolveServiceBundle({ get() { throw new Error('boom') } }, ['a']).complete, false)
})

test('bindServices：服务已在场时立即结算，不走 inject', () => {
  let injected = 0
  const ctx = {
    get: () => ({ id: 'ready' }),
    inject() { injected += 1 },
  }
  const seen = []
  bindServices(ctx, { names: ['x'], onReady: (services, bundle) => seen.push([services.x.id, bundle.complete]), progress: () => {} })
  assert.deepEqual(seen, [['ready', true]])
  assert.equal(injected, 0, '已在场就不该再走 inject')
})

test('bindServices：有 ctx.inject 时沿用官方语义', () => {
  let called = 0
  const ctx = {
    get: () => null,
    inject(names, cb) {
      called += 1
      cb({ x: { id: 'from-inject' } })
    },
  }
  const seen = []
  const via = []
  bindServices(ctx, {
    names: ['x'],
    onReady: (services) => seen.push(services.x.id),
    progress: (entry) => via.push(entry.via),
  })
  assert.equal(called, 1)
  assert.deepEqual(seen, ['from-inject'])
  assert.deepEqual(via, ['inject'])
})

test('bindServices：无 ctx.inject 时轮询到齐（动态包通道）', () => {
  let available = false
  const ctx = { get: () => (available ? { id: 'late' } : null) }
  const scheduled = []
  const seen = []
  const via = []
  bindServices(ctx, {
    names: ['x'],
    maxAttempts: 5,
    intervalMs: 1,
    schedule: (fn) => { scheduled.push(fn); return scheduled.length },
    cancel: () => {},
    onReady: (services, bundle) => seen.push([services.x.id, bundle.complete]),
    progress: (entry) => via.push(entry.via),
  })
  assert.equal(seen.length, 0, '此刻还没就绪')
  available = true
  scheduled.shift()()
  assert.equal(seen.length, 1)
  assert.equal(seen[0][0], 'late')
  assert.equal(seen[0][1], true)
  assert.equal(via.join(','), 'poll')
})

test('bindServices：轮询超时只记录，不抛错也不回调', () => {
  const ctx = { get: () => null }
  const scheduled = []
  const seen = []
  const via = []
  bindServices(ctx, {
    names: ['x'],
    maxAttempts: 2,
    intervalMs: 1,
    schedule: (fn) => { scheduled.push(fn); return scheduled.length },
    cancel: () => {},
    onReady: () => seen.push('ready'),
    progress: (entry) => via.push(entry),
  })
  scheduled.shift()()
  scheduled.shift()()
  assert.equal(seen.length, 0, '超时不得回调 onReady')
  const last = via[via.length - 1]
  assert.equal(last.complete, false)
  assert.equal(last.timeout, true)
  assert.equal(Array.from(last.missing).join(','), 'x')
})

test('bindServices：cancelled 之后停止轮询', () => {
  let cancelled = false
  const scheduled = []
  const seen = []
  bindServices({ get: () => null }, {
    names: ['x'],
    maxAttempts: 10,
    intervalMs: 1,
    schedule: (fn) => { scheduled.push(fn); return scheduled.length },
    cancel: () => {},
    cancelled: () => cancelled,
    onReady: () => seen.push('ready'),
    progress: () => {},
  })
  cancelled = true
  scheduled.shift()()
  assert.equal(seen.length, 0)
  assert.equal(scheduled.length, 0, '取消后不应再排下一次')
})

test('describeService：只记录可调用成员与形参个数', () => {
  class Svc {
    a(x, y) {}
    get b() { return 1 }
  }
  const svc = new Svc()
  svc.c = () => {}
  svc.data = { not: 'callable' }
  const shape = Array.from(describeService(svc))
  assert.ok(shape.includes('a/2'), shape.join(','))
  assert.ok(shape.includes('c/0'), shape.join(','))
  assert.equal(shape.some((item) => item.startsWith('data')), false)
  assert.equal(shape.some((item) => item.startsWith('b/')), false, '访问器不当作方法')
  assert.equal(Array.from(describeService(null)).length, 0)
})
