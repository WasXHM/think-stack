import { t } from '../i18n/index.js';
import { useEffect } from 'react';

import { appName } from '../config.js';

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${t(appName)}` : t(appName);
  }, [title]);
}

