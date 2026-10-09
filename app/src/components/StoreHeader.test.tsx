import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StoreHeader from './StoreHeader';

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
});
