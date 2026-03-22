import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types/game';
import { initialState } from './reducer';
import { getPhaseGuide } from './phaseGuide';

const baseState: GameState = {
  ...initialState,
  players: [
    { id: 'A', name: 'アリス', hand: [] },
    { id: 'B', name: 'ボブ', hand: [] },
  ],
  round: 1,
};

describe('getPhaseGuide', () => {
  it('scout フェーズで phaseName が「スカウトフェーズ」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'scout' }).phaseName).toBe('スカウトフェーズ');
  });

  it('scout フェーズで players[0] がアクティブプレイヤー', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'scout' }).activePlayerName).toBe('アリス');
  });

  it('scout-result フェーズで phaseName が「スカウト結果」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'scout-result' }).phaseName).toBe('スカウト結果');
  });

  it('scout-result フェーズで players[0] がアクティブプレイヤー', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'scout-result' }).activePlayerName).toBe('アリス');
  });

  it('action フェーズで phaseName が「アクションフェーズ」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'action' }).phaseName).toBe('アクションフェーズ');
  });

  it('action フェーズで players[0] がアクティブプレイヤー', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'action' }).activePlayerName).toBe('アリス');
  });

  it('action-result フェーズで phaseName が「アクション結果」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'action-result' }).phaseName).toBe('アクション結果');
  });

  it('watch フェーズで phaseName が「ウォッチフェーズ」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'watch' }).phaseName).toBe('ウォッチフェーズ');
  });

  it('watch フェーズで players[1] がアクティブプレイヤー', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'watch' }).activePlayerName).toBe('ボブ');
  });

  it('spotlight フェーズで phaseName が「スポットライト」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'spotlight' }).phaseName).toBe('スポットライト');
  });

  it('spotlight フェーズで players[0]（actor）がアクティブプレイヤー', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'spotlight' }).activePlayerName).toBe('アリス');
  });

  it('spotlight-bonus フェーズで phaseName が「スポットライトボーナス」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'spotlight-bonus' }).phaseName).toBe(
      'スポットライトボーナス',
    );
  });

  it('spotlight-bonus フェーズで booResult=correct のとき players[1]（watcher）がアクティブ', () => {
    const state: GameState = { ...baseState, phase: 'spotlight-bonus', booResult: 'correct' };
    expect(getPhaseGuide(state).activePlayerName).toBe('ボブ');
  });

  it('spotlight-bonus フェーズで booResult=incorrect のとき players[0]（actor）がアクティブ', () => {
    const state: GameState = { ...baseState, phase: 'spotlight-bonus', booResult: 'incorrect' };
    expect(getPhaseGuide(state).activePlayerName).toBe('アリス');
  });

  it('spotlight-joker フェーズで booResult=correct のとき players[1]（watcher）がアクティブ', () => {
    const state: GameState = { ...baseState, phase: 'spotlight-joker', booResult: 'correct' };
    expect(getPhaseGuide(state).activePlayerName).toBe('ボブ');
  });

  it('spotlight-joker フェーズで booResult=incorrect のとき players[0]（actor）がアクティブ', () => {
    const state: GameState = { ...baseState, phase: 'spotlight-joker', booResult: 'incorrect' };
    expect(getPhaseGuide(state).activePlayerName).toBe('アリス');
  });

  it('backstage フェーズで phaseName が「バックステージ」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'backstage' }).phaseName).toBe('バックステージ');
  });

  it('backstage フェーズで backstagePlayerId に対応するプレイヤー名を返す', () => {
    const state: GameState = { ...baseState, phase: 'backstage', backstagePlayerId: 'B' };
    expect(getPhaseGuide(state).activePlayerName).toBe('ボブ');
  });

  it('backstage-result フェーズで phaseName が「バックステージ結果」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'backstage-result' }).phaseName).toBe(
      'バックステージ結果',
    );
  });

  it('intermission フェーズで phaseName が「幕間」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'intermission' }).phaseName).toBe('幕間');
  });

  it('intermission フェーズで activePlayerName が空文字', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'intermission' }).activePlayerName).toBe('');
  });

  it('curtain-call フェーズで phaseName が「カーテンコール」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'curtain-call' }).phaseName).toBe('カーテンコール');
  });

  it('result フェーズで phaseName が「結果発表」', () => {
    expect(getPhaseGuide({ ...baseState, phase: 'result' }).phaseName).toBe('結果発表');
  });
});
