import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ResultModal from './ResultModal';

describe('ResultModal', () => {
  it('タイトルとメッセージが表示される', () => {
    render(
      <ResultModal title="スカウト完了" message="手札が5枚になりました" onProceed={() => {}} />,
    );
    expect(screen.getByText('スカウト完了')).toBeDefined();
    expect(screen.getByText('手札が5枚になりました')).toBeDefined();
  });

  it('proceedLabel が「次へ」のデフォルトで表示される', () => {
    render(<ResultModal title="結果" message="完了" onProceed={() => {}} />);
    expect(screen.getByRole('button', { name: '次へ' })).toBeDefined();
  });

  it('proceedLabel を指定するとそのラベルで表示される', () => {
    render(
      <ResultModal title="結果" message="完了" onProceed={() => {}} proceedLabel="アクションへ" />,
    );
    expect(screen.getByRole('button', { name: 'アクションへ' })).toBeDefined();
  });

  it('ボタン押下で onProceed が呼ばれる', () => {
    const onProceed = vi.fn();
    render(<ResultModal title="結果" message="完了" onProceed={onProceed} />);
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(onProceed).toHaveBeenCalledOnce();
  });
});
