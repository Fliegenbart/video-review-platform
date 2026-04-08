import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DemoReviewApp from './DemoReviewApp.jsx';

describe('DemoReviewApp', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a read-only demo review with timeline markers and no comment actions', () => {
    render(<DemoReviewApp />);

    expect(screen.getByText('Demo review')).toBeInTheDocument();
    expect(screen.getByText('Summer launch film')).toBeInTheDocument();
    expect(screen.getByText('Comments (4)')).toBeInTheDocument();
    expect(screen.getByLabelText('Comment at 00:00:12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add comment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete comment' })).not.toBeInTheDocument();
  });

  it('jumps the selected moment when a comment is clicked', () => {
    render(<DemoReviewApp />);

    expect(screen.getByText('00:00:00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Helena Stone/i }));

    expect(screen.getByText('00:00:12')).toBeInTheDocument();
  });
});
