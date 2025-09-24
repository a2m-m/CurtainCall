import { UIComponent } from './component.js';

export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';

export interface CardOptions {
  rank: string;
  suit: CardSuit;
  faceDown?: boolean;
  annotation?: string;
}

const SUIT_SYMBOL: Record<CardSuit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '★',
};

export class CardComponent extends UIComponent<HTMLDivElement> {
  private rank: string;
  private suit: CardSuit;
  private faceDown: boolean;

  constructor(options: CardOptions) {
    super(document.createElement('div'));
    this.element.className = 'card';
    this.rank = options.rank;
    this.suit = options.suit;
    this.faceDown = Boolean(options.faceDown);
    this.renderFace();

    if (options.annotation) {
      this.element.title = options.annotation;
    }
  }

  setFaceDown(faceDown: boolean): void {
    this.faceDown = faceDown;
    this.renderFace();
  }

  setCard(rank: string, suit: CardSuit): void {
    this.rank = rank;
    this.suit = suit;
    this.renderFace();
  }

  private renderFace(): void {
    if (this.faceDown) {
      this.element.classList.add('card--face-down');
      this.element.textContent = '';
      this.element.setAttribute('aria-label', '伏せ札');
      return;
    }

    this.element.classList.remove('card--face-down');
    const symbol = SUIT_SYMBOL[this.suit];
    this.element.textContent = `${this.rank}${symbol}`;
    this.element.setAttribute('aria-label', `${this.suit} の ${this.rank}`);
  }
}
