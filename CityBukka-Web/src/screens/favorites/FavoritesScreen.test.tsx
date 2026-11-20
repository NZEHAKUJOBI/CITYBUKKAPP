import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installFakeServer, resetClientState, signIn } from '../../test/fakeServer';
import { renderApp } from '../../test/render';

let server: ReturnType<typeof installFakeServer>;
beforeEach(() => {
  resetClientState();
  server = installFakeServer();
});
afterEach(() => vi.unstubAllGlobals());

describe('FavoritesScreen', () => {
  it('is only for signed-in customers', async () => {
    renderApp('/saved');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fsaved');
  });

  it('lists saved dishes and bukkas from the server and removes them when un-hearted', async () => {
    server.state.favorites.food.push('food_jellof_rice');
    server.state.favorites.restaurant.push('rest_mama_ope');
    signIn();
    const user = userEvent.setup();
    renderApp('/saved');

    await user.click(await screen.findByRole('button', { name: 'Remove Smoky Party Jellof Rice from saved' }));
    expect(screen.getByText('No Favorite Dishes Yet')).toBeInTheDocument();
    await waitFor(() => expect(server.state.favorites.food).toEqual([]));
    expect(server.state.requests).toContainEqual(expect.objectContaining({
      method: 'DELETE', path: '/api/me/favorites/food/food_jellof_rice', auth: 'Bearer test-token',
    }));

    await user.click(screen.getByRole('tab', { name: 'Bookmarked Bukkas' }));
    await user.click(await screen.findByRole('button', { name: /^Remove .* from saved$/ }));
    expect(screen.getByText('No Bookmarked Bukkas')).toBeInTheDocument();
  });

  it('rolls back an optimistic un-heart when the server refuses', async () => {
    server.state.favorites.food.push('food_jellof_rice');
    signIn();
    server.state.overrides.set('DELETE /api/me/favorites/food/food_jellof_rice', () => new Response(
      JSON.stringify({ error: { code: 'internal', message: 'boom' } }), { status: 500 },
    ));
    const user = userEvent.setup();
    renderApp('/saved');
    await user.click(await screen.findByRole('button', { name: 'Remove Smoky Party Jellof Rice from saved' }));
    expect(await screen.findByRole('button', { name: 'Remove Smoky Party Jellof Rice from saved' })).toBeInTheDocument();
  });
});
