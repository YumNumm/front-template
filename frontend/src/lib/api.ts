import { createApiClient } from '@front-template/api';

export const api = createApiClient('/', {
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: 'include',
    }),
});
