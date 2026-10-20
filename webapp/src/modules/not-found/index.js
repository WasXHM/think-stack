import { t } from '../../i18n/index.js';
import React from 'react';

import StatePanel from '../../components/StatePanel.js';
import usePageTitle from '../../hooks/usePageTitle.js';

export default function NotFoundModule() {
  usePageTitle(t("页面未找到"));
  return (
    <div className="page page--narrow">
      <StatePanel
        actionLabel={t("返回全部思考")}
        actionTo="/"
        description={t("这个地址没有对应的页面，已有内容不会受到影响。")}
        icon="alert"
        title={t("页面未找到")}
      />
    </div>
  );
}

