var canvas, context;

var snake = {
  tail: [
    {x: 3, y: 2, direction: 'H'},
    {x: 2, y: 2, direction: 'D2R'},
    {x: 2, y: 1, direction: 'L2D'},
    {x: 3, y: 1, direction: 'D2L'},
    {x: 3, y: 0, direction: 'R2D'},
    {x: 2, y: 0, direction: 'H'},
  ],
  vx: 1,
  vy: 0
};

var cookie = {x: -1, y: -1};
var fpsCounter = 0;
var moves = 0;
var lastMoveWithDirChange = -1;
var bufferedDirChange = -1;

var alive = true;
var gamePaused = false;
var score = 0;
var highScore = 0;

var GRID = {w: 15, h: 15};
var SPEED = 7;
var COOKIE_SPAWN_RATE = 10;
var CELL_SIZE = 20;
var COOKIE_SIZE = 8;
var COOKIE_PADDING = 6;
var CANVAS_WIDTH = CELL_SIZE * GRID.w;
var CANVAS_HEIGHT = CELL_SIZE * GRID.h;

var SNAKE_COLOR = '#3a3323';
var COOKIE_COLOR = '#2160ff';
var BG_COLOR = '#a2c000';

var isMobile = false;


function setupScreenDimensions() {
  var screenWidth = window.innerWidth;
  var screenHeight = window.innerHeight;
  var snakeDiv = document.getElementById('snake');
  var dpadDiv = document.getElementById('dpad');

  highScore = (localStorage['net.pretopia.SnakeIt.highScore'] > 0) ? localStorage['net.pretopia.SnakeIt.highScore'] : 0;

  if (screenWidth < screenHeight) {
    CELL_SIZE = Math.floor(screenWidth / GRID.w);
  }
  else {
    CELL_SIZE = Math.floor(screenHeight / GRID.h);
  }

  CANVAS_WIDTH = CELL_SIZE * GRID.w;
  CANVAS_HEIGHT = CELL_SIZE * GRID.h;
  COOKIE_SIZE = Math.floor(0.4 * CELL_SIZE);
  COOKIE_PADDING = Math.floor(CELL_SIZE - COOKIE_SIZE) / 2;

  snakeDiv.style.width = CANVAS_WIDTH + 'px';


  isMobile = /Android|webOS|iPhone|iPad|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    document.body.ontouchmove = function (e) {
      e.preventDefault();
    }
    dpadDiv.style.display = 'block';
    dpadDiv.style.width = CANVAS_WIDTH + 'px';
    dpadDiv.style.height = screenHeight - CANVAS_HEIGHT + 'px';
    document.getElementById('up').style.height = (screenHeight - CANVAS_HEIGHT) / 2 + 'px';
    document.getElementById('down').style.height = (screenHeight - CANVAS_HEIGHT) / 2 + 'px';
  }
}

function setupCanvas() {
  canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  context = canvas.getContext('2d');

  var div = document.getElementById('snake');
  div.appendChild(canvas);
}

function togglePauseGame() {
  if (gamePaused) window.requestAnimationFrame(mainLoop);
  lastMoveWithDirChange = -1;
  gamePaused = !gamePaused;
}

function gameOver() {
  lastMoveWithDirChange = -1;
  alive = false;

  if (score > highScore) {
    localStorage['net.pretopia.SnakeIt.highScore'] = score;
  }
}

function restartGame() {
  highScore = (localStorage['net.pretopia.SnakeIt.highScore'] > 0) ? localStorage['net.pretopia.SnakeIt.highScore'] : 0;

  alive = true;
  snake = {
    tail: [
      {x: 3, y: 2, direction: 'H'},
      {x: 2, y: 2, direction: 'D2R'},
      {x: 2, y: 1, direction: 'L2D'},
      {x: 3, y: 1, direction: 'D2L'},
      {x: 3, y: 0, direction: 'R2D'},
      {x: 2, y: 0, direction: 'H'},
    ],
    vx: 1,
    vy: 0
  };
  cookie = {x: -1, y: -1};
  fpsCounter = 0;
  score = 0;
  moves = 0;
  lastMoveWithDirChange = -1;
  bufferedDirChange = -1;

  mainLoop();
}

