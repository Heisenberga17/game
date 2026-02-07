import './style.css';
import { Game } from './core/Game';
import { GameMenu } from './ui/GameMenu';

async function main() {
  const menu = new GameMenu();
  const options = await menu.show();

  const game = new Game();
  await game.init(options);
  game.start();
}

main();
