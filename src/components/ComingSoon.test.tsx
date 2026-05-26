import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('T1-01: renderiza logo y nombre cuando se pasan ambos props', () => {
    render(<ComingSoon clinicName="Aurora Clínica" logoUrl="https://cdn/logo.png" />);

    expect(screen.getByTestId('coming-soon-logo')).toBeInTheDocument();
    expect(screen.getByTestId('coming-soon-logo')).toHaveAttribute('src', 'https://cdn/logo.png');
    expect(screen.getByTestId('coming-soon-clinic-name')).toHaveTextContent('Aurora Clínica');
    expect(screen.getByTestId('coming-soon-heading')).toBeInTheDocument();
    expect(screen.getByTestId('coming-soon-subtext')).toBeInTheDocument();
  });

  it('T1-02: renderiza solo heading/subtext cuando no se pasan props', () => {
    render(<ComingSoon />);

    expect(screen.queryByTestId('coming-soon-logo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coming-soon-clinic-name')).not.toBeInTheDocument();
    expect(screen.getByTestId('coming-soon-heading')).toBeInTheDocument();
    expect(screen.getByTestId('coming-soon-subtext')).toBeInTheDocument();
  });

  it('T1-03: no renderiza img cuando logoUrl es string vacío', () => {
    render(<ComingSoon clinicName="Aurora" logoUrl="" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByTestId('coming-soon-clinic-name')).toHaveTextContent('Aurora');
    expect(screen.getByTestId('coming-soon-heading')).toBeInTheDocument();
  });
});
