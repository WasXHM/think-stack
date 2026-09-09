import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootNodeModules = path.join(rootDirectory, 'node_modules');

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/think-stack',
  experimental: { typedRoutes: true },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      // The legacy webapp has its own node_modules. Both sides of the
      // BrowserRouter boundary must resolve the exact same React Router copy.
      'react-router-dom': path.join(rootNodeModules, 'react-router-dom'),
      'react-router': path.join(rootNodeModules, 'react-router'),
      '@remix-run/router': path.join(rootNodeModules, '@remix-run/router'),
    };
    return config;
  },
};

export default nextConfig;
