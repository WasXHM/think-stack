import React from 'react';

import StatePanel from '../../components/StatePanel.js';
import usePageTitle from '../../hooks/usePageTitle.js';

export default function NotFoundModule() {
  usePageTitle('页面未找到');
  return (
    <div className="page page--narrow">
      <StatePanel
        actionLabel="返回全部思考"
        actionTo="/"
        description="这个地址没有对应的页面，已有内容不会受到影响。"
        icon="alert"
        title="页面未找到"
      />
    </div>
  );
}

