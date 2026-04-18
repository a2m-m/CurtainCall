import { useState, useEffect } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import { getPhaseGuide, getOperatingHand } from '@/game/phaseGuide';
import type { GameState } from '@/types/game';
import HandPanel from './HandPanel';
import InfoOverlay from './InfoOverlay';
import PhaseHeader from './PhaseHeader';
import styles from './GameRouter.module.css';
import ResultModal from './ResultModal';
import ActionScreen from '@/screens/ActionScreen';
import BackstageScreen from '@/screens/BackstageScreen';
import IntermissionScreen from '@/screens/IntermissionScreen';
import ResultScreen from '@/screens/ResultScreen';
import ScoutScreen from '@/screens/ScoutScreen';
import SpotlightBonusScreen from '@/screens/SpotlightBonusScreen';
import SpotlightRevealScreen from '@/screens/SpotlightRevealScreen';
import StandbyScreen from '@/screens/StandbyScreen';
import TitleScreen from '@/screens/TitleScreen';
import WatchScreen from '@/screens/WatchScreen';


function getActLabel(phase: GameState['phase']): string {
  switch (phase) {
    case 'standby': return 'Act I';
    case 'scout':
    case 'scout-result':
    case 'action':
    case 'watch': return 'Act II';
    case 'spotlight':
    case 'spotlight-bonus':
    case 'spotlight-joker':
    case 'spotlight-open-result':
    case 'backstage':
    case 'backstage-result': return 'Act III';
    case 'intermission': return "Entr'acte";
    case 'curtain-call':
    case 'result': return 'Finale';
    default: return '';
  }
}

export default function GameRouter() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPassDeviceVisible, setIsPassDeviceVisible] = useState(false);

  // フェーズが変わったら PassDevice 表示フラグをリセット（安全ネット）
  useEffect(() => {
    setIsPassDeviceVisible(false);
  }, [state.phase]);

  if (state.phase === 'standby' && state.players[0].name === '') {
    return <TitleScreen />;
  }

  const { phaseName, activePlayerName } = getPhaseGuide(state);
  const rawHand = getOperatingHand(state);
  const operatingHand = rawHand !== null
    ? { hand: rawHand, playerName: activePlayerName }
    : null;

  const actLabel = getActLabel(state.phase);

  function renderScreen() {
    switch (state.phase) {
      case 'standby':
        return <StandbyScreen onPassDeviceChange={setIsPassDeviceVisible} />;
      case 'scout':
        return <ScoutScreen />;
      case 'scout-result': {
        const scoutedCard = state.lastScoutedCard;
        const actor = state.players[0];
        return (
          <>
            <ScoutScreen />
            <ResultModal
              title="スカウト完了"
              message={`${actor.name} の手札が ${actor.hand.length}枚 になりました`}
              cards={scoutedCard !== null ? [scoutedCard] : []}
              onProceed={() => dispatch({ type: 'SCOUT_RESULT_PROCEED' })}
              proceedLabel="アクションへ"
            />
          </>
        );
      }
      case 'action':
        return <ActionScreen onPassDeviceChange={setIsPassDeviceVisible} />;
      case 'watch':
        return <WatchScreen />;
      case 'spotlight':
        return <SpotlightRevealScreen onPassDeviceChange={setIsPassDeviceVisible} />;
      case 'spotlight-bonus':
      case 'spotlight-joker':
      case 'spotlight-open-result':
        return <SpotlightBonusScreen />;
      case 'backstage':
      case 'backstage-result':
        return <BackstageScreen />;
      case 'intermission':
        return <IntermissionScreen onPassDeviceChange={setIsPassDeviceVisible} />;
      case 'curtain-call':
      case 'result':
        return <ResultScreen />;
      default: {
        const _exhaustive: never = state.phase;
        return _exhaustive;
      }
    }
  }

  return (
    <>
      <PhaseHeader
        phaseName={phaseName}
        activePlayerName={activePlayerName}
        onInfoOpen={() => setIsInfoOpen(true)}
        actLabel={actLabel}
        playerAName={state.players[0].name}
        playerBName={state.players[1].name}
      />
      <div className={styles.stage}>
        <div className={styles.main}>
          {renderScreen()}
        </div>
      </div>
      {operatingHand && !isPassDeviceVisible && (
        <div className={styles.handDock}>
          <HandPanel
            hand={operatingHand.hand}
            playerName={operatingHand.playerName}
            dockMode
          />
        </div>
      )}
      <InfoOverlay
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        gameState={state}
        operatingHand={isPassDeviceVisible ? null : operatingHand}
      />
    </>
  );
}
