const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Variables
let gameState = {
  level: 1,
  score: 0,
  missCount: 0,
  lives: 3,
  isPaused: false,
  gameOver: false,
  won: false,
  playerName: 'Player',
  shotsFired: 0,
  gameStartTime: null,
  gameDuration: 0
};

let gameSettings = {
  enemySpeed: 1,
  enemyFireRate: 0.01,
  enemySpawnRate: 0.95
};

let gameOptions = {
  soundEnabled: true,
  missesCostPoints: true
};

// Leaderboard functions (server-based persistence)
let cachedLeaderboard = [];

async function getLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    cachedLeaderboard = await response.json();
    return cachedLeaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Fall back to cached version
    return cachedLeaderboard;
  }
}

async function saveToLeaderboard(playerName, score, stats = {}) {
  try {
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        playerName, 
        score,
        missCount: stats.missCount || 0,
        level: stats.level || 1,
        shotsFired: stats.shotsFired || 0,
        duration: stats.duration || 0
      })
    });
    
    if (!response.ok) throw new Error('Failed to save score');
    const updated = await response.json();
    cachedLeaderboard = updated;
    return updated;
  } catch (error) {
    console.error('Error saving to leaderboard:', error);
    return cachedLeaderboard;
  }
}

async function displayLeaderboard(elementId, highlightName = null) {
  const leaderboard = await getLeaderboard();
  const container = document.getElementById(elementId);
  
  if (leaderboard.length === 0) {
    container.innerHTML = '<p class="no-scores">No scores yet. Be the first!</p>';
    return;
  }
  
  let html = '';
  let topScoreMessage = '';
  
  leaderboard.forEach((entry, index) => {
    const isCurrentPlayer = entry.name === highlightName;
    const isTopScore = index === 0 && isCurrentPlayer;
    
    let entryClass = '';
    if (isCurrentPlayer) {
      entryClass = isTopScore ? ' highlight top-score' : ' highlight';
    }
    
    const mins = Math.floor(entry.duration / 60);
    const secs = entry.duration % 60;
    const durationDisplay = entry.duration ? `${mins}m ${secs}s` : '-';
    
    const crown = isTopScore ? '👑 ' : '';
    
    html += `
      <div class="leaderboard-entry${entryClass}">
        ${crown}<span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-name">${entry.name}</span>
        <span class="leaderboard-score">${entry.score}</span>
        <span class="leaderboard-level">Lvl: ${entry.level || 1}</span>
        <span class="leaderboard-duration">${durationDisplay}</span>
      </div>
    `;
    
    if (isTopScore) {
      topScoreMessage = '🎉 NEW TOP SCORE! 🎉';
    }
  });
  
  if (topScoreMessage) {
    html = `<p class="celebration-message">${topScoreMessage}</p>` + html;
  }
  
  container.innerHTML = html;
}

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Sound effect generator
function playSound(frequency, duration, type = 'sine') {
  if (!gameOptions.soundEnabled) return;
  
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Sound effects
function playShootSound() {
  playSound(400, 0.1, 'square');
}

function playHitSound() {
  playSound(800, 0.2, 'sine');
}

function playMissSound() {
  playSound(200, 0.15, 'sine');
}

function playDamageSound() {
  playSound(100, 0.3, 'square');
}

function playGameOverSound() {
  if (!gameOptions.soundEnabled) return;
  
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  
  // Descending glissando from 400Hz to 100Hz over 0.8 seconds
  const now = audioContext.currentTime;
  oscillator.frequency.setValueAtTime(400, now);
  oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.8);
  
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
  
  oscillator.start(now);
  oscillator.stop(now + 0.8);
}

// Player
const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 50,
  width: 50,
  height: 40,
  speed: 5,
  bullets: []
};

// Enemies
let enemies = [];
let enemyBullets = [];
let enemyDirection = 1;
let particles = [];

// Input
const keys = {};

