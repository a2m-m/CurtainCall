import { useState } from 'react';
import { useGameDispatch, useGameState } from '@/game/context';
import { getPhaseGuide } from '@/game/phaseGuide';
import InfoOverlay from './InfoOverlay';
import PhaseHeader from './PhaseHeader';
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


export default function GameRouter() {
  const state = useGameState();
  const dispatch = useGameDispatch();
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  if (state.phase === 'standby' && state.players[0].name === '') {
    return <TitleScreen />;
  }

  const { phaseName, activePlayerName } = getPhaseGuide(state);

  function renderScreen() {
    switch (state.phase) {
      case 'standby':
        return <StandbyScreen />;
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
        return <ActionScreen />;
      case 'watch':
        return <WatchScreen />;
      case 'spotlight':
        return <SpotlightRevealScreen />;
      case 'spotlight-bonus':
      case 'spotlight-joker':
      case 'spotlight-open-result':
        return <SpotlightBonusScreen />;
      case 'backstage':
      case 'backstage-result':
        return <BackstageScreen />;
      case 'intermission':
        return <IntermissionScreen />;
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
      />
      {renderScreen()}
      <InfoOverlay
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        gameState={state}
      />
    </>
  );
}
