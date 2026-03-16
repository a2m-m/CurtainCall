import React, { createContext, useContext, useReducer } from 'react';
import type { GameState } from '@/types/game';
import { type GameAction, gameReducer, initialState } from '@/game/reducer';

const GameStateContext = createContext<GameState>(initialState);
const GameDispatchContext = createContext<React.Dispatch<GameAction>>(
  (_action: GameAction): void => {},
);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameDispatchContext.Provider value={dispatch}>
      <GameStateContext.Provider value={state}>
        {children}
      </GameStateContext.Provider>
    </GameDispatchContext.Provider>
  );
}

export function useGameState(): GameState {
  return useContext(GameStateContext);
}

export function useGameDispatch(): React.Dispatch<GameAction> {
  return useContext(GameDispatchContext);
}
