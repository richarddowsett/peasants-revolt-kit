import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StoreHoldingPage from './StoreHoldingPage';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('StoreHoldingPage', () => {
  it('renders the store closed notice and information', () => {
    render(<StoreHoldingPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /The Store Is Currently Closed/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/the store is currently closed but check back again soon for further updates/i)
    ).toBeInTheDocument();
  });

  it('renders the PRRA instagram link with correct target and URL', () => {
    render(<StoreHoldingPage />);

    const instagramLinks = screen.getAllByRole('link', { name: /instagram|@prrcbrentwood/i });
    expect(instagramLinks.length).toBeGreaterThan(0);

    const primaryInstagramBtn = instagramLinks.find(
      (link) => link.getAttribute('href') === 'https://www.instagram.com/prrcbrentwood/'
    );
    expect(primaryInstagramBtn).toBeDefined();
    expect(primaryInstagramBtn).toHaveAttribute('target', '_blank');
    expect(primaryInstagramBtn).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('provides navigation links to order tracking and organiser CMS', () => {
    render(<StoreHoldingPage />);

    const orderTrackingLinks = screen.getAllByRole('link', { name: /track/i });
    expect(
      orderTrackingLinks.some((l) => l.getAttribute('href') === '/store/orders')
    ).toBe(true);

    const adminLink = screen.getByRole('link', { name: /Organiser CMS/i });
    expect(adminLink).toHaveAttribute('href', '/admin');
  });

  it('renders prominent buttons and banner for club events', () => {
    render(<StoreHoldingPage />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Club Events & Tickets Are Open/i })
    ).toBeInTheDocument();

    const mainEventsBtn = screen.getByTestId('holding-page-events-button');
    expect(mainEventsBtn).toBeInTheDocument();
    expect(mainEventsBtn).toHaveAttribute('href', '/events');
    expect(mainEventsBtn).toHaveTextContent(/Browse Club Events/i);

    const headerEventsBtn = screen.getByTestId('holding-page-header-events-button');
    expect(headerEventsBtn).toBeInTheDocument();
    expect(headerEventsBtn).toHaveAttribute('href', '/events');
    expect(headerEventsBtn).toHaveTextContent(/Club Events/i);
  });
});
