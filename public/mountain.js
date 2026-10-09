// Browser-only mountain stage; the existing game owns movement, combat, and timing.
const MountainLevel = {
    size: 720,
    palette: {
        sky: '#99d9ea', earth: '#69452e', earthDark: '#3f2b22', edge: '#bb8750',
        snow: '#fff6d9', rock: '#7d8891', rockDark: '#38434d', eye: '#aeefff',
        feather: '#d7e3e8', wing: '#506977', sun: '#fff2a1', shadow: '#233f55'
    },
    art: null,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    async prepare() {
        const manifest = await fetch('/assets/mountain-scene.json').then(r => {
            if (!r.ok) throw new Error('Mountain artwork could not load');
            return r.json();
        });
        const image = async url => {
            const img = new Image();
            img.src = url;
            await img.decode();
            return img;
        };
        this.art = {
            background: await image(manifest.background),
            parts: await Promise.all(manifest.parts.map(async part => ({ ...part, image: await image(part.url) })))
        };
    },
    build() {
        const footholds = [
            [220, 696, 200], [340, 650, 86], [242, 604, 86], [350, 558, 86],
            [242, 512, 90], [350, 466, 86], [252, 420, 100], [355, 374, 88],
            [260, 328, 90], [355, 282, 86], [284, 236, 86], [374, 190, 80],
            [300, 144, 80], [380, 98, 76], [374, 52, 90]
        ];
        footholds.forEach(([x, y, w]) => platforms.push(new Platform(x, y, w, 12, 'mountain')));
        activeCheckpoint = { stage: 6, x: 255, y: 672 };
        startCheckpoint = new Checkpoint(245, 672);
        this.checkpointReached = false;
        this.completed = false;
        enemies.push(new MountainEnemy(360, 630, 'golem', platforms[1]));
        enemies.push(new MountainEnemy(275, 492, 'golem', platforms[4]));
        enemies.push(new MountainEnemy(390, 354, 'golem', platforms[7]));
        enemies.push(new MountainEnemy(330, 124, 'golem', platforms[12]));
        enemies.push(new MountainEnemy(420, 545, 'hawk'));
        enemies.push(new MountainEnemy(230, 350, 'hawk'));
        enemies.push(new MountainEnemy(470, 220, 'hawk'));
        cameraX = 120;
        cameraY = 450;
    },
    drawBackground(ctx, time) {
        const p = this.palette;
        ctx.fillStyle = p.sky;
        ctx.fillRect(0, 0, this.size, this.size);
        if (!this.art) return;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.art.background, 0, 0, this.size, this.size);
        const t = this.reducedMotion ? 0 : time;
        this.art.parts.forEach((part, i) => {
            const wind = part.kind === 'wind';
            const dx = Math.round(Math.sin(t * (wind ? 0.6 : 0.85) + i) * (wind ? 7 : 3));
            const dy = Math.round(Math.sin(t * 0.7 + i * 1.8) * (wind ? 2 : 4));
            ctx.drawImage(part.image, Math.round(part.x * 7.2) + dx, Math.round(part.y * 7.2) + dy,
                Math.ceil(part.w * 7.2), Math.ceil(part.h * 7.2));
        });
        // Stepped translucent light, not blur: retain hard pixel edges in the artwork.
        ctx.save();
        ctx.fillStyle = p.sun;
        ctx.globalAlpha = 0.035;
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(330 - i * 30, 20 + i * 28, 150 + i * 45, 34);
        }
        ctx.restore();
    },
    drawPlatform(ctx, platform) {
        const p = this.palette;
        const x = Math.floor(platform.x), y = Math.floor(platform.y);
        drawPixelRect(ctx, p.earthDark, x + 3, y + 4, platform.w, platform.h);
        drawPixelRect(ctx, p.earth, x, y, platform.w, platform.h);
        drawPixelRect(ctx, p.edge, x, y, platform.w, 3);
        for (let i = 8; i < platform.w - 3; i += 17) {
            drawPixelRect(ctx, p.earthDark, x + i, y + 6, 8, 2);
        }
        if (y < 160) drawPixelRect(ctx, p.snow, x + 2, y - 2, platform.w - 4, 3);
    },
    drawDetails(ctx, time) {
        const p = this.palette;
        const summit = platforms[platforms.length - 1];
        drawPixelRect(ctx, p.earthDark, summit.x + 44, summit.y - 34, 3, 34);
        drawPixelRect(ctx, p.eye, summit.x + 47, summit.y - 34, 18, 10);
        drawPixelRect(ctx, p.snow, summit.x + 47, summit.y - 34, 18, 2);
        if (!this.checkpointReached) {
            Sprites.drawCheckpointStatue(ctx, 290, 396, time * 10);
        }
        ctx.save();
        ctx.fillStyle = p.sun;
        for (let i = 0; i < 18; i++) {
            const x = (i * 79 + time * 5) % this.size;
            const y = (i * 137 + Math.sin(time * 0.6 + i) * 5) % this.size;
            ctx.globalAlpha = 0.15 + (Math.sin(time + i) + 1) * 0.14;
            ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
        }
        ctx.restore();
    },
    update() {
        player.x = Math.max(0, Math.min(this.size - player.width, player.x));
        if (!this.checkpointReached && player.grounded && player.ridingPlatform === platforms[6]) {
            this.checkpointReached = true;
            activeCheckpoint = { stage: 6, x: 285, y: 396 };
            audio.playHeal();
        }
        if (player.y > cameraY + V_HEIGHT + 80 || player.y > this.size + 20) {
            tookDamageThisRun = true;
            player.takeDamage(0);
            if (gameState === 'PLAYING') {
                player.reset(activeCheckpoint.x, activeCheckpoint.y);
                cameraY = Math.max(0, Math.min(450, player.y - 150));
            }
        }
        stageLabel.textContent = `MOUNTAIN: ${Math.min(100, Math.max(0, Math.round((672 - player.y) / 644 * 100)))}%`;
        if (!this.completed && player.grounded && player.ridingPlatform === platforms[14]) {
            this.completed = true;
            gameState = 'VICTORY';
            cutscenePhase = 'DIALOGUE';
            audio.stopChiptune();
            audio.playVictory();
            document.querySelectorAll('[data-cs-hide]').forEach(el => { el.style.display = 'none'; });
            cutsceneOverlay.classList.remove('hidden', 'opacity-0');
            playDialogue(['We made it to the summit!'], () => {
                awaitingChoice = false;
                dialogueNext.classList.add('hidden');
                dialogueChoices.classList.remove('hidden');
                choiceReplayBtn.textContent = '↻ REPLAY MOUNTAIN';
                choiceContinueBtn.textContent = '↻ RETURN TO INFERNO';
            });
        }
    }
};

