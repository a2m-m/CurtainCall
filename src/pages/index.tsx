import GameRouter from '@/components/GameRouter';
import { GameProvider } from '@/game/context';

export default function Home() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