// Event Listeners
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === ' ') e.preventDefault();
  if (e.key === 'p' || e.key === 'P') togglePause();
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('optionsBtn').addEventListener('click', openOptions);
document.getElementById('restartBtn').addEventListener('click', restartGame);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('restartGameBtn').addEventListener('click', restartGame);
document.getElementById('closeOptionsBtn').addEventListener('click', closeOptions);
document.getElementById('startGameBtn').addEventListener('click', startGame);
document.getElementById('soundToggle').addEventListener('change', (e) => {
  gameOptions.soundEnabled = e.target.checked;
});
document.getElementById('missesToggle').addEventListener('change', (e) => {
  gameOptions.missesCostPoints = e.target.checked;
});

// Start Game
function startGame() {
  const playerNameInput = document.getElementById('playerName');
  gameState.playerName = playerNameInput.value.trim() || 'Player';
  
  // Save player name for next time
  localStorage.setItem('lastPlayerName', gameState.playerName);
  
  document.getElementById('startScreen').classList.add('hidden');
  init();
  gameLoop();
}
function init() {
  gameState.level = 1;
  gameState.score = 0;
  gameState.missCount = 0;
  gameState.lives = 3;
  gameState.isPaused = false;
  gameState.gameOver = false;
  gameState.won = false;
  gameState.shotsFired = 0;
  gameState.gameStartTime = Date.now();
  gameState.gameDuration = 0;
  
  enemyDirection = 1;
  player.x = canvas.width / 2 - 25;
  player.y = canvas.height - 50;
  player.bullets = [];
  
  enemies = [];
  enemyBullets = [];
  particles = [];
  
  spawnEnemies();
  updateUI();
  
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('pauseScreen').classList.add('hidden');
}

// Spawn Enemies based on level
function spawnEnemies() {
  enemies = [];
  const rows = Math.min(3 + Math.floor(gameState.level / 3), 5);
  const cols = Math.min(6 + Math.floor(gameState.level / 2), 10);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      enemies.push({
        x: col * 70 + 40,
        y: row * 60 + 30,
        width: 40,
        height: 30,
        active: true,
        bullets: []
      });
    }
  }
  
  updateGameSettings();
}

// Update game settings based on level
function updateGameSettings() {
  gameSettings.enemySpeed = 1 + (gameState.level - 1) * 0.5;
  gameSettings.enemyFireRate = 0.01 + (gameState.level - 1) * 0.003;
  gameSettings.enemySpawnRate = 0.95 - (gameState.level - 1) * 0.02;
}

// Open Options
function openOptions() {
  document.getElementById('optionsScreen').classList.remove('hidden');
  gameState.isPaused = true;
}

// Close Options
function closeOptions() {
  document.getElementById('optionsScreen').classList.add('hidden');
  gameState.isPaused = false;
}

// Toggle Pause
function togglePause() {
  gameState.isPaused = !gameState.isPaused;
  const pauseScreen = document.getElementById('pauseScreen');
  const pauseBtn = document.getElementById('pauseBtn');
  
  if (gameState.isPaused) {
    pauseScreen.classList.remove('hidden');
    pauseBtn.textContent = 'Resume';
  } else {
    pauseScreen.classList.add('hidden');
    pauseBtn.textContent = 'Pause';
  }
}

