import { fireEvent, render, screen } from '@testing-library/react';
import { FallbackImage } from './small';

describe('FallbackImage', () => {
  it('shows the branded placeholder (no <img>) when the URL is empty', () => {
    const { container } = render(<FallbackImage src="" alt="Jollof rice" />);
    expect(container.querySelector('img')).toBeNull();
    const placeholder = screen.getByRole('img', { name: 'Jollof rice' });
    expect(placeholder).toHaveAttribute('data-placeholder');
    expect(placeholder.querySelector('svg')).not.toBeNull();
  });

  it('treats null and whitespace URLs as missing', () => {
    const { container, rerender } = render(<FallbackImage src={null} alt="" />);
    expect(container.querySelector('img')).toBeNull();
    rerender(<FallbackImage src="   " alt="" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-placeholder]')).not.toBeNull();
  });

  it('swaps a broken photo for the placeholder', () => {
    const { container } = render(<FallbackImage src="/uploads/missing.webp" alt="Suya" />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/uploads/missing.webp');
    fireEvent.error(img);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('img', { name: 'Suya' })).toHaveAttribute('data-placeholder');
  });
});
