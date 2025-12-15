const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const bgm = document.getElementById('bgm');

// 游戏配置
const TILE_SIZE = 30; // 格子大小
const ROWS = canvas.height / TILE_SIZE;
const COLS = canvas.width / TILE_SIZE;
const GAME_SPEED = 1000 / 60; // 60 FPS

// 游戏状态
let gameRunning = false;
let score = 0;
let keys = {};
let bullets = [];
let enemies = [];
let walls = [];
let spawnTimer = 0;

// 方向常量
const UP = 0, DOWN = 1, LEFT = 2, RIGHT = 3;

// 输入监听
document.addEventListener('keydown', e => keys[e.code] = true);
document.addEventListener('keyup', e => keys[e.code] = false);

// 基础类：游戏对象
class GameObject {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.color = color;
        this.markedForDeletion = false;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    getRect() {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }
}

// 坦克类
class Tank extends GameObject {
    constructor(x, y, color, isPlayer) {
        super(x, y, color);
        this.isPlayer = isPlayer;
        this.direction = UP;
        this.speed = isPlayer ? 3 : 1.5;
        this.cooldown = 0;
    }

    draw() {
        super.draw();
        // 画炮管
        ctx.fillStyle = '#999';
        let gunW = this.width / 4;
        let gunH = this.height / 2;
        let gunX = this.x + this.width / 2 - gunW / 2;
        let gunY = this.y;

        if (this.direction === UP) { gunY = this.y - 10; }
        if (this.direction === DOWN) { gunY = this.y + this.height - 10; }
        if (this.direction === LEFT) { 
            gunW = this.height / 2; gunH = this.width / 4;
            gunX = this.x - 10; gunY = this.y + this.height / 2 - gunH / 2;
        }
        if (this.direction === RIGHT) {
            gunW = this.height / 2; gunH = this.width / 4;
            gunX = this.x + this.width - 10; gunY = this.y + this.height / 2 - gunH / 2;
        }
        ctx.fillRect(gunX, gunY, gunW, gunH);
        
        // 如果是敌人，画个小红心
        if(!this.isPlayer) {
            ctx.fillStyle = 'black';
            ctx.fillRect(this.x + 10, this.y + 10, 10, 10);
        }
    }

    move() {
        let prevX = this.x;
        let prevY = this.y;

        if (this.direction === UP) this.y -= this.speed;
        if (this.direction === DOWN) this.y += this.speed;
        if (this.direction === LEFT) this.x -= this.speed;
        if (this.direction === RIGHT) this.x += this.speed;

        // 边界检查
        if (this.x < 0) this.x = 0;
        if (this.y < 0) this.y = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;

        // 墙体碰撞检查
        if (checkWallCollision(this) || checkEnemyCollision(this)) {
            this.x = prevX;
            this.y = prevY;
            // 如果是敌人，撞墙后随机转向
            if (!this.isPlayer) {
                this.changeDirectionRandomly();
            }
        }
    }

    shoot() {
        if (this.cooldown > 0) return;
        
        let bx = this.x + this.width / 2 - 4;
        let by = this.y + this.height / 2 - 4;
        
        // 子弹颜色
        let bColor = this.isPlayer ? '#ffff00' : '#ffaaaa';
        
        bullets.push(new Bullet(bx, by, this.direction, bColor, this.isPlayer));
        this.cooldown = 30; // 射击冷却
    }

    changeDirectionRandomly() {
        const dirs = [UP, DOWN, LEFT, RIGHT];
        this.direction = dirs[Math.floor(Math.random() * dirs.length)];
    }

    update() {
        if (this.cooldown > 0) this.cooldown--;
    }
}

// 子弹类
class Bullet extends GameObject {
    constructor(x, y, direction, color, fromPlayer) {
        super(x, y, color);
        this.width = 8;
        this.height = 8;
        this.direction = direction;
        this.speed = 6;
        this.fromPlayer = fromPlayer;
    }

    update() {
        if (this.direction === UP) this.y -= this.speed;
        if (this.direction === DOWN) this.y += this.speed;
        if (this.direction === LEFT) this.x -= this.speed;
        if (this.direction === RIGHT) this.x += this.speed;

        // 出界删除
        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.markedForDeletion = true;
        }
    }
}

// 墙壁类
class Wall extends GameObject {
    constructor(x, y) {
        super(x, y, '#a0522d'); // 砖块色
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
        // 画一点纹理
        ctx.strokeStyle = '#000';
        ctx.strokeRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
    }
}

// --- 游戏初始化与工具函数 ---

let player = new Tank(200, 500, '#2ecc71', true); // 绿色玩家

