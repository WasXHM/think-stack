import { useEffect } from 'react';

import { appName } from '../config.js';

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${appName}` : appName;
  }, [title]);
}

