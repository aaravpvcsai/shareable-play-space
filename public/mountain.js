// Browser-only mountain stage; the existing game owns movement, combat, and timing.
const MountainLevel = {
    size: 720,
    height: 2880,
    introShown: false,
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
        this.completed = false;
        this.checkpointIndex = 0;
        this.startY = this.height - 48;
        for (let i = 0; i < 58; i++) {
            const y = this.height - 24 - i * 46;
            const x = i === 0 ? 220 : 280 + (i % 2 ? 66 : -34) + Math.round(Math.sin(i * 0.55) * 24);
            platforms.push(new Platform(x, y, i === 0 ? 200 : (i % 12 === 0 ? 120 : 94), 12, 'mountain'));
            if (i > 1 && i % 4 === 0) enemies.push(new MountainEnemy(x + 40, y - 20, 'golem', platforms[i]));
            if (i > 3 && i % 7 === 0) enemies.push(new MountainEnemy(x + 110, y - 55, 'hawk'));
        }
        this.summit = new Platform(200, 188, 320, 16, 'mountain');
        platforms.push(this.summit);
        this.summitBoss = new FrostBoss(410, this.summit.y - 52, this.summit);
        enemies.push(this.summitBoss);
        activeCheckpoint = { stage: 6, x: 255, y: this.startY };
        startCheckpoint = new Checkpoint(245, this.startY);
        cameraX = 120;
        cameraY = this.height - V_HEIGHT;
    },
    drawBackground(ctx, time) {
        const p = this.palette;
        ctx.fillStyle = p.sky;
        ctx.fillRect(0, 0, this.size, this.height);
        if (!this.art) return;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.art.background, 0, 0, this.size, this.height);
        const t = this.reducedMotion ? 0 : time;
        this.art.parts.forEach((part, i) => {
            const wind = part.kind === 'wind';
            const dx = Math.round(Math.sin(t * (wind ? 0.6 : 0.85) + i) * (wind ? 7 : 3));
            const dy = Math.round(Math.sin(t * 0.7 + i * 1.8) * (wind ? 2 : 4));
            ctx.drawImage(part.image, Math.round(part.x * 7.2) + dx, Math.round(part.y * 28.8) + dy,
                Math.ceil(part.w * 7.2), Math.ceil(part.h * 28.8));
        });
        // Stepped translucent light, not blur: retain hard pixel edges in the artwork.
        ctx.save();
        ctx.fillStyle = p.sun;
        ctx.globalAlpha = 0.035;
        for (let i = 0; i < 6; i++) {
            ctx.fillRect(330 - i * 30, 80 + i * 112, 150 + i * 45, 136);
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
        if (y < 650) drawPixelRect(ctx, p.snow, x + 2, y - 2, platform.w - 4, 3);
    },
    drawDetails(ctx, time) {
        const p = this.palette;
        const summit = platforms[platforms.length - 1];
        drawPixelRect(ctx, p.earthDark, summit.x + 44, summit.y - 34, 3, 34);
        drawPixelRect(ctx, p.eye, summit.x + 47, summit.y - 34, 18, 10);
        drawPixelRect(ctx, p.snow, summit.x + 47, summit.y - 34, 18, 2);
        platforms.forEach((platform, i) => {
            if (i > 0 && i % 12 === 0 && i > this.checkpointIndex) Sprites.drawCheckpointStatue(ctx, platform.x + 15, platform.y - 24, time * 10);
        });
        ctx.save();
        ctx.fillStyle = p.sun;
        for (let i = 0; i < 18; i++) {
            const x = (i * 79 + time * 5) % this.size;
            const y = (i * 277 + Math.sin(time * 0.6 + i) * 5) % this.height;
            ctx.globalAlpha = 0.15 + (Math.sin(time + i) + 1) * 0.14;
            ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
        }
        ctx.restore();
    },
    update() {
        player.x = Math.max(0, Math.min(this.size - player.width, player.x));
        const index = platforms.indexOf(player.ridingPlatform);
        if (player.grounded && index > this.checkpointIndex && index % 12 === 0) {
            this.checkpointIndex = index;
            activeCheckpoint = { stage: 6, x: platforms[index].x + 15, y: platforms[index].y - player.height };
            audio.playHeal();
        }
        if (player.y > cameraY + V_HEIGHT + 80 || player.y > this.height + 20) {
            tookDamageThisRun = true;
            player.takeDamage(0);
            if (gameState === 'PLAYING') {
                player.reset(activeCheckpoint.x, activeCheckpoint.y);
                cameraY = Math.max(0, Math.min(this.height - V_HEIGHT, player.y - 150));
            }
        }
        stageLabel.textContent = `MOUNTAIN: ${Math.min(100, Math.max(0, Math.round((this.startY - player.y) / (this.startY - 164) * 100)))}%`;
        if (!this.completed && this.summitBoss.dead && player.grounded && player.ridingPlatform === this.summit) {
            this.completed = true;
            gameState = 'VICTORY';
            cutscenePhase = 'DIALOGUE';
            audio.stopChiptune();
            audio.playVictory();
            projectiles = [];
            document.querySelectorAll('[data-cs-hide]').forEach(el => { el.style.display = 'none'; });
            cutsceneOverlay.classList.remove('hidden', 'opacity-0');
            this.endingDialogue();
        }
    },
    replies: {
        first: { replay: ["Let's do this again!"], continue: ["Let's go! We are SO ready for this next stage."] },
        success: { replay: ["Haha! The more tokens the better!"], continue: ["Alright! You're even more ready for this next stage!"] },
        failed: { replay: ["Nice! Don't give up just yet!"], continue: ["Alright, I understand.", "Maybe we'll do SPECTACULAR for this next stage!"] }
    },
    endingDialogue() {
        if (isReplayRun) {
            if (tookDamageThisRun || enemiesKilledThisRun < enemiesSpawnedThisRun) {
                playDialogue(["Aw it's alright! You did your best!"], () => showChoices('failed'));
            } else {
                frostTokens += 5;
                unifiedTokens = true;
                updateMagmaHUD();
                playDialogue(["You got 5 Frost Tokens! Congrats!", "Do you want more tokens or shall we continue?"], () => {
                    showChoices('success');
                    if (!tokenTipShown) {
                        tokenTipShown = true;
                        openTokenModal('tip');
                    }
                });
            }
            return;
        }
        const lines = ["We made it to the summit!"];
        if (!this.introShown) lines.push(
            "Now, similarly you can replay this level without taking any damage for other tokens.",
            "I promise that SOON, you will be able to use these tokens for really cool things!",
            "I won't remind you to replay levels for tokens anymore after this.",
            "But, just keep in mind that this will happen for every level.",
            "You will either get different types of tokens, or more of previous tokens.",
            "With that said, choose your option!"
        );
        this.introShown = true;
        playDialogue(lines, () => showChoices('first'));

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

// Frost projectiles share shield/collision mechanics, but keep cold pixel artwork and a finite lifetime.
class FrostProjectile extends Projectile {
    constructor(x, y, vx, vy) { super(x, y, vx, vy); this.life = 5; }
    update(dt, knight, ledges) {
        super.update(dt, knight, ledges);
        this.life -= dt;
        if (this.life <= 0 || this.x < -30 || this.x > MountainLevel.size + 30) this.active = false;
    }
    draw(ctx) {
        const p = MountainLevel.palette;
        drawPixelRect(ctx, p.wing, this.x, this.y, 8, 8);
        drawPixelRect(ctx, p.eye, this.x + 2, this.y + 1, 4, 6);
        drawPixelRect(ctx, p.snow, this.x + 3, this.y + 2, 2, 3);
    }
}

class FrostBoss {
    constructor(x, y, platform) {
        this.x = x; this.y = y; this.platform = platform;
        this.width = 44; this.height = 52;
        this.hp = 1200; this.maxHp = 1200;
        this.dead = false; this.lastHitAttackId = -1; this.invulnerableTimer = 0;
        this.type = 'frostBoss'; this.state = 'idle'; this.timer = 1.2;
        this.attackCycle = 0; this.animFrame = 0; this.engaged = false; this.dir = -1;
    }
    update(dt, knight, shots) {
        this.animFrame += dt;
        this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
        if (!this.engaged && knight.y > this.platform.y + 100) return;
        this.engaged = true;
        bossBarContainer.classList.remove('hidden');
        bossBarContainer.querySelector('.glow-red').textContent = '❄ FROSTBOUND TITAN';
        bossHpText.textContent = `${Math.max(0, this.hp)} / ${this.maxHp} HP`;
        bossHpBar.style.width = `${Math.max(0, this.hp) / this.maxHp * 100}%`;
        const enraged = this.hp <= 600;
        this.timer -= dt;
        if (this.state === 'idle') {
            this.dir = knight.x > this.x ? 1 : -1;
            this.x += this.dir * (enraged ? 90 : 60) * dt;
            if (this.timer <= 0) {
                this.state = 'windup'; this.timer = enraged ? 0.45 : 0.7;
                this.attackCycle++;
                this.targetX = knight.x;
            }
        } else if (this.state === 'windup' && this.timer <= 0) {
            const mode = this.attackCycle % 3;
            if (mode === 0) {
                this.state = 'charge'; this.timer = 0.65;
                this.dir = this.targetX > this.x ? 1 : -1;
            } else {
                const count = enraged ? 9 : 7;
                for (let i = 0; i < count; i++) {
                    if (mode === 1) {
                        const angle = Math.atan2(knight.y + 10 - (this.y + 26), knight.x - (this.x + 22)) + (i - (count - 1) / 2) * 0.15;
                        shots.push(new FrostProjectile(this.x + 22, this.y + 26, Math.cos(angle) * 260, Math.sin(angle) * 260));
                    } else {
                        shots.push(new FrostProjectile(this.platform.x + 20 + i * (280 / (count - 1)), this.platform.y - 155, 0, enraged ? 250 : 190));
                    }
                }
                audio.playFireball();
                this.state = 'recover'; this.timer = enraged ? 0.5 : 0.85;
            }
        } else if (this.state === 'charge') {
            this.x += this.dir * (enraged ? 260 : 210) * dt;
            if (this.timer <= 0) { this.state = 'recover'; this.timer = 0.65; }
        } else if (this.state === 'recover' && this.timer <= 0) {
            this.state = 'idle'; this.timer = enraged ? 0.35 : 0.7;
        }
        this.x = Math.max(this.platform.x + 4, Math.min(this.platform.x + this.platform.w - this.width - 4, this.x));
    }
    draw(ctx) {
        if (this.dead) return;
        const p = MountainLevel.palette, x = Math.floor(this.x), y = Math.floor(this.y);
        drawPixelRect(ctx, p.rockDark, x + 3, y + 14, 38, 34);
        drawPixelRect(ctx, p.feather, x + 7, y + 7, 30, 37);
        drawPixelRect(ctx, p.snow, x + 10, y, 24, 24);
        drawPixelRect(ctx, p.eye, x + 10, y - 7, 5, 12);
        drawPixelRect(ctx, p.eye, x + 29, y - 7, 5, 12);
        drawPixelRect(ctx, this.hp <= 600 ? p.edge : p.eye, x + 14, y + 10, 5, 4);
        drawPixelRect(ctx, this.hp <= 600 ? p.edge : p.eye, x + 25, y + 10, 5, 4);
        drawPixelRect(ctx, p.rockDark, x + 17, y + 20, 12, 5);
        const arms = this.state === 'windup' ? -10 : Math.round(Math.sin(this.animFrame * 7) * 3);
        drawPixelRect(ctx, p.wing, x - 7, y + 18 + arms, 12, 23);
        drawPixelRect(ctx, p.wing, x + 38, y + 18 - arms, 12, 23);
        drawPixelRect(ctx, p.eye, x - 7, y + 36 + arms, 12, 5);
        drawPixelRect(ctx, p.eye, x + 38, y + 36 - arms, 12, 5);
        drawPixelRect(ctx, p.rockDark, x + 7, y + 44, 12, 8);
        drawPixelRect(ctx, p.rockDark, x + 26, y + 44, 12, 8);
        if (this.state === 'windup') {
            drawPixelRect(ctx, p.sun, x + 20, y - 23, 4, 9);
            drawPixelRect(ctx, p.sun, x + 20, y - 12, 4, 3);
            if (this.attackCycle % 3 === 2) {
                for (let i = 0; i < 9; i++) drawPixelRect(ctx, p.eye, this.platform.x + 18 + i * 35, this.platform.y - 3, 8, 3);
            }
        }
    }
}

MountainLevel.prepare().catch(error => console.error(error.message));