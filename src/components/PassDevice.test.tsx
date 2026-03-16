import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PassDevice from './PassDevice';

describe('PassDevice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('プレイヤー名が表示される', () => {
    render(<PassDevice playerName="アリス" onComplete={() => {}} />);
    expect(screen.getByText('アリス')).toBeDefined();
  });

  it('長押し2秒でonCompleteが呼ばれる', () => {
    const onComplete = vi.fn();
    render(<PassDevice playerName="アリス" onComplete={onComplete} />);
    const btn = screen.getByRole('button', { name: '長押しで進む' });
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('長押し中にプログレスバーが進む', () => {
    render(<PassDevice playerName="アリス" onComplete={() => {}} />);
    const btn = screen.getByRole('button', { name: '長押しで進む' });
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const bar = screen.getByRole('progressbar');
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeGreaterThan(0);
    expect(Number(bar.getAttribute('aria-valuenow'))).toBeLessThan(100);
  });

  it('途中で離すとリセットされる', () => {
    const onComplete = vi.fn();
    render(<PassDevice playerName="アリス" onComplete={onComplete} />);
    const btn = screen.getByRole('button', { name: '長押しで進む' });
    fireEvent.pointerDown(btn);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.pointerUp(btn);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onComplete).not.toHaveBeenCalled();
    const bar = screen.getByRole('progressbar');
    expect(Number(bar.getAttribute('aria-valuenow'))).toBe(0);
  });

  it('レンダリングテストが通る', () => {
    const { container } = render(<PassDevice playerName="ボブ" onComplete={() => {}} />);
    expect(container.firstElementChild).toBeDefined();
  });
});
