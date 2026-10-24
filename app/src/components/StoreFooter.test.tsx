import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StoreFooter from './StoreFooter';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('StoreFooter Component', () => {
  it('renders club branding and compliance statement', () => {
    render(<StoreFooter />);

    expect(screen.getByText('Peasants Revolt Running Club')).toBeInTheDocument();
    expect(screen.getByText(/Zero Tracking Cookies • UK GDPR & PECR Compliant/i)).toBeInTheDocument();
  });

  it('contains link to Privacy & Cookies Policy', () => {
    render(<StoreFooter />);

    const privacyLink = screen.getByRole('link', { name: /privacy & cookies policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('contains links to catalogue, orders, and admin', () => {
    render(<StoreFooter />);

    expect(screen.getByRole('link', { name: /store catalogue/i })).toHaveAttribute('href', '/store');
    expect(screen.getByRole('link', { name: /my orders/i })).toHaveAttribute('href', '/store/orders');
    expect(screen.getByRole('link', { name: /club admin/i })).toHaveAttribute('href', '/admin');
  });
});
