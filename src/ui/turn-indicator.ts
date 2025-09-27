export interface TurnIndicatorState {
  activeName: string;
  opponentName: string;
}

export class TurnIndicator {
  public readonly el: HTMLDivElement;

  private readonly valueEl: HTMLSpanElement;

  private readonly opponentEl: HTMLSpanElement;

  constructor(initialState: TurnIndicatorState) {
    this.el = document.createElement('div');
    this.el.className = 'turn-indicator';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');

    const label = document.createElement('span');
    label.className = 'turn-indicator__label';
    label.textContent = '現在のターン';

    this.valueEl = document.createElement('span');
    this.valueEl.className = 'turn-indicator__value';

    this.opponentEl = document.createElement('span');
    this.opponentEl.className = 'turn-indicator__opponent';

    this.el.append(label, this.valueEl, this.opponentEl);

    this.setState(initialState);
  }

  public setState(nextState: TurnIndicatorState): void {
    this.valueEl.textContent = nextState.activeName;

    if (nextState.opponentName) {
      this.opponentEl.textContent = `（相手：${nextState.opponentName}）`;
      this.opponentEl.hidden = false;
    } else {
      this.opponentEl.textContent = '';
      this.opponentEl.hidden = true;
    }

    this.el.setAttribute('aria-label', `現在のターンは${nextState.activeName}です。`);
    this.el.setAttribute('title', `現在のターン：${nextState.activeName}`);
  }
}
