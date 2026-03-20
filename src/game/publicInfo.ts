import type { Card, PublicInfo } from '@/types/game';

export function buildPublicInfos(
  existing: PublicInfo[],
  cards: Card[],
  playerId: string,
  round: number,
): PublicInfo[] {
  return [
    ...existing,
    ...cards.map((card) => ({ playerId, card, round })),
  ];
}
