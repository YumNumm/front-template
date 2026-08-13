import { createFileRoute } from '@tanstack/react-router';

import { authClient } from '~/lib/auth-client';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const signInWithGoogle = () => {
    void authClient.signIn.social({
      provider: 'google',
      callbackURL: '/me',
    });
  };

  return (
    <main className='mx-auto max-w-3xl px-6 py-16'>
      <h1 className='text-3xl font-semibold tracking-tight'>ログイン</h1>
      <button
        className='mt-6 rounded-md bg-neutral-900 px-4 py-2 text-white'
        onClick={signInWithGoogle}
        type='button'
      >
        Google でログイン
      </button>
    </main>
  );
}
