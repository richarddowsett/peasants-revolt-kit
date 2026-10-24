import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StoreLoginScreen from './StoreLoginScreen';

const mockSignIn = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

describe('StoreLoginScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default sign-in form with email and password fields', () => {
    render(<StoreLoginScreen />);

    expect(screen.getByText('Club Member Portal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('runner@peasants.store')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('validates empty inputs on submit', async () => {
    render(<StoreLoginScreen />);

    const form = screen.getByRole('button', { name: /sign in to store/i }).closest('form')!;
    fireEvent.submit(form);

    expect(
      await screen.findByText('Please provide both email address and password.')
    ).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('calls signInWithEmailAndPassword and triggers onSuccess upon successful sign in', async () => {
    const onSuccess = vi.fn();
    mockSignIn.mockResolvedValueOnce({ user: { email: 'runner@peasants.store' } });

    render(<StoreLoginScreen onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('runner@peasants.store'), {
      target: { value: 'runner@peasants.store' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in to store/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        expect.anything(),
        'runner@peasants.store',
        'password123'
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('displays user friendly error message when sign in fails', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/invalid-credential' });

    render(<StoreLoginScreen />);

    fireEvent.change(screen.getByPlaceholderText('runner@peasants.store'), {
      target: { value: 'runner@peasants.store' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in to store/i }));

    expect(
      await screen.findByText(/Invalid email or password/i)
    ).toBeInTheDocument();
  });

  it('handles specific registration errors (email already in use, weak password, invalid email)', async () => {
    mockCreateUser.mockRejectedValueOnce({ code: 'auth/email-already-in-use' });

    render(<StoreLoginScreen />);

    fireEvent.click(screen.getByText(/register now/i));
    const form = screen.getByRole('button', { name: /register & access store/i }).closest('form')!;

    fireEvent.change(screen.getByPlaceholderText('Alex'), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText('Runner'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByPlaceholderText('runner@peasants.store'), { target: { value: 'existing@peasants.store' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });

    fireEvent.submit(form);
    expect(await screen.findByText(/An account with this email address already exists/i)).toBeInTheDocument();

    mockCreateUser.mockRejectedValueOnce({ code: 'auth/weak-password' });
    fireEvent.submit(form);
    expect(await screen.findByText(/Password should be at least 6 characters long/i)).toBeInTheDocument();

    mockCreateUser.mockRejectedValueOnce({ code: 'auth/invalid-email' });
    fireEvent.submit(form);
    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  it('switches to create account mode, validates names, and registers user', async () => {
    const onSuccess = vi.fn();
    mockCreateUser.mockResolvedValueOnce({ user: { uid: 'user_1' } });
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    render(<StoreLoginScreen onSuccess={onSuccess} />);

    // Click "Register now" toggle
    fireEvent.click(screen.getByText(/register now/i));
    const form = screen.getByRole('button', { name: /register & access store/i }).closest('form')!;

    // Submit without first/last name
    fireEvent.change(screen.getByPlaceholderText('runner@peasants.store'), {
      target: { value: 'newrunner@peasants.store' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'securePass123' },
    });
    fireEvent.submit(form);

    expect(
      await screen.findByText('Please provide your first and last name.')
    ).toBeInTheDocument();

    // Fill first and last name
    fireEvent.change(screen.getByPlaceholderText('Alex'), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByPlaceholderText('Runner'), {
      target: { value: 'Smith' },
    });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.anything(),
        'newrunner@peasants.store',
        'securePass123'
      );
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.anything(), {
        displayName: 'Alex Smith',
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<StoreLoginScreen onClose={onClose} />);

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
