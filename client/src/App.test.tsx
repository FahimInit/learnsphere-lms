import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

describe('LearnSphere Frontend Foundation', () => {
  it('renders the LearnSphere brand header and primary callouts', () => {
    const { getByText } = render(<App />);
    expect(getByText('LearnSphere')).toBeInTheDocument();
    expect(
      getByText(/Master New Skills with Structured Interactive Courses/i)
    ).toBeInTheDocument();
  });
});
