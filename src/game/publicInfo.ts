import type { Card, PublicInfo } from '@/types/game';

export function buildPublicInfos(
  existing: PublicInfo[],
  cards: Card[],
  playerId: string,
  round: number,
  indices: number[],
): PublicInfo[] {
  return [
    ...existing,
    ...cards.map((card, i) => ({ playerId, card, round, backstageIndex: indices[i] })),
  ];
}

/** backstage から index `removedIndex` のカードが削除された後、publicInfos を整合させる。
 * 削除されたカードのエントリを取り除き、それより大きいインデックスを 1 デクリメントする。
 */
export function shiftPublicInfosAfterRemoval(
  infos: PublicInfo[],
  removedIndex: number,
): PublicInfo[] {
  return infos
    .filter((info) => info.backstageIndex !== removedIndex)
    .map((info) =>
      info.backstageIndex > removedIndex
        ? { ...info, backstageIndex: info.backstageIndex - 1 }
        : info,
    );
}
