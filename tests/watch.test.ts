import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWatchView,
  type WatchStageViewModel,
  type WatchStatusViewModel,
} from '../src/views/watch.js';

type PartialStatus = Partial<WatchStatusViewModel>;

type PartialStage = Partial<WatchStageViewModel>;

const createStatus = (overrides?: PartialStatus): WatchStatusViewModel => ({
  turnLabel: 'ターン：#12',
  booLabel: 'あなたのブーイング：1 / 3',
  remainingLabel: '残りウォッチ機会：2',
  warning: false,
  warningLabel: 'ブーイング不足注意',
  warningMessage: undefined,
  clapDisabled: false,
  clapDisabledReason: undefined,
  ...overrides,
});

const createStage = (overrides?: PartialStage): WatchStageViewModel => ({
  actorLabel: '役者',
  actorCard: null,
  actorEmptyMessage: '役者未配置',
  kurokoLabel: '黒子',
  kurokoCard: null,
  kurokoEmptyMessage: '黒子未配置',
  ...overrides,
});

describe('createWatchView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('クラップとブーイングのボタンでそれぞれのハンドラが呼ばれる', () => {
    const onClap = vi.fn();
    const onBoo = vi.fn();

    const view = createWatchView({
      title: 'ウォッチ',
      status: createStatus(),
      stage: createStage(),
      onClap,
      onBoo,
    });

    document.body.append(view);

    const clapButton = view.querySelector<HTMLButtonElement>(
      '.watch-actions__button--clap',
    );
    const booButton = view.querySelector<HTMLButtonElement>(
      '.watch-actions__button--boo',
    );

    expect(clapButton).not.toBeNull();
    expect(booButton).not.toBeNull();

    clapButton?.click();
    booButton?.click();

    expect(onClap).toHaveBeenCalledTimes(1);
    expect(onBoo).toHaveBeenCalledTimes(1);
  });

  it('updateStatusでブーイング不足警告の表示とボタンの注意文を切り替えられる', () => {
    const view = createWatchView({
      title: 'ウォッチ',
      status: createStatus(),
      stage: createStage(),
    });

    document.body.append(view);

    const warningBadge = view.querySelector<HTMLSpanElement>('.watch-status__badge');
    const warningMessage = view.querySelector<HTMLParagraphElement>(
      '.watch-status__warning',
    );
    const clapButton = view.querySelector<HTMLButtonElement>('.watch-actions__button--clap');

    expect(warningBadge?.hidden).toBe(true);
    expect(warningMessage?.hidden).toBe(true);
    expect(clapButton?.hasAttribute('title')).toBe(false);

    view.updateStatus(
      createStatus({
        warning: true,
        warningLabel: '不足注意',
        warningMessage: '残り機会的にブーイングが必要です',
      }),
    );

    expect(warningBadge?.hidden).toBe(false);
    expect(warningBadge?.textContent).toBe('不足注意');
    expect(warningMessage?.hidden).toBe(false);
    expect(warningMessage?.textContent).toBe('残り機会的にブーイングが必要です');
    expect(clapButton?.getAttribute('title')).toBe('残り機会的にブーイングが必要です');

    view.updateStatus(createStatus());

    expect(warningBadge?.hidden).toBe(true);
    expect(warningMessage?.hidden).toBe(true);
    expect(clapButton?.hasAttribute('title')).toBe(false);
  });

  it('updateStageでカード表示と空表示を切り替えられる', () => {
    const view = createWatchView({
      title: 'ウォッチ',
      status: createStatus(),
      stage: createStage(),
    });

    document.body.append(view);

    const slots = view.querySelectorAll<HTMLDivElement>('.watch-stage__slot');
    const actorSlot = slots.item(0);
    const kurokoSlot = slots.item(1);

    expect(actorSlot.classList.contains('is-empty')).toBe(true);
    expect(kurokoSlot.classList.contains('is-empty')).toBe(true);

    view.updateStage(
      createStage({
        actorCard: {
          rank: 'A',
          suit: 'spades',
          annotation: '主演カード',
          description: '役者の説明',
        },
        kurokoCard: {
          rank: '9',
          suit: 'hearts',
          faceDown: true,
          description: '黒子の説明',
        },
      }),
    );

    const actorCard = actorSlot.querySelector<HTMLDivElement>('.card');
    const actorPlaceholder = actorSlot.querySelector<HTMLDivElement>(
      '.watch-stage__placeholder',
    );
    const actorDescription = actorSlot.querySelector<HTMLParagraphElement>(
      '.watch-stage__description',
    );

    expect(actorSlot.classList.contains('is-empty')).toBe(false);
    expect(actorCard?.hidden).toBe(false);
    expect(actorCard?.textContent).toBe('A♠');
    expect(actorCard?.getAttribute('title')).toBe('主演カード');
    expect(actorPlaceholder?.hidden).toBe(true);
    expect(actorDescription?.hidden).toBe(false);
    expect(actorDescription?.textContent).toBe('役者の説明');

    const kurokoCard = kurokoSlot.querySelector<HTMLDivElement>('.card');
    const kurokoPlaceholder = kurokoSlot.querySelector<HTMLDivElement>(
      '.watch-stage__placeholder',
    );
    const kurokoDescription = kurokoSlot.querySelector<HTMLParagraphElement>(
      '.watch-stage__description',
    );

    expect(kurokoSlot.classList.contains('is-empty')).toBe(false);
    expect(kurokoCard?.classList.contains('card--face-down')).toBe(true);
    expect(kurokoPlaceholder?.hidden).toBe(true);
    expect(kurokoDescription?.hidden).toBe(false);
    expect(kurokoDescription?.textContent).toBe('黒子の説明');

    view.updateStage(createStage());

    expect(actorSlot.classList.contains('is-empty')).toBe(true);
    expect(actorCard?.hidden).toBe(true);
    expect(actorCard?.getAttribute('aria-hidden')).toBe('true');
    expect(actorPlaceholder?.hidden).toBe(false);
    expect(actorPlaceholder?.textContent).toBe('役者未配置');

    expect(kurokoSlot.classList.contains('is-empty')).toBe(true);
    expect(kurokoCard?.hidden).toBe(true);
    expect(kurokoCard?.getAttribute('aria-hidden')).toBe('true');
    expect(kurokoPlaceholder?.hidden).toBe(false);
    expect(kurokoPlaceholder?.textContent).toBe('黒子未配置');
  });
});
