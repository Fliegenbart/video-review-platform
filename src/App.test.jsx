import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./AdminApp.jsx', () => ({
  default: () => <div>Admin route</div>,
}));

vi.mock('./ReviewApp.jsx', () => ({
  default: ({ token }) => <div>{`Review route: ${token}`}</div>,
}));

vi.mock('./DemoReviewApp.jsx', () => ({
  default: () => <div>Demo route</div>,
}));

import App from './App.jsx';

function renderAt(pathname) {
  window.history.pushState({}, '', pathname);
  return render(<App />);
}

describe('App routing', () => {
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('renders the public landing page on the root route', () => {
    renderAt('/');

    expect(
      screen.getByRole('heading', { name: 'Private video review, without the software feeling.' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open secure review' })).toHaveAttribute(
      'href',
      '/demo'
    );
    expect(screen.getByRole('link', { name: 'Admin sign in' })).toHaveAttribute(
      'href',
      '/admin'
    );
  });

  it('renders the admin app on /admin', () => {
    renderAt('/admin');

    expect(screen.getByText('Admin route')).toBeInTheDocument();
  });

  it('renders the demo review on /demo', () => {
    renderAt('/demo');

    expect(screen.getByText('Demo route')).toBeInTheDocument();
  });

  it('renders the token review route on /r/:token', () => {
    renderAt('/r/demo-token');

    expect(screen.getByText('Review route: demo-token')).toBeInTheDocument();
  });
});
