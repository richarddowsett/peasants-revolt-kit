import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from './ThemeToggle';
import { ThemeProvider } from '@/context/ThemeContext';

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders Classic Orange and Trendy Green options with Orange selected by default', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const orangeBtn = screen.getByRole('button', { name: /orange/i });
    const greenBtn = screen.getByRole('button', { name: /green/i });

    expect(orangeBtn).toBeInTheDocument();
    expect(greenBtn).toBeInTheDocument();
    expect(orangeBtn).toHaveClass('bg-[rgb(202,88,46)]');
    expect(screen.getByText(/sneak peek/i)).toBeInTheDocument();
  });

  it('switches to Trendy Green when green button is clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const greenBtn = screen.getByRole('button', { name: /green/i });
    fireEvent.click(greenBtn);

    expect(greenBtn).toHaveClass('bg-[rgb(82,94,62)]');
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');
    expect(localStorage.getItem('prrc_theme')).toBe('green');
  });

  it('switches back to Classic Orange when orange button is clicked', () => {
    localStorage.setItem('prrc_theme', 'green');

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const orangeBtn = screen.getByRole('button', { name: /orange/i });
    fireEvent.click(orangeBtn);

    expect(orangeBtn).toHaveClass('bg-[rgb(202,88,46)]');
    expect(document.documentElement.getAttribute('data-theme')).toBe('orange');
    expect(localStorage.getItem('prrc_theme')).toBe('orange');
  });
});
