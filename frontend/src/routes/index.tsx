import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className='mx-auto max-w-3xl px-6 py-16'>
      <h1 className='text-3xl font-semibold tracking-tight'>Front Template</h1>
      <p className='mt-3 text-neutral-600'>
        TanStack Start on Cloudflare Workers.
      </p>
    </main>
  );
}
