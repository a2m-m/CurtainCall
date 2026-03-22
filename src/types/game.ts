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
  | 'scout-result'
  | 'action'
  | 'action-result'
  | 'watch'
  | 'spotlight'
  | 'spotlight-bonus'
  | 'spotlight-joker'
  | 'spotlight-open-result'
  | 'backstage'
  | 'backstage-result'
  | 'intermission'
  | 'curtain-call'
  | 'result';

export type PublicInfo = {
  playerId: string;
  card: Card;
  round: number;
  backstageIndex: number;
};

export type CurtainCallReason = 'joker' | 'set-last-1' | 'hand-shortage';

export type BackstageResult = 'match' | 'no-match';

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
  playerAKami: Card[]; // プレイヤーAステージに蓄積されたカミ札
  playerBKami: Card[]; // プレイヤーBステージに蓄積されたカミ札
  playerAShimo: Card[]; // プレイヤーAが蓄積したシモ札（playerAKami と同インデックスで対応）
  playerBShimo: Card[]; // プレイヤーBが蓄積したシモ札
  round: number;
  curtainCallReason: CurtainCallReason | null;
  booResult: 'correct' | 'incorrect' | null;
  spotlightCard: Card | null;
  backstageRevealedCards: Card[];
  backstageResult: BackstageResult | null;
  backstagePlayerId: string | null; // バックステージ担当者ID（boo敗者）
  lastOpenedCard: Card | null; // SPOTLIGHT_OPEN_SET で開いたカード（結果表示用）
  spotlightOpenResultNextPhase: GamePhase | null; // spotlight-open-result 後の遷移先
  lastScoutedCard: Card | null; // SCOUT_CARD で引いたカード（スカウト結果表示用）
  lastBackstageDrawnCard: Card | null; // BACKSTAGE_TAKE_HAND で引いたカード（結果表示用）
};
