import '../webapp/src/styles.css';
import Providers from './providers.js';

export const metadata = {
  title: 'ThinkStack / 思栈',
  description: '个人技术思考工作台',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
