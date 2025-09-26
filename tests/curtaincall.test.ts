import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCurtainCallView,
  type CurtainCallPlayerSummaryViewModel,
} from '../src/views/curtaincall.js';

type PartialPlayer = Partial<CurtainCallPlayerSummaryViewModel>;

type PlayerCardList = CurtainCallPlayerSummaryViewModel['kami'];

type PartialPlayerCardList = Partial<PlayerCardList>;

const createCardList = (overrides?: PartialPlayerCardList): PlayerCardList => ({
  label: 'カミ',
  cards: [],
  emptyMessage: 'カードはありません',
  ...overrides,
});

const createPlayer = (overrides?: PartialPlayer): CurtainCallPlayerSummaryViewModel => ({
  id: 'lumina',
  name: 'ルミナ',
  breakdown: [
    { label: 'カミ合計', value: '10' },
    { label: '手札合計', value: '4' },
    { label: 'ブーイングペナルティ', value: '0' },
  ],
  final: { label: '最終ポイント', value: '+6', trend: 'positive' },
  booProgress: { label: 'ブーイング達成', value: '3/3' },
  kami: createCardList({ label: 'カミ', emptyMessage: 'カミはありません' }),
  hand: createCardList({ label: '手札', emptyMessage: '手札はありません' }),
  ...overrides,
});

describe('createCurtainCallView', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('結果ラベルと説明文を更新し、説明が無い場合は非表示にできる', () => {
    const view = createCurtainCallView({
      title: 'カーテンコール',
      result: { label: '引き分け' },
      players: [createPlayer(), createPlayer({ id: 'nox', name: 'ノクス' })],
    });

    document.body.append(view);

    const label = view.querySelector<HTMLParagraphElement>('.curtaincall__result-label');
    const description = view.querySelector<HTMLParagraphElement>('.curtaincall__result-description');
    expect(label?.textContent).toBe('引き分け');
    expect(description?.hidden).toBe(true);
    expect(description?.textContent).toBe('');

    view.updateResult({ label: 'ルミナの勝ち', description: 'ジョーカーにより決着しました' });
    expect(label?.textContent).toBe('ルミナの勝ち');
    expect(description?.hidden).toBe(false);
    expect(description?.textContent).toBe('ジョーカーにより決着しました');

    view.updateResult({ label: 'ノクスの勝ち' });
    expect(label?.textContent).toBe('ノクスの勝ち');
    expect(description?.hidden).toBe(true);
    expect(description?.textContent).toBe('');
  });

  it('updatePlayersでプレイヤーカード一覧を差し替えられる', () => {
    const view = createCurtainCallView({
      title: 'カーテンコール',
      result: { label: 'ルミナの勝ち' },
      players: [createPlayer(), createPlayer({ id: 'nox', name: 'ノクス' })],
    });

    document.body.append(view);

    const initialCards = view.querySelectorAll<HTMLDivElement>('.curtaincall-player');
    expect(initialCards).toHaveLength(2);
    expect(initialCards.item(0).dataset.playerId).toBe('lumina');
    expect(initialCards.item(1).dataset.playerId).toBe('nox');

    view.updatePlayers([
      createPlayer({ id: 'lumina', name: '先攻ルミナ' }),
      createPlayer({ id: 'nox', name: '後攻ノクス' }),
    ]);

    const updatedCards = view.querySelectorAll<HTMLDivElement>('.curtaincall-player');
    expect(updatedCards).toHaveLength(2);
    expect(updatedCards.item(0).querySelector('h2')?.textContent).toBe('先攻ルミナ');
    expect(updatedCards.item(1).querySelector('h2')?.textContent).toBe('後攻ノクス');
  });

  it('各種ボタンの表示と活性状態を制御できる', () => {
    const onBoardCheck = vi.fn();
    const onGoHome = vi.fn();
    const onNewGame = vi.fn();
    const onSave = vi.fn();

    const view = createCurtainCallView({
      title: 'カーテンコール',
      result: { label: 'ノクスの勝ち' },
      players: [createPlayer(), createPlayer({ id: 'nox', name: 'ノクス' })],
      boardCheckLabel: '盤面を見る',
      onOpenBoardCheck: onBoardCheck,
      onGoHome,
      onStartNewGame: onNewGame,
      onSaveResult: onSave,
      saveDisabled: true,
    });

    document.body.append(view);

    const boardCheckButton = view.querySelector<HTMLButtonElement>('.curtaincall__boardcheck-button');
    expect(boardCheckButton).not.toBeNull();
    expect(boardCheckButton?.textContent).toBe('盤面を見る');
    boardCheckButton?.click();
    expect(onBoardCheck).toHaveBeenCalledTimes(1);

    const actionButtons = view.querySelectorAll<HTMLButtonElement>('.curtaincall__action-button');
    expect(actionButtons).toHaveLength(3);
    expect(actionButtons.item(0).textContent).toBe('HOME');
    expect(actionButtons.item(1).textContent).toBe('新しいゲーム');
    expect(actionButtons.item(2).textContent).toBe('結果の保存');

    actionButtons.item(0).click();
    actionButtons.item(1).click();
    actionButtons.item(2).click();

    expect(onGoHome).toHaveBeenCalledTimes(1);
    expect(onNewGame).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();

    expect(actionButtons.item(2).disabled).toBe(true);
    view.setSaveDisabled(false);
    expect(actionButtons.item(2).disabled).toBe(false);

    actionButtons.item(2).click();
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('ボードチェックハンドラ未指定時はボタンを描画しない', () => {
    const view = createCurtainCallView({
      title: 'カーテンコール',
      result: { label: '引き分け' },
      players: [createPlayer(), createPlayer({ id: 'nox', name: 'ノクス' })],
    });

    document.body.append(view);

    expect(view.querySelector('.curtaincall__boardcheck-button')).toBeNull();
  });
});
