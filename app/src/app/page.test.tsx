import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from './page';

vi.mock('./store/page', () => ({
  default: () => <div data-testid="store-catalogue-page">Catalogue Page Mock</div>,
}));

describe('HomePage', () => {
  it('renders the storefront catalogue page', () => {
    render(<HomePage />);
    expect(screen.getByTestId('store-catalogue-page')).toBeInTheDocument();
  });
});
