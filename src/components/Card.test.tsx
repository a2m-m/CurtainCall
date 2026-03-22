import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Card from './Card';
import type { Card as CardType } from '@/types/game';

const faceUpCard = (suit: CardType['suit'], rank: number): CardType => ({
  suit,
  rank,
  isJoker: false,
  isFaceUp: true,
});

const faceDownCard = (): CardType => ({
  suit: 'spades',
  rank: 1,
  isJoker: false,
  isFaceUp: false,
});

const jokerCard = (): CardType => ({
  suit: 'spades',
  rank: 0,
  isJoker: true,
  isFaceUp: true,
});

const faceDownJokerCard = (): CardType => ({
  suit: 'spades',
  rank: 0,
  isJoker: true,
  isFaceUp: false,
});

describe('Card', () => {
  it('表向きカードがスートとランクを表示する', () => {
    render(<Card card={faceUpCard('spades', 1)} />);
    expect(screen.getByText('♠')).toBeDefined();
    expect(screen.getByText('A')).toBeDefined();
  });

  it('数字カード（2-10）をそのまま表示する', () => {
    render(<Card card={faceUpCard('hearts', 7)} />);
    expect(screen.getByText('♥')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
  });

  it('絵札（J/Q/K）を正しく表示する', () => {
    const { rerender } = render(<Card card={faceUpCard('clubs', 11)} />);
    expect(screen.getByText('J')).toBeDefined();

    rerender(<Card card={faceUpCard('diamonds', 12)} />);
    expect(screen.getByText('Q')).toBeDefined();

    rerender(<Card card={faceUpCard('clubs', 13)} />);
    expect(screen.getByText('K')).toBeDefined();
  });

  it('裏向きカードはスート・ランクを表示しない', () => {
    render(<Card card={faceDownCard()} />);
    expect(screen.queryByText('♠')).toBeNull();
    expect(screen.queryByText('A')).toBeNull();
  });

  it('ジョーカーがJOKERラベルを表示する', () => {
    render(<Card card={jokerCard()} />);
    expect(screen.getByText('JOKER')).toBeDefined();
  });

  it('裏向きジョーカーはJOKERラベルを表示しない', () => {
    render(<Card card={faceDownJokerCard()} />);
    expect(screen.queryByText('JOKER')).toBeNull();
  });

  it('裏向きジョーカーはbackクラスを持つ', () => {
    const { container } = render(<Card card={faceDownJokerCard()} />);
    const el = container.querySelector('[class*="back"]');
    expect(el).toBeTruthy();
  });

  it('selected状態でselectedクラスが付く', () => {
    const { container } = render(<Card card={faceUpCard('spades', 5)} isSelected />);
    expect(container.firstChild?.toString()).toBeTruthy();
    const el = container.querySelector('[class*="selected"]');
    expect(el).toBeTruthy();
  });

  it('isSelectedShimo状態でselectedShimoクラスが付く', () => {
    const { container } = render(<Card card={faceUpCard('clubs', 3)} isSelectedShimo />);
    const el = container.querySelector('[class*="selectedShimo"]');
    expect(el).toBeTruthy();
  });

  it('onClick が呼ばれる', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('hearts', 10)} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('onClick がある場合 tabIndex=0 が設定される', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('spades', 5)} onClick={handleClick} />);
    expect(screen.getByRole('button').getAttribute('tabindex')).toBe('0');
  });

  it('onClick がない場合 tabIndex が設定されない', () => {
    render(<Card card={faceUpCard('spades', 5)} />);
    const el = document.querySelector('[tabindex]');
    expect(el).toBeNull();
  });

  it('Enter キーで onClick が呼ばれる', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('clubs', 7)} onClick={handleClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('Space キーで onClick が呼ばれる', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('diamonds', 3)} onClick={handleClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' });
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('その他のキーでは onClick が呼ばれない', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('hearts', 8)} onClick={handleClick} />);
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Tab' });
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('isSelected のとき aria-pressed=true になる', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('spades', 2)} onClick={handleClick} isSelected />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('isSelectedShimo のとき aria-pressed=true になる', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('clubs', 4)} onClick={handleClick} isSelectedShimo />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });

  it('未選択のとき aria-pressed=false になる', () => {
    const handleClick = vi.fn();
    render(<Card card={faceUpCard('hearts', 6)} onClick={handleClick} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('animateFlip=trueでflippingクラスが付く', () => {
    const { container } = render(<Card card={faceUpCard('spades', 7)} animateFlip />);
    const el = container.querySelector('[class*="flipping"]');
    expect(el).toBeTruthy();
  });

  it('animateFlip未指定ではflippingクラスが付かない', () => {
    const { container } = render(<Card card={faceUpCard('spades', 7)} />);
    const el = container.querySelector('[class*="flipping"]');
    expect(el).toBeNull();
  });

  it('animateFlip=trueでもカード内容は正常に表示される', () => {
    render(<Card card={faceUpCard('hearts', 5)} animateFlip />);
    expect(screen.getByText('♥')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
  });

  it('animateSlide=trueでslidingクラスが付く', () => {
    const { container } = render(<Card card={faceUpCard('clubs', 3)} animateSlide />);
    const el = container.querySelector('[class*="sliding"]');
    expect(el).toBeTruthy();
  });

  it('animateSlide未指定ではslidingクラスが付かない', () => {
    const { container } = render(<Card card={faceUpCard('clubs', 3)} />);
    const el = container.querySelector('[class*="sliding"]');
    expect(el).toBeNull();
  });

  it('animateDeal=trueでdealingクラスが付く', () => {
    const { container } = render(<Card card={faceDownCard()} animateDeal />);
    const el = container.querySelector('[class*="dealing"]');
    expect(el).toBeTruthy();
  });

  it('dealDelayを指定するとanimationDelayスタイルが付く', () => {
    const { container } = render(<Card card={faceDownCard()} animateDeal dealDelay={0.15} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.animationDelay).toBe('0.15s');
  });

  it('animateDeal未指定ではdealingクラスが付かない', () => {
    const { container } = render(<Card card={faceDownCard()} />);
    const el = container.querySelector('[class*="dealing"]');
    expect(el).toBeNull();
  });
});
