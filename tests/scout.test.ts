import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createScoutView } from '../src/views/scout.js';
import type {
  ScoutOpponentHandCardViewModel,
  ScoutRecentTakenCardViewModel,
} from '../src/views/scout.js';

const createOpponentCards = (count: number): ScoutOpponentHandCardViewModel[] =>
  Array.from({ length: count }, (_, index) => ({ id: `opponent-${index}` }));

describe('createScoutView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('相手のカードをクリックすると選択ハンドラが呼ばれる', () => {
    const onSelect = vi.fn();
    const view = createScoutView({
      title: 'スカウト',
      cards: createOpponentCards(3),
      onSelectCard: onSelect,
    });

    document.body.append(view);

    const firstButton = view.querySelector(
      '.scout-hand__card-button[data-index="0"]',
    ) as HTMLButtonElement | null;
    expect(firstButton).not.toBeNull();

    firstButton?.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('選択更新で「これを引く」ボタンが有効化され、押下で確定ハンドラが動作する', () => {
    const onConfirm = vi.fn();
    const view = createScoutView({
      title: 'スカウト',
      cards: createOpponentCards(2),
      onConfirmSelection: onConfirm,
    });

    document.body.append(view);

    const confirmButton = view.querySelector(
      '.scout-actions__button--primary',
    ) as HTMLButtonElement | null;
    expect(confirmButton).not.toBeNull();
    expect(confirmButton?.disabled).toBe(true);

    const cards = createOpponentCards(2);
    view.updateOpponentHand(cards, 1);

    expect(confirmButton?.disabled).toBe(false);

    confirmButton?.click();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('最近取られたカード一覧が更新され、カード情報を表示する', () => {
    const recentCard: ScoutRecentTakenCardViewModel = {
      id: 'recent-1',
      rank: 'A',
      suit: 'spades',
      annotation: 'テストカード',
    };

    const view = createScoutView({
      title: 'スカウト',
      cards: createOpponentCards(1),
      recentTakenCards: [],
      recentTakenEmptyLabel: 'なし',
    });

    document.body.append(view);

    const list = view.querySelector('.scout-recent__list');
    expect(list).not.toBeNull();
    expect(list?.textContent?.trim()).toBe('なし');

    view.updateRecentTaken([recentCard]);

    const items = list?.querySelectorAll('.scout-recent__item');
    expect(items?.length).toBe(1);

    const cardElement = items?.item(0)?.querySelector('.card');
    expect(cardElement?.textContent).toBe('A♠');
    expect(cardElement?.getAttribute('title')).toBe('テストカード');
  });
});
