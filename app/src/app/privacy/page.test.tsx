import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PrivacyPolicyPage from './page';

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb(null);
    return () => {};
  }),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('PrivacyPolicyPage', () => {
  it('renders page header and UK compliance notice badge', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole('heading', { level: 1, name: /privacy & cookies policy/i })).toBeInTheDocument();
    expect(screen.getByText(/UK Compliance Notice/i)).toBeInTheDocument();
  });

  it('contains summary affirming zero tracking cookies and strictly necessary storage', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText(/At a Glance: Does this site use cookies\?/i)).toBeInTheDocument();
    expect(screen.getByText(/No tracking or advertising cookies/i)).toBeInTheDocument();
    expect(screen.getByText(/Strictly necessary storage only/i)).toBeInTheDocument();
  });

  it('details PECR compliance and lists Firebase Auth IndexedDB token', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText(/Cookies and Local Device Storage \(PECR Notice\)/i)).toBeInTheDocument();
    expect(screen.getByText(/firebase:authUser:\*/i)).toBeInTheDocument();
    expect(screen.getByText(/admin_authenticated/i)).toBeInTheDocument();
  });

  it('includes navigation link back to the store and external link to ICO', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole('link', { name: /back to store/i })).toHaveAttribute('href', '/store');
    expect(screen.getByRole('link', { name: /ico\.org\.uk/i })).toHaveAttribute('href', 'https://ico.org.uk');
  });
});
