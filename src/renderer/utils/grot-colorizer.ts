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

// Matches ANSI CSI sequences: ESC [ <codes> m
const ANSI_RE = /(\x1b\[[\d;]*m)/

/**
 * Convert a string containing ANSI escape codes to an HTML string with
 * Tailwind class-based <span> wrappers. HTML special characters in the
 * source text are escaped before processing.
 */
export function ansiToHtml(text: string): string {
  // Escape HTML before we do anything else, so v-html is safe
  const safe = text
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
  return text.replace(/\x1b\[[\d;]*m/g, '')
}
