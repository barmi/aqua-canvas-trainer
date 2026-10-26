import { expect, test } from 'vitest'
import { appBuild, buildLabel } from './build-info'
import packageJson from '../../package.json'

test('the build stamp carries the package version and a valid build time', () => {
  expect(appBuild.version).toBe(packageJson.version)
  expect(Number.isNaN(Date.parse(appBuild.builtAt))).toBe(false)
})
test('the footer label shows version, deploy time in the given zone and the short commit', () => {
  const build = { version: '1.2.3', commit: 'eb62d37083abd5f991764745b22bd2ee0237266e', builtAt: '2026-10-26T14:20:00.000Z' }
  expect(buildLabel(build, false, 'Asia/Seoul')).toBe('v1.2.3 · 2026. 10. 26. 오후 11:20 배포 · eb62d37')
  expect(buildLabel({ ...build, commit: null }, true)).toBe('v1.2.3 · 개발 서버')
})
