import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PlayerStage, MainStage, BackstageArea } from './Stage';
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

describe('PlayerStage', () => {
  it('プレイヤー名を表示する', () => {
    render(<PlayerStage playerName="アリス" kamiCard={null} shimoCard={null} />);
    expect(screen.getByText('アリス')).toBeDefined();
  });

  it('カミとシモのラベルを表示する', () => {
    render(<PlayerStage playerName="アリス" kamiCard={null} shimoCard={null} />);
    expect(screen.getByText('カミ')).toBeDefined();
    expect(screen.getByText('シモ')).toBeDefined();
  });

  it('kamiCard=nullのとき空プレースホルダーを表示する', () => {
    render(<PlayerStage playerName="アリス" kamiCard={null} shimoCard={null} />);
    const placeholders = screen.getAllByLabelText(/空の.*スロット/);
    expect(placeholders.length).toBe(2);
  });

  it('kamiCardがあるときCardを表示する', () => {
    render(<PlayerStage playerName="アリス" kamiCard={faceUpCard('spades', 1)} shimoCard={null} />);
    expect(screen.getByText('♠')).toBeDefined();
    expect(screen.getByText('A')).toBeDefined();
  });

  it('isActive=trueでactiveクラスが付く', () => {
    const { container } = render(
      <PlayerStage playerName="アリス" kamiCard={null} shimoCard={null} isActive />
    );
    const el = container.querySelector('[class*="active"]');
    expect(el).toBeTruthy();
  });

  it('isActive未指定でactiveクラスが付かない', () => {
    const { container } = render(
      <PlayerStage playerName="ボブ" kamiCard={null} shimoCard={null} />
    );
    const el = container.querySelector('[class*="active"]');
    expect(el).toBeNull();
  });

  it('animateSlide=trueでカードにslidingクラスが付く', () => {
    const { container } = render(
      <PlayerStage playerName="アリス" kamiCard={faceUpCard('spades', 1)} shimoCard={null} animateSlide />
    );
    const el = container.querySelector('[class*="sliding"]');
    expect(el).toBeTruthy();
  });
});

describe('MainStage', () => {
  it('13枚のカードを表示する', () => {
    const cards = Array.from({ length: 13 }, (_, i) => faceDownCard());
    const { container } = render(<MainStage cards={cards} />);
    // 13枚のCardコンポーネント（裏向きは空div）
    const cardEls = container.querySelectorAll('[class*="card"]');
    expect(cardEls.length).toBe(13);
  });

  it('カードが0枚のとき13個のプレースホルダーを表示する', () => {
    const { container } = render(<MainStage cards={[]} />);
    const placeholders = container.querySelectorAll('[class*="cardPlaceholder"]');
    expect(placeholders.length).toBe(13);
  });

  it('カードが5枚のとき残り8個のプレースホルダーを表示する', () => {
    const cards = Array.from({ length: 5 }, () => faceDownCard());
    const { container } = render(<MainStage cards={cards} />);
    const placeholders = container.querySelectorAll('[class*="cardPlaceholder"]');
    expect(placeholders.length).toBe(8);
  });

  it('aria-label "メインステージ" を持つ', () => {
    render(<MainStage cards={[]} />);
    expect(screen.getByLabelText('メインステージ')).toBeDefined();
  });

  it('animateDeal=trueでカードにdealingクラスが付く', () => {
    const cards = [faceDownCard(), faceDownCard()];
    const { container } = render(<MainStage cards={cards} animateDeal />);
    const els = container.querySelectorAll('[class*="dealing"]');
    expect(els.length).toBe(2);
  });

  it('animateDealでstaggerディレイが設定される', () => {
    const cards = [faceDownCard(), faceDownCard(), faceDownCard()];
    const { container } = render(<MainStage cards={cards} animateDeal />);
    const cardEls = container.querySelectorAll('[class*="card"]') as NodeListOf<HTMLElement>;
    expect(cardEls[0].style.animationDelay).toBe('0s');
    expect(cardEls[1].style.animationDelay).toBe('0.05s');
    expect(cardEls[2].style.animationDelay).toBe('0.1s');
  });
});

describe('BackstageArea', () => {
  it('10枚のカードを表示する', () => {
    const cards = Array.from({ length: 10 }, () => faceDownCard());
    const { container } = render(<BackstageArea cards={cards} />);
    const cardEls = container.querySelectorAll('[class*="card"]');
    expect(cardEls.length).toBe(10);
  });

  it('カードが0枚のとき10個のプレースホルダーを表示する', () => {
    const { container } = render(<BackstageArea cards={[]} />);
    const placeholders = container.querySelectorAll('[class*="cardPlaceholder"]');
    expect(placeholders.length).toBe(10);
  });

  it('aria-label "バックステージ" を持つ', () => {
    render(<BackstageArea cards={[]} />);
    expect(screen.getByLabelText('バックステージ')).toBeDefined();
  });
});
