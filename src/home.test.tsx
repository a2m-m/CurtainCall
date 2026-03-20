import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '@/pages/index';

describe('Home', () => {
  it('初期表示でタイトル画面が描画される', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'CurtainCall' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'ゲームスタート' })).toBeDefined();
  });

  it('ゲーム開始後にスタンバイ画面へ遷移する', () => {
    render(<Home />);

    fireEvent.change(screen.getByLabelText('プレイヤーA'), { target: { value: 'アリス' } });
    fireEvent.change(screen.getByLabelText('プレイヤーB'), { target: { value: 'ボブ' } });
    fireEvent.click(screen.getByRole('button', { name: 'ゲームスタート' }));

    expect(screen.getByRole('heading', { name: 'カード配布完了' })).toBeDefined();
    expect(screen.getByText('アリス の手札')).toBeDefined();
    expect(screen.getByText('ボブ の手札')).toBeDefined();
  });
});
