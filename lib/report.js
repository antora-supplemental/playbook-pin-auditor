'use strict'
const fs = require('node:fs')
const path = require('node:path')

function buildReport (scan) {
  const findings = scan.findings || []
  return {
    version: 1, tool: 'playbook-pin-auditor', generatedAt: new Date().toISOString(),
    summary: {
      checked: (scan.checked || []).length, findings: findings.length,
      floatingRef: findings.filter((f) => f.classification === 'floating-ref').length,
      missingRef: findings.filter((f) => f.classification === 'missing-ref').length,
      floatingRange: findings.filter((f) => f.classification === 'floating-range').length,
      unpinnedPlaybook: findings.filter((f) => f.classification === 'unpinned-playbook-require').length,
    },
    findings, checked: scan.checked, meta: { reportEmail: 'support@devcentr.org' },
  }
}

function writeOutputs (report, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  const lines = ['# Playbook Pin Auditor', '', 'Generated: ' + report.generatedAt, '', '## Summary', '', '```json', JSON.stringify(report.summary, null, 2), '```', '', '## Findings', '']
  if (!report.findings.length) lines.push('_No floating / missing pins._')
  for (const f of report.findings) {
    lines.push('- **' + f.target + '** — `' + f.classification + '`' + (f.spec ? ' (`' + f.spec + '`)' : '') + (f.prefer ? ' → prefer `' + f.prefer + '`' : ''))
  }
  lines.push('', 'Support: support@devcentr.org', '')
  fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'))
}
module.exports = { buildReport, writeOutputs }
