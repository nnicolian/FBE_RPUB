// Minimal, safe Markdown renderer for the strategy documents (no raw HTML):
// headings, paragraphs, bullet lists, tables, **bold**, *italic* and [links](url).

function inline(text, keyBase = '') {
  const out = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  let last = 0, m, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={keyBase + i++}>{t.slice(2, -2)}</strong>)
    else if (t.startsWith('[')) {
      const [, label, url] = t.match(/\[([^\]]+)\]\(([^)]+)\)/)
      out.push(/^https?:\/\//.test(url) ? <a key={keyBase + i++} href={url} target="_blank" rel="noreferrer" className="text-brand underline">{label}</a> : label)
    } else out.push(<em key={keyBase + i++}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ text }) {
  const lines = String(text || '').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++ }
      const cells = r => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
      const body = rows.filter(r => !/^\|\s*-{3}/.test(r))
      const [head, ...rest] = body.map(cells)
      blocks.push(
        <div key={blocks.length} className="overflow-x-auto my-3">
          <table>
            <thead><tr>{head.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr></thead>
            <tbody>{rest.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} className="text-sm align-top">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )
      continue
    }
    if (/^\s*- /.test(line)) {
      const items = []
      while (i < lines.length && (/^\s*- /.test(lines[i]) || !lines[i].trim())) {
        if (lines[i].trim()) items.push(lines[i].replace(/^\s*- /, ''))
        i++
        if (i < lines.length && lines[i].trim() && !/^\s*- /.test(lines[i])) break
      }
      blocks.push(<ul key={blocks.length} className="list-disc ml-6 my-2 space-y-1 text-sm">{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</ul>)
      continue
    }
    const h = line.match(/^(#{1,3})\s+(.*)/)
    if (h) {
      const cls = h[1].length === 1 ? 'text-lg font-bold mt-5 mb-2' : 'text-base font-bold mt-4 mb-1'
      blocks.push(<div key={blocks.length} className={cls}>{inline(h[2])}</div>)
      i++; continue
    }
    blocks.push(<p key={blocks.length} className="text-sm my-2 leading-relaxed">{inline(line)}</p>)
    i++
  }
  return <div>{blocks}</div>
}
