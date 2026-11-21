import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('LearnSphere Frontend Foundation', () => {
  it('renders the LearnSphere brand header and primary callouts', () => {
    render(<App />);
    expect(screen.getByText('LearnSphere')).toBeInTheDocument();
    expect(
      screen.getByText(/Master New Skills with Structured Interactive Courses/i)
    ).toBeInTheDocument();
  });
});
