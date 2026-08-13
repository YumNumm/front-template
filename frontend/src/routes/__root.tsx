import type { ReactNode } from 'react';

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';

import appCss from '~/styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Front Template' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang='ja'>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <RootDocument>
      <header className='border-b border-neutral-200 bg-white'>
        <nav className='mx-auto flex max-w-3xl gap-4 px-6 py-4'>
          <a href='/'>Home</a>
          <a href='/login'>Login</a>
          <a href='/me'>Me</a>
        </nav>
      </header>
      <Outlet />
    </RootDocument>
  );
}
