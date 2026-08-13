import { createFileRoute, redirect } from '@tanstack/react-router';

import { api } from '~/lib/api';
import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/me')({
  beforeLoad: async () => {
    const session = await authClient.getSession();

    if (!session.data) {
      throw redirect({ to: '/login' });
    }
  },
  loader: async () => {
    const response = await api.api.v1.users.me.$get();

    if (!response.ok) {
      throw new Error(`ユーザー情報の取得に失敗しました: ${response.status}`);
    }

    return response.json();
  },
  component: MePage,
});

function MePage() {
  const data = Route.useLoaderData();

  return (
    <main className='mx-auto max-w-3xl px-6 py-16'>
      <h1 className='text-3xl font-semibold tracking-tight'>ログイン情報</h1>
      <pre className='mt-6 overflow-x-auto rounded-md bg-neutral-100 p-4'>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}