function initMap() {
    walls = [];
    // 简单的地图生成逻辑：生成一些随机墙壁
    for (let i = 0; i < 40; i++) {
        let wx = Math.floor(Math.random() * COLS) * TILE_SIZE;
        let wy = Math.floor(Math.random() * (ROWS - 5) + 2) * TILE_SIZE; // 避开出生点
        
        // 避免和玩家位置重叠
        if (Math.abs(wx - player.x) > 60 || Math.abs(wy - player.y) > 60) {
            walls.push(new Wall(wx, wy));
        }
    }
}

function checkRectIntersect(r1, r2) {
    return !(r2.x > r1.x + r1.w || 
             r2.x + r2.w < r1.x || 
             r2.y > r1.y + r1.h || 
             r2.y + r2.h < r1.y);
}

function checkWallCollision(obj) {
    let rect = obj.getRect();
    for (let w of walls) {
        if (checkRectIntersect(rect, w.getRect())) return true;
    }
    return false;
}

function checkEnemyCollision(tank) {
    // 防止坦克之间重叠
    let rect = tank.getRect();
    // 检查玩家
    if (!tank.isPlayer && checkRectIntersect(rect, player.getRect())) return true;
    
    // 检查其他敌人
    for (let e of enemies) {
        if (e !== tank && checkRectIntersect(rect, e.getRect())) return true;
    }
    return false;
}

// --- 核心循环 ---

function update() {
    // 1. 玩家逻辑
    if (keys['ArrowUp'] || keys['KeyW']) { player.direction = UP; player.move(); }
    else if (keys['ArrowDown'] || keys['KeyS']) { player.direction = DOWN; player.move(); }
    else if (keys['ArrowLeft'] || keys['KeyA']) { player.direction = LEFT; player.move(); }
    else if (keys['ArrowRight'] || keys['KeyD']) { player.direction = RIGHT; player.move(); }
    
    if (keys['Space']) { player.shoot(); }
    player.update();

    // 2. 敌人生成
    if (spawnTimer <= 0 && enemies.length < 5) {
        let ex = Math.floor(Math.random() * (COLS - 2) + 1) * TILE_SIZE;
        enemies.push(new Tank(ex, 0, '#e74c3c', false));
        spawnTimer = 150; // 生成间隔
    }
    spawnTimer--;

    // 3. 敌人逻辑
    enemies.forEach(enemy => {
        // 简单的AI：有概率改变方向，否则一直走
        if (Math.random() < 0.02) enemy.changeDirectionRandomly();
        enemy.move();
        enemy.update();
        // 简单的AI：随机射击
        if (Math.random() < 0.03) enemy.shoot();
    });

    // 4. 子弹逻辑
    bullets.forEach(b => {
        b.update();
        let bRect = b.getRect();

        // 子弹打墙
        for (let i = 0; i < walls.length; i++) {
            if (checkRectIntersect(bRect, walls[i].getRect())) {
                b.markedForDeletion = true;
                walls.splice(i, 1); // 墙被破坏
                break;
            }
        }

        // 子弹打人
        if (b.fromPlayer) {
            // 玩家子弹打敌人
            for (let i = 0; i < enemies.length; i++) {
                if (checkRectIntersect(bRect, enemies[i].getRect())) {
                    b.markedForDeletion = true;
                    enemies.splice(i, 1);
                    score += 100;
                    scoreEl.innerText = score;
                    break;
                }
            }
        } else {
            // 敌人子弹打玩家
            if (checkRectIntersect(bRect, player.getRect())) {
                gameOver();
            }
        }
    });

    // 清理子弹
    bullets = bullets.filter(b => !b.markedForDeletion);
}

function draw() {
    // 清空画布
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 画墙
    walls.forEach(w => w.draw());

    // 画子弹
    bullets.forEach(b => b.draw());

    // 画敌人
    enemies.forEach(e => e.draw());

    // 画玩家
    player.draw();
}

function loop() {
    if (!gameRunning) return;
    update();
    draw();
    requestAnimationFrame(loop);
}

function startGame() {
    score = 0;
    scoreEl.innerText = 0;
    player = new Tank(200, 500, '#2ecc71', true);
    bullets = [];
    enemies = [];
    spawnTimer = 0;
    initMap();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
    
    // 尝试播放音乐
    bgm.currentTime = 0;
    bgm.play().catch(error => {
        console.log("音频播放失败 (可能是文件不存在或浏览器限制):", error);
    });

    loop();
}

function gameOver() {
    gameRunning = false;
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
    bgm.pause();
}

// 绑定开始按钮
document.getElementById('startBtn').addEventListener('click', startGame);