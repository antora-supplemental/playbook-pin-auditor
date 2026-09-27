#!/usr/bin/env node
'use strict'
const path = require('node:path')
const { auditPins, buildReport, writeOutputs } = require('../lib/index.js')
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
  if (opts.help) { console.log('Usage: playbook-pin-auditor [--root DIR] [--playbook FILE] [--out DIR] [--fail]\nPrefer github:org/repo#vX.Y.Z. Support: support@devcentr.org'); process.exit(0) }
  const scan = auditPins(opts)
  const report = buildReport(scan)
  writeOutputs(report, path.resolve(opts.out))
  console.log('playbook-pin-auditor: checked ' + report.summary.checked + ', findings ' + report.summary.findings)
  for (const f of report.findings) console.log('  - ' + f.target + ': ' + f.classification + (f.spec ? ' (' + f.spec + ')' : ''))
  if (opts.fail && report.summary.findings > 0) process.exit(1)
}
main()
