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
 * Make a display label safe inside the wire mention `@[label](uri)`.
 *
 * Minimal on purpose: the label grammar is delimited by `]` and escapes with
 * `\`, so only those two characters are escaped. Line breaks and tabs become
 * spaces because a mention is an inline token, not a block. Everything else,
 * quotes and brackets included, is left exactly as the rules produced it.
 * @param label - label produced by the configured naming rules.
 * @returns the label as the wire form spells it.
 */
export function escapeMentionLabel(label: string): string {
  return label
    .replace(/[\r\n\t]+/gu, ' ')
    .replace(/[\\\]]/gu, match => `\\${match}`)
}

/**
 * Render the host-neutral Markdown mention the composer and Host both parse.
 * @param sessionId - opaque session id.
 * @param label - user-facing title after the naming rules ran.
 * @returns `@[label](dsh-session:...)` mention.
 */
export function formatSessionReferenceMention(sessionId: string, label: string): string {
  return `@[${escapeMentionLabel(label)}](${encodeSessionReferenceUri(sessionId)})`
}
