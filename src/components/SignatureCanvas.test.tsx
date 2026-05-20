import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SignatureCanvas } from './SignatureCanvas';

describe('SignatureCanvas', () => {
  it('renders canvas element', () => {
    render(<SignatureCanvas onSign={vi.fn()} onClear={vi.fn()} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', () => {
    const onClear = vi.fn();
    render(<SignatureCanvas onSign={vi.fn()} onClear={onClear} />);
    const btn = screen.getByText('Limpiar firma');
    fireEvent.click(btn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('renders existing signature as img when existingDataUrl is provided', () => {
    const dataUrl = 'data:image/png;base64,TESTDATA';
    render(
      <SignatureCanvas onSign={vi.fn()} onClear={vi.fn()} readOnly existingDataUrl={dataUrl} />,
    );
    const img = screen.getByAltText('Firma');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', dataUrl);
  });

  it('does not render canvas when readOnly and existingDataUrl provided', () => {
    render(
      <SignatureCanvas onSign={vi.fn()} onClear={vi.fn()} readOnly existingDataUrl="data:image/png;base64,X" />,
    );
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();
  });
});