// Update Game
function update() {
  if (gameState.isPaused || gameState.gameOver) return;
  
  // Update player position
  if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
  if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
  
  // Shoot
  if (keys[' ']) {
    if (player.bullets.length < 5) {
      player.bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        speed: 7
      });
      gameState.shotsFired++;
      playShootSound();
      keys[' '] = false; // Prevent rapid fire
    }
  }
  
  // Update player bullets
  player.bullets = player.bullets.filter(bullet => {
    bullet.y -= bullet.speed;
    
    // Check if bullet went off screen without hitting (miss)
    if (bullet.y < 0 && !bullet.hit && gameOptions.missesCostPoints) {
      gameState.missCount++;
      playMissSound();
    }
    
    return bullet.y > 0;
  });
  
  // Enemy logic
  let moveDown = false;
  
  enemies.forEach(enemy => {
    enemy.x += enemyDirection * gameSettings.enemySpeed;
    
    if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
      moveDown = true;
    }
  });
  
  if (moveDown) {
    enemyDirection *= -1;
    enemies.forEach(enemy => {
      enemy.y += 30;
    });
  }
  
  // Enemy shooting (max 3 bullets)
  if (enemyBullets.length < 3) {
    enemies.forEach(enemy => {
      if (Math.random() < gameSettings.enemyFireRate && enemy.active) {
        enemyBullets.push({
          x: enemy.x + enemy.width / 2 - 2,
          y: enemy.y + enemy.height,
          width: 4,
          height: 10,
          speed: 4
        });
      }
    });
  }
  
  // Update enemy bullets
  enemyBullets = enemyBullets.filter(bullet => {
    bullet.y += bullet.speed;
    return bullet.y < canvas.height;
  });
  
  // Collision detection - player bullets vs enemies
  player.bullets.forEach((bullet, bulletIndex) => {
    enemies.forEach((enemy, enemyIndex) => {
      if (isColliding(bullet, enemy)) {
        bullet.hit = true;
        player.bullets.splice(bulletIndex, 1);
        enemies.splice(enemyIndex, 1);
        gameState.score += 10 * gameState.level;
        playHitSound();
        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
      }
    });
  });
  

  
  // Collision detection - enemy bullets vs player
  enemyBullets = enemyBullets.filter(bullet => {
    if (isColliding(bullet, player)) {
      gameState.lives--;
      playDamageSound();
      createExplosion(player.x + player.width / 2, player.y + player.height / 2);
      return false;
    }
    return true;
  });
  
  // Check if all enemies defeated
  if (enemies.length === 0) {
    gameState.level++;
    spawnEnemies();
  }
  
  // Update particles
  particles = particles.filter(p => {
    p.life--;
    return p.life > 0;
  });
  
  // Check game over conditions
  if (gameState.lives <= 0) {
    gameState.gameOver = true;
    playGameOverSound();
    showGameOver(false);
  }
  
  if (enemies.some(e => e.y + e.height >= canvas.height)) {
    gameState.gameOver = true;
    playGameOverSound();
    showGameOver(false);
  }
  
  updateUI();
}

// Collision detection
function isColliding(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width &&
         rect1.x + rect1.width > rect2.x &&
         rect1.y < rect2.y + rect2.height &&
         rect1.y + rect1.height > rect2.y;
}

// Draw classic Space Invaders enemy
function drawSpaceInvader(x, y, width, height) {
  const cellSize = width / 8;
  
  // Define the classic Space Invaders pixel pattern
  const pattern = [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 0, 1, 1, 0, 1, 0],
    [0, 0, 1, 0, 0, 1, 0, 0]
  ];
  
  // Draw the alien with color variations
  pattern.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === 1) {
        const drawX = x + colIndex * cellSize;
        const drawY = y + rowIndex * cellSize;
        
        // Color variation based on position
        // Eyes are orange, body is red with yellow accents
        if ((colIndex === 2 || colIndex === 5) && (rowIndex === 1 || rowIndex === 2)) {
          // Eyes - orange
          ctx.fillStyle = '#ffaa00';
        } else if ((rowIndex === 3) || (rowIndex === 2 && (colIndex === 0 || colIndex === 7))) {
          // Lower body and side details - darker red
          ctx.fillStyle = '#cc0000';
        } else {
          // Main body - bright red
          ctx.fillStyle = '#ff0000';
        }
        
        ctx.fillRect(drawX, drawY, cellSize, cellSize);
      }
    });
  });
  
  // Add a subtle glow effect
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 8;
}

// Create explosion particles
function createExplosion(x, y) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 20,
      color: `hsl(${Math.random() * 60 + 20}, 100%, 50%)`
    });
  }
}

