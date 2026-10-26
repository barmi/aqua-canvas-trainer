import type { BuildInfo } from '../../scripts/build-info'

/** Replaced at build time by vite.config.ts with the version, commit and build time. */
declare const __APP_BUILD__: BuildInfo

export const appBuild: BuildInfo = __APP_BUILD__

/**
 * The footer line: `v0.2.0 · 2026. 10. 26. 오후 11:20 배포 · eb62d37`, in the viewer's own time zone.
 * A dev server has not been deployed, so it says so instead of a time.
 */
export function buildLabel(build: BuildInfo, dev = false, timeZone?: string) {
  const when = dev ? '개발 서버' : `${new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(build.builtAt))} 배포`
  return [`v${build.version}`, when, build.commit?.slice(0, 7)].filter(Boolean).join(' · ')
}
