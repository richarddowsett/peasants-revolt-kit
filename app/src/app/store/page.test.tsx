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
      sizeGuideRows: [
        { gender: 'men', size: 'M', chest: '38 – 40', waist: '32 – 34', length: '27' },
      ],
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

describe('StoreCatalogPage - Sizing Guide Unit Switching (Inches & CM)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('converts sizes input in inches to cm when cm is selected, and displays inches when in is selected', async () => {
    render(<StoreCatalogPage />);

    // Wait for product to load
    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    // Click Sizing Guide button
    const sizeGuideButton = screen.getByRole('button', { name: /Sizing Guide/i });
    fireEvent.click(sizeGuideButton);

    // Modal opens
    expect(screen.getByText(/Official Size Guide/i)).toBeInTheDocument();

    // Default unit is cm: inches (38 - 40, 32 - 34, 27) are converted to cm
    expect(screen.getByText('97 – 102')).toBeInTheDocument();
    expect(screen.getByText('81 – 86')).toBeInTheDocument();
    expect(screen.getByText('69')).toBeInTheDocument();

    // Toggle unit to Inches (in)
    const inchesToggle = screen.getByRole('button', { name: /Inches \(in\)/i });
    fireEvent.click(inchesToggle);

    // Converted cm values should now be replaced by raw input inches
    expect(screen.getByText('38 – 40')).toBeInTheDocument();
    expect(screen.getByText('32 – 34')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();

    // Toggle back to Centimeters (cm)
    const cmToggle = screen.getByRole('button', { name: /Centimeters \(cm\)/i });
    fireEvent.click(cmToggle);

    // Converted back to cm
    expect(screen.getByText('97 – 102')).toBeInTheDocument();
    expect(screen.getByText('81 – 86')).toBeInTheDocument();
    expect(screen.getByText('69')).toBeInTheDocument();
  });
});
