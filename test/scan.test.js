'use strict'
const { describe, it, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { classifyPin, auditPins } = require('../lib/scan.js')
const { buildReport } = require('../lib/report.js')

describe('classifyPin', () => {
  it('accepts semver tags', () => {
    assert.equal(classifyPin('github:antora-supplemental/link-validator#v0.2.0').ok, true)
    assert.equal(classifyPin('github:antora-supplemental/link-validator#v0.2.0').classification, 'semver-tag')
  })
  it('flags floating main and missing ref', () => {
    assert.equal(classifyPin('github:antora-supplemental/x#main').classification, 'floating-ref')
    assert.equal(classifyPin('github:antora-supplemental/x').classification, 'missing-ref')
  })
  it('flags caret ranges', () => {
    assert.equal(classifyPin('^1.2.3').classification, 'floating-range')
  })
})

describe('auditPins', () => {
  let tmp
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-audit-'))
    fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({
      dependencies: {
        good: 'github:antora-supplemental/extension-lister#v0.1.0',
        bad: 'github:antora-supplemental/link-validator#main',
        missing: 'github:antora-supplemental/orphan-finder',
      },
    }, null, 2))
    fs.writeFileSync(path.join(tmp, 'playbook.yml'), 'antora:\n  extensions:\n    - require: \'@antora-supplemental/ghost-ext\'\n')
  })
  after(() => fs.rmSync(tmp, { recursive: true, force: true }))
  it('reports floating and missing pins', () => {
    const scan = auditPins({ root: tmp, playbook: 'playbook.yml' })
    const classes = scan.findings.map((f) => f.classification).sort()
    assert.ok(classes.includes('floating-ref'))
    assert.ok(classes.includes('missing-ref'))
    assert.ok(classes.includes('unpinned-playbook-require'))
    assert.ok(buildReport(scan).summary.findings >= 3)
  })
})
