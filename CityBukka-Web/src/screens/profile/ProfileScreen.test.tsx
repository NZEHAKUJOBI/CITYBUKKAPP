import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { installFakeServer, resetClientState, signIn, testUser } from '../../test/fakeServer';
import { renderApp } from '../../test/render';

let server: ReturnType<typeof installFakeServer>;
beforeEach(() => {
  resetClientState();
  const user = testUser({ savedAddresses: ['12 Bosso Road, Minna', '4 Paiko Road, Minna'], selectedAddress: '12 Bosso Road, Minna' });
  server = installFakeServer({ user });
  signIn(user);
});
afterEach(() => vi.unstubAllGlobals());

describe('ProfileScreen', () => {
  it('shows the real signed-in user and no invented rewards', async () => {
    renderApp('/profile');
    expect(await screen.findByText('Ada Customer')).toBeInTheDocument();
    expect(screen.getByText('0803 123 4567')).toBeInTheDocument();
    expect(screen.getByText('ada@example.test')).toBeInTheDocument();
    expect(screen.queryByText(/Fire Points/)).toBeNull();
  });

  it('toggles dark mode and saves it to the account', async () => {
    renderApp('/profile');
    const toggle = await screen.findByRole('switch', { name: 'Dark Mode Theme' });
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('light');
    await waitFor(() => expect(server.state.user.isDarkMode).toBe(false));
  });

  it('changes the selected delivery address via PATCH /api/me', async () => {
    renderApp('/profile');
    fireEvent.click(await screen.findByRole('button', { name: /Saved Addresses/ }));
    const dialog = screen.getByRole('dialog', { name: 'Saved Addresses' });
    fireEvent.click(within(dialog).getByRole('radio', { name: /Paiko Road/ }));
    await waitFor(() => expect(server.state.user.selectedAddress).toBe('4 Paiko Road, Minna'));
    expect(within(dialog).getByRole('radio', { name: /Paiko Road/ })).toBeChecked();
    const patch = server.state.requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toEqual({ selectedAddress: '4 Paiko Road, Minna' });
  });

  it('edits name and email without ever sending the phone', async () => {
    renderApp('/profile');
    fireEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit profile' });
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Ada Obi' } });
    fireEvent.change(within(dialog).getByLabelText(/Email/), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Ada Obi')).toBeInTheDocument();
    const patch = server.state.requests.find((r) => r.method === 'PATCH');
    expect(patch?.body).toEqual({ name: 'Ada Obi', email: '' });
  });

  it('logs out', async () => {
    renderApp('/profile');
    fireEvent.click(await screen.findByRole('button', { name: /Log Out/ }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/));
    expect(localStorage.getItem('citybukka:session')).toBeNull();
  });

  it('links support contacts', async () => {
    renderApp('/profile');
    expect((await screen.findByRole('link', { name: /24\/7 Bukka Support/ })).getAttribute('href')).toEqual('tel:+2348002855269');
    expect(screen.getByRole('link', { name: /Email Support/ }).getAttribute('href')).toEqual('mailto:help@citybukka.com');
  });
});
