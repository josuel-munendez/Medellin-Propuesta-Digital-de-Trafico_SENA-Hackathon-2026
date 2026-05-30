export function getConfiguredEnv(name) {
  const value = import.meta.env[name]
  if (!value) return ''

  const trimmed = String(value).trim()
  if (!trimmed || trimmed.startsWith('YOUR_') || trimmed.includes('_HERE')) {
    return ''
  }

  return trimmed
}
