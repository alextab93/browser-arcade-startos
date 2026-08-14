/* net.pretopia.BounceIt
 *
 * Copyright (c) 2011, Thijs van As <t.vanas@gmail.com>
 *
 * http://pretopia.net
 * http://pretopia.googlecode.com
 *
 * bounceit.js
 */

/* Note 2016/01/17:
 *
 * Switched from setInterval / clearInterval implementation to
 * requestAnimationFrame / cancelAnimationFrame implementaiton.
 *
 * Some stuff related to CORELOOP_INTERVAL and NYM_CYCLES_IN_SECOND
 * is still related to the old implementation
 */

/* create/check namespace net.pretopia.BounceIt */
var net;
if (!net) {
	net = {};
}
else if (typeof net != 'object') {
	throw new Error('net already exists and is not an object');
}

if (!net.pretopia) {
	net.pretopia = {};
}
else if (typeof net.pretopia != 'object') {
	throw new Error('net.pretopia already exists and is not an object');
}

if (net.pretopia.BounceIt) {
	throw new Error('net.pretopia.BounceIt already exists');
}

/* end of namespace initialization, actual code begins here */
net.pretopia.BounceIt = function (div) {
	var BounceIt_ID = div != null && div != '' ? div : 'BounceItInstance';
	var gameCanvas = null;
	var gameContext = null;
	var timerId = 0;
	var CORELOOP_INTERVAL = 30;
	var VERSION = '1.0';
	var ISTOUCHDEVICE = false;

	var PLATFORM_TYPE_BASE = 0;
	var PLATFORM_TYPE_NORMAL = 1;
	var PLATFORM_TYPE_SIDE = 2;
	var PLATFORM_TYPE_FAST = 3;

	var POWERUP_TYPE_BOOST = 0;
	var POWERUP_TYPE_SLOWMOTION = 1;
	var POWERUP_TYPE_BONUS = 2;
	var POWERUP_TYPE_BASEPLATFORM = 3;
	var POWERUP_TYPE_BOMB = 4;

	//var FPS_RATE_LIMITER = 1000 / CORELOOP_INTERVAL;
	var FPS_RATE_LIMITER = 20;
	var SLOWMOTION_DURATION = 4 * FPS_RATE_LIMITER; // 4 seconds

	/* load image files */
	var transparentStarImage = new Image();
	transparentStarImage.src = 'img/transparent-star.png';

	var leftButtonImage = new Image();
	leftButtonImage.src = 'img/left.png';

	var rightButtonImage = new Image();
	rightButtonImage.src = 'img/right.png';

	var slowMotionImage = new Image();
	slowMotionImage.src = 'img/hourglass.png';

	var slowMotionMiniImage = new Image();
	slowMotionMiniImage.src = 'img/hourglass-mini.png';

	var boostImage = new Image();
	boostImage.src = 'img/star.png';

	var ballImage = new Image();
	ballImage.src = 'img/ball.png';

	var bonusImage = new Image();
	bonusImage.src = 'img/500.png';

	var basePlatformImage = new Image();
	basePlatformImage.src = 'img/base.png';

	var bombImage = new Image();
	bombImage.src = 'img/bomb.png';

	var relativeHeight = 0;
	var STEP_DIVIDER = 40;
	var LRSPEED = 7;
	var GAME_AREA_HEIGHT = 420;
	var GAME_AREA_WIDTH = 320;
	var PLATFORM_WIDTH = 80;
	var PLATFORM_HEIGHT = 10;
	var NUM_PLATFORMS = 0;
	var BALL_RADIUS = 9;
	var BALL_AMPLITUDE = 150;

	var goLeft = false;
	var goRight = false;

	var Platforms = null;
	var Powerups = null;
	var ball = null;
	var highScore = 0;
	var score = 0;
	var time = 0;
	var boosts = 0;
	var slowMotionStart = 0;
	var slowMotionFactor = 1;
	var spawnBasePlatform = false;
	var bombEnabled = false;
	var isStarting = true;
	var bombDisappearSpeed = 15;

	var coolDownPowerUp = 0;
	var coolDownBoost = 0;
	var coolDownSlowMotion = 0;
	var coolDownBonus = 0;
	var coolDownBasePlatform = 0;
	var coolDownBomb = 0;

	var gravityLookup = [];
	var gravityLookupLength = 0;

	/* user input */
	var accelerometerEnabled = false;
	var attachKeyboard = true;
	var attachTouchControls = true;
	var attachAccelerometer = false;
	var selectedMenuOption = 0;
	var selectedOptionPause = 1;

	var textGradient = null;

	var gamePaused = false;

	var cheat = false;
	var konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // u, u, d, d, l, r, l, r, b, a
	var konamiCount = 0;

	/* background */
	var rgb = [0xee, 0xee, 0xee];
	var rgbIndex = 0;
	var channelChangeTime = 500; // clarification of these vlues in loadGame()
	var threeChannelChangeTime = 1500;
	var stepSize = 2.9;
	var countColorUp = false;

	/* rate limiter */
	var now;
	var elapsed;
	var then = Date.now();

	/* populate the gravityLookup array, a lookup table for the bounce behavior */
	function _populateGravityLookup() {
		gravityLookup = [];
		var stepSize = Math.PI / STEP_DIVIDER;
		var amplitude = BALL_AMPLITUDE;

		for (var i = 0; i < Math.PI; i += stepSize) {
			gravityLookup[gravityLookup.length] = Math.round(Math.sin(i) * amplitude);
		}

		gravityLookupLength = gravityLookup.length;
	}

	/* get the left X-coordinate of an element */
	function _getLeftXCoordinate(element) {
		var x = element.offsetLeft;

		while ((element = element.offsetParent)) {
			x += element.offsetLeft;
		}

		return x;
	}

	/* get the top Y-coordinate of an element */
	function _getTopYCoordinate(element) {
		var y = element.offsetTop;

		while ((element = element.offsetParent)) {
			y += element.offsetTop;
		}

		return y;
	}

	/* check if device is touch device */
	function _isTouchDevice() {
		try {
			document.createEvent('TouchEvent');
			return true;
		} catch (e) {
			return false;
		}
	}

	/* clear the screen */
	function _clearScreen() {
		gameContext.save();

		if (time % threeChannelChangeTime == 0) {
			countColorUp = !countColorUp;
		}

		if (time % channelChangeTime == 0) {
			rgbIndex = rgbIndex == rgb.length - 1 ? 0 : rgbIndex + 1;
		}

		// calculate the new background color
		// cycle over the 3 channels (RGB), each start at 0xee, go down to 0x44, then go back up
		var calcColor = Math.floor(0xee - (time % channelChangeTime) / stepSize);
		var color = countColorUp ? 0x44 + 0xee - calcColor : calcColor;
		rgb[rgbIndex] = color;
		var backgroundColor = '#' + rgb[0].toString(16) + rgb[1].toString(16) + rgb[2].toString(16);

		gameContext.fillStyle = backgroundColor;
		gameContext.fillRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);
		gameContext.restore();
	}

	/* initialize timer */
	function initTimer() {
		timerId = requestAnimationFrame(coreLoop);
	}

	/* attach menu event handlers for keyboard controls */
	function _attachKeyboardHandlersMenu() {
		document.onkeydown = function (e) {
			var key = window.event ? window.event.keyCode : e.which;

			switch (key) {
				case 13:
				// enter
				// explicit fallthrough
				case 32:
					// space bar
					switch (selectedMenuOption) {
						case 0:
							// start game
							loadGame();
							return;
						case 1:
							// instructions
							loadInstructions();
							return;
						default:
							return;
					}
					break;
				case 38:
					// up arrow
					if (selectedMenuOption > 0) {
						selectedMenuOption--;
					}
					else {
						selectedMenuOption = 1;
					}
					break;
				case 40:
					// down arrow
					if (selectedMenuOption < 1) {
						selectedMenuOption++;
					}
					else {
						selectedMenuOption = 0;
					}
					break;
				default:
					return;
			}

			loadMenu();
			return false;
		};
	}

	/* handle accelerometer input */
	function _attachAccelerometerHandlers() {
		window.ondevicemotion = function (event) {
			goRight = goLeft = false;
			switch (window.orientation) {
				case 0:
					ball.ax = event.accelerationIncludingGravity.x;
					break;
				case 180:
					ball.ax = -event.accelerationIncludingGravity.x;
					break;
				case -90:
					ball.ax = event.accelerationIncludingGravity.y;
					break;
				case 90:
					ball.ax = -event.accelerationIncludingGravity.y;
					break;
				default:
					break;
			}

			if (ball.ax > 0.7) {
				goRight = true;
			}
			if (ball.ax < -0.7) {
				goLeft = true;
			}
		};
	}

	/* handle keyboard input */
	function _attachKeyboardHandlers() {
		document.onkeydown = function (e) {
			var key = window.event ? window.event.keyCode : e.which;

			if (key != konamiCode[konamiCount++]) {
				konamiCount = 0;
			}
			else if (konamiCount == konamiCode.length) {
				konamiCount = 0;
				cheat = true;
			}

			switch (key) {
				case 27:
					// escape
					togglePauseGame();
					return;
					break;
				case 32:
					// space bar
					if (boosts > 0) {
						boosts--;
						ball.base = ball.y;
						relativeHeight = 1;
					}
					break;
				case 37:
					// left arrow
					goLeft = true;
					break;
				case 39:
					// right arrow
					goRight = true;
					break;
				default:
					return;
			}

			return false;
		};

		document.onkeyup = function (e) {
			var key = window.event ? window.event.keyCode : e.which;

			switch (key) {
				case 37:
					// left arrow
					goLeft = false;
					break;
				case 39:
					// right arrow
					goRight = false;
					break;
				default:
					return;
			}

			return false;
		};
	}

	/* attach pause-game event handlers for keyboard controls */
	function _attachKeyboardHandlersPause() {
		document.onkeydown = function (e) {
			var key = window.event ? window.event.keyCode : e.which;

			switch (key) {
				case 27:
					// escape
					selectedOptionPause = 1;
					togglePauseGame();
					break;
				case 13:
				// enter
				// explicit fallthrough
				case 32:
					// space bar
					switch (selectedOptionPause) {
						case 0:
							// main menu
							cancelAnimationFrame(timerId);
							timerId = 0;
							gamePaused = false;

							if (attachAccelerometer) {
								window.ondevicemotion = null;
							}

							loadMenu();
							break;
						case 1:
							// return to game
							togglePauseGame();
							break;
					}
					selectedOptionPause = 1;
					return false;
					break;
				case 37:
				// left arrow
				// explicit fallthrough
				case 39:
					// right arrow
					selectedOptionPause = selectedOptionPause ? 0 : 1;
					gameContext.save();
					gameContext.strokeStyle = selectedOptionPause == 0 ? '#ffffff' : '#000000';
					gameContext.strokeRect((GAME_AREA_WIDTH >> 1) - 150 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);
					gameContext.strokeStyle = selectedOptionPause == 1 ? '#ffffff' : '#000000';
					gameContext.strokeRect((GAME_AREA_WIDTH >> 1) + 10 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);
					gameContext.restore();
					return false;
					break;
				default:
					break;
			}
		};
	}

	/* handle touch input */
	function touchHandler(e) {
		goLeft = goRight = false;

		if (e.type == 'touchstart') {
			var touch = e.touches[0];
			var thirdWidth = GAME_AREA_WIDTH / 3;
			var xCanvas = _getLeftXCoordinate(gameCanvas);
			var yCanvas = _getTopYCoordinate(gameCanvas);

			if (touch.pageX - xCanvas >= GAME_AREA_WIDTH - 50 && touch.pageY - yCanvas >= GAME_AREA_HEIGHT - 50 && !gamePaused) {
				// tap on the pause icon to pause the game
				togglePauseGame();
			}
			if (!attachAccelerometer && touch.pageX - xCanvas < thirdWidth) {
				// tap on the left side of the screen to move ball to the left
				goLeft = true;
			}
			else if (!attachAccelerometer && touch.pageX - xCanvas > 2 * thirdWidth) {
				// tap on the right side of the screen to move the ball to the right
				goRight = true;
			}
			else {
				// tap in the middle to invoke a boost
				if (boosts > 0) {
					boosts--;
					ball.base = ball.y;
					relativeHeight = 1;
				}
			}
		}
	}

	/* event handler for mouse clicks during the game */
	function inGameClick(e) {
		var mouseX = e.pageX - _getLeftXCoordinate(gameCanvas);
		var mouseY = e.pageY - _getTopYCoordinate(gameCanvas);

		if (mouseX >= GAME_AREA_WIDTH - 40 && mouseY >= GAME_AREA_HEIGHT - 40 && !gamePaused) {
			togglePauseGame();
		}
	}

	/* event handler for mouse clicks/touches in menu */
	function menuTouchClick(e) {
		var sensor = e.touches != undefined ? e.touches[0] : e;
		var mouseX = sensor.pageX - _getLeftXCoordinate(gameCanvas);
		var mouseY = sensor.pageY - _getTopYCoordinate(gameCanvas);
		var fontSize = GAME_AREA_HEIGHT / 10;

		touchControlsInUse = e.touches != undefined ? true : false;

		// Start Game
		if (mouseX > (GAME_AREA_WIDTH >> 1) - startTxtOffset &&
			mouseX < (GAME_AREA_WIDTH >> 1) + startTxtOffset &&
			mouseY > (GAME_AREA_HEIGHT >> 1) - fontSize + 10 &&
			mouseY < (GAME_AREA_HEIGHT >> 1) + 10) {
			loadGame();
		}
		// Instructions
		else if (mouseX > (GAME_AREA_WIDTH >> 1) - instrTxtOffset &&
			mouseX < (GAME_AREA_WIDTH >> 1) + instrTxtOffset &&
			mouseY > (GAME_AREA_HEIGHT >> 1) + 20 &&
			mouseY < (GAME_AREA_HEIGHT >> 1) + 1.5 * fontSize + 10) {
			loadInstructions();
		}
		// About
		else if (mouseX > GAME_AREA_WIDTH - 200 && mouseY > GAME_AREA_HEIGHT - 30) {
			window.location = '/';
		}
		// toggle sound fx
		else if (accelerometerEnabled && mouseX < 35 && mouseY > GAME_AREA_HEIGHT - 35) {
			attachAccelerometer = !attachAccelerometer;
			loadMenu();
		}
	}

	/* event handler for mouse clicks/touches in pause screen */
	function pauseTouchClick(e) {
		var sensor = e.touches != undefined ? e.touches[0] : e;
		var mouseX = sensor.pageX - _getLeftXCoordinate(gameCanvas);
		var mouseY = sensor.pageY - _getTopYCoordinate(gameCanvas);

		// main menu
		if (mouseX >= (GAME_AREA_WIDTH >> 1) - 150 && mouseX < (GAME_AREA_WIDTH >> 1) - 10 && mouseY >= (GAME_AREA_HEIGHT >> 1) + 25 && mouseY < (GAME_AREA_HEIGHT >> 1) + 75) {
			cancelAnimationFrame(timerId);
			timerId = 0;
			gamePaused = false;

			if (attachAccelerometer) {
				window.ondevicemotion = null;
			}

			loadMenu();
		}
		// return to game
		else if (mouseX >= (GAME_AREA_WIDTH >> 1) + 10 && mouseX < (GAME_AREA_WIDTH >> 1) + 150 && mouseY >= (GAME_AREA_HEIGHT >> 1) + 25 && mouseY < (GAME_AREA_HEIGHT >> 1) + 75) {
			togglePauseGame();
		}
	}

	/* display a game progress message */
	function showMessage(message, isBanner) {
		gameContext.save();

		gameContext.textAlign = 'center';

		if (isBanner) {
			gameContext.fillStyle = 'rgba(0, 0, 0, 0.8)';
			gameContext.fillRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);
			gameContext.lineWidth = 3;
			gameContext.strokeStyle = '#ffffff';

			gameContext.font = '60px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillStyle = textGradient;

			gameContext.strokeText(message, GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) - 20);
			gameContext.fillText(message, GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) - 20);
		}
		else {
			gameContext.font = '18px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillStyle = '#f0f0f0';

			gameContext.fillText(message, GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + 40);
		}

		gameContext.restore();
	}

	/* pause the game */
	function togglePauseGame(forceValue) {
		// forceValue is used to toggle pause from an external event, like a orientation
		// change on a mobile device
		if (forceValue != undefined && typeof forceValue != 'object') {
			if (forceValue == gamePaused || timerId == 0) {
				// game is already paused
				return;
			}

			gamePaused = !forceValue;
		}

		if (!gamePaused) {
			gamePaused = true;
			//drawPad();
			showMessage('Paused', true);
			//clearPad();

			gameCanvas.removeEventListener('click', inGameClick, false);
			gameCanvas.removeEventListener('touchstart', touchHandler, false);
			gameCanvas.removeEventListener('touchend', touchHandler, false);

			if (!ISTOUCHDEVICE) {
				gameCanvas.addEventListener('click', pauseTouchClick, false);
			}

			if (attachKeyboard) {
				_attachKeyboardHandlersPause();
			}

			if (attachTouchControls) {
				gameCanvas.addEventListener('touchstart', pauseTouchClick, false);
			}

			gameContext.save();

			var buttonGradient = gameContext.createLinearGradient(0, (GAME_AREA_HEIGHT >> 1) + 25, 0, (GAME_AREA_HEIGHT >> 1) + 75);
			buttonGradient.addColorStop(0, '#222222');
			buttonGradient.addColorStop(0.5, '#333333');
			buttonGradient.addColorStop(1, '#aaaaaa');
			gameContext.fillStyle = buttonGradient;

			// main menu button
			gameContext.fillRect((GAME_AREA_WIDTH >> 1) - 150 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);
			gameContext.strokeStyle = attachKeyboard && selectedOptionPause == 0 ? '#000000' : '#ffffff';
			gameContext.strokeRect((GAME_AREA_WIDTH >> 1) - 150 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);
			gameContext.strokeStyle = attachKeyboard && selectedOptionPause == 0 ? '#ffffff' : '#000000';
			gameContext.strokeRect((GAME_AREA_WIDTH >> 1) - 150 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);

			// return to game button
			gameContext.fillRect((GAME_AREA_WIDTH >> 1) + 10 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);
			gameContext.strokeStyle = attachKeyboard && selectedOptionPause == 1 ? '#000000' : '#ffffff';
			gameContext.strokeRect((GAME_AREA_WIDTH >> 1) + 10 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);
			gameContext.strokeStyle = attachKeyboard && selectedOptionPause == 1 ? '#ffffff' : '#000000';
			gameContext.strokeRect((GAME_AREA_WIDTH >> 1) + 10 + 0.5, (GAME_AREA_HEIGHT >> 1) + 25, 140, 50);

			// text in buttons
			gameContext.fillStyle = '#f0f0f0';
			gameContext.textAlign = 'center';
			gameContext.font = '18px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillText('Main Menu', (GAME_AREA_WIDTH >> 1) - 80 + 0.5, (GAME_AREA_HEIGHT >> 1) + 55);
			gameContext.fillText('Return to Game', (GAME_AREA_WIDTH >> 1) + 80 + 0.5, (GAME_AREA_HEIGHT >> 1) + 55);

			gameContext.restore();
		}
		else {
			_clearScreen();

			// remove event listeners for buttons
			gameCanvas.removeEventListener('click', pauseTouchClick, false);
			gameCanvas.removeEventListener('touchstart', pauseTouchClick, false);

			// add game event listeners
			if (!ISTOUCHDEVICE) {
				gameCanvas.addEventListener('click', inGameClick, false);
			}

			if (attachKeyboard) {
				_attachKeyboardHandlers();
			}

			if (attachTouchControls) {
				gameCanvas.addEventListener('touchstart', touchHandler, false);
				gameCanvas.addEventListener('touchend', touchHandler, false);
			}

			gamePaused = false;
		}
	}

	/* class Powerup */
	function Powerup(type) {
		this.type = type;
		this.width = 40;
		this.height = 40;
		this.vx = 0;
		this.x = Math.random() * (GAME_AREA_WIDTH - this.width);
		this.vy = 4;
		this.y = -this.height;

		if (this.x < 0) {
			this.x = 0;
		}

		if (time > 1000) {
			this.vy += 1;
		}
		else if (time > 1500) {
			this.vy += 2;
		}
		else if (time > 2000) {
			this.vy += 3;
		}
		else if (time > 2500) {
			this.vy += 4;
		}

		this.invoked = false;

		this.invoke = function () {
			if (!this.invoked) {
				this.invoked = true;
				switch (this.type) {
					case POWERUP_TYPE_BOOST:
						boosts++;
						break;
					case POWERUP_TYPE_SLOWMOTION:
						slowMotionStart = time;
						slowMotionFactor = 2;
						bombEnabled = false;
						break;
					case POWERUP_TYPE_BONUS:
						score += 500;
						break;
					case POWERUP_TYPE_BASEPLATFORM:
						spawnBasePlatform = true;
						break;
					case POWERUP_TYPE_BOMB:
						bombEnabled = true;
						break;
					default:
						break;
				}
			}
		};

		this.draw = function () {
			if (!this.invoked) {
				switch (this.type) {
					case POWERUP_TYPE_BOOST:
						gameContext.drawImage(boostImage, this.x, this.y);
						break;
					case POWERUP_TYPE_SLOWMOTION:
						gameContext.drawImage(slowMotionImage, this.x, this.y);
						break;
					case POWERUP_TYPE_BONUS:
						gameContext.drawImage(bonusImage, this.x, this.y);
						break;
					case POWERUP_TYPE_BASEPLATFORM:
						gameContext.drawImage(basePlatformImage, this.x, this.y);
						break;
					case POWERUP_TYPE_BOMB:
						gameContext.drawImage(bombImage, this.x, this.y);
						break;
					default:
						return;
				}
			}
		};
	}

	/* class Platform */
	function Platform(x, y, type) {
		this.type = type;

		this.vx = type == PLATFORM_TYPE_SIDE ? 3 : 0;
		this.vy = type == PLATFORM_TYPE_FAST ? 3 : 2;

		if (STEP_DIVIDER != 32) {
			// iPhone 4 speed hack
			this.vy += 2;
		}

		this.widthOffset = type == PLATFORM_TYPE_BASE ? 0 : 3; // widthOffset = number of pixels used for curved side of platform)
		this.width = PLATFORM_WIDTH - 2 * this.widthOffset;
		this.height = PLATFORM_HEIGHT;

		this.x = x;
		this.y = y - this.height;

		this.spawnedNew = false;

		this.draw = function () {
			// gradient used for the platform
			var platformGradient = gameContext.createLinearGradient(0, this.y, 0, this.y + this.height);
			switch (this.type) {
				case PLATFORM_TYPE_BASE:
					platformGradient.addColorStop(0, '#f0f0f0');
					break;
				case PLATFORM_TYPE_NORMAL:
					platformGradient.addColorStop(0, '#666666');
					break;
				case PLATFORM_TYPE_SIDE:
					platformGradient.addColorStop(0, '#0000bb');
					break;
				case PLATFORM_TYPE_FAST:
					platformGradient.addColorStop(0, '#bb0000');
					break;
				default:
					platformGradient.addColorStop(0, '#888888');
					break;
			}
			platformGradient.addColorStop(1, '#000000');

			gameContext.beginPath();
			gameContext.strokeStyle = platformGradient;
			gameContext.lineWidth = this.height;
			gameContext.lineCap = 'round';
			gameContext.moveTo(this.x + this.widthOffset + this.width / 40, this.y + this.height / 2);
			gameContext.lineTo(this.x + this.widthOffset + this.width - this.width / 40, this.y + this.height / 2);
			gameContext.stroke();
		};
	}

	/* class Ball */
	function Ball() {
		this.ax = 0;
		this.x = 0;
		this.y = 0;
		this.vy = 0;
		this.base = 0;
		this.radius = BALL_RADIUS;
		this.circumference = 2 * Math.PI;

		this.draw = function () {
			gameContext.drawImage(ballImage, this.x - BALL_RADIUS, this.y - BALL_RADIUS);
		};
	}

	function coreLoop() {
		timerId = requestAnimationFrame(coreLoop);

		now = Date.now();
		elapsed = now - then;

		if (elapsed < FPS_RATE_LIMITER) {
			return;
		}
		else {
			then = now - (elapsed % FPS_RATE_LIMITER);
		}

		if (gamePaused) {
			return;
		}

		if (relativeHeight != 0) {
			if (relativeHeight >= gravityLookupLength) {
				relativeHeight = 0;
			}
			else {
				ball.vy = ball.base - gravityLookup[relativeHeight] - ball.y;
				relativeHeight++;
			}
		}

		time++;

		if (slowMotionStart && time - slowMotionStart > SLOWMOTION_DURATION) {
			// disable SLOWMOTION powerup
			slowMotionStart = 0;
			slowMotionFactor = 1;
		}

		ball.y += ball.vy;

		// current ball properties, save locally for speedup
		var ballX = ball.x;
		var ballVX = ball.vx;
		var ballVY = ball.vy;
		var ballRadius = ball.radius;

		_clearScreen();

		score++;

		gameContext.save();

		// canvas text is slow on mobile devices

		if (!ISTOUCHDEVICE) {
			gameContext.lineWidth = 3;
			gameContext.strokeStyle = '#ffffff';
			gameContext.font = '24px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.textAlign = 'right';

			gameContext.strokeText(score, GAME_AREA_WIDTH - 10, 30);

			gameContext.font = '14px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.lineWidth = 2;
			gameContext.strokeText(highScore, GAME_AREA_WIDTH - 10, 50);
			gameContext.font = '24px Futura-CondensedExtraBold, Impact, Helvetica';
		}

		if (cheat) {
			var message = 'CHEATER';
			gameContext.save();
			gameContext.lineWidth = 3;
			gameContext.strokeStyle = '#ffffff';

			gameContext.font = '60px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillStyle = textGradient;
			gameContext.textAlign = 'center';

			gameContext.strokeText(message, GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);
			gameContext.fillText(message, GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);
			gameContext.restore();
		}

		// Platforms to be removed because they are not visible anymore
		var toBeRemoved = [];
		var j = 0;
		var currentPlatform = null;
		var currPlX = 0;
		var currPlY = 0;
		var currPlVx = 0;
		var currPlVy = 0;
		var currPlWidth = 0;
		var currPlHeight = 0;
		var numPlatforms = Platforms.length;

		// cycle over all spawned platforms
		for (var i = 0; i < numPlatforms; i++) {
			// object dereferencing is expensive, so do it only once
			currentPlatform = Platforms[i];
			currPlX = currentPlatform.x;
			currPlY = currentPlatform.y;
			currPlVx = currentPlatform.vx;
			currPlVy = currentPlatform.vy;
			currPlWidth = currentPlatform.width;
			currPlHeight = currentPlatform.height;

			// platform out of game area
			if (currPlY > GAME_AREA_HEIGHT) {
				toBeRemoved[j++] = i;
				continue;
			}

			if (bombEnabled) {
				// POWERUP_TYPE_BOMB invoked, remove all currently visible platforms
				var rnd = Math.floor(Math.random() * 2);
				currentPlatform.vx = (rnd == 1 ? 1 : -1) * bombDisappearSpeed;
				if (i == numPlatforms - 1) {
					bombEnabled = false;
				}
			}
			else if (currentPlatform.type != PLATFORM_TYPE_BASE || !isStarting || (Platforms[i + 1] != undefined && currPlY - Platforms[i + 1].y < 100)) {
				// move the platform
				if (currPlVx != bombDisappearSpeed && currPlVx != -bombDisappearSpeed && (currPlX < 0 || currPlX + currPlWidth > GAME_AREA_WIDTH)) {
					currentPlatform.vx = -(currentPlatform.vx + 0.1);
					if (currPlX < 0) {
						currentPlatform.x = 0;
					}
					else {
						currentPlatform.x = GAME_AREA_WIDTH - currPlWidth;
					}
				}

				if (currentPlatform.type == PLATFORM_TYPE_BASE) {
					isStarting = false;
				}

				currentPlatform.x += Math.round(currentPlatform.vx / slowMotionFactor);
				currentPlatform.y += Math.round(currPlVy / slowMotionFactor);
			}

			currentPlatform.draw();

			if (
				ballVY >= 0 &&
				ballX >= currPlX &&
				ballX <= currPlX + currPlWidth &&
				ball.y + ballRadius + Math.abs(Math.abs(ballVY - currPlVy) - currPlHeight) > currPlY &&
				ball.y + ballRadius <= currPlY + currPlHeight + ballRadius
			) {
				// bounce off platform
				ball.base = ball.y;
				relativeHeight = 1;
			}

			// difficulty: distance in pixels between 2 spawned platforms
			if (time > 3500) {
				spawnThreshold = 160;
			}
			else if (time > 3000) {
				spawnThreshold = 150;
			}
			else if (time > 2500) {
				spawnThreshold = 140;
			}
			else if (time > 1000) {
				spawnThreshold = 130;
			}
			else if (time > 500) {
				spawnThreshold = 110;
			}
			else {
				spawnThreshold = 90;
			}

			// spawn new Platform
			if (!currentPlatform.spawnedNew && currPlY >= spawnThreshold) {
				var rnd = Math.floor(Math.random() * 5);
				var platformType = PLATFORM_TYPE_NORMAL;
				switch (rnd) {
					case 0:
						platformType = PLATFORM_TYPE_SIDE;
						break;
					case 1:
						platformType = PLATFORM_TYPE_FAST;
						break;
					default:
						break;
				}

				if (spawnBasePlatform) {
					// POWERUP_TYPE_BASEPLATFORM invoked
					spawnBasePlatform = false;
					Platforms[Platforms.length] = new Platform(0, 0, PLATFORM_TYPE_BASE);
					Platforms[Platforms.length - 1].width = GAME_AREA_WIDTH;
				}
				else {
					// spawn normal platform
					Platforms[Platforms.length] = new Platform(Math.floor(Math.random() * NUM_PLATFORMS) * PLATFORM_WIDTH, 0, platformType);
				}

				if (time > 3000) {
					Platforms[Platforms.length - 1].vy += 4;
				}
				else if (time > 2500) {
					Platforms[Platforms.length - 1].vy += 4;
				}
				else if (time > 2000) {
					Platforms[Platforms.length - 1].vy += 3;
				}
				else if (time > 1500) {
					Platforms[Platforms.length - 1].vy += 2;
				}
				else if (time > 1000) {
					Platforms[Platforms.length - 1].vy += 1;
				}

				currentPlatform.spawnedNew = true;
			}
		}

		var powerupsToBeRemoved = [];
		var currentPowerup = null;
		var currPoX = 0;
		var currPoY = 0;
		var currPoWidth = 0;
		var currPoHeight = 0;
		var numPowerups = Powerups.length;
		var qq = 0;

		// cycle over all spawned powerups
		for (var l = 0; l < numPowerups; l++) {
			// object dereferencing is expensive, so do it only once
			currentPowerup = Powerups[l];
			currPoX = currentPowerup.x;
			currPoY = currentPowerup.y;
			currPoWidth = currentPowerup.width;
			currPoHeight = currentPowerup.height;

			// powerup out of game area
			if (currentPowerup.y > GAME_AREA_HEIGHT) {
				powerupsToBeRemoved[qq++] = l;
				continue;
			}

			// invoke the powerup
			if (
				!currentPowerup.invoked &&
				ballX + ballRadius >= currPoX &&
				ballX - ballRadius <= currPoX + currPoWidth &&
				ball.y + ballRadius >= currPoY &&
				ball.y - ballRadius <= currPoY + currPoHeight
			) {
				currentPowerup.invoke();
			}

			// move the powerup
			currentPowerup.x += Math.round(currentPowerup.vx / slowMotionFactor);
			currentPowerup.y += Math.round(currentPowerup.vy / slowMotionFactor);

			numPlatforms = Platforms.length;

			// check if a platform falls on a platform, then adjust the speed
			for (var p = 0; p < numPlatforms; p++) {
				if (
					currPoY + currPoHeight >= Platforms[p].y &&
					currPoY + currPoHeight < Platforms[p].y + Platforms[p].height + (Platforms[p].vy ? Platforms[p].vy - currentPowerup.vy : 0) &&
					currPoX + currPoWidth >= Platforms[p].x &&
					currPoX <= Platforms[p].x + Platforms[p].width
				) {
					if (Platforms[p].type == PLATFORM_TYPE_BASE && isStarting) {
						currentPowerup.vy = 0;
					}
					else {
						currentPowerup.vx = Platforms[p].vx;
						currentPowerup.vy = Platforms[p].vy;
						currentPoY = Platforms[p].y - currPoHeight;
					}
					break;
				}
			}

			currentPowerup.draw();
		}

		for (var ll = 0; ll < powerupsToBeRemoved.length; ll++) {
			Powerups.splice(powerupsToBeRemoved[ll] - ll, 1);
		}

		if (coolDownPowerUp < time - FPS_RATE_LIMITER) {
			// 1 second general cooldown
			var rnd2 = Math.floor(Math.random() * 150);

			switch (rnd2) {
				case 0:
					if (coolDownSlowMotion < time - FPS_RATE_LIMITER * 3) {
						// 3 second cooldown
						coolDownPowerUp = coolDownSlowMotion = time;
						Powerups[Powerups.length] = new Powerup(POWERUP_TYPE_SLOWMOTION);
					}
					break;
				case 1:
					if (coolDownBonus < time - FPS_RATE_LIMITER * 4) {
						// 4 second cooldown
						coolDownPowerUp = coolDownBonus = time;
						Powerups[Powerups.length] = new Powerup(POWERUP_TYPE_BONUS);
					}
					break;
				case 2:
					if (coolDownBasePlatform < time - FPS_RATE_LIMITER * 3) {
						// 3 second cooldown
						coolDownPowerUp = coolDownBasePlatform = time;
						Powerups[Powerups.length] = new Powerup(POWERUP_TYPE_BASEPLATFORM);
					}
					break;
				case 3:
					if (coolDownBomb < time - FPS_RATE_LIMITER * 7) {
						// 7 second cooldown
						coolDownPowerUp = coolDownBomb = time;
						Powerups[Powerups.length] = new Powerup(POWERUP_TYPE_BOMB);
					}
					break;
				case 4:
				case 5:
					if (coolDownBoost < time - FPS_RATE_LIMITER) {
						// 1 second cooldown
						coolDownPowerUp = coolDownBoost = time;
						Powerups[Powerups.length] = new Powerup(POWERUP_TYPE_BOOST);
					}
					break;
				default:
					break;
			}
		}

		// remove Platforms that are not visible anymore
		for (var k = 0; k < toBeRemoved.length; k++) {
			Platforms.splice(toBeRemoved[k] - k, 1);
		}

		if (goLeft && ballX - ballRadius > 0) {
			ball.x -= LRSPEED - ball.ax;
		}
		else if (goRight && ballX + ballRadius < GAME_AREA_WIDTH) {
			ball.x += LRSPEED + ball.ax;
		}

		ball.draw();

		// render boost stars
		var numIconsInRow = Math.floor((GAME_AREA_WIDTH * 0.66) / 24);
		var row = 0;
		var col = 0;

		for (var i = 0; i < boosts; i++) {
			row = parseInt(i / numIconsInRow);
			col = i - row * numIconsInRow;
			gameContext.drawImage(boostImage, 5 + 24 * col, 8 + 22 * row, 20, 20);
		}

		// render slowmotion hourglasses
		if (slowMotionFactor > 1) {
			var numOfSlowMotionSlots = (SLOWMOTION_DURATION - (time - slowMotionStart)) / CORELOOP_INTERVAL;
			var rowOffset = row + 1;

			for (var j = 0; j < numOfSlowMotionSlots; j++) {
				row = parseInt(j / numIconsInRow) + rowOffset;
				col = j - (row - rowOffset) * numIconsInRow;
				gameContext.drawImage(slowMotionMiniImage, 5 + 24 * col, 8 + 25 * row, 20, 20);
			}
		}

		// render left/right buttons on touchscreen devices
		if (ISTOUCHDEVICE && !attachAccelerometer && attachTouchControls) {
			gameContext.drawImage(leftButtonImage, 16, GAME_AREA_HEIGHT * 0.67 - 16);
			gameContext.drawImage(rightButtonImage, GAME_AREA_WIDTH - 48, GAME_AREA_HEIGHT * 0.67 - 16);
		}
		if (ISTOUCHDEVICE && (attachAccelerometer || attachTouchControls)) {
			gameContext.drawImage(transparentStarImage, (GAME_AREA_WIDTH >> 1) - 21, GAME_AREA_HEIGHT * 0.67 - 23);
		}

		// render icon legend on touchscreen devices
		if (ISTOUCHDEVICE && !attachAccelerometer && attachTouchControls && time < 3 * FPS_RATE_LIMITER) {
			gameContext.save();
			gameContext.textAlign = 'center';
			gameContext.fillStyle = '#111111';
			gameContext.font = '26px Futura-CondensedExtraBold, Impact, Helvetica';
			var leftMessage = 'left';
			var rightMessage = 'right';
			gameContext.fillText(leftMessage, 32, GAME_AREA_HEIGHT * 0.67 + 48);
			gameContext.fillText(rightMessage, GAME_AREA_WIDTH - 32, GAME_AREA_HEIGHT * 0.67 + 48);
			gameContext.restore();
		}
		if (ISTOUCHDEVICE && (attachAccelerometer || attachTouchControls) && time < 3 * FPS_RATE_LIMITER) {
			gameContext.save();
			gameContext.textAlign = 'center';
			gameContext.fillStyle = '#111111';
			gameContext.font = '26px Futura-CondensedExtraBold, Impact, Helvetica';
			var starMessage = 'star boost';
			gameContext.fillText(starMessage, GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT * 0.67 + 48);
			gameContext.restore();
		}

		// render 'press space bar for boost' message on PC
		if (!ISTOUCHDEVICE && attachKeyboard && time < 4 * FPS_RATE_LIMITER) {
			gameContext.save();
			gameContext.textAlign = 'left';
			gameContext.fillStyle = '#111111';
			gameContext.font = '20px Futura-CondensedExtraBold, Impact, Helvetica';
			var pressSpaceMessage = 'Arrows to move ball, space bar for star boost';
			var messageDimensions = gameContext.measureText(pressSpaceMessage);
			gameContext.fillText(pressSpaceMessage, (GAME_AREA_WIDTH - messageDimensions.width) >> 1, GAME_AREA_HEIGHT - 100);
			gameContext.restore();
		}

		// render score + highscore
		if (!ISTOUCHDEVICE) {
			gameContext.fillText(score, GAME_AREA_WIDTH - 10, 30);
			gameContext.fillStyle = '#440000';
			gameContext.font = '14px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillText(highScore, GAME_AREA_WIDTH - 10, 50);
		}
		else {
			gameContext.font = '22px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.textAlign = 'right';
			gameContext.fillStyle = '#000000';
			gameContext.fillText(score, GAME_AREA_WIDTH - 10, 30);
			gameContext.fillStyle = '#555555';
			gameContext.font = '12px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillText(highScore, GAME_AREA_WIDTH - 10, 50);
		}

		// draw pause icon
		gameContext.fillStyle = '#000000';
		gameContext.fillRect(GAME_AREA_WIDTH - 24, GAME_AREA_HEIGHT - 23, 4, 17);
		gameContext.fillRect(GAME_AREA_WIDTH - 15, GAME_AREA_HEIGHT - 23, 4, 17);

		gameContext.restore();

		if (ball.y + ballRadius > GAME_AREA_HEIGHT) {
			if (cheat) {
				ball.y = 0;
			}
			else {
				// game over
				cancelAnimationFrame(timerId);
				timerId = 0;

				gameCanvas.removeEventListener('click', inGameClick, false);
				gameCanvas.removeEventListener('touchstart', touchHandler, false);

				// show game over message and set trigger for main menu load
				showMessage('Game Over', true);

				if (!cheat && parseInt(localStorage['net.pretopia.BounceIt.highScore']) < score) {
					showMessage('New highscore! ' + score + ' points', false);
					localStorage['net.pretopia.BounceIt.highScore'] = score;
				}
				else {
					showMessage('You scored ' + score + ' points', false);
				}

				if (!ISTOUCHDEVICE) {
					gameCanvas.addEventListener('click', loadMenu, false);
				}

				if (attachKeyboard) {
					document.onkeydown = loadMenu;
				}

				if (attachTouchControls) {
					gameCanvas.addEventListener('touchstart', loadMenu, false);
				}

				if (attachAccelerometer) {
					window.ondevicemotion = null;
				}
			}
		}
	}

	/* render playing field */
	function prepareGameArea() {
		// DOM elements
		var tmpDiv = null;
		var BounceItField = null;
		var wrapperDiv = null;

		// place the game in the div 'BounceItField' if present, attach it to the
		// document body otherwise
		if ((BounceItField = document.getElementById(BounceIt_ID)) == null) {
			BounceItField = document.body;
		}

		// reset the game
		if ((wrapperDiv = document.getElementById(BounceIt_ID + '_BounceItWrapper')) != null) {
			BounceItField.removeChild(wrapperDiv);
		}

		// div for BounceIt
		wrapperDiv = document.createElement('div');
		wrapperDiv.id = BounceIt_ID + '_BounceItWrapper';
		wrapperDiv.className = 'BounceItWrapper';
		BounceItField.appendChild(wrapperDiv);

		// canvas where the game will take place
		gameCanvas = document.createElement('canvas');
		gameCanvas.className = 'BounceItGameCanvas';
		gameCanvas.width = GAME_AREA_WIDTH;
		gameCanvas.height = GAME_AREA_HEIGHT;

		try {
			gameContext = gameCanvas.getContext('2d');
		} catch (e) {
			wrapperDiv.className += ' BounceItError';
			wrapperDiv.innerHTML =
				'<p>HTML5 Canvas is not supported in your browser.</p>' +
				'<p>Use a current browser to play BounceIt.</p>';
			return;
		}

		// gradient used for banner messages
		textGradient = gameContext.createLinearGradient(0, (GAME_AREA_HEIGHT >> 1) - 50, 0, (GAME_AREA_HEIGHT >> 1) + 50);
		textGradient.addColorStop(0, '#570d0e');
		textGradient.addColorStop(0.5, '#af1c1e');
		textGradient.addColorStop(1, '#e24e50');

		wrapperDiv.appendChild(gameCanvas);
	}

	/* shows the instructions */
	function loadInstructions() {
		// remove event handlers for main menu
		gameCanvas.removeEventListener('click', menuTouchClick, false);
		gameCanvas.removeEventListener('touchstart', menuTouchClick, false);

		if (!ISTOUCHDEVICE) {
			gameCanvas.addEventListener('click', loadMenu, false);
		}

		if (attachKeyboard) {
			document.onkeydown = loadMenu;
		}

		if (attachTouchControls) {
			gameCanvas.addEventListener('touchstart', loadMenu, false);
		}

		gameContext.save();

		var menuGradient = gameContext.createRadialGradient(GAME_AREA_WIDTH >> 2, GAME_AREA_HEIGHT >> 2, 10, GAME_AREA_WIDTH >> 1, GAME_AREA_WIDTH >> 1, GAME_AREA_WIDTH);
		menuGradient.addColorStop(0, '#444444');
		menuGradient.addColorStop(0.5, '#200000');
		menuGradient.addColorStop(1, '#000000');

		if (myBrowser.OS.name == 'Android') {
			gameContext.fillStyle = '#000000';
		}
		else {
			gameContext.fillStyle = menuGradient;
		}
		gameContext.fillRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);

		var fontSize = GAME_AREA_HEIGHT / 30;

		instructionsText = [
			'The objective in BounceIt is to get as',
			'many points possible, by bouncing up.',
			'',
			'Different types of powerups fall down',
			'that will help you during your journey.',
			'',
			'You can control the ball using your',
			'keyboard, touch screen or accelero-',
			'meter. Press the space bar to use a star',
			'and bounce-boost the ball. On a touch',
			'screen, tap the transparent star in the',
			'center of the screen',
			'',
			'Click, touch or press any key to return',
			'to the menu'
		];

		gameContext.textAlign = 'left';
		gameContext.fillStyle = '#bbbbbb';
		gameContext.font = fontSize + 'px Futura-CondensedExtraBold, Impact, Helvetica';

		var helpTextDimensions = gameContext.measureText(instructionsText[8]);
		var helpTextOffset = (GAME_AREA_WIDTH - helpTextDimensions.width) >> 1;

		for (var i = 0; i < instructionsText.length; i++) {
			gameContext.fillText(instructionsText[i], helpTextOffset, fontSize * i + fontSize * 3);
		}

		gameContext.restore();
	}

	/* shows the menu */
	function loadMenu() {
		var fontSize = GAME_AREA_HEIGHT / 11;

		highScore = localStorage['net.pretopia.BounceIt.highScore'] > 0 ? localStorage['net.pretopia.BounceIt.highScore'] : 0;

		// prepare the canvas
		prepareGameArea();

		// remove event listeners for buttons
		gameCanvas.removeEventListener('click', pauseTouchClick, false);
		gameCanvas.removeEventListener('touchstart', pauseTouchClick, false);

		gameContext.save();

		// gradient for menu background
		var menuGradient = gameContext.createRadialGradient(GAME_AREA_WIDTH >> 2, GAME_AREA_HEIGHT >> 2, 10, GAME_AREA_WIDTH >> 1, GAME_AREA_WIDTH >> 1, GAME_AREA_WIDTH);
		menuGradient.addColorStop(0, '#444444');
		menuGradient.addColorStop(0.5, '#200000');
		menuGradient.addColorStop(1, '#000000');

		if (myBrowser.OS.name == 'Android') {
			gameContext.fillStyle = '#000000';
		}
		else {
			gameContext.fillStyle = menuGradient;
		}
		gameContext.fillRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);

		// gradient for header text
		var headGradient = gameContext.createLinearGradient(0, 40, 0, 100);
		headGradient.addColorStop(0, '#570d0e');
		headGradient.addColorStop(0.5, '#af1c1e');
		headGradient.addColorStop(1, '#e24e50');

		// BounceIt header
		gameContext.textAlign = 'center';
		gameContext.fillStyle = headGradient;
		gameContext.strokeStyle = '#ffffff';
		gameContext.lineWidth = 2;
		gameContext.font = fontSize * 1.7 + 'px Futura-CondensedExtraBold, Impact, Helvetica';
		gameContext.fillText('BounceIt', GAME_AREA_WIDTH >> 1, fontSize * 2.5 + 10);
		gameContext.strokeText('BounceIt', GAME_AREA_WIDTH >> 1, fontSize * 2.5 + 10);

		gameContext.fillStyle = '#ffffff';
		gameContext.font = fontSize / 2 + 'px Futura-CondensedExtraBold, Impact, Helvetica';
		gameContext.fillText('Highscore: ' + highScore, GAME_AREA_WIDTH >> 1, fontSize * 4);

		// start game option
		gameContext.fillStyle = '#000000';
		gameContext.lineWidth = 1.5;
		gameContext.font = fontSize + 'px Futura-CondensedExtraBold, Impact, Helvetica';
		gameContext.fillText('Start Game', GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);
		gameContext.strokeText('Start Game', GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);

		// instructions option
		gameContext.fillText('Instructions', GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + 1.5 * fontSize);
		gameContext.strokeText('Instructions', GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + 1.5 * fontSize);

		// measurements in order to determine where to draw the triangles and keyboard cursor
		var startTxtDimensions = gameContext.measureText('Start Game');
		var instrTxtDimensions = gameContext.measureText('Instructions');
		startTxtOffset = (startTxtDimensions.width >> 1) + 25;
		instrTxtOffset = (instrTxtDimensions.width >> 1) + 25;

		if (accelerometerEnabled) {
			// checkbox
			gameContext.fillStyle = attachAccelerometer ? '#ff0000' : '#000000';
			gameContext.fillRect(10, GAME_AREA_HEIGHT - 25, 15, 15);
			gameContext.strokeRect(10, GAME_AREA_HEIGHT - 25, 15, 15);

			// text
			gameContext.font = fontSize / 3 + 'px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillStyle = '#f0f0f0';
			gameContext.textAlign = 'left';
			gameContext.fillText('Accelerometer', 35, GAME_AREA_HEIGHT - 11);
		}

		// copyright message
		gameContext.fillStyle = '#cccccc';
		gameContext.font = '13px Helvetica';
		gameContext.textAlign = 'right';
		var aboutText = 'v' + VERSION + ' - By Thijs van As, 2011';
		gameContext.fillText(aboutText, GAME_AREA_WIDTH - 7, GAME_AREA_HEIGHT - 10);

		gameContext.restore();

		if (!ISTOUCHDEVICE) {
			gameCanvas.addEventListener('click', menuTouchClick, false);
		}

		if (attachKeyboard) {
			var menuBall = new Ball();
			menuBall.x = (GAME_AREA_WIDTH >> 1) - instrTxtOffset - 10;
			menuBall.y = (GAME_AREA_HEIGHT >> 1) + fontSize * (selectedMenuOption == 2 ? 3.5 : 1.5 * selectedMenuOption) - fontSize / 3;
			menuBall.draw();

			_attachKeyboardHandlersMenu();
		}

		if (attachTouchControls) {
			gameCanvas.addEventListener('touchstart', menuTouchClick, false);
		}
	}

	/* play the game */
	function loadGame() {
		NUM_PLATFORMS = GAME_AREA_WIDTH / PLATFORM_WIDTH;

		if (timerId != 0) {
			cancelAnimationFrame(timerId);
			timerId = 0;
		}

		goLeft = goRight = false;

		prepareGameArea();

		Platforms = [];
		Platforms[0] = new Platform(0, GAME_AREA_HEIGHT >> 1, PLATFORM_TYPE_BASE);
		Platforms[0].width = GAME_AREA_WIDTH;

		Powerups = [];

		ball = new Ball();
		ball.y = (GAME_AREA_HEIGHT >> 1) - ball.radius;
		ball.x = GAME_AREA_WIDTH >> 1;
		ball.base = ball.y;

		score = 0;
		time = 0;
		boosts = 3;
		cheat = false;
		konamiCount = 0;

		rgb = [0xee, 0xee, 0xee];
		rgbIndex = 0;
		channelChangeTime = 500; // 0xee - 0x44 = 0xaa (170 decimal) colors per channel
		threeChannelChangeTime = 1500;
		stepSize = 2.9; // 500 / 170 = 2.9
		countColorUp = false;

		spawnBasePlatform = false;
		slowMotionStart = 0;
		slowMotionFactor = 1;
		isStarting = true;

		coolDownPowerUp = 0;
		coolDownSlowMotion = 0;
		coolDownBonus = 0;
		coolDownBasePlatform = 0;
		coolDownBomb = 0;
		coolDownBoost = 0;

		if (localStorage['net.pretopia.BounceIt.highScore'] === undefined || localStorage['net.pretopia.BounceIt.highScore'] === null) {
			localStorage['net.pretopia.BounceIt.highScore'] = 0;
		}

		highScore = localStorage['net.pretopia.BounceIt.highScore'];

		_populateGravityLookup();

		if (attachKeyboard) {
			_attachKeyboardHandlers();
		}

		if (attachAccelerometer) {
			_attachAccelerometerHandlers();
		}

		if (attachTouchControls) {
			gameCanvas.addEventListener('touchstart', touchHandler, false);
			gameCanvas.addEventListener('touchend', touchHandler, false);
		}

		if (!ISTOUCHDEVICE) {
			gameCanvas.addEventListener('click', inGameClick, false);
		}

		initTimer();
	}

	/* starts/resets the game */
	function main(params) {
		// parse params
		if (typeof params == 'object') {
			attachKeyboard = params.attachKeyboard != undefined ? params.attachKeyboard : true;
			attachTouchControls = params.attachTouchControls != undefined ? params.attachTouchControls : true;
			accelerometerEnabled = params.accelerometerEnabled != undefined ? params.accelerometerEnabled : false;
			GAME_AREA_WIDTH = params.gameAreaWidth != undefined ? params.gameAreaWidth : GAME_AREA_WIDTH;
			GAME_AREA_HEIGHT = params.gameAreaHeight != undefined ? params.gameAreaHeight : GAME_AREA_HEIGHT;
			PLATFORM_WIDTH = params.platformWidth != undefined ? params.platformWidth : PLATFORM_WIDTH;
			PLATFORM_HEIGHT = params.platformHeight != undefined ? params.platformHeight : PLATFORM_HEIGHT;
			BALL_RADIUS = params.ballRadius != undefined ? params.ballRadius : BALL_RADIUS;
			LRSPEED = params.lrSpeed != undefined ? params.lrSpeed : LRSPEED;
			BALL_AMPLITUDE = params.ballAmplitude != undefined ? params.ballAmplitude : BALL_AMPLITUDE;
			CORELOOP_INTERVAL = params.coreLoopInterval != undefined ? params.coreLoopInterval : CORELOOP_INTERVAL;
			STEP_DIVIDER = params.stepDivider != undefined ? params.stepDivider : STEP_DIVIDER;

			//FPS_RATE_LIMITER = 1000 / CORELOOP_INTERVAL;
			SLOWMOTION_DURATION = 5 * FPS_RATE_LIMITER; // 4 seconds

			attachAccelerometer = accelerometerEnabled;
		}

		ISTOUCHDEVICE = myBrowser.isMobile; //_isTouchDevice();

		loadMenu();
	}

	/* attach main() and togglePauseGame() to the instance of BounceIt */
	this.main = main;
	this.pause = togglePauseGame;
};
