function replace(value, start, end, text, selectionStart, selectionEnd = selectionStart) {
  return { value: value.slice(0, start) + text + value.slice(end), start: start + selectionStart, end: start + selectionEnd };
}

function wrap(value, start, end, marker, placeholder) {
  const selected = value.slice(start, end);
  if (start >= marker.length && value.slice(start - marker.length, start) === marker && value.slice(end, end + marker.length) === marker) {
    return replace(value, start - marker.length, end + marker.length, selected, 0, selected.length);
  }
  if (selected.length > marker.length * 2 && selected.startsWith(marker) && selected.endsWith(marker)) {
    const content = selected.slice(marker.length, -marker.length);
    return replace(value, start, end, content, 0, content.length);
  }
  const content = selected || placeholder;
  return replace(value, start, end, marker + content + marker, marker.length, marker.length + content.length);
}

function formatLines(value, start, end, command) {
  const first = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1;
  const lastPosition = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const newline = value.indexOf('\n', lastPosition);
  const last = newline === -1 ? value.length : newline;
  const lines = value.slice(first, last).split('\n');
  const edits = lines.map((line, index) => {
    const indent = line.match(/^[\t ]*/)[0];
    const body = line.slice(indent.length);
    let prefix = '';
    let remove = '';
    if (/^h[1-6]$/.test(command) || command === 'paragraph') {
      remove = body.match(/^#{1,6}(?:\s+|$)/)?.[0] ?? '';
      prefix = command === 'paragraph' ? '' : `${'#'.repeat(Number(command[1]))} `;
    } else if (command === 'quote') {
      remove = body.match(/^> ?/)?.[0] ?? '';
      prefix = '> ';
    } else {
      remove = body.match(/^(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/)?.[0] ?? '';
      prefix = command === 'orderedList' ? `${index + 1}. ` : command === 'taskList' ? '- [ ] ' : '- ';
    }
    return { indent: indent.length, removed: remove.length, prefix, original: line, text: indent + prefix + body.slice(remove.length) };
  });
  function mapPosition(position) {
    let originalOffset = first;
    let newOffset = first;
    for (const edit of edits) {
      if (position <= originalOffset + edit.original.length) {
        const column = position - originalOffset;
        return newOffset + (column < edit.indent ? column : edit.indent + edit.prefix.length + Math.max(0, column - edit.indent - edit.removed));
      }
      originalOffset += edit.original.length + 1;
      newOffset += edit.text.length + 1;
    }
    return position + newOffset - originalOffset;
  }
  return { value: value.slice(0, first) + edits.map((edit) => edit.text).join('\n') + value.slice(last), start: mapPosition(start), end: mapPosition(end) };
}

export function formatMarkdown(value, start, end, command, maxLength = 500000) {
  let result;
  const inline = { bold: ['**', '加粗文本'], italic: ['_', '斜体文本'], strike: ['~~', '删除线文本'] };
  if (inline[command]) {
    result = wrap(value, start, end, ...inline[command]);
  } else if (command === 'inlineCode') {
    const content = value.slice(start, end) || '代码';
    const longest = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
    const marker = '`'.repeat(longest + 1);
    const padding = content.startsWith('`') || content.endsWith('`') ? ' ' : '';
    result = replace(value, start, end, marker + padding + content + padding + marker, marker.length + padding.length, marker.length + padding.length + content.length);
  } else if (command === 'link') {
    const content = (value.slice(start, end) || '链接文本').replace(/[\\[\]]/g, '\\$&');
    const prefix = `[${content}](`;
    result = replace(value, start, end, `${prefix}https://)`, prefix.length, prefix.length + 8);
  } else if (command === 'codeBlock' || command === 'divider') {
    const before = value.slice(0, start);
    const after = value.slice(end);
    const leading = before ? (before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n') : '';
    const trailing = after ? (after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n') : '\n';
    const content = value.slice(start, end) || '代码';
    const fence = '`'.repeat(Math.max(3, 1 + Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length))));
    const block = command === 'divider' ? '---' : `${fence}\n${content}\n${fence}`;
    const cursor = leading.length + (command === 'divider' ? block.length + trailing.length : fence.length + 1);
    result = replace(value, start, end, leading + block + trailing, cursor, command === 'divider' ? cursor : cursor + content.length);
  } else if (/^h[1-6]$/.test(command) || ['paragraph', 'quote', 'unorderedList', 'orderedList', 'taskList'].includes(command)) {
    result = formatLines(value, start, end, command);
  } else {
    throw new Error('不支持的 Markdown 格式。');
  }
  if (result.value.length > maxLength) throw new Error('格式设置后超过正文长度限制，请缩短内容后重试。');
  return result;
}
