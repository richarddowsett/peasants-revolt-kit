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

let mockCurrentUser: any = null;

vi.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb(mockCurrentUser);
    return () => {};
  }),
  signInWithEmailAndPassword: vi.fn().mockImplementation((auth, email, password) => {
    mockCurrentUser = { uid: 'logged-in-user', email, displayName: 'Logged In User' };
    return Promise.resolve({ user: mockCurrentUser });
  }),
  signOut: vi.fn().mockImplementation(() => {
    mockCurrentUser = null;
    return Promise.resolve();
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

describe('StoreCatalogPage - Guest Browsing & Guest Checkout', () => {
  beforeEach(() => {
    mockCurrentUser = null;
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders products directly for guest users without showing a login gate', async () => {
    render(<StoreCatalogPage />);

    // Should immediately display the official store banner and product without login blocking
    await waitFor(() => {
      expect(screen.getByText('Peasants Revolt Running Club Store')).toBeInTheDocument();
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    // Sign in button is visible in header for guests
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('allows guest to add product to basket, open checkout, and complete order as guest', async () => {
    const { createOrder } = await import('@/lib/api');
    vi.mocked(createOrder).mockResolvedValue({
      id: 'PRRC-5555',
      totalAmount: 25,
      paymentLinkUrl: 'https://monzo.me/pay/PRRC-5555?amount=25',
      userEmail: 'guest@example.com',
      userName: 'Guest Runner',
    } as any);

    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    // Add to Basket
    const addButton = screen.getByRole('button', { name: /add to basket/i });
    fireEvent.click(addButton);

    // Basket Drawer should open and display item
    await waitFor(() => {
      expect(screen.getByText('Your Basket')).toBeInTheDocument();
      expect(screen.getByText('Subtotal')).toBeInTheDocument();
    });

    // Click Proceed to Checkout
    const checkoutButton = screen.getByRole('button', { name: /proceed to checkout/i });
    fireEvent.click(checkoutButton);

    // Modal should show "Checkout as Guest"
    await waitFor(() => {
      expect(screen.getByText('Checkout as Guest')).toBeInTheDocument();
    });

    // Fill Name and Email
    const nameInput = screen.getByPlaceholderText('e.g. Alex Smith');
    const emailInput = screen.getByPlaceholderText('alex@example.com');
    fireEvent.change(nameInput, { target: { value: 'Guest Runner' } });
    fireEvent.change(emailInput, { target: { value: 'guest@example.com' } });

    // Submit order form
    fireEvent.submit(nameInput.closest('form')!);

    // Verify createOrder called without userId
    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          userName: 'Guest Runner',
          userEmail: 'guest@example.com',
          userId: undefined,
          items: expect.arrayContaining([
            expect.objectContaining({
              productId: 'prod-1',
              price: 25,
              quantity: 1,
            }),
          ]),
        })
      );
    });

    // Order Placed modal should render
    await waitFor(() => {
      expect(screen.getByText('Order Placed!')).toBeInTheDocument();
    });
    expect(screen.getAllByText('PRRC-5555').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /pay £25.00 via monzo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to store/i })).toBeInTheDocument();
    expect(screen.queryByText(/view my order status/i)).not.toBeInTheDocument();
  });

  it('shows an error and does not create order if guest name is missing or whitespace', async () => {
    const { createOrder } = await import('@/lib/api');
    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));
    await waitFor(() => {
      expect(screen.getByText('Your Basket')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    await waitFor(() => {
      expect(screen.getByText('Checkout as Guest')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('e.g. Alex Smith');
    const emailInput = screen.getByPlaceholderText('alex@example.com');

    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.change(emailInput, { target: { value: 'guest@example.com' } });
    fireEvent.submit(nameInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Please enter your full name.')).toBeInTheDocument();
    });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('shows an error and does not create order if guest email is missing or whitespace', async () => {
    const { createOrder } = await import('@/lib/api');
    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));
    await waitFor(() => {
      expect(screen.getByText('Your Basket')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    await waitFor(() => {
      expect(screen.getByText('Checkout as Guest')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('e.g. Alex Smith');
    const emailInput = screen.getByPlaceholderText('alex@example.com');

    fireEvent.change(nameInput, { target: { value: 'Guest Runner' } });
    fireEvent.change(emailInput, { target: { value: '   ' } });
    fireEvent.submit(nameInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address.')).toBeInTheDocument();
    });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('shows an error and does not create order if guest email is an invalid format', async () => {
    const { createOrder } = await import('@/lib/api');
    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));
    await waitFor(() => {
      expect(screen.getByText('Your Basket')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    await waitFor(() => {
      expect(screen.getByText('Checkout as Guest')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('e.g. Alex Smith');
    const emailInput = screen.getByPlaceholderText('alex@example.com');

    fireEvent.change(nameInput, { target: { value: 'Guest Runner' } });
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.submit(nameInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('allows user to toggle between guest checkout and member sign-in within checkout modal', async () => {
    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));
    await waitFor(() => {
      expect(screen.getByText('Your Basket')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));

    // In guest view, click "Sign in" toggle inside the checkout modal
    await waitFor(() => {
      expect(screen.getByText('Checkout as Guest')).toBeInTheDocument();
    });
    const signInToggle = screen.getByRole('button', { name: /sign in to member account/i });
    fireEvent.click(signInToggle);

    // Now in member sign in view
    expect(screen.getByText('Sign In to Account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('runner@peasants.store')).toBeInTheDocument();

    // Click back to guest view
    const backToGuest = screen.getByRole('button', { name: /continue as guest instead/i });
    fireEvent.click(backToGuest);

    expect(screen.getByText('Checkout as Guest')).toBeInTheDocument();
  });

  it('persists basket items to localStorage and clears them upon successful order', async () => {
    const { createOrder } = await import('@/lib/api');
    vi.mocked(createOrder).mockResolvedValueOnce({
      id: 'PRRC-7777',
      totalAmount: 25,
      paymentLinkUrl: 'https://monzo.me/pay/PRRC-7777?amount=25',
      userEmail: 'guest@example.com',
      userName: 'Guest Runner',
    } as any);

    render(<StoreCatalogPage />);

    await waitFor(() => {
      expect(screen.getByText('Peasants Race Vest')).toBeInTheDocument();
    });

    // Add item
    fireEvent.click(screen.getByRole('button', { name: /add to basket/i }));

    // Check localStorage
    await waitFor(() => {
      const stored = localStorage.getItem('prrc_cart');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toHaveLength(1);
    });

    // Complete order
    fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
    const nameInput = screen.getByPlaceholderText('e.g. Alex Smith');
    const emailInput = screen.getByPlaceholderText('alex@example.com');
    fireEvent.change(nameInput, { target: { value: 'Guest' } });
    fireEvent.change(emailInput, { target: { value: 'guest@test.com' } });
    fireEvent.submit(nameInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Order Placed!')).toBeInTheDocument();
    });

    // localStorage should be cleared
    await waitFor(() => {
      expect(localStorage.getItem('prrc_cart')).toBeNull();
    });
  });
});
