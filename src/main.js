import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-game',
  width: window.innerWidth,          // full-screen
  height: window.innerHeight,
  backgroundColor: '#d8b4fe',        // light purple
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [GameScene],
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
});
