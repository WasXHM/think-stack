import React from 'react';
import Icon from './Icon.js';

const groups = [
  [['bold', '加粗'], ['italic', '斜体'], ['strike', '删除线']],
  [['quote', '引用'], ['unorderedList', '无序列表'], ['orderedList', '有序列表'], ['taskList', '任务列表']],
  [['inlineCode', '行内代码'], ['codeBlock', '代码块'], ['link', '插入链接'], ['divider', '分隔线']],
];

export default function MarkdownToolbar({ disabled, onFormat, onImage }) {
  function navigate(event) {
    if (event.target.tagName === 'SELECT' || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const controls = Array.from(event.currentTarget.querySelectorAll('button:not(:disabled), select:not(:disabled)'));
    const index = controls.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + controls.length) % controls.length;
    controls[next]?.focus();
  }

  return (
    <div aria-label="Markdown 格式工具栏" className="markdown-toolbar" role="toolbar" onKeyDown={navigate}>
      <select
        aria-label="标题级别"
        title="设置当前行或选中行的标题级别"
        className="markdown-toolbar__heading"
        disabled={disabled}
        value=""
        onChange={(event) => onFormat(event.target.value)}
      >
        <option value="" disabled>标题</option>
        <option value="paragraph">正文</option>
        {['一级', '二级', '三级', '四级', '五级', '六级'].map((label, index) => <option key={label} value={`h${index + 1}`}>H{index + 1} · {label}标题</option>)}
      </select>
      {groups.map((group, index) => (
        <div className="markdown-toolbar__group" key={index}>
          {group.map(([command, label]) => (
            <button key={command} type="button" aria-label={label} title={label} disabled={disabled}
              onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(command)}>
              <Icon name={command} size={18} />
            </button>
          ))}
        </div>
      ))}
      <div className="markdown-toolbar__group">
        <button type="button" aria-label="插入图片" title="插入图片" disabled={disabled}
          onMouseDown={(event) => event.preventDefault()} onClick={onImage}>
          <Icon name="image" size={18} />
        </button>
      </div>
    </div>
  );
}
