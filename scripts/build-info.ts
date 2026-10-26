import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** What a build stamps into the app (footer) and into build-info.json: the release version, its commit and when it was built. */
export interface BuildInfo { version: string; commit: string | null; builtAt: string }

/** The commit GitHub Actions builds, else the checkout's HEAD; null outside a git checkout. */
function currentCommit(root: string) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null }
  catch { return null }
}

/** The version comes from package.json alone; the Pages workflow deploys right after building, so the build time is the deploy time. */
export function readBuildInfo(root: string): BuildInfo {
  const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { version: string }
  return { version, commit: currentCommit(root), builtAt: new Date().toISOString() }
}
