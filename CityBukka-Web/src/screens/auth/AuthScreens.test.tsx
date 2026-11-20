import { fireEvent, screen, waitFor } from '@testing-library/react';
import { normalizeNigerianPhone } from '../../lib/phone';
import { safeNext } from '../../state/AuthContext';
import { installFakeServer, resetClientState, testUser } from '../../test/fakeServer';
import { renderApp } from '../../test/render';

let server: ReturnType<typeof installFakeServer>;
beforeEach(() => {
  resetClientState();
  server = installFakeServer({ user: testUser({ phone: '08031234567' }), password: 'secret123' });
});
afterEach(() => vi.unstubAllGlobals());

const fill = (label: RegExp | string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Login', () => {
  it('guards /orders, signs in and returns to ?next', async () => {
    renderApp('/orders');
    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(screen.getByText('e.g. 0803 123 4567')).toBeInTheDocument();
    fill('Phone number', '08031234567');
    fill('Password', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'My Orders' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/orders$/);
    const session = JSON.parse(localStorage.getItem('citybukka:session')!) as { token: string };
    expect(session.token).toBe('test-token');
    expect(server.state.requests.find((r) => r.path === '/api/orders')?.auth).toBe('Bearer test-token');
  });

  it('shows invalid credentials', async () => {
    renderApp('/login');
    fill('Phone number', '08031234567');
    fill('Password', 'wrong-pass');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong phone number or password.');
    expect(localStorage.getItem('citybukka:session')).toBeNull();
  });

  it('refuses rider accounts on the customer sign-in', async () => {
    server.state.user = testUser({ role: 'rider' });
    renderApp('/login');
    fill('Phone number', '08031234567');
    fill('Password', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This is a rider account — use the rider app at /rider');
    expect(localStorage.getItem('citybukka:session')).toBeNull();
  });

  it('reports rate limiting with the Retry-After wait', async () => {
    server.state.overrides.set('POST /api/auth/login', () => new Response(
      JSON.stringify({ error: { code: 'rate_limited', message: 'Too many' } }),
      { status: 429, headers: { 'Retry-After': '30' } },
    ));
    renderApp('/login');
    fill('Phone number', '08031234567');
    fill('Password', 'secret123');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 30 seconds');
  });
});

describe('Register', () => {
  it('validates the Nigerian phone, creates the account and signs in', async () => {
    renderApp('/register?next=%2Fprofile');
    await screen.findByRole('heading', { name: 'Create your account' });
    fill('Full name', 'Bola Buyer');
    fill('Phone number', '12345');
    fill('Password', 'pass1234');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/Enter a valid Nigerian mobile number/)).toBeInTheDocument();

    fill('Phone number', '0905 111 2222');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Bola Buyer')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/profile$/));
    const reg = server.state.requests.find((r) => r.path === '/api/auth/register');
    expect(reg?.body).toEqual({ name: 'Bola Buyer', phone: '0905 111 2222', password: 'pass1234' });
  });

  it('explains a taken phone number', async () => {
    renderApp('/register');
    fill('Full name', 'Ada');
    fill('Phone number', '08031234567');
    fill('Password', 'pass1234');
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  });
});

describe('helpers', () => {
  it('only allows same-app next paths', () => {
    expect(safeNext('/orders/CB-1')).toBe('/orders/CB-1');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('/login?next=/x')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });

  it('normalises Nigerian mobile numbers', () => {
    expect(normalizeNigerianPhone('0803 123 4567')).toBe('08031234567');
    expect(normalizeNigerianPhone('+234 803 123 4567')).toBe('08031234567');
    expect(normalizeNigerianPhone('2349051112222')).toBe('09051112222');
    expect(normalizeNigerianPhone('0603 123 4567')).toBeNull();
    expect(normalizeNigerianPhone('12345')).toBeNull();
  });
});
