/** Canonical session URI scheme used by session-reference. */
const SESSION_REFERENCE_SCHEME = 'dsh-session:'

/**
 * Encode a session id as the canonical lossless `dsh-session:` URI.
 * @param sessionId - opaque session id.
 * @returns canonical URI.
 */
export function encodeSessionReferenceUri(sessionId: string): string {
  const json = JSON.stringify(sessionId)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const payload = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `${SESSION_REFERENCE_SCHEME}${payload}`
}

/**
 * Render the host-neutral Markdown mention the composer and Host both parse.
 * @param sessionId - opaque session id.
 * @param label - user-facing title.
 * @returns `@[label](dsh-session:...)` mention.
 */
export function formatSessionReferenceMention(sessionId: string, label: string): string {
  const escaped = label.replace(/[\\\]]/gu, match => `\\${match}`)
  return `@[${escaped}](${encodeSessionReferenceUri(sessionId)})`
}
