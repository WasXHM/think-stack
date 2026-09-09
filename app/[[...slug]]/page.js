import dynamic from 'next/dynamic';

const WorkspaceClient = dynamic(() => import('./workspace-client.js'), {
  ssr: false,
  loading: () => <div className="page route-loading" aria-busy="true">正在载入页面…</div>,
});

export default function CatchAllPage() {
  return <WorkspaceClient />;
}
