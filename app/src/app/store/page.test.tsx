import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoreCatalogPage from './page';

// Mock dependencies
vi.mock('@/lib/api', () => ({
  fetchProducts: vi.fn().mockResolvedValue([
    {
      id: 'prod-1',
      name: 'Peasants Race Vest',
      description: 'Official kit',
      price: 25,
      imageUrl: '/vest1.png',
      imageUrls: ['/vest1.png', '/vest2.png'],
      sizes: ["Men's S", "Men's M"],
      isPublished: true,
    },
  ]),
  createOrder: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'test-user', email: 'runner@peasants.store', displayName: 'Runner' } },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb({ uid: 'test-user', email: 'runner@peasants.store', displayName: 'Runner' });
    return () => {};
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('StoreCatalogPage - Image Zoom Lightbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens image zoom lightbox when product image is clicked, and closes on Escape key', async () => {
    render(<StoreCatalogPage />);

    // Wait for product to load
    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    // Click to open zoom
    const zoomButton = screen.getByTitle('Click to zoom & inspect photo');
    fireEvent.click(zoomButton);

    // Zoom modal should be open
    expect(screen.getByText(/Photo 1 of 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Press Esc to exit/i)).toBeInTheDocument();

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });

    // Zoom modal should be closed
    await waitFor(() => {
      expect(screen.queryByText(/Photo 1 of 2/i)).not.toBeInTheDocument();
    });
  });

  it('closes image zoom lightbox when Esc button is clicked', async () => {
    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    const zoomButton = screen.getByTitle('Click to zoom & inspect photo');
    fireEvent.click(zoomButton);

    expect(screen.getByText(/Photo 1 of 2/i)).toBeInTheDocument();

    // Click the exit Esc button
    const exitButton = screen.getByTitle('Exit image (Esc)');
    fireEvent.click(exitButton);

    await waitFor(() => {
      expect(screen.queryByText(/Photo 1 of 2/i)).not.toBeInTheDocument();
    });
  });

  it('cycles images when ArrowRight and ArrowLeft keys are pressed', async () => {
    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    const zoomButton = screen.getByTitle('Click to zoom & inspect photo');
    fireEvent.click(zoomButton);

    expect(screen.getByText(/Photo 1 of 2/i)).toBeInTheDocument();

    // Press ArrowRight to go to Photo 2
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByText(/Photo 2 of 2/i)).toBeInTheDocument();

    // Press ArrowLeft to go back to Photo 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByText(/Photo 1 of 2/i)).toBeInTheDocument();

    // Press Escape to exit
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText(/Photo 1 of 2/i)).not.toBeInTheDocument();
  });
});
