/**
 * Minimal ANSI-to-HTML converter for grot command output.
 *
 * Handles the subset of ANSI codes that grot's Colorator module produces.
 * To remove ANSI rendering entirely, replace `ansiToHtml` with `stripAnsi`
 * in OutputPanel.vue.
 *
 * Supported codes (from grot/lib/grot/cli/colorator.rb):
 *   0  reset, 1 bold, 3 italic, 4 underline
 *   30 black, 31 red, 32 green, 33 yellow, 34 blue, 35 magenta, 36 cyan, 37 white
 *   90 grey, 97 bright-white
 *   40-47 background colors (mapped to bg-* classes)
 */

const ANSI_TO_CLASS: Record<number, string> = {
  1:  'font-bold',
  3:  'italic',
  4:  'underline',
  30: 'text-gray-900 dark:text-gray-800',
  31: 'text-red-400',
  32: 'text-green-400',
  33: 'text-yellow-400',
  34: 'text-blue-400',
  35: 'text-purple-400',
  36: 'text-cyan-400',
  37: 'text-gray-200',
  90: 'text-gray-500',
  97: 'text-white',
  40: 'bg-black',
  41: 'bg-red-900',
  42: 'bg-green-900',
  43: 'bg-yellow-900',
  44: 'bg-blue-900',
  45: 'bg-purple-900',
  46: 'bg-cyan-900',
  47: 'bg-gray-200',
}

// Matches ANSI CSI sequences: ESC [ <codes> m (SGR only)
const ANSI_RE = /(\x1b\[[\d;]*m)/

// Matches non-SGR ANSI sequences (cursor movement, erase line, show/hide cursor, etc.)
// These end in letters other than 'm', e.g. \x1b[2K (erase), \x1b[1G (cursor), \x1b[?25l (hide cursor)
const ANSI_NON_SGR_RE = /\x1b\[[\d;?]*[A-LN-Za-ln-z]/g

/**
 * Convert a string containing ANSI escape codes to an HTML string with
 * Tailwind class-based <span> wrappers. HTML special characters in the
 * source text are escaped before processing.
 *
 * Non-color ANSI sequences (cursor movement, erase line, etc.) are stripped.
 * Carriage returns are converted to newlines so spinner frames display as
 * separate lines instead of overwriting each other.
 */
export function ansiToHtml(text: string): string {
  // Strip non-SGR ANSI codes (cursor movement, erase line, hide cursor, etc.)
  let cleaned = text.replace(ANSI_NON_SGR_RE, '')

  // Convert \r\n to \n first, then standalone \r to \n so spinner frames
  // appear as separate lines instead of overwriting in whitespace-pre-wrap
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Collapse runs of blank lines (spinner can produce many empty frames)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  // Escape HTML before we do anything else, so v-html is safe
  const safe = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const parts = safe.split(ANSI_RE)
  let classes: string[] = []
  let html = ''

  for (const part of parts) {
    if (ANSI_RE.test(part)) {
      // It's an escape sequence — parse out all codes (e.g. ESC[1;32m)
      const codes = part.slice(2, -1).split(';').map(Number)
      for (const code of codes) {
        if (code === 0) {
          classes = []
        } else {
          const cls = ANSI_TO_CLASS[code]
          if (cls) {
            // Bold/italic/underline stack; colors replace
            if (code === 1 || code === 3 || code === 4) {
              if (!classes.includes(cls)) classes.push(cls)
            } else {
              // Replace any existing color class
              classes = classes.filter(
                (c) => !c.startsWith('text-') && !c.startsWith('bg-')
              )
              classes.push(cls)
            }
          }
        }
      }
    } else if (part) {
      // It's text content
      if (classes.length > 0) {
        html += `<span class="${classes.join(' ')}">${part}</span>`
      } else {
        html += part
      }
    }
  }

  return html
}

/**
 * Strip all ANSI escape codes from a string, returning plain text.
 * Use this instead of ansiToHtml in OutputPanel if color rendering is unwanted.
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[\d;?]*[A-Za-z]/g, '')
}
