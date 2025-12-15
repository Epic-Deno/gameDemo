// 游戏画布和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 游戏状态
let gameRunning = true;
let score = 0;

// 玩家飞机
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    speed: 5,
    bullets: []
};

// 敌人飞机
let enemies = [];
let enemySpeed = 2;
let enemySpawnRate = 100; // 每100帧生成一个敌人
let frameCount = 0;

// 按键状态
const keys = {};

// 初始化游戏
function initGame() {
    gameRunning = true;
    score = 0;
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 60;
    player.bullets = [];
    enemies = [];
    enemySpeed = 2;
    frameCount = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('gameOver').style.display = 'none';
    gameLoop();
}

// 绘制玩家飞机
function drawPlayer() {
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // 绘制飞机细节
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(player.x + 15, player.y + 10, 20, 20);
}

// 绘制敌人飞机
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // 绘制敌人细节
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(enemy.x + 5, enemy.y + 5, 10, 10);
        ctx.fillRect(enemy.x + 25, enemy.y + 5, 10, 10);
    });
}

// 绘制子弹
function drawBullets() {
    player.bullets.forEach(bullet => {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

// 更新玩家位置
function updatePlayer() {
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
        player.x = Math.max(0, player.x - player.speed);
    }
    if (keys['ArrowRight'] || keys['d'] || keys['D']) {
        player.x = Math.min(canvas.width - player.width, player.x + player.speed);
    }
    if (keys['ArrowUp'] || keys['w'] || keys['W']) {
        player.y = Math.max(0, player.y - player.speed);
    }
    if (keys['ArrowDown'] || keys['s'] || keys['S']) {
        player.y = Math.min(canvas.height - player.height, player.y + player.speed);
    }
}

// 更新敌人
function updateEnemies() {
    // 生成新敌人
    if (frameCount % enemySpawnRate === 0) {
        const enemy = {
            x: Math.random() * (canvas.width - 40),
            y: -40,
            width: 40,
            height: 40,
            speed: enemySpeed
        };
        enemies.push(enemy);
    }
    
    // 更新敌人位置
    enemies.forEach((enemy, index) => {
        enemy.y += enemy.speed;
        
        // 敌人飞出屏幕，移除
        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
        }
    });
}

// 更新子弹
function updateBullets() {
    player.bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        
        // 子弹飞出屏幕，移除
        if (bullet.y < -bullet.height) {
            player.bullets.splice(index, 1);
        }
    });
}

// 发射子弹
function shootBullet() {
    const bullet = {
        x: player.x + player.width / 2 - 2.5,
        y: player.y,
        width: 5,
        height: 15,
        speed: 8
    };
    player.bullets.push(bullet);
}

// 碰撞检测
function checkCollisions() {
    // 子弹与敌人碰撞
    player.bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                // 碰撞发生，移除子弹和敌人
                player.bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                score += 10;
                document.getElementById('score').textContent = score;
                
                // 增加游戏难度
                if (score % 100 === 0) {
                    enemySpeed += 0.5;
                    if (enemySpawnRate > 30) {
                        enemySpawnRate -= 5;
                    }
                }
            }
        });
    });
    
    // 敌人与玩家碰撞
    enemies.forEach(enemy => {
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            // 游戏结束
            gameRunning = false;
            document.getElementById('finalScore').textContent = score;
            document.getElementById('gameOver').style.display = 'block';
        }
    });
}

// 清空画布
function clearCanvas() {
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制星星背景
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
        const x = (i * 137.5) % canvas.width;
        const y = (i * 197.5 + frameCount) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
}

// 游戏主循环
function gameLoop() {
    if (!gameRunning) return;
    
    clearCanvas();
    updatePlayer();
    updateEnemies();
    updateBullets();
    checkCollisions();
    drawPlayer();
    drawEnemies();
    drawBullets();
    
    frameCount++;
    requestAnimationFrame(gameLoop);
}

// 重新开始游戏
function restartGame() {
    initGame();
}

// 键盘事件监听
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === ' ' && gameRunning) {
        e.preventDefault();
        shootBullet();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 鼠标点击发射子弹
document.addEventListener('click', () => {
    if (gameRunning) {
        shootBullet();
    }
});

// 触摸事件支持（移动设备）
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    if (gameRunning) {
        shootBullet();
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x + deltaX * 0.1));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y + deltaY * 0.1));
    
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

// 初始化游戏
initGame();