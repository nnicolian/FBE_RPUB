// RIS export for Zotero / Mendeley from APA-style reference strings in the References Library.

const doiOf = s => (String(s || '').match(/10\.\d{4,9}\/[^\s"<>]+/) || [])[0]?.replace(/[.,;)]+$/, '') || ''

function parseApa(ref) {
  const r = { authors: [], year: '', title: '', journal: '', volume: '', issue: '', pages: '' }
  const ym = ref.match(/\((\d{4})[a-z]?\)\.?/)
  if (!ym) return r
  r.year = ym[1]
  const before = ref.slice(0, ym.index)
  r.authors = [...before.matchAll(/([A-Z][A-Za-z'’\-]+(?:\s[A-Z][A-Za-z'’\-]+)*),\s((?:[A-Z]\.\s?(?:-?[A-Z]\.\s?)*)+)/g)].map(m => `${m[1]}, ${m[2].trim()}`)
  const after = ref.slice(ym.index + ym[0].length).trim()
  const t = after.match(/^(.+?[.?!])\s+(.*)$/)
  if (!t) { r.title = after; return r }
  r.title = t[1].replace(/\.$/, '')
  const src = t[2].match(/^([^,]+),\s*(\d+)?(?:\((\d+)\))?,?\s*([\d–\-]+)?/)
  if (src) { r.journal = src[1].trim(); r.volume = src[2] || ''; r.issue = src[3] || ''; r.pages = src[4] || '' }
  return r
}

export function toRis(entries) {
  return entries.map(e => {
    const p = parseApa(e.reference || '')
    const doi = doiOf(e.link) || doiOf(e.reference)
    const lines = [p.journal ? 'TY  - JOUR' : 'TY  - GEN']
    p.authors.forEach(a => lines.push(`AU  - ${a}`))
    lines.push(`TI  - ${p.title || e.theme}`)
    if (p.journal) lines.push(`JO  - ${p.journal}`)
    if (p.year) lines.push(`PY  - ${p.year}`)
    if (p.volume) lines.push(`VL  - ${p.volume}`)
    if (p.issue) lines.push(`IS  - ${p.issue}`)
    if (p.pages) { const [sp, ep] = p.pages.split(/[–-]/); lines.push(`SP  - ${sp}`); if (ep) lines.push(`EP  - ${ep}`) }
    if (doi) lines.push(`DO  - ${doi}`)
    if (e.link) lines.push(`UR  - ${e.link}`)
    if (e.definition) lines.push(`AB  - ${e.definition.replace(/\s+/g, ' ')}`)
    lines.push(`KW  - ${[e.theory, e.theme].filter(Boolean).join(' — ')}`)
    lines.push(`N1  - ${(e.reference || '').replace(/\s+/g, ' ')}`)
    lines.push('ER  - ')
    return lines.join('\r\n')
  }).join('\r\n\r\n') + '\r\n'
}

export function dois(entries) {
  return [...new Set(entries.map(e => doiOf(e.link) || doiOf(e.reference)).filter(Boolean))]
}

export function downloadText(filename, text, type = 'application/x-research-info-systems') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
