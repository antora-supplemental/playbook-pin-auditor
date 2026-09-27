#!/usr/bin/env node
'use strict'
const path = require('node:path')
const { auditPins, buildReport, writeOutputs } = require('../lib/index.js')
const { createProgress } = require('../lib/progress.js')

const TOOL = 'playbook-pin-auditor'

function parseArgs (argv) {
  const opts = { root: '.', out: 'pin-audit-report', playbook: null, fail: false }
  const args = argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--root') opts.root = args[++i]
    else if (a === '--out') opts.out = args[++i]
    else if (a === '--playbook') opts.playbook = args[++i]
    else if (a === '--package-json') opts.packageJson = args[++i]
    else if (a === '--fail') opts.fail = true
    else if (a === '--help' || a === '-h') opts.help = true
  }
  return opts
}

function main () {
  const opts = parseArgs(process.argv)
  if (opts.help) {
    console.log('Usage: playbook-pin-auditor [--root DIR] [--playbook FILE] [--out DIR] [--fail]\nPrefer github:org/repo#vX.Y.Z. Support: support@devcentr.org')
    process.exit(0)
  }
  const progress = createProgress({ id: TOOL, stream: process.stderr })
  progress.starting('starting pin audit')
  progress.enumStart('dependencies')
  const scan = auditPins({
    ...opts,
    onProgress (n) { progress.enumTick(n) },
  })
  progress.enumDone(scan.checked.length)
  const report = buildReport(scan)
  writeOutputs(report, path.resolve(opts.out))
  progress.done('checked ' + report.summary.checked + ', findings ' + report.summary.findings)
  for (const f of report.findings) {
    process.stderr.write(TOOL + ':   - ' + f.target + ': ' + f.classification + (f.spec ? ' (' + f.spec + ')' : '') + '\n')
  }
  if (opts.fail && report.summary.findings > 0) process.exit(1)
}
main()
