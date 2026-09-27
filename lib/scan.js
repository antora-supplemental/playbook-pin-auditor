'use strict'

const fs = require('node:fs')
const path = require('node:path')

let yaml
try { yaml = require('js-yaml') } catch (_) { yaml = null }

const SEMVER_TAG_RE = /^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/
const FLOATING_REFS = new Set(['main', 'master', 'head', 'latest', 'dev', 'develop'])

function classifyPin (spec) {
  if (!spec || typeof spec !== 'string') return { ok: false, classification: 'invalid', detail: 'empty' }
  if (/^[\^~><=*]|^\d/.test(spec) && !spec.includes('github:') && !spec.startsWith('git+') && !spec.includes('/')) {
    if (SEMVER_TAG_RE.test(spec.replace(/^[^\d]*/, '')) || /^\d+\.\d+\.\d+/.test(spec)) {
      const floating = /[\^~*]/.test(spec) || spec === '*' || spec === 'latest'
      return { ok: !floating, classification: floating ? 'floating-range' : 'npm-semver', ref: spec }
    }
  }
  let repo = null
  let ref = null
  const gh = spec.match(/^github:([^#]+)(?:#(.+))?$/i)
  if (gh) { repo = gh[1]; ref = gh[2] || null }
  else {
    const git = spec.match(/github\.com[/:]([^/]+\/[^/#.]+)(?:\.git)?(?:#(.+))?/i)
    if (git) { repo = git[1].replace(/\.git$/, ''); ref = git[2] || null }
  }
  if (repo) {
    if (!ref) return { ok: false, classification: 'missing-ref', repo, ref: null, prefer: 'github:' + repo + '#vX.Y.Z' }
    if (FLOATING_REFS.has(ref.toLowerCase())) return { ok: false, classification: 'floating-ref', repo, ref, prefer: 'github:' + repo + '#vX.Y.Z' }
    if (SEMVER_TAG_RE.test(ref)) return { ok: true, classification: 'semver-tag', repo, ref }
    if (/^[0-9a-f]{7,40}$/i.test(ref)) return { ok: true, classification: 'commit-sha', repo, ref }
    return { ok: false, classification: 'non-semver-ref', repo, ref, prefer: 'github:' + repo + '#vX.Y.Z' }
  }
  if (/^(file:|link:|workspace:)/i.test(spec)) return { ok: true, classification: 'local', ref: spec }
  return { ok: true, classification: 'other', ref: spec }
}

function collectPlaybookRequires (playbookPath) {
  if (!yaml) throw new Error('js-yaml required to parse playbooks')
  const doc = yaml.load(fs.readFileSync(playbookPath, 'utf8')) || {}
  const ext = (((doc.antora || {}).extensions) || [])
  const out = []
  for (const e of ext) {
    if (typeof e === 'string') out.push({ require: e, pin: null })
    else if (e && typeof e === 'object') out.push({ require: e.require || e.id || null, pin: e.version || null, raw: e })
  }
  return out
}

function auditPins ({ root = '.', packageJson = 'package.json', playbook = null } = {}) {
  const abs = path.resolve(root)
  const pkgPath = path.resolve(abs, packageJson)
  const findings = []
  const checked = []

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    for (const section of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
      const block = pkg[section] || {}
      for (const [name, spec] of Object.entries(block)) {
        const c = classifyPin(spec)
        checked.push({ name, spec, section, ...c })
        if (!c.ok) {
          findings.push({
            target: name, classification: c.classification, kind: c.classification,
            sources: [path.relative(abs, pkgPath).split(path.sep).join('/')],
            spec, prefer: c.prefer || null, repo: c.repo || null, ref: c.ref || null,
          })
        }
      }
    }
  }

  if (playbook) {
    const pb = path.resolve(abs, playbook)
    if (fs.existsSync(pb)) {
      const reqs = collectPlaybookRequires(pb)
      for (const r of reqs) {
        if (!r.require) continue
        const match = checked.find((c) => c.name === r.require || c.name.endsWith('/' + r.require))
        if (!match) {
          findings.push({
            target: r.require, classification: 'unpinned-playbook-require', kind: 'unpinned-playbook-require',
            sources: [path.relative(abs, pb).split(path.sep).join('/')],
            prefer: 'Add github:org/repo#vX.Y.Z to package.json',
          })
        }
      }
    }
  }
  return { root: abs, checked, findings }
}

module.exports = { auditPins, classifyPin, collectPlaybookRequires, FLOATING_REFS, SEMVER_TAG_RE }
