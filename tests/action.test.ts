import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createActionView } from '../src/views/action.js';
import type { ActionHandCardViewModel } from '../src/views/action.js';

const createCard = (partial?: Partial<ActionHandCardViewModel>): ActionHandCardViewModel => ({
  id: partial?.id ?? 'card-1',
  rank: partial?.rank ?? 'A',
  suit: partial?.suit ?? 'spades',
  annotation: partial?.annotation,
  disabled: partial?.disabled,
  recentlyDrawn: partial?.recentlyDrawn,
});

const queryHandItems = (root: Element): HTMLLIElement[] =>
  Array.from(root.querySelectorAll<HTMLLIElement>('.action-hand__item'));

describe('createActionView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('手札のカードをクリックすると選択ハンドラが呼ばれる', () => {
    const onSelect = vi.fn();
    const view = createActionView({
      title: 'アクション',
      handCards: [createCard({ id: 'card-actor' })],
      onSelectHandCard: onSelect,
    });

    document.body.append(view);

    const button = view.querySelector<HTMLButtonElement>('.action-hand__card');
    expect(button).not.toBeNull();

    button?.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenLastCalledWith('card-actor');
  });

  it('setSelectionとupdateHandで役者・黒子の表示や直前フラグを更新できる', () => {
    const cards = [
      createCard({ id: 'card-1', rank: 'A', suit: 'spades' }),
      createCard({ id: 'card-2', rank: '9', suit: 'hearts' }),
    ];

    const view = createActionView({
      title: 'アクション',
      handCards: cards,
    });

    document.body.append(view);

    view.setSelection({ actorCardId: 'card-1' });

    let items = queryHandItems(view);
    expect(items[0].classList.contains('is-actor')).toBe(true);
    expect(items[0].querySelector('.action-hand__badge--actor')).not.toBeNull();

    view.updateHand(
      [
        { ...cards[0], recentlyDrawn: true },
        cards[1],
      ],
      { actorCardId: 'card-2', kurokoCardId: 'card-1' },
    );

    items = queryHandItems(view);
    expect(items[0].classList.contains('is-kuroko')).toBe(true);
    expect(items[0].querySelector('.action-hand__badge--kuroko')).not.toBeNull();
    expect(items[0].classList.contains('is-recent')).toBe(true);
    expect(items[0].querySelector('.action-hand__recent-label')?.textContent).toBe(
      '直前に引いたカード',
    );

    expect(items[1].classList.contains('is-actor')).toBe(true);
    expect(items[1].querySelector('.action-hand__badge--actor')).not.toBeNull();
  });

  it('setConfirmDisabledで「配置を確定」ボタンの活性状態を制御できる', () => {
    const view = createActionView({
      title: 'アクション',
      handCards: [createCard({ id: 'card-actor' })],
      confirmDisabled: true,
    });

    document.body.append(view);

    const buttons = Array.from(view.querySelectorAll<HTMLButtonElement>('.button'));
    const confirmButton = buttons.find((button) => button.textContent === '配置を確定');
    expect(confirmButton).not.toBeUndefined();
    expect(confirmButton?.disabled).toBe(true);

    view.setConfirmDisabled(false);
    expect(confirmButton?.disabled).toBe(false);

    view.setConfirmDisabled(true);
    expect(confirmButton?.disabled).toBe(true);
  });
});
