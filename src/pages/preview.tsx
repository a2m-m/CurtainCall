import { useState } from 'react';
import type { Card as CardType, GameState } from '@/types/game';
import Card from '@/components/Card';
import { PlayerStage, MainStage, BackstageArea } from '@/components/Stage';
import PhaseHeader from '@/components/PhaseHeader';
import InfoOverlay from '@/components/InfoOverlay';
import PassDevice from '@/components/PassDevice';

// ── サンプルデータ ──────────────────────────────────────────

function makeCard(suit: CardType['suit'], rank: number, isFaceUp = true): CardType {
  return { suit, rank, isJoker: false, isFaceUp };
}

const faceUpCard = makeCard('spades', 1);
const faceDownCard: CardType = { suit: 'hearts', rank: 5, isJoker: false, isFaceUp: false };
const jokerCard: CardType = { suit: 'spades', rank: 0, isJoker: true, isFaceUp: true };
const redCard = makeCard('hearts', 12);
const diamondCard = makeCard('diamonds', 7);

const sampleMainCards: CardType[] = [
  makeCard('spades', 3),
  makeCard('hearts', 7),
  makeCard('clubs', 11),
  makeCard('diamonds', 2),
  makeCard('spades', 9),
];

const sampleBackstageCards: CardType[] = [
  { ...makeCard('clubs', 4), isFaceUp: false },
  { ...makeCard('hearts', 6), isFaceUp: false },
  makeCard('diamonds', 13),
];

const sampleState: GameState = {
  phase: 'watch',
  players: [
    { id: 'A', name: 'アリス', hand: Array(12).fill(faceDownCard) },
    { id: 'B', name: 'ボブ', hand: Array(9).fill(faceDownCard) },
  ],
  stage: { kami: makeCard('spades', 1), shimo: makeCard('hearts', 8) },
  deck: [],
  setRemainingCount: 7,
  publicInfos: [
    { playerId: 'B', card: makeCard('diamonds', 3), round: 1 },
    { playerId: 'A', card: makeCard('clubs', 10), round: 2 },
  ],
  playerABooCnt: 1,
  playerBBooCnt: 2,
  round: 3,
  curtainCallReason: null,
};

// ── セクションラベル ─────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{ fontSize: 11, letterSpacing: 3, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 20 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── プレビューページ ─────────────────────────────────────────

export default function Preview() {
  const [infoOpen, setInfoOpen] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [passComplete, setPassComplete] = useState(false);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 20px', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--gold)', marginBottom: 40 }}>
        🎭 Component Preview
      </h1>

      {/* ── Card ── */}
      <Section title="Card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Card card={faceUpCard} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>A♠ 表</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Card card={redCard} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Q♥ 赤</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Card card={diamondCard} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>7♦</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Card card={faceDownCard} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>裏向き</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Card card={jokerCard} />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>JOKER</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Card card={faceUpCard} isSelected />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>選択（カミ）</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <Card card={faceUpCard} isSelectedShimo />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>選択（シモ）</span>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>クリッカブル（タップで選択）</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sampleMainCards.map((c, i) => (
              <Card
                key={i}
                card={c}
                isSelected={selectedIdx === i}
                onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ── PlayerStage ── */}
      <Section title="PlayerStage">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <PlayerStage
            playerName="アリス"
            kamiCard={makeCard('spades', 1)}
            shimoCard={makeCard('hearts', 8)}
            isActive
          />
          <PlayerStage
            playerName="ボブ"
            kamiCard={null}
            shimoCard={makeCard('clubs', 5)}
          />
          <PlayerStage
            playerName="空スロット"
            kamiCard={null}
            shimoCard={null}
          />
        </div>
      </Section>

      {/* ── MainStage ── */}
      <Section title="MainStage（5枚 + 8プレースホルダー）">
        <MainStage cards={sampleMainCards} />
      </Section>

      {/* ── BackstageArea ── */}
      <Section title="BackstageArea（3枚 + 7プレースホルダー）">
        <BackstageArea cards={sampleBackstageCards} />
      </Section>

      {/* ── PhaseHeader ── */}
      <Section title="PhaseHeader">
        <PhaseHeader
          phaseName="スカウトフェーズ"
          activePlayerName="アリスのターン"
          onInfoOpen={() => setInfoOpen(true)}
        />
        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
          📊ボタンで InfoOverlay が開きます
        </p>
      </Section>

      {/* ── PassDevice ── */}
      <Section title="PassDevice">
        {passComplete ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--gold)', fontSize: 16 }}>
            ✅ デバイスパス完了！
            <br />
            <button
              onClick={() => setPassComplete(false)}
              style={{ marginTop: 16, padding: '8px 20px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              リセット
            </button>
          </div>
        ) : (
          <PassDevice playerName="ボブ" onComplete={() => setPassComplete(true)} />
        )}
      </Section>

      {/* ── InfoOverlay ── */}
      <InfoOverlay
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
        gameState={sampleState}
      />
    </div>
  );
}
