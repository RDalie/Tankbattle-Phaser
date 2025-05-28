import Phaser from 'phaser';

/* ---------- CONSTANTS ---------- */
const W = window.innerWidth;       // now matches full-screen size
const H = window.innerHeight;

/* movement */
const ROT_SPEED  = 180;   // °/s
const MOVE_SPEED = 300;   // forward velocity

/* gameplay */
const BULLET_SPEED   = 600;
const ENEMY_SPEED    = 200;
const ENEMY_SLOW     =  80;
const ENEMY_FREQ     = 1600;    // ms
const HOURGLASS_FREQ = 15000;   // ms
const HOURGLASS_TIME = 10000;   // ms

/* sprites face UP; Phaser 0 rad faces RIGHT */
const FWD = -Math.PI / 2;
const forward = rot => rot + FWD;

/* -------------------------------- */
export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  preload() {
    this.load.image('player',    'images/soldier1.png');
    this.load.image('enemy',     'images/aliens3.png');
    this.load.image('bullet',    'images/ammo6.png');
    this.load.image('hourglass', 'images/hourglass.png');
    this.load.image('clock',     'images/clock.png');
    this.load.image('gameover',  'images/game_over.png');
  }

  create() {
    /* FLAGS */
    this.isOver = this.hourglassOn = false;

    /* PLAYER */
    this.player = this.physics.add.sprite(W / 2, H / 2, 'player')
      .setCollideWorldBounds(true);

    /* GROUPS */
    this.bullets     = this.physics.add.group();
    this.enemies     = this.physics.add.group();
    this.hourglasses = this.physics.add.group();

    /* UI */
    this.score = 0;
    this.start = this.time.now;
    this.txtScore = this.add.text(10, 10, 'Enemies killed: 0',
                    { fontFamily: 'monospace', fontSize: 20, color: '#000' });
    this.add.image(W - 60, H - 60, 'clock').setScale(0.2);
    this.txtTimer = this.add.text(W - 80, H - 40, '0',
                    { fontFamily: 'monospace', fontSize: 20, color: '#000' });

    /* INPUT */
    this.cursors = this.input.keyboard.createCursorKeys();
    this.space   = this.input.keyboard.addKey('SPACE');

    /* TIMERS */
    this.time.addEvent({ delay: ENEMY_FREQ,     loop: true, callback: () => this.spawnEnemy() });
    this.time.addEvent({ delay: HOURGLASS_FREQ, loop: true, callback: () => this.spawnHourglass() });

    /* COLLISIONS */
    this.physics.add.overlap(this.bullets, this.enemies,      this.hitEnemy,     null, this);
    this.physics.add.overlap(this.player,  this.enemies,      this.gameOver,     null, this);
    this.physics.add.overlap(this.player,  this.hourglasses,  this.getHourglass, null, this);

    /* GAME-OVER overlay */
    this.panelGO = this.add.image(W / 2, H / 2, 'gameover').setVisible(false);
    this.txtGO   = this.add.text(W / 2, H / 2 + 60, '',
                  { fontFamily: 'monospace', fontSize: 28, color: '#ff0000' })
                  .setOrigin(0.5).setVisible(false);
    this.input.once('pointerdown', () => { if (this.isOver) this.scene.restart(); });
  }

  /* ---------- MAIN LOOP ---------- */
  update() {
    if (this.isOver) return;

    /* rotation */
    if (this.cursors.left.isDown)       this.player.setAngularVelocity(-ROT_SPEED);
    else if (this.cursors.right.isDown) this.player.setAngularVelocity( ROT_SPEED);
    else                                this.player.setAngularVelocity(0);

    /* forward / stop */
    if (this.cursors.up.isDown) {
      const a = forward(this.player.rotation);
      this.player.setVelocity(Math.cos(a) * MOVE_SPEED, Math.sin(a) * MOVE_SPEED);
    } else {
      this.player.setVelocity(0, 0);
    }

    /* shoot */
    if (Phaser.Input.Keyboard.JustDown(this.space)) this.fire();

    /* clean bullets */
    this.bullets.children.each(b => {
      if (b.active && !this.physics.world.bounds.contains(b.x, b.y)) b.destroy();
    });

    /* enemies chase */
    this.enemies.children.each(e => {
      this.physics.moveToObject(e, this.player,
        this.hourglassOn ? ENEMY_SLOW : ENEMY_SPEED);
    });

    /* hourglass timeout */
    if (this.hourglassOn && this.time.now > this.tHourglassEnd) this.hourglassOn = false;

    /* UI */
    this.txtTimer.setText(Math.floor((this.time.now - this.start) / 1000));
    if (this.hourglassOn) {
      this.txtHG ??= this.add.text(W - 120, 20, '',
                  { fontFamily: 'monospace', fontSize: 24 });
      this.txtHG.setText(Math.ceil((this.tHourglassEnd - this.time.now) / 1000));
    } else if (this.txtHG) { this.txtHG.destroy(); this.txtHG = null; }
  }

  /* ---------- HELPERS ---------- */
  fire() {
    const b = this.bullets.create(this.player.x, this.player.y, 'bullet')
      .setRotation(this.player.rotation).setScale(0.6);
    this.physics.velocityFromRotation(forward(this.player.rotation),
                                      BULLET_SPEED, b.body.velocity);
  }

  spawnEnemy() {
    const edge = Phaser.Math.Between(0, 3);      // 0=top 1=bottom 2=left 3=right
    const x = edge === 2 ? 0 : edge === 3 ? W : Phaser.Math.Between(0, W);
    const y = edge === 0 ? 0 : edge === 1 ? H : Phaser.Math.Between(0, H);
    const e = this.enemies.create(x, y, 'enemy').setScale(0.9);

    e.body.setCircle(20, e.width / 2 - 20, e.height / 2 - 20);

    this.physics.moveToObject(e, this.player,
      this.hourglassOn ? ENEMY_SLOW : ENEMY_SPEED);
  }

  spawnHourglass() {
    this.hourglasses.create(
      Phaser.Math.Between(50, W - 50),
      Phaser.Math.Between(50, H - 50),
      'hourglass').setScale(0.8);
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy(); enemy.destroy();
    this.score++; this.txtScore.setText(`Enemies killed: ${this.score}`);
  }

  getHourglass(_, hg) {
    hg.destroy();
    this.hourglassOn   = true;
    this.tHourglassEnd = this.time.now + HOURGLASS_TIME;
  }

  gameOver() {
    this.isOver = true;
    this.player.setTint(0xff0000).setAngularVelocity(0);
    this.enemies.setVelocity(0); this.bullets.setVelocity(0);
    this.panelGO.setVisible(true);
    this.txtGO.setText(`Score: ${this.score} — click to restart`).setVisible(true);
  }
}