function handleKeyInput(key) {
  if (lastMoveWithDirChange == moves) {
    // key pressed too quickly after previous key press
    // buffering to be the first action after next frame refresh
    bufferedDirChange = key;
    return;
  }

  lastMoveWithDirChange = moves;

  if (isMobile && !alive) restartGame();

  switch (key) {
    case 27: // escape
      if (alive) {
        togglePauseGame();
      }
      else {
        restartGame();
      }
      break;
    case 38: // up
      if (snake.vx != 0) {
        snake.tail[0].direction = (snake.vx == 1) ? 'R2U' : 'L2U';
        snake.vx = 0;
        snake.vy = -1;
      }
      break;
    case 40: // down
      if (snake.vx != 0) {
        snake.tail[0].direction = (snake.vx == 1) ? 'R2D' : 'L2D';
        snake.vx = 0;
        snake.vy = 1;
      }
      break;
    case 37: // left
      if (snake.vy != 0) {
        snake.tail[0].direction = (snake.vy == 1) ? 'D2L' : 'U2L';
        snake.vx = -1;
        snake.vy = 0;
      }
      break;
    case 39: // right
      if (snake.vy != 0) {
        snake.tail[0].direction = (snake.vy == 1) ? 'D2R' : 'U2R';
        snake.vx = 1;
        snake.vy = 0;
      }
      break;
  }
}

function attachInputHandlers() {
  document.onkeydown = function (e) {
    var key = (window.event) ? window.event.keyCode : e.which;

    if (!isMobile && (!alive || gamePaused) && (key != 27)) return;

    handleKeyInput(key);
  }

  // touch
  document.getElementById('up').ontouchstart = function () {
    handleKeyInput(38);
  }
  document.getElementById('down').ontouchstart = function () {
    handleKeyInput(40);
  }
  document.getElementById('left').ontouchstart = function () {
    handleKeyInput(37);
  }
  document.getElementById('right').ontouchstart = function () {
    handleKeyInput(39);
  }
}

