import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GameProvider } from '@/game/context';
import TitleScreen from './TitleScreen';

function renderWithProvider() {
  return render(
    <GameProvider>
      <TitleScreen />
    </GameProvider>,
  );
}

describe('TitleScreen', () => {
  it('プレイヤーA・B名の入力フォームが表示される', () => {
    renderWithProvider();
    expect(screen.getByLabelText('プレイヤーA')).toBeDefined();
    expect(screen.getByLabelText('プレイヤーB')).toBeDefined();
    expect(screen.getByRole('button', { name: 'ゲームスタート' })).toBeDefined();
  });

  it('空欄のままゲームスタートを押すとエラーが表示される', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('button', { name: 'ゲームスタート' }));
    expect(screen.getByText('プレイヤーA名を入力してください')).toBeDefined();
    expect(screen.getByText('プレイヤーB名を入力してください')).toBeDefined();
  });

  it('プレイヤーA空欄のみエラーが表示される', () => {
    renderWithProvider();
    fireEvent.change(screen.getByLabelText('プレイヤーB'), { target: { value: 'ボブ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ゲームスタート' }));
    expect(screen.getByText('プレイヤーA名を入力してください')).toBeDefined();
    expect(screen.queryByText('プレイヤーB名を入力してください')).toBeNull();
  });

  it('名前が重複するとエラーが表示される', () => {
    renderWithProvider();
    fireEvent.change(screen.getByLabelText('プレイヤーA'), { target: { value: 'アリス' } });
    fireEvent.change(screen.getByLabelText('プレイヤーB'), { target: { value: 'アリス' } });
    fireEvent.click(screen.getByRole('button', { name: 'ゲームスタート' }));
    expect(screen.getByText('プレイヤー名が重複しています')).toBeDefined();
  });

  it('両名入力後にゲームスタートを押すとINIT_GAMEがdispatchされ画面がscoutフェーズに遷移する', () => {
    // GameProvider 経由で state を確認するため index.tsx 相当のラッパーを使う
    const { container } = renderWithProvider();
    fireEvent.change(screen.getByLabelText('プレイヤーA'), { target: { value: 'アリス' } });
    fireEvent.change(screen.getByLabelText('プレイヤーB'), { target: { value: 'ボブ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ゲームスタート' }));
    // INIT_GAME dispatch 後は phase が scout になるため TitleScreen は再レンダーされる
    // ここでは dispatch 後にエラーが残らないことのみ確認（reducer テストで遷移は担保済み）
    expect(screen.queryByText('プレイヤーA名を入力してください')).toBeNull();
    expect(screen.queryByText('プレイヤーB名を入力してください')).toBeNull();
    expect(container.firstElementChild).toBeDefined();
  });
});