class MountainEnemy {
    constructor(x, y, type, platform = null) {
        this.x = x; this.y = y; this.startX = x; this.startY = y;
        this.type = type; this.platform = platform;
        this.width = type === 'hawk' ? 24 : 20; this.height = 20;
        this.hp = type === 'hawk' ? 40 : 80; this.maxHp = this.hp;
        this.dead = false; this.lastHitAttackId = -1;
        this.animFrame = 0; this.dir = 1; this.state = 'walk'; this.cooldown = 2;
    }
    update(dt, knight) {
        this.animFrame += dt;
        this.cooldown -= dt;
        if (this.type === 'hawk') {
            const nearby = Math.hypot(knight.x - this.x, knight.y - this.y) < 150;
            if (this.state === 'walk' && nearby && this.cooldown <= 0) {
                this.state = 'windup'; this.timer = 0.6;
            }
            if (this.state === 'windup') {
                this.timer -= dt;
                if (this.timer <= 0) {
                    const angle = Math.atan2(knight.y - this.y, knight.x - this.x);
                    this.vx = Math.cos(angle) * 145; this.vy = Math.sin(angle) * 145;
                    this.state = 'dive'; this.timer = 0.65;
                }
            } else if (this.state === 'dive') {
                this.x += this.vx * dt; this.y += this.vy * dt; this.timer -= dt;
                if (this.timer <= 0) { this.state = 'walk'; this.cooldown = 2.8; }
            } else {
                this.x += (this.startX + Math.sin(this.animFrame) * 35 - this.x) * Math.min(1, dt * 3);
                this.y += (this.startY + Math.sin(this.animFrame * 2) * 8 - this.y) * Math.min(1, dt * 3);
            }
        } else if (this.platform) {
            const near = Math.abs(knight.y - this.y) < 32 && Math.abs(knight.x - this.x) < 90;
            if (this.state === 'walk' && near && this.cooldown <= 0) {
                this.state = 'windup'; this.timer = 0.65; this.dir = knight.x > this.x ? 1 : -1;
            }
            if (this.state === 'windup') {
                this.timer -= dt;
                if (this.timer <= 0) { this.state = 'charge'; this.timer = 0.45; }
            } else {
                this.x += this.dir * (this.state === 'charge' ? 110 : 22) * dt;
                if (this.state === 'charge') {
                    this.timer -= dt;
                    if (this.timer <= 0) { this.state = 'walk'; this.cooldown = 2; }
                }
                if (this.x < this.platform.x + 3 || this.x > this.platform.x + this.platform.w - this.width - 3) this.dir *= -1;
                this.x = Math.max(this.platform.x + 3, Math.min(this.platform.x + this.platform.w - this.width - 3, this.x));
            }
        }
    }
    draw(ctx) {
        if (this.dead) return;
        const p = MountainLevel.palette;
        const x = Math.floor(this.x), y = Math.floor(this.y);
        if (this.type === 'hawk') {
            const flap = Math.round(Math.sin(this.animFrame * 9) * 4);
            drawPixelRect(ctx, p.wing, x - 7, y + 4 + flap, 12, 4);
            drawPixelRect(ctx, p.wing, x + 17, y + 4 - flap, 13, 4);
            drawPixelRect(ctx, p.feather, x + 3, y + 5, 17, 9);
            drawPixelRect(ctx, p.earthDark, x + 15, y + 5, 3, 3);
            drawPixelRect(ctx, p.edge, x + 20, y + 8, 5, 3);
        } else {
            drawPixelRect(ctx, p.rockDark, x, y + 7, 20, 13);
            drawPixelRect(ctx, p.rock, x + 3, y + 1, 14, 16);
            drawPixelRect(ctx, p.snow, x + 3, y + 1, 14, 3);
            drawPixelRect(ctx, p.eye, x + 5, y + 7, 3, 3);
            drawPixelRect(ctx, p.eye, x + 12, y + 7, 3, 3);
            drawPixelRect(ctx, p.rockDark, x + 5, y + 19, 4, 3);
            drawPixelRect(ctx, p.rockDark, x + 13, y + 19, 4, 3);
        }
        if (this.state === 'windup') {
            drawPixelRect(ctx, p.earthDark, x + 8, y - 11, 4, 6);
            drawPixelRect(ctx, p.sun, x + 8, y - 4, 4, 2);
        }
        if (this.hp < this.maxHp) {
            drawPixelRect(ctx, p.rockDark, x, y - 5, 20, 2);
            drawPixelRect(ctx, p.eye, x, y - 5, 20 * this.hp / this.maxHp, 2);
        }
    }
}

MountainLevel.prepare().catch(error => console.error(error.message));