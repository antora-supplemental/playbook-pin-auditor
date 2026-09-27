'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { createProgress, detectTTY } = require('../lib/progress.js')

describe('playbook-pin-auditor progress', () => {
  it('preface uses tool id and CI disables TTY', () => {
    const prev = process.env.CI
    process.env.CI = 'true'
    try {
      assert.equal(detectTTY({ isTTY: true }), false)
      const chunks = []
      const stream = { isTTY: true, write (s) { chunks.push(s); return true } }
      const p = createProgress({ id: 'playbook-pin-auditor', stream, every: 1 })
      assert.equal(p._tty, false)
      p.starting('starting test')
      p.enumStart('files')
      p.enumTick(1)
      p.enumDone(1)
      const text = chunks.join('')
      assert.ok(!text.includes('\r'))
      assert.match(text, /playbook-pin-auditor: starting test/)
      assert.match(text, /playbook-pin-auditor: checking 0 files…/)
      assert.match(text, /playbook-pin-auditor: checking 1 files…/)
    } finally {
      if (prev === undefined) delete process.env.CI
      else process.env.CI = prev
    }
  })
})
