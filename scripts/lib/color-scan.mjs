/**
 * 颜色字面量扫描（scripts/check-colors.mjs 与 scripts/metrics.mjs 共用）。
 *
 * 分类口径见 docs/theme-tokens.md：
 *   controlled —— 位于 `var(<token>, <回退>)` 的第二参数；
 *   exempt     —— 行内 / 上一行有 `TOKEN-OK:`，或处于 `TOKEN-OK-BLOCK:` 区间；
 *   raw        —— 其余，必须为 0。
 */

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g

/** 字面量是否落在 var(...) 的第二个参数里。 */
export function insideVarFallback(line, index) {
  let depth = 0
  for (let i = index - 1; i >= 0; i -= 1) {
    const ch = line[i]
    if (ch === ')') depth += 1
    else if (ch === '(') {
      if (depth === 0) {
        if (line.slice(Math.max(0, i - 3), i + 1) !== 'var(') return false
        const between = line.slice(i + 1, index)
        let d = 0
        for (const c of between) {
          if (c === '(') d += 1
          else if (c === ')') d -= 1
          else if (c === ',' && d === 0) return true
        }
        return false
      }
      depth -= 1
    }
  }
  return false
}

/**
 * 扫描源码里的颜色字面量。
 *
 * @param {string} source 源码
 * @returns {{controlled: number, exempt: Array, raw: Array, total: number}}
 */
export function scanColors(source) {
  const lines = String(source).split(/\r?\n/)
  const controlled = []
  const exempt = []
  const raw = []
  let inBlockComment = false
  let inTokenBlock = false

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i]
    let line = rawLine
    const lineNo = i + 1

    if (rawLine.includes('TOKEN-OK-BLOCK-END')) inTokenBlock = false

    if (inBlockComment) {
      if (rawLine.includes('*/')) inBlockComment = false
      continue
    }
    const blockStart = rawLine.indexOf('/*')
    if (blockStart >= 0) {
      const blockEnd = rawLine.indexOf('*/', blockStart)
      if (blockEnd < 0) {
        inBlockComment = true
        line = rawLine.slice(0, blockStart)
      } else {
        line = rawLine.slice(0, blockStart) + rawLine.slice(blockEnd + 2)
      }
    }

    if (rawLine.includes('TOKEN-OK-BLOCK:')) inTokenBlock = true
    const exempted = /TOKEN-OK:/.test(rawLine)
      || /TOKEN-OK:/.test(lines[i - 1] || '')
      || inTokenBlock

    for (const match of line.matchAll(COLOR)) {
      const entry = { line: lineNo, value: match[0], text: line.trim().slice(0, 160) }
      if (insideVarFallback(line, match.index)) controlled.push(entry)
      else if (exempted) exempt.push(entry)
      else raw.push(entry)
    }
  }

  return { controlled: controlled.length, exempt, raw, total: controlled.length + exempt.length + raw.length }
}
