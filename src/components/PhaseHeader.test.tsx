import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PhaseHeader from './PhaseHeader';

describe('PhaseHeader', () => {
  it('フェーズ名を表示する', () => {
    render(<PhaseHeader phaseName="スカウトフェーズ" activePlayerName="アリス" onInfoOpen={() => {}} />);
    expect(screen.getByText('スカウトフェーズ')).toBeDefined();
  });

  it('アクティブプレイヤー名を表示する', () => {
    render(<PhaseHeader phaseName="アクションフェーズ" activePlayerName="ボブ" onInfoOpen={() => {}} />);
    expect(screen.getByText('ボブ')).toBeDefined();
  });

  it('📊ボタンをクリックするとonInfoOpenが呼ばれる', () => {
    const handleInfoOpen = vi.fn();
    render(<PhaseHeader phaseName="スカウトフェーズ" activePlayerName="アリス" onInfoOpen={handleInfoOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'ゲーム情報を開く' }));
    expect(handleInfoOpen).toHaveBeenCalledOnce();
  });

  it('📊ボタンが表示される', () => {
    render(<PhaseHeader phaseName="スカウトフェーズ" activePlayerName="アリス" onInfoOpen={() => {}} />);
    expect(screen.getByRole('button', { name: 'ゲーム情報を開く' })).toBeDefined();
  });
});