function render() {
  // background
  context.fillStyle = BG_COLOR;
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // cookie
  context.fillStyle = COOKIE_COLOR;
  context.fillRect(CELL_SIZE * cookie.x + COOKIE_PADDING,
                   CELL_SIZE * cookie.y + COOKIE_PADDING, COOKIE_SIZE, COOKIE_SIZE);

  // snake
  context.fillStyle = SNAKE_COLOR;

  for (var i = 0; i < snake.tail.length; i++) {
    switch (snake.tail[i].direction) {
      // straight horizontal part
      case 'H':
        context.fillRect(CELL_SIZE * snake.tail[i].x,
                         CELL_SIZE * snake.tail[i].y + 1,
                         CELL_SIZE,
                         CELL_SIZE - 2);
      break;
      // straight vertical part
      case 'V':
        context.fillRect(CELL_SIZE * snake.tail[i].x + 1,
                         CELL_SIZE * snake.tail[i].y,
                         CELL_SIZE - 2,
                         CELL_SIZE);
      break;
      // right-to-down corner
      // up-to-left corner
      case 'R2D':
      case 'U2L':
        context.fillRect(CELL_SIZE * snake.tail[i].x,
                         CELL_SIZE * snake.tail[i].y + 1,
                         CELL_SIZE - 1,
                         CELL_SIZE - 2);
        context.fillRect(CELL_SIZE * snake.tail[i].x + 1,
                         CELL_SIZE * snake.tail[i].y + CELL_SIZE - 1,
                         CELL_SIZE - 2,
                         1);
      break;
      // right-to-up corner
      // down-to-left corner
      case 'R2U':
      case 'D2L':
        context.fillRect(CELL_SIZE * snake.tail[i].x,
                         CELL_SIZE * snake.tail[i].y + 1,
                         CELL_SIZE - 1,
                         CELL_SIZE - 2);
        context.fillRect(CELL_SIZE * snake.tail[i].x + 1,
                         CELL_SIZE * snake.tail[i].y,
                         CELL_SIZE - 2,
                         1);
      break;
      // left-to-down corner
      // up-to-right corner
      case 'L2D':
      case 'U2R':
        context.fillRect(CELL_SIZE * snake.tail[i].x + 1,
                         CELL_SIZE * snake.tail[i].y + 1,
                         CELL_SIZE - 1,
                         CELL_SIZE - 2);
        context.fillRect(CELL_SIZE * snake.tail[i].x + 1,
                         CELL_SIZE * snake.tail[i].y + CELL_SIZE - 1,
                         CELL_SIZE - 2,
                         1);
      break;
      // left-to-up corner
      // down-to-right corner
      case 'L2U':
      case 'D2R':
        context.fillRect(CELL_SIZE * snake.tail[i].x + 1,
                         CELL_SIZE * snake.tail[i].y + 1,
                         CELL_SIZE - 1,
                         CELL_SIZE - 2);
        context.fillRect(CELL_SIZE * snake.tail[i].x + 1,
                         CELL_SIZE * snake.tail[i].y,
                         CELL_SIZE - 2,
                         1);
      break;
      default:
        // should never happen
        break;
    }
  }

  // score
  context.fillStyle = '#ffffff';
  context.textAlign = 'right';
  context.font = '20px Arial';
  context.fillText(score, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 30);

  // highScore
  if (highScore > 0) {
    context.font = '14px Arial';
    context.fillText('Best: ' + highScore, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 10)
  }

  // game over text
  if (!alive) {
    context.fillStyle = '#ff0000';
    context.textAlign = 'center';
    context.font = '36px Arial';
    context.fillText('GAME OVER' , CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    if (!isMobile) {
      context.font = '18px Arial';
      context.fillText('ESC to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
    }
  }
}

function bumpIntoSelf() {
  var head = {x: snake.tail[0].x, y: snake.tail[0].y};

  for (var i = 1; i < snake.tail.length; i++) {
    if (head.x == snake.tail[i].x && head.y == snake.tail[i].y) return true;
  }

  return false;
}

function spawnCookie() {
  cookie.x = Math.floor(Math.random() * GRID.w);
  cookie.y = Math.floor(Math.random() * GRID.h);

  for (var i = 0; i < snake.tail.length; i++) {
    if (cookie.x == snake.tail[i].x && cookie.y == snake.tail[i].y) spawnCookie();
  }
}

function eatCookie() {
  return (snake.tail[0].x == cookie.x && snake.tail[0].y == cookie.y);
}

function mainLoop() {
  var cookieEaten = false;

  if (!gamePaused && alive) window.requestAnimationFrame(mainLoop);

  if (fpsCounter % SPEED == 0) {
    fpsCounter = 0;
    moves++;

    for (var i = snake.tail.length - 1; i >= 0; i--) {
      if (i == 0) {
        snake.tail[0].x += snake.vx;
        snake.tail[0].y += snake.vy;

        switch (snake.tail[0].direction) {
          // H, V, R2D, R2U, L2D, L2U, D2R, D2L, U2R, U2L
          case 'R2D':
          case 'R2U':
          case 'L2D':
          case 'L2U':
            snake.tail[0].direction = 'V';
            break;
          case 'D2R':
          case 'D2L':
          case 'U2R':
          case 'U2L':
            snake.tail[0].direction = 'H';
            break;
          default:
            break;
        }

        if (snake.tail[0].x >= GRID.w) snake.tail[0].x = 0;
        if (snake.tail[0].x < 0) snake.tail[0].x = GRID.w - 1;
        if (snake.tail[0].y >= GRID.h) snake.tail[0].y = 0;
        if (snake.tail[0].y < 0) snake.tail[0].y = GRID.h - 1;

        if (eatCookie()) {
          cookie.x = -1;
          cookie.y = -1;
          cookieEaten = true;
        }
      }
      else {
        snake.tail[i].x = snake.tail[i-1].x;
        snake.tail[i].y = snake.tail[i-1].y;
        snake.tail[i].direction = snake.tail[i-1].direction;
      }
    }

    if (bumpIntoSelf()) gameOver();

    if (cookieEaten) {
      cookieEaten = false;
      snake.tail[snake.tail.length] = {x: snake.tail[0].x - snake.vx,
                                       y: snake.tail[0].y - snake.vy,
                                       direction: snake.tail[0].direction};
      score++;
    }

    // if there's a pending key press in the buffer, perform it right now
    if (bufferedDirChange > 0) {
      handleKeyInput(bufferedDirChange);
      bufferedDirChange = -1;
    }

    if (moves % COOKIE_SPAWN_RATE == 0 && cookie.x < 0) {
      spawnCookie();
    }

    render();
  }

  fpsCounter++;
}

setupScreenDimensions();
setupCanvas();
attachInputHandlers();
mainLoop();
