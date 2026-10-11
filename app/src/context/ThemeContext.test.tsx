import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function TestConsumer() {
  const { theme, tokens, setTheme, toggleTheme, isOrange, isGreen } = useTheme();
  return (
    <div>
      <div data-testid="theme-name">{theme}</div>
      <div data-testid="is-orange">{isOrange ? 'yes' : 'no'}</div>
      <div data-testid="is-green">{isGreen ? 'yes' : 'no'}</div>
      <div data-testid="token-primary">{tokens.primary}</div>
      <div data-testid="token-label">{tokens.label}</div>
      <button onClick={() => setTheme('green')}>Set Green</button>
      <button onClick={() => setTheme('orange')}>Set Orange</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to Classic Orange when no saved theme is present', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-name')).toHaveTextContent('orange');
    expect(screen.getByTestId('is-orange')).toHaveTextContent('yes');
    expect(screen.getByTestId('is-green')).toHaveTextContent('no');
    expect(screen.getByTestId('token-label')).toHaveTextContent('Classic Orange');
    expect(screen.getByTestId('token-primary')).toHaveTextContent('rgb(202, 88, 46)');
    expect(document.documentElement.getAttribute('data-theme')).toBe('orange');
  });

  it('restores green theme from localStorage if saved', () => {
    localStorage.setItem('prrc_theme', 'green');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-name')).toHaveTextContent('green');
    expect(screen.getByTestId('is-green')).toHaveTextContent('yes');
    expect(screen.getByTestId('token-label')).toHaveTextContent('Trendy Green');
    expect(screen.getByTestId('token-primary')).toHaveTextContent('rgb(155, 165, 130)');
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');
  });

  it('updates state, tokens, localStorage, and html attribute when switching theme', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-name')).toHaveTextContent('orange');

    act(() => {
      screen.getByText('Set Green').click();
    });

    expect(screen.getByTestId('theme-name')).toHaveTextContent('green');
    expect(screen.getByTestId('token-label')).toHaveTextContent('Trendy Green');
    expect(localStorage.getItem('prrc_theme')).toBe('green');
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');

    act(() => {
      screen.getByText('Set Orange').click();
    });

    expect(screen.getByTestId('theme-name')).toHaveTextContent('orange');
    expect(screen.getByTestId('token-label')).toHaveTextContent('Classic Orange');
    expect(localStorage.getItem('prrc_theme')).toBe('orange');
    expect(document.documentElement.getAttribute('data-theme')).toBe('orange');
  });

  it('toggleTheme switches between orange and green', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-name')).toHaveTextContent('orange');

    act(() => {
      screen.getByText('Toggle').click();
    });

    expect(screen.getByTestId('theme-name')).toHaveTextContent('green');

    act(() => {
      screen.getByText('Toggle').click();
    });

    expect(screen.getByTestId('theme-name')).toHaveTextContent('orange');
  });
});
