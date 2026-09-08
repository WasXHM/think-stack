import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function SafeLink({ href = '', children, node: _node, ...props }) {
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      {...props}
    >
      {children}
    </a>
  );
}

function SafeImage({ src = '', alt = '', node: _node, ...props }) {
  const allowed = /^(?:https?:\/\/|\.{1,2}\/|\/(?!\/))/i.test(src);
  if (!allowed) {
    return null;
  }
  return (
    <img
      alt={alt}
      decoding="async"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={src}
      {...props}
    />
  );
}

export default function MarkdownContent({ children, className = '' }) {
  return (
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: SafeLink,
          img: SafeImage,
          table: ({ children: tableChildren }) => (
            <div className="markdown-table-wrap" tabIndex="0">
              <table>{tableChildren}</table>
            </div>
          ),
        }}
      >
        {String(children ?? '')}
      </ReactMarkdown>
    </div>
  );
}
