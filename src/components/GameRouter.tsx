import { useState } from 'react';
import { useGameState } from '@/game/context';
import { getPhaseGuide } from '@/game/phaseGuide';
import InfoOverlay from './InfoOverlay';
import PhaseHeader from './PhaseHeader';
import ActionResultScreen from '@/screens/ActionResultScreen';
import ActionScreen from '@/screens/ActionScreen';
import BackstageScreen from '@/screens/BackstageScreen';
import IntermissionScreen from '@/screens/IntermissionScreen';
import ResultScreen from '@/screens/ResultScreen';
import ScoutResultScreen from '@/screens/ScoutResultScreen';
import ScoutScreen from '@/screens/ScoutScreen';
import SpotlightBonusScreen from '@/screens/SpotlightBonusScreen';
import SpotlightRevealScreen from '@/screens/SpotlightRevealScreen';
import StandbyScreen from '@/screens/StandbyScreen';
import TitleScreen from '@/screens/TitleScreen';
import WatchScreen from '@/screens/WatchScreen';

export default function GameRouter() {
  const state = useGameState();
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
      case 'scout-result':
        return <ScoutResultScreen />;
      case 'action':
        return <ActionScreen />;
      case 'action-result':
        return <ActionResultScreen />;
      case 'watch':
        return <WatchScreen />;
      case 'spotlight':
        return <SpotlightRevealScreen />;
      case 'spotlight-bonus':
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
