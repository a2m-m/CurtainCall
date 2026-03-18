export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Card = {
  suit: Suit;
  rank: number; // 1-13, 0 for Joker
  isJoker: boolean;
  isFaceUp: boolean;
};

export type Player = {
  id: string;
  name: string;
  hand: Card[];
};

export type Stage = {
  kami: Card | null;
  shimo: Card | null;
};

export type GamePhase =
  | 'standby'
  | 'scout'
  | 'action'
  | 'watch'
  | 'spotlight'
  | 'spotlight-bonus'
  | 'backstage'
  | 'intermission'
  | 'curtain-call'
  | 'result';

export type PublicInfo = {
  playerId: string;
  card: Card;
  round: number;
};

export type CurtainCallReason = 'joker' | 'set-last-1' | 'hand-shortage';

export type GameState = {
  phase: GamePhase;
  players: [Player, Player];
  stage: Stage;
  deck: Card[];
  backstage: Card[];
  setRemainingCount: number; // 裏向きカード数（セット残枚数）
  publicInfos: PublicInfo[];
  playerABooCnt: number;
  playerBBooCnt: number;
  round: number;
  curtainCallReason: CurtainCallReason | null;
};