// Draw Game
function draw() {
  // Clear canvas
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw player
  ctx.fillStyle = '#00ff00';
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 10;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  
  // Draw player triangle on top
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.moveTo(player.x + player.width / 2, player.y - 10);
  ctx.lineTo(player.x, player.y);
  ctx.lineTo(player.x + player.width, player.y);
  ctx.closePath();
  ctx.fill();
  
  // Draw player bullets
  ctx.fillStyle = '#00ff00';
  player.bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
  
  // Draw enemies
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 10;
  enemies.forEach(enemy => {
    if (enemy.active) {
      drawSpaceInvader(enemy.x, enemy.y, enemy.width, enemy.height);
    }
  });
  

  
  // Draw enemy bullets
  ctx.fillStyle = '#ff0000';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 5;
  enemyBullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
  
  // Draw particles
  ctx.shadowColor = 'none';
  ctx.shadowBlur = 0;
  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 20;
    ctx.beginPath();
    ctx.arc(p.x + p.vx * (20 - p.life) / 20, p.y + p.vy * (20 - p.life) / 20, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  
  // Draw level indicator
  ctx.fillStyle = '#00ff00';
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 5;
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`Wave: ${gameState.level}`, 10, 25);
}

// Update UI
function updateUI() {
  const hitScore = gameState.score;
  const missPenalty = gameState.missCount * 5;
  const totalScore = gameOptions.missesCostPoints ? hitScore - missPenalty : hitScore;
  
  // Get high score from leaderboard
  const leaderboard = getLeaderboard();
  const highScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
  
  document.getElementById('playerDisplay').textContent = gameState.playerName;
  document.getElementById('highScore').textContent = highScore;
  document.getElementById('level').textContent = gameState.level;
  document.getElementById('hitScore').textContent = hitScore;
  document.getElementById('missCount').textContent = gameState.missCount;
  document.getElementById('misspenalty').textContent = missPenalty;
  document.getElementById('score').textContent = totalScore;
  document.getElementById('lives').textContent = gameState.lives;
}

// Show Game Over
async function showGameOver(won) {
  const modal = document.getElementById('gameOverScreen');
  const title = document.getElementById('gameOverTitle');
  const message = document.getElementById('gameOverMessage');
  const finalPlayer = document.getElementById('finalPlayer');
  const finalScore = document.getElementById('finalScore');
  const finalLevel = document.getElementById('finalLevel');
  
  if (won) {
    title.textContent = 'You Win!';
    message.textContent = 'Congratulations! You defeated all enemies!';
  } else {
    title.textContent = 'Game Over!';
    message.textContent = 'Better luck next time!';
  }
  
  finalPlayer.textContent = gameState.playerName;
  finalScore.textContent = gameState.score;
  finalLevel.textContent = gameState.level;
  
  // Calculate game duration in seconds
  gameState.gameDuration = Math.floor((Date.now() - gameState.gameStartTime) / 1000);
  
  // Save to leaderboard and display it (only if score > 0)
  if (gameState.score > 0) {
    await saveToLeaderboard(gameState.playerName, gameState.score, {
      missCount: gameState.missCount,
      level: gameState.level,
      shotsFired: gameState.shotsFired,
      duration: gameState.gameDuration
    });
  }
  await displayLeaderboard('gameOverLeaderboardList', gameState.playerName);
  
  modal.classList.remove('hidden');
}

// Restart Game
function restartGame() {
  init();
  gameLoop();
}

// Game Loop
function gameLoop() {
  update();
  draw();
  
  if (!gameState.gameOver) {
    requestAnimationFrame(gameLoop);
  }
}

// Initialize leaderboard and player name on page load
displayLeaderboard('startLeaderboardList');

// Load previous player name
const lastPlayerName = localStorage.getItem('lastPlayerName');
if (lastPlayerName) {
  document.getElementById('playerName').value = lastPlayerName;
}

// Add Enter key support for player name input
document.getElementById('playerName').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    startGame();
  }
});
