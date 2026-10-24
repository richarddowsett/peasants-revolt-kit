import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoreHeader from './StoreHeader';

const mockSignOut = vi.fn();
let authCallback: ((user: unknown) => void) | null = null;

vi.mock('firebase/auth', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
    authCallback = cb;
    return () => {};
  },
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

// Mock Next.js router & links
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('StoreHeader Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders store branding title and basket count', () => {
    render(<StoreHeader cartItemCount={3} onOpenCart={vi.fn()} />);

    expect(screen.getByText('Peasants Running Kit')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onOpenCart when basket button is clicked', () => {
    const onOpenCartMock = vi.fn();
    render(<StoreHeader cartItemCount={2} onOpenCart={onOpenCartMock} />);

    const basketButton = screen.getByRole('button', { name: /basket/i });
    fireEvent.click(basketButton);

    expect(onOpenCartMock).toHaveBeenCalledTimes(1);
  });

  it('renders Sign In button and calls onOpenLogin when clicked for unauthenticated user', () => {
    const onOpenLoginMock = vi.fn();
    render(<StoreHeader cartItemCount={0} onOpenCart={vi.fn()} onOpenLogin={onOpenLoginMock} />);

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();

    fireEvent.click(signInButton);
    expect(onOpenLoginMock).toHaveBeenCalledTimes(1);
  });

  it('renders member profile and calls signOut when Sign Out button is clicked', async () => {
    render(<StoreHeader cartItemCount={0} onOpenCart={vi.fn()} />);

    if (authCallback) {
      authCallback({ displayName: 'Alex Runner', email: 'alex@example.com' });
    }

    const signOutBtn = await screen.findByRole('button', { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();
    expect(screen.getByText('Alex Runner')).toBeInTheDocument();

    fireEvent.click(signOutBtn);
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });
});
