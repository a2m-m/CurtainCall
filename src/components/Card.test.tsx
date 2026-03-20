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
});
