import { t } from '../i18n/index.js';
import React from 'react';
import Icon from './Icon.js';



export default function MarkdownToolbar({ disabled, onFormat, onImage }) {
const groups = [
  [['bold', t("加粗")], ['italic', t("斜体")], ['strike', t("删除线")]],
  [['quote', t("引用")], ['unorderedList', t("无序列表")], ['orderedList', t("有序列表")], ['taskList', t("任务列表")]],
  [['inlineCode', t("行内代码")], ['codeBlock', t("代码块")], ['link', t("插入链接")], ['divider', t("分隔线")]],
];
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
    <div aria-label={t("Markdown 格式工具栏")} className="markdown-toolbar" role="toolbar" onKeyDown={navigate}>
      <select
        aria-label={t("标题级别")}
        title={t("设置当前行或选中行的标题级别")}
        className="markdown-toolbar__heading"
        disabled={disabled}
        value=""
        onChange={(event) => onFormat(event.target.value)}
      >
        <option value="" disabled>{t("标题")}</option>
        <option value="paragraph">{t("正文")}</option>
        {[t("一级"), t("二级"), t("三级"), t("四级"), t("五级"), t("六级")].map((label, index) => <option key={label} value={`h${index + 1}`}>H{index + 1} · {label}{t("标题")}</option>)}
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
        <button type="button" aria-label={t("插入图片")} title={t("插入图片")} disabled={disabled}
          onMouseDown={(event) => event.preventDefault()} onClick={onImage}>
          <Icon name="image" size={18} />
        </button>
      </div>
    </div>
  );
}
