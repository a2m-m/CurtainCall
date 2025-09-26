import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSpotlightView,
  type SpotlightStageCardViewModel,
  type SpotlightStageViewModel,
} from '../src/views/spotlight.js';

type PartialStage = Partial<SpotlightStageViewModel>;

type PartialCard = Partial<SpotlightStageCardViewModel>;

const createStage = (overrides?: PartialStage): SpotlightStageViewModel => ({
  actorLabel: '役者',
  actorCard: null,
  actorEmptyMessage: '役者は未公開です',
  kurokoLabel: '黒子',
  kurokoCard: null,
  kurokoEmptyMessage: '黒子は未公開です',
  ...overrides,
});

const createCard = (overrides?: PartialCard): SpotlightStageCardViewModel => ({
  rank: 'A',
  suit: 'spades',
  faceDown: false,
  ...overrides,
});

describe('createSpotlightView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('黒子公開ボタンがクリックでハンドラを呼び出し、活性状態を切り替えられる', () => {
    const onReveal = vi.fn();

    const view = createSpotlightView({
      title: 'スポットライト',
      stage: createStage(),
      revealLabel: '黒子を公開する',
      onReveal,
    });

    document.body.append(view);

    const revealButton = view.querySelector<HTMLButtonElement>('.spotlight-actions__button');
    expect(revealButton).not.toBeNull();
    expect(revealButton?.disabled).toBe(false);

    revealButton?.click();
    expect(onReveal).toHaveBeenCalledTimes(1);

    view.setRevealDisabled(true);
    expect(revealButton?.disabled).toBe(true);

    view.setRevealDisabled(false);
    expect(revealButton?.disabled).toBe(false);
  });

  it('updateRevealCaptionで説明文を表示・非表示に切り替えられる', () => {
    const view = createSpotlightView({
      title: 'スポットライト',
      stage: createStage(),
    });

    document.body.append(view);

    const caption = view.querySelector<HTMLParagraphElement>('.spotlight-actions__caption');
    expect(caption).not.toBeNull();
    expect(caption?.hidden).toBe(true);
    expect(caption?.textContent).toBe('');

    view.updateRevealCaption('公開後は判定が行われます');
    expect(caption?.hidden).toBe(false);
    expect(caption?.textContent).toBe('公開後は判定が行われます');

    view.updateRevealCaption(null);
    expect(caption?.hidden).toBe(true);
    expect(caption?.textContent).toBe('');
  });

  it('updateStageで役者と黒子の表示状態を切り替えられる', () => {
    const view = createSpotlightView({
      title: 'スポットライト',
      stage: createStage(),
    });

    document.body.append(view);

    const slots = view.querySelectorAll<HTMLDivElement>('.spotlight-stage__slot');
    const actorSlot = slots.item(0);
    const kurokoSlot = slots.item(1);

    const actorPlaceholder = actorSlot.querySelector<HTMLDivElement>('.spotlight-stage__placeholder');
    const actorCard = actorSlot.querySelector<HTMLDivElement>('.card');
    const actorDescription = actorSlot.querySelector<HTMLParagraphElement>('.spotlight-stage__description');

    const kurokoPlaceholder = kurokoSlot.querySelector<HTMLDivElement>('.spotlight-stage__placeholder');
    const kurokoCard = kurokoSlot.querySelector<HTMLDivElement>('.card');
    const kurokoDescription = kurokoSlot.querySelector<HTMLParagraphElement>('.spotlight-stage__description');

    expect(actorSlot.classList.contains('is-empty')).toBe(true);
    expect(actorCard?.hidden).toBe(true);
    expect(actorCard?.getAttribute('aria-hidden')).toBe('true');
    expect(actorPlaceholder?.hidden).toBe(false);
    expect(actorPlaceholder?.textContent).toBe('役者は未公開です');
    expect(actorDescription?.hidden).toBe(true);

    expect(kurokoSlot.classList.contains('is-empty')).toBe(true);
    expect(kurokoCard?.hidden).toBe(true);
    expect(kurokoCard?.getAttribute('aria-hidden')).toBe('true');
    expect(kurokoPlaceholder?.hidden).toBe(false);
    expect(kurokoPlaceholder?.textContent).toBe('黒子は未公開です');
    expect(kurokoDescription?.hidden).toBe(true);

    view.updateStage(
      createStage({
        actorLabel: '提示された役者',
        actorCard: createCard({
          rank: 'Q',
          suit: 'hearts',
          annotation: '主演カード',
          description: '役者の説明',
        }),
        kurokoLabel: '提示された黒子',
        kurokoCard: createCard({
          rank: '9',
          suit: 'clubs',
          faceDown: true,
          description: '黒子の説明',
        }),
      }),
    );

    expect(actorSlot.classList.contains('is-empty')).toBe(false);
    expect(actorSlot.querySelector('h2')?.textContent).toBe('提示された役者');
    expect(actorCard?.hidden).toBe(false);
    expect(actorCard?.textContent).toBe('Q♥');
    expect(actorCard?.classList.contains('card--face-down')).toBe(false);
    expect(actorCard?.getAttribute('title')).toBe('主演カード');
    expect(actorPlaceholder?.hidden).toBe(true);
    expect(actorDescription?.hidden).toBe(false);
    expect(actorDescription?.textContent).toBe('役者の説明');

    expect(kurokoSlot.classList.contains('is-empty')).toBe(false);
    expect(kurokoSlot.querySelector('h2')?.textContent).toBe('提示された黒子');
    expect(kurokoCard?.hidden).toBe(false);
    expect(kurokoCard?.textContent).toBe('');
    expect(kurokoCard?.classList.contains('card--face-down')).toBe(true);
    expect(kurokoCard?.getAttribute('title')).toBeNull();
    expect(kurokoPlaceholder?.hidden).toBe(true);
    expect(kurokoDescription?.hidden).toBe(false);
    expect(kurokoDescription?.textContent).toBe('黒子の説明');

    view.updateStage(createStage());

    expect(actorSlot.classList.contains('is-empty')).toBe(true);
    expect(actorCard?.hidden).toBe(true);
    expect(actorCard?.getAttribute('aria-hidden')).toBe('true');
    expect(actorCard?.getAttribute('title')).toBeNull();
    expect(actorPlaceholder?.hidden).toBe(false);
    expect(actorPlaceholder?.textContent).toBe('役者は未公開です');
    expect(actorDescription?.hidden).toBe(true);
    expect(actorDescription?.textContent).toBe('');

    expect(kurokoSlot.classList.contains('is-empty')).toBe(true);
    expect(kurokoCard?.hidden).toBe(true);
    expect(kurokoCard?.getAttribute('aria-hidden')).toBe('true');
    expect(kurokoPlaceholder?.hidden).toBe(false);
    expect(kurokoPlaceholder?.textContent).toBe('黒子は未公開です');
    expect(kurokoDescription?.hidden).toBe(true);
    expect(kurokoDescription?.textContent).toBe('');
  });
});
