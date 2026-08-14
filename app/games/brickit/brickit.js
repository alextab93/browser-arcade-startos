/* net.pretopia.BrickIt
 *
 * Copyright (c) 2010, Thijs van As <t.vanas@gmail.com>
 *
 * http://pretopia.net
 * http://pretopia.googlecode.com
 *
 * brickit.js
 */

/* create/check namespace net.pretopia.BrickIt */
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

if (net.pretopia.BrickIt) {
	throw new Error('net.pretopia.BrickIt already exists');
}

/* end of namespace initialization, actual code begins here */
net.pretopia.BrickIt = function (div) {
	/* BRICKIT_ID is used as a unique identifier for this instance. It is mainly
   useful for multiple instances of BrickIt on 1 website. It is the id of
   the <div /> element where BrickIt should be placed. */
	var BRICKIT_ID = div != null && div != '' ? div : 'BrickItInstance';
	var VERSION = '1.0';

	/* dimensions */
	var GAME_AREA_WIDTH = 650;
	var GAME_AREA_HEIGHT = 455;
	var NUM_COLS = 0;
	var NUM_ROWS = 0;
	var BRICK_WIDTH = 45;
	var BRICK_HEIGHT = 19;
	var DEFAULT_BALL_SPEED = 3;
	var MEDIUM_BALL_SPEED = 4;
	var HIGH_BALL_SPEED = 5;
	var PAD_SPEED = 8;
	var PAD_WIDTH = 100;
	var PAD_WIDTH_HALF = PAD_WIDTH >> 1;
	var PAD_HEIGHT = 12;
	var PAD_HEIGHT_HALF = PAD_HEIGHT >> 1;
	var PAD_BOTTOM_OFFSET = 40;
	var BALL_RADIUS = 7;

	/* declare global canvas-related objects */
	var gameCanvas = null;
	var gameContext = null;
	var brickGradientNormal = null;
	var brickGradientBonus = null;
	var brickGradientGold = null;
	var padGradient = null;
	var textGradient = null;
	var levelTxtOffset = 0;
	var startTxtOffset = 0;
	var instrTxtOffset = 0;

	/* user input */
	var attachKeyboard = true;
	var attachTouchControls = false;
	var attachTouchSwipe = false;
	var goWest = false;
	var goEast = false;
	var selectedMenuOption = 0;
	var selectedOptionPause = 1;
	var touchControlsInUse = false;
	var thumbsUp = false;

	/* game state */
	var CORELOOP_INTERVAL = 18;
	var FPS_RATE_LIMITER = 20;
	var timerId = 0;
	var lastTick = 0;
	var gamePaused = false;
	var skipMenu = false; // skip the menu (used for iPads running iOS 3.2, which cannot display Canvas text)
	var DEFAULT_LIVES = 5;
	var lives = DEFAULT_LIVES;
	var numBricksLeft = 0;
	var score = 0;
	var level = 0;

	/* 2-dimensional array where level will be loaded into */
	var brickMatrix = null;
	var brickMatrixStartX = 0;
	var brickMatrixStartY = 25;

	/* pad object */
	var pad  = {
	             x: 0,
	             y: 0
	           };

	/* ball object */
	var ball = {
	             x: 0,
	             y: 0,
	             vx: 0,
	             vy: 0,
	             getNorth: function() { return (this.y - BALL_RADIUS); },
	             getEast:  function() { return (this.x + BALL_RADIUS); },
	             getSouth: function() { return (this.y + BALL_RADIUS); },
	             getWest:  function() { return (this.x - BALL_RADIUS); }
	           };

	/* audio */
	var AUDIO_ENABLED = true;
	var enableSoundFX = true;

	/* brick types */
	var BTYPE_NORMAL = 1;
	var BTYPE_BONUS = 5;
	var BTYPE_GOLD = 7;
	var BTYPE_DOUBLE = 8;
	var BTYPE_STEEL = 9;
	var NUM_STEEL_HITS = 10;

	/* floor faster */
	var floor = Math.floor;

	/* level definitions */
	var Levels = []; // array that will contain all the levels
	var l = 0;       // counter to keep track of current level number while adding levels

	/* rate limiter */
	var now;
	var elapsed;
	var then = Date.now();

	Levels[l] = [
		[0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
		[0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
		[0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
		[0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0],
		[0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0],
		[0, 0, 1, 8, 8, 8, 1, 8, 8, 8, 1, 0, 0],
		[0, 1, 1, 1, 5, 1, 1, 1, 5, 1, 1, 1, 0],
		[0, 1, 1, 1, 5, 1, 1, 1, 5, 1, 1, 1, 0],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
		[1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
		[1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
		[0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
		[0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0]
	];
	Levels[l++].title = 'Invasion from Space';

	Levels[l] = [
		[5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 5],
		[1, 5, 1, 1, 1, 1, 1, 1, 1, 5, 1],
		[1, 1, 5, 1, 1, 1, 1, 1, 5, 1, 1],
		[1, 1, 1, 5, 1, 1, 1, 5, 1, 1, 1],
		[1, 1, 1, 1, 5, 1, 5, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 9, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 8, 1, 8, 1, 1, 1, 1],
		[1, 1, 1, 8, 1, 1, 1, 8, 1, 1, 1],
		[1, 1, 8, 1, 1, 1, 1, 1, 8, 1, 1]
	];
	Levels[l++].title = 'The Journey Begins';

	Levels[l] = [
		[1, 5, 1, 0, 0, 0, 0, 0, 1, 5, 1],
		[1, 5, 1, 1, 0, 0, 0, 1, 1, 5, 1],
		[1, 5, 1, 1, 1, 0, 1, 1, 1, 5, 1],
		[1, 5, 1, 1, 1, 8, 1, 1, 1, 5, 1],
		[1, 5, 1, 1, 0, 5, 0, 1, 1, 5, 1],
		[1, 5, 1, 8, 0, 5, 0, 8, 1, 5, 1],
		[1, 5, 1, 0, 0, 5, 0, 0, 1, 5, 1],
		[1, 5, 8, 0, 0, 5, 0, 0, 8, 5, 1],
		[1, 5, 0, 0, 0, 5, 0, 0, 0, 5, 1],
		[1, 9, 0, 0, 0, 9, 0, 0, 0, 9, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9]
	];
	Levels[l++].title = 'Ziltoid Attacks';

	Levels[l] = [
		[9, 0, 9, 0, 9, 0, 9, 0, 9, 0, 9],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[9, 0, 9, 0, 9, 0, 9, 0, 9, 0, 9],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[9, 0, 9, 0, 9, 5, 9, 0, 9, 0, 9],
		[0, 0, 0, 0, 5, 8, 5, 0, 0, 0, 0],
		[0, 0, 0, 0, 5, 8, 5, 0, 0, 0, 0],
		[9, 0, 9, 0, 9, 5, 9, 0, 9, 0, 9],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[9, 0, 9, 0, 9, 0, 9, 0, 9, 0, 9],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[9, 0, 9, 0, 9, 0, 9, 0, 9, 0, 9]
	];
	Levels[l++].title = 'Battle in Outer Space';

	Levels[l] = [
		[0, 0, 0, 0, 8, 8, 8, 8, 8, 8, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 8, 8, 8, 8, 0, 0, 0, 0, 0],
		[9, 0, 0, 0, 0, 0, 9, 9, 0, 0, 0, 0, 0, 9],
		[9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9],
		[9, 9, 9, 0, 0, 0, 0, 0, 0, 0, 0, 9, 9, 9],
		[9, 9, 9, 9, 0, 0, 0, 0, 0, 0, 9, 9, 9, 9],
		[9, 9, 9, 9, 9, 0, 0, 0, 0, 9, 9, 9, 9, 9],
		[9, 9, 9, 9, 9, 9, 5, 5, 9, 9, 9, 9, 9, 9],
		[0, 0, 0, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0],
		[0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0]
	];
	Levels[l++].title = 'All Your Base Are Belong to Us';

	Levels[l] = [
		[9, 0, 9, 0, 9, 0, 9, 0, 9, 0, 9, 0, 9],
		[1, 0, 5, 0, 1, 0, 5, 0, 1, 0, 5, 0, 1],
		[1, 0, 5, 0, 1, 0, 5, 0, 1, 0, 5, 0, 1],
		[1, 0, 5, 0, 1, 0, 5, 0, 1, 0, 5, 0, 1],
		[8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8, 0, 8],
		[1, 0, 5, 0, 1, 0, 9, 0, 1, 0, 5, 0, 1],
		[1, 0, 5, 0, 1, 9, 5, 9, 1, 0, 5, 0, 1],
		[1, 0, 5, 0, 9, 0, 5, 0, 9, 0, 5, 0, 1],
		[1, 0, 5, 9, 1, 0, 5, 0, 1, 9, 5, 0, 1],
		[8, 0, 9, 0, 8, 0, 8, 0, 8, 0, 9, 0, 8],
		[1, 0, 5, 0, 1, 0, 5, 0, 1, 0, 5, 0, 1],
		[1, 0, 5, 0, 1, 0, 7, 0, 1, 0, 5, 0, 1],
		[1, 0, 5, 0, 7, 0, 0, 0, 7, 0, 5, 0, 1],
		[1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 1],
		[7, 0, 7, 0, 0, 0, 0, 0, 0, 0, 7, 0, 7]
	];
	Levels[l++].title = 'Asteroid Belt';

	Levels[l] = [
		[0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0],
		[0, 0, 0, 7, 7, 7, 7, 7, 7, 7, 0, 0, 0],
		[0, 0, 0, 7, 1, 7, 7, 7, 1, 7, 0, 0, 0],
		[0, 0, 7, 7, 1, 7, 7, 7, 1, 7, 7, 0, 0],
		[0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 0],
		[0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 0],
		[0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 0],
		[0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 0],
		[0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 0],
		[0, 0, 0, 7, 0, 7, 7, 7, 0, 7, 0, 0, 0],
		[0, 0, 0, 7, 7, 0, 5, 0, 7, 7, 0, 0, 0],
		[0, 0, 0, 0, 7, 7, 5, 7, 7, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 7, 7, 7, 0, 0, 0, 0, 0]
	];
	Levels[l++].title = 'Smile!';

	Levels[l] = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 5, 5],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 5, 5],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 8, 8, 0, 8, 8, 0, 0, 0, 0, 8, 8],
		[0, 0, 0, 8, 8, 0, 8, 8, 0, 0, 0, 0, 8, 8],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1],
		[0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[7, 7, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 7, 7],
		[7, 7, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 7, 7],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[9, 9, 0, 9, 9, 0, 9, 9, 0, 9, 9, 0, 9, 9],
		[9, 9, 0, 9, 9, 0, 9, 9, 0, 9, 9, 0, 9, 9]
	];
	Levels[l++].title = 'Fort HCNOP';

	Levels[l] = [
		[0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0],
		[8, 7, 7, 7, 7, 7, 7, 7],
		[8, 8, 8, 8, 7, 7, 7, 1],
		[8, 8, 8, 8, 7, 7, 7, 1],
		[8, 8, 8, 8, 7, 7, 7, 1],
		[8, 5, 5, 5, 1, 1, 1, 1],
		[8, 5, 5, 5, 1, 1, 1, 1],
		[8, 5, 5, 5, 1, 1, 1, 1],
		[5, 5, 5, 5, 5, 5, 5, 1]
	];
	Levels[l++].title = 'Four Elements';

	Levels[l] = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0],
		[7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0],
		[7, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0],
		[7, 0, 0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7],
		[7, 0, 0, 0, 7, 7, 7, 7, 7, 7, 7, 7, 7],
		[7, 0, 0, 0, 7, 0, 0, 7, 0, 7, 0, 7, 7],
		[7, 0, 0, 0, 7, 0, 0, 0, 0, 7, 0, 7, 7],
		[7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 7, 7],
		[7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0]
	];
	Levels[l++].title = 'Key to the Universe';

	Levels[l] = [
		[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
		[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
		[9, 9, 0, 0, 0, 0, 0, 0, 0, 9, 9],
		[9, 9, 0, 0, 0, 0, 0, 0, 0, 9, 9],
		[9, 9, 0, 5, 1, 8, 1, 5, 0, 9, 9],
		[9, 9, 0, 5, 1, 8, 1, 5, 0, 9, 9],
		[9, 9, 0, 5, 1, 8, 1, 5, 0, 9, 9],
		[9, 9, 0, 5, 1, 8, 1, 5, 0, 9, 9],
		[9, 9, 0, 5, 1, 8, 1, 5, 0, 9, 9],
		[9, 9, 0, 5, 1, 8, 1, 5, 0, 9, 9],
		[9, 9, 0, 0, 0, 0, 0, 0, 0, 9, 9],
		[9, 9, 0, 0, 0, 0, 0, 0, 0, 9, 9],
		[9, 9, 9, 9, 0, 0, 0, 9, 9, 9, 9],
		[9, 9, 9, 9, 0, 0, 0, 9, 9, 9, 9]
	];
	Levels[l++].title = 'Encapsulated';

	Levels[l] = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0],
		[0, 0, 7, 7, 7, 7, 0, 0, 0, 0, 0],
		[0, 7, 7, 7, 1, 7, 7, 0, 0, 0, 0],
		[0, 7, 7, 7, 7, 7, 7, 0, 0, 0, 0],
		[7, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0],
		[7, 7, 7, 7, 7, 0, 0, 0, 0, 5, 5],
		[7, 7, 7, 7, 0, 0, 0, 0, 0, 5, 5],
		[7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0],
		[7, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0],
		[0, 7, 7, 7, 7, 7, 7, 0, 0, 0, 0],
		[0, 7, 7, 7, 7, 7, 7, 0, 0, 0, 0],
		[0, 0, 7, 7, 7, 7, 0, 0, 0, 0, 0],
		[0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0]
	];
	Levels[l++].title = 'Mac Man';

	Levels[l] = [
		[9, 0, 9, 0, 0, 0, 9, 0, 9],
		[9, 0, 9, 0, 0, 0, 9, 0, 9],
		[9, 9, 9, 0, 0, 0, 9, 9, 9],
		[9, 9, 9, 0, 0, 0, 9, 9, 9],
		[9, 9, 9, 0, 0, 0, 9, 9, 9],
		[9, 9, 9, 0, 0, 0, 9, 9, 9],
		[9, 9, 9, 9, 9, 9, 9, 9, 9],
		[9, 9, 9, 9, 9, 9, 9, 9, 9],
		[9, 9, 9, 5, 5, 5, 9, 9, 9],
		[9, 9, 5, 5, 5, 5, 5, 9, 9],
		[9, 9, 5, 5, 5, 5, 5, 9, 9],
		[9, 9, 5, 5, 5, 5, 5, 9, 9],
		[9, 9, 5, 5, 5, 5, 5, 9, 9]
	];
	Levels[l++].title = 'Battering Ram';

	Levels[l] = [
		[0, 5, 5, 0, 0, 0, 5, 5, 0],
		[0, 5, 5, 0, 0, 0, 5, 5, 0],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[0, 5, 5, 0, 0, 0, 5, 5, 0],
		[0, 5, 5, 0, 0, 0, 5, 5, 0],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[5, 0, 0, 5, 0, 5, 0, 0, 5],
		[0, 5, 5, 0, 0, 0, 5, 5, 0],
		[0, 5, 5, 0, 0, 0, 5, 5, 0]
	];
	Levels[l++].title = '7-Segment Display';

	Levels[l] = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 0],
		[0, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 0],
		[0, 0, 0, 0, 8, 0, 0, 0, 8, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0],
		[0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0],
		[0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0],
		[0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0],
		[0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0],
		[0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0],
		[0, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0]
	];
	Levels[l++].title = 'The Joker';

	Levels[l] = [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[5, 0, 0, 7, 5, 7, 5, 7, 5, 0, 0, 5],
		[5, 5, 0, 5, 7, 5, 7, 5, 7, 0, 5, 5],
		[5, 5, 5, 7, 5, 7, 5, 7, 5, 5, 5, 5],
		[5, 5, 5, 5, 7, 5, 7, 5, 7, 5, 5, 5],
		[5, 5, 5, 7, 5, 7, 5, 7, 5, 5, 5, 5],
		[5, 5, 0, 5, 7, 5, 7, 5, 7, 0, 5, 5],
		[5, 0, 0, 7, 5, 7, 5, 7, 5, 0, 0, 5]
	];
	Levels[l++].title = 'Candy';

	Levels[l] = [
		[0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0],
		[1, 1, 1, 0, 5, 5, 5, 0, 1, 1, 1],
		[0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0],
		[5, 5, 5, 0, 1, 1, 1, 0, 5, 5, 5],
		[0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0],
		[1, 1, 1, 0, 5, 5, 5, 0, 1, 1, 1],
		[0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0],
		[5, 5, 5, 0, 1, 1, 1, 0, 5, 5, 5],
		[0, 5, 0, 0, 0, 0, 0, 0, 0, 5, 0]
	];
	Levels[l++].title = 'Force Field';

	Levels[l] = [
		[0, 0, 0, 0, 5, 0, 0, 0, 0],
		[0, 0, 0, 1, 5, 1, 0, 0, 0],
		[0, 0, 7, 1, 5, 1, 7, 0, 0],
		[0, 0, 0, 1, 5, 1, 0, 0, 0],
		[0, 0, 0, 0, 5, 0, 0, 0, 0],
		[0, 0, 0, 1, 5, 1, 0, 0, 0],
		[0, 0, 7, 1, 5, 1, 7, 0, 0],
		[0, 0, 0, 1, 5, 1, 0, 0, 0],
		[0, 0, 0, 0, 5, 0, 0, 0, 0],
		[0, 0, 0, 1, 5, 1, 0, 0, 0],
		[0, 0, 7, 1, 5, 1, 7, 0, 0],
		[0, 0, 0, 1, 5, 1, 0, 0, 0],
		[0, 0, 0, 0, 5, 0, 0, 0, 0]
	];
	Levels[l++].title = 'Totem';

	Levels[l] = [
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1],
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1],
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1],
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1],
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1],
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1],
		[1, 5, 7, 5, 1, 0, 1, 5, 7, 5, 1]
	];
	Levels[l++].title = 'Unprotected Areas';

	/* the last level is a special level: a randomly populated matrix */
	Levels[l] = new Array(13);
	for (var i = 0; i < Levels[l].length; i++) {
		Levels[l][i] = new Array(10);
		for (var j = 0; j < Levels[l][i].length; j++) {
			var rnd = Math.floor(Math.random() * 5);
			var val = 0;

			if (i > 0) {
				switch (rnd) {
					case 1:
						val = 1;
						break;
					case 2:
						val = 5;
						break;
					case 3:
						val = 7;
						break;
					case 4:
						val = 8;
						break;
					default:
						val = 0;
						break;
				}
			}

			Levels[l][i][j] = val;
		}
	}
	Levels[l++].title = 'Randomized Confetti Finale';

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
		return myBrowser.isMobile;
	}

	/* clear the screen */
	function _clearScreen() {
		gameContext.save();
		gameContext.fillStyle = '#000000';
		gameContext.fillRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);
		gameContext.restore();
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
							lives = DEFAULT_LIVES;
							score = 0;
							loadLevel();
							return;
						case 2:
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
						selectedMenuOption = 2;
					}
					break;
				case 40:
					// down arrow
					if (selectedMenuOption < 2) {
						selectedMenuOption++;
					}
					else {
						selectedMenuOption = 0;
					}
					break;
				case 37:
					// left arrow
					if (selectedMenuOption == 1) {
						if (level > 0) {
							level--;
						}
						else {
							level = Levels.length - 1;
						}
					}
					break;
				case 39:
					// right arrow
					if (selectedMenuOption == 1) {
						if (level < Levels.length - 1) {
							level++;
						}
						else {
							level = 0;
						}
					}
					break;
				case 83:
					// s
					// toggle sound fx
					if (AUDIO_ENABLED) {
						enableSoundFX = !enableSoundFX;
					}
					break;
				default:
					return;
			}

			loadMenu();
			return false;
		};
	}

	/* attach in-game event handlers for keyboard controls */
	function _attachKeyboardHandlers() {
		document.onkeydown = function (e) {
			var key = window.event ? window.event.keyCode : e.which;

			switch (key) {
				case 27:
					// escape
					togglePauseGame();
					return;
					break;
				case 13:
				// enter
				// explicit fallthrough
				case 32:
					// space bar
					releaseBall();
					return false;
					break;
				case 37:
					// left arrow
					goWest = true;
					break;
				case 39:
					// right arrow
					goEast = true;
					break;
				default:
					return;
					break;
			}

			return false;
		};

		document.onkeyup = function (e) {
			var key = window.event ? window.event.keyCode : e.which;

			switch (key) {
				case 37:
					// left arrow
					goWest = false;
					break;
				case 39:
					// right arrow
					goEast = false;
					break;
				default:
					return;
					break;
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
							if (skipMenu) {
								togglePauseGame();
								break;
							}
							cancelAnimationFrame(timerId);
							timerId = 0;
							gamePaused = false;
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

	/* event handler for touches */
	function touchHandler(e) {
		goWest = goEast = false;

		if (e.type == 'touchstart') {
			var touch = e.touches[0];
			var thirdWidth = GAME_AREA_WIDTH / 3;
			var xCanvas = _getLeftXCoordinate(gameCanvas);
			var yCanvas = _getTopYCoordinate(gameCanvas);

			if (thumbsUp) {
				// we come from the instruction screen
				thumbsUp = false;
				_clearScreen();
				drawAllBricks();
				drawBall();
				drawPad();
				updateGameStatus();
			}

			// remove the mouse event handlers (they conflict with the touchend event)
			gameCanvas.removeEventListener('click', releaseBall, false);
			gameCanvas.removeEventListener('mousemove', mouseHandler, false);

			if (touch.pageX - xCanvas >= GAME_AREA_WIDTH - 50 && touch.pageY - yCanvas >= GAME_AREA_HEIGHT - 50 && !gamePaused) {
				// tap on the pause icon to pause the game
				togglePauseGame();
			}
			else if (touch.pageX - xCanvas < thirdWidth) {
				// tap on the left side of the screen to move the pad west
				goWest = true;
			}
			else if (touch.pageX - xCanvas > 2 * thirdWidth) {
				// tap on the right side of the screen to move the pad east
				goEast = true;
			}
			else {
				// tap in the middle to release the ball
				releaseBall();
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
		else {
			releaseBall();
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
		if (mouseX > (GAME_AREA_WIDTH >> 1) - startTxtOffset && mouseX < (GAME_AREA_WIDTH >> 1) + startTxtOffset &&
		    mouseY > (GAME_AREA_HEIGHT >> 1) - fontSize + 10 && mouseY < (GAME_AREA_HEIGHT >> 1) + 10) {
			lives = DEFAULT_LIVES;
			score = 0;
			loadLevel();
		}
		// - level
		else if (mouseX > (GAME_AREA_WIDTH >> 1) - levelTxtOffset - 60 && mouseX < (GAME_AREA_WIDTH >> 1) - levelTxtOffset &&
		         mouseY > (GAME_AREA_HEIGHT >> 1) - 7 + fontSize && mouseY < (GAME_AREA_HEIGHT >> 1) + 20 + fontSize) {
			if (level > 0) {
				level--;
			}
			else {
				level = Levels.length - 1;
			}
		
			loadMenu();
		}
		// + level
		else if (mouseX > (GAME_AREA_WIDTH >> 1) + levelTxtOffset && mouseX < (GAME_AREA_WIDTH >> 1) + levelTxtOffset + 60 &&
		         mouseY > (GAME_AREA_HEIGHT >> 1) - 7 + fontSize && mouseY < (GAME_AREA_HEIGHT >> 1) + 20 + fontSize) {
			if (level < Levels.length - 1) {
				level++;
			}
			else {
				level = 0;
			}
		
			loadMenu();
		}
		// Instructions
		else if (mouseX > (GAME_AREA_WIDTH >> 1) - instrTxtOffset && mouseX < (GAME_AREA_WIDTH >> 1) + instrTxtOffset &&
		         mouseY > (GAME_AREA_HEIGHT >> 1) + (2.5 * fontSize) + 10 && mouseY < (GAME_AREA_HEIGHT >> 1) + (3.5*fontSize) + 10) {
			loadInstructions();
		}
		// About
		else if (mouseX > (GAME_AREA_WIDTH - 200) && mouseY > (GAME_AREA_HEIGHT - 30)) {
			window.location = '/';	
		}
		// toggle sound fx
		else if (AUDIO_ENABLED && mouseX < 35 && mouseY > (GAME_AREA_HEIGHT - 35)) {
			enableSoundFX = !enableSoundFX;
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
			loadMenu();
		}
		// return to game
		else if (mouseX >= (GAME_AREA_WIDTH >> 1) + 10 && mouseX < (GAME_AREA_WIDTH >> 1) + 150 && mouseY >= (GAME_AREA_HEIGHT >> 1) + 25 && mouseY < (GAME_AREA_HEIGHT >> 1) + 75) {
			togglePauseGame();
		}
	}

	/* event handler for mouse moves */
	function mouseHandler(e) {
		var mouseX = e.pageX - _getLeftXCoordinate(gameCanvas);

		if (gamePaused) {
			return;
		}

		clearPad();

		pad.x = mouseX >= PAD_WIDTH_HALF ? (mouseX <= GAME_AREA_WIDTH - PAD_WIDTH_HALF ? mouseX - PAD_WIDTH_HALF : pad.x) : pad.x;

		drawPad();
	}

	/* event handler for touch moves */
	function touchSwipeHandler(e) {
		if (e.touches.length != 1) {
			// only work with 1 finger
			return;
		}

		// check when we handled this event last time. Don't do it too often, it's CPU intensive
		var d = new Date();
		var time = d.getTime();

		if (time - lastTick < 2 * CORELOOP_INTERVAL) {
			return;
		}

		lastTick = time;

		var touch = e.touches[0];
		var touchX = touch.pageX - _getLeftXCoordinate(gameCanvas);

		if (touchX < pad.x - 30 || touchX > pad.x + PAD_WIDTH + 30) {
			// only handle swipes on, above or below the pad
			return;
		}

		if (gamePaused) {
			return;
		}

		// neglect the other touch handlers (touchstart and touchend)
		goWest = goEast = false;

		clearPad();

		pad.x = touchX >= PAD_WIDTH_HALF ? (touchX <= GAME_AREA_WIDTH - PAD_WIDTH_HALF ? touchX - PAD_WIDTH_HALF : pad.x) : pad.x;

		drawPad();
	}

	/* update the game status line (level, lives, score) */
	function updateGameStatus() {
		var statusMessage = 'Level: ' + (level + 1) + '     Lives: ' + lives + '     Score: ' + score;

		gameContext.save();

		if (!skipMenu) {
			// print status message
			gameContext.textAlign = 'left';
			gameContext.font = '17px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.clearRect(0, GAME_AREA_HEIGHT - 20, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);
			gameContext.fillText(statusMessage, 5, GAME_AREA_HEIGHT - 5);
		}

		// draw pause icon
		gameContext.fillRect(GAME_AREA_WIDTH - 24, GAME_AREA_HEIGHT - 23, 4, 17);
		gameContext.fillRect(GAME_AREA_WIDTH - 15, GAME_AREA_HEIGHT - 23, 4, 17);

		gameContext.restore();
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

			gameContext.strokeText(message, GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);
			gameContext.fillText(message, GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);
		}
		else {
			gameContext.font = '18px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillStyle = '#f0f0f0';

			gameContext.fillText(message, GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + 60);
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
			drawPad();
			showMessage('Paused', true);
			clearPad();

			if (skipMenu) {
				if (!_isTouchDevice()) {
					gameCanvas.addEventListener('click', togglePauseGame, false);
				}

				if (attachKeyboard) {
					document.onkeydown = togglePauseGame;
				}

				if (attachTouchControls) {
					gameCanvas.addEventListener('touchstart', togglePauseGame, false);
				}

				return;
			}

			gameCanvas.removeEventListener('click', inGameClick, false);
			gameCanvas.removeEventListener('touchstart', touchHandler, false);
			gameCanvas.removeEventListener('touchend', touchHandler, false);
			gameCanvas.removeEventListener('touchmove', touchSwipeHandler, false);

			if (!_isTouchDevice()) {
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
			drawAllBricks();
			drawBall();
			drawPad();
			updateGameStatus();

			// set when skipMenu
			gameCanvas.removeEventListener('click', togglePauseGame, false);
			gameCanvas.removeEventListener('touchstart', togglePauseGame, false);

			// remove event listeners for buttons
			gameCanvas.removeEventListener('click', pauseTouchClick, false);
			gameCanvas.removeEventListener('touchstart', pauseTouchClick, false);

			// add game event listeners
			if (!_isTouchDevice()) {
				gameCanvas.addEventListener('mousemove', mouseHandler, false);
				gameCanvas.addEventListener('click', inGameClick, false);
			}

			if (attachKeyboard) {
				_attachKeyboardHandlers();
			}

			if (attachTouchControls) {
				if (attachTouchSwipe) {
					gameCanvas.addEventListener('touchmove', touchSwipeHandler, false);
				}

				gameCanvas.addEventListener('touchstart', touchHandler, false);
				gameCanvas.addEventListener('touchend', touchHandler, false);
			}

			gamePaused = false;
		}
	}

	/* release the ball */
	function releaseBall() {
		if (lives && ball.vx == 0) {
			// launch the ball, either to the right or left (decide randomly)
			ball.vx = Math.round(Math.random()) ? -DEFAULT_BALL_SPEED : DEFAULT_BALL_SPEED;
			ball.vy = -1 * (DEFAULT_BALL_SPEED == 1 ? MEDIUM_BALL_SPEED : DEFAULT_BALL_SPEED);
		}
	}

	/* move the pad */
	function movePad(offset) {
		clearPad();

		if ((pad.x > 0 && offset < 0) || (pad.x < GAME_AREA_WIDTH - PAD_WIDTH && offset > 0)) {
			pad.x += offset;
		}

		drawPad();
	}

	/* draw the pad */
	function drawPad() {
		gameContext.save();

		gameContext.beginPath();
		gameContext.strokeStyle = padGradient;
		gameContext.lineWidth = PAD_HEIGHT;
		gameContext.lineCap = 'round';
		gameContext.moveTo(pad.x + PAD_WIDTH / 20, pad.y + PAD_HEIGHT_HALF);
		gameContext.lineTo(pad.x + PAD_WIDTH - PAD_WIDTH / 20, pad.y + PAD_HEIGHT_HALF);
		gameContext.stroke();

		gameContext.restore();
	}

	/* clear the pad */
	function clearPad() {
		gameContext.clearRect(pad.x - PAD_WIDTH / 20, pad.y - 1, PAD_WIDTH + PAD_WIDTH / 10, PAD_HEIGHT + 2);
	}

	/* draw the ball */
	function drawBall() {
		var ballGradient = null;

		gameContext.save();

		ballGradient = gameContext.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_RADIUS);
		ballGradient.addColorStop(0, '#ffffff');
		ballGradient.addColorStop(1, '#555555');

		gameContext.fillStyle = ballGradient;
		gameContext.beginPath();
		gameContext.arc(ball.x, ball.y, BALL_RADIUS, 0, 2 * Math.PI, false);
		gameContext.closePath();
		gameContext.fill();

		gameContext.restore();
	}

	/* clear the ball */
	function clearBall() {
		gameContext.save();

		gameContext.fillStyle = '#000000';
		gameContext.beginPath();
		gameContext.arc(ball.x, ball.y, BALL_RADIUS + 1, 0, 2 * Math.PI, false);
		gameContext.closePath();
		gameContext.fill();

		gameContext.restore();
	}

	/* draw a brick */
	function drawBrick(brickCoords) {
		var brickGradientDouble = null;
		var brickGradientSteel = null;

		gameContext.save();

		switch (brickCoords.type) {
			case BTYPE_NORMAL:
				gameContext.fillStyle = brickGradientNormal;
				break;
			case BTYPE_BONUS:
				gameContext.fillStyle = brickGradientBonus;
				break;
			case BTYPE_GOLD:
				gameContext.fillStyle = brickGradientGold;
				break;
			case BTYPE_DOUBLE:
				brickGradientDouble = gameContext.createLinearGradient(brickCoords.x, brickCoords.y, brickCoords.x, brickCoords.y + BRICK_HEIGHT);
				if (brickCoords.hit > 0) {
					brickGradientDouble.addColorStop(0, '#001100');
					brickGradientDouble.addColorStop(1, '#00aa00');
				}
				else {
					brickGradientDouble.addColorStop(0, '#00aa00');
					brickGradientDouble.addColorStop(1, '#001100');
				}
				gameContext.fillStyle = brickGradientDouble;
				break;
			case BTYPE_STEEL:
				brickGradientSteel = gameContext.createLinearGradient(brickCoords.x, brickCoords.y, brickCoords.x, brickCoords.y + BRICK_HEIGHT);
				brickGradientSteel.addColorStop(0, '#222222');
				brickGradientSteel.addColorStop(1, '#aaaaaa');

				gameContext.fillStyle = brickGradientSteel;
				gameContext.strokeStyle = '#f0f0f0';
				break;
			default:
				break;
		}

		// add 0.5 pixel in order to have the lines crisp
		gameContext.fillRect(brickCoords.x + 0.5, brickCoords.y + 0.5, BRICK_WIDTH, BRICK_HEIGHT);
		gameContext.strokeRect(brickCoords.x + 0.5, brickCoords.y + 0.5, BRICK_WIDTH, BRICK_HEIGHT);

		gameContext.restore();
	}

	/* draw all bricks */
	function drawAllBricks() {
		for (var i = 0; i < NUM_COLS; i++) {
			for (var j = 0; j < NUM_ROWS; j++) {
				if (brickMatrix[i][j].active) {
					brickCoords = { 
					                x: (brickMatrixStartX + i*BRICK_WIDTH),
					                y: (brickMatrixStartY + j*BRICK_HEIGHT),
					                type: brickMatrix[i][j].type,
					                hit: brickMatrix[i][j].hit
					              };
					drawBrick(brickCoords);
				}
			}
		}
	}

	/* clear a brick */
	function clearBrick(brickCoords) {
		gameContext.clearRect(brickCoords.x - 1, brickCoords.y - 1, BRICK_WIDTH + 2, BRICK_HEIGHT + 2);
	}

	/* this is where the magic happens */
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

		var brickCol = -1;
		var brickRow = -1;
		var brickCoords = null;
		var hitBrick = false;

		if (gamePaused) {
			return;
		}

		// move pad on keyboard or touchinput
		if (goWest) {
			movePad(-PAD_SPEED);
		}
		else if (goEast) {
			movePad(PAD_SPEED);
		}

		// clear ball on old position
		clearBall();

		// check if we're done
		if (numBricksLeft == 0) {
			cancelAnimationFrame(timerId);
			timerId = 0;
			drawPad();

			if (Levels.length != ++level) {
				// show level advance message and set trigger for next level load
				showMessage('Congratulations!', true);
				showMessage('Proceed to level ' + (level + 1), false);

				gameCanvas.removeEventListener('touchmove', touchSwipeHandler, false);
				gameCanvas.removeEventListener('mousemove', mouseHandler, false);

				if (!_isTouchDevice()) {
					gameCanvas.addEventListener('click', loadLevel, false);
				}

				if (attachKeyboard) {
					document.onkeydown = loadLevel;
				}

				if (attachTouchControls) {
					gameCanvas.addEventListener('touchstart', loadLevel, false);
				}

				clearPad();

				if (enableSoundFX && audio_finishLevel) {
					audio_finishLevel.play();
				}

				return;
			}
			else {
				// show winner message
				showMessage("You're A Winner!", true);
				showMessage('You scored ' + score + ' points', false);
				level = 0;

				gameCanvas.removeEventListener('mousemove', mouseHandler, false);
				gameCanvas.removeEventListener('touchmove', touchSwipeHandler, false);

				if (!_isTouchDevice()) {
					gameCanvas.addEventListener('click', loadMenu, false);
				}

				if (attachKeyboard) {
					document.onkeydown = loadMenu;
				}

				if (attachTouchControls) {
					gameCanvas.addEventListener('touchstart', loadMenu, false);
				}

				clearPad();

				if (enableSoundFX && audio_winner) {
					audio_winner.play();
				}

				return;
			}
		}

		// ball hits east or west wall
		if ((ball.getEast() >= GAME_AREA_WIDTH && ball.vx > 0) || (ball.getWest() <= 0 && ball.vx < 0)) {
			ball.vx = -ball.vx;
		}

		// ball hits ceiling
		if (ball.getNorth() <= 0 && ball.vy < 0) {
			ball.vy = -ball.vy;
		}

		// ball is not caught by pad
		if (ball.getSouth() > pad.y + Math.max(ball.vy, PAD_HEIGHT)) {
			lives--;
			updateGameStatus();
			goEast = goWest = false;
			ball.vx = ball.vy = 0;
			ball.x = GAME_AREA_WIDTH >> 1;
			ball.y = floor((GAME_AREA_HEIGHT << 1) / 3) + 15;

			drawAllBricks();
			drawPad();

			// Game Over, no more lives
			if (lives < 1) {
				// reset timer
				cancelAnimationFrame(timerId);
				timerId = 0;

				gameCanvas.removeEventListener('mousemove', mouseHandler, false);
				gameCanvas.removeEventListener('touchmove', touchSwipeHandler, false);

				// show game over message and set trigger for main menu load
				showMessage('Game Over', true);
				showMessage('You scored ' + score + ' points', false);

				if (!_isTouchDevice()) {
					gameCanvas.addEventListener('click', loadMenu, false);
				}

				if (attachKeyboard) {
					document.onkeydown = loadMenu;
				}

				if (attachTouchControls) {
					gameCanvas.addEventListener('touchstart', loadMenu, false);
				}

				clearPad();

				if (enableSoundFX && audio_gameOver) {
					audio_gameOver.play();
				}
				return;
			}

			if (enableSoundFX && audio_loseLive) {
				audio_loseLive.play();
			}

			drawBall();
			return;
		}

		// bounce off pad
		if (ball.getEast() > pad.x && ball.getWest() < pad.x + PAD_WIDTH && ball.getSouth() + ball.vy >= pad.y - 1 && ball.getSouth() <= pad.y + Math.max(ball.vy, PAD_HEIGHT)) {
			if (ball.x < pad.x + PAD_WIDTH / 6) {
				// far-west part of pad
				ball.vx = ball.vx > 0 ? -ball.vx : -HIGH_BALL_SPEED;
				ball.vy = ball.vx > 0 ? -HIGH_BALL_SPEED : -DEFAULT_BALL_SPEED;
			}
			else if (ball.x > pad.x + PAD_WIDTH - PAD_WIDTH / 6) {
				// far-east part of pad
				ball.vx = ball.vx > 0 ? HIGH_BALL_SPEED : -ball.vx;
				ball.vy = ball.vx > 0 ? -DEFAULT_BALL_SPEED : -HIGH_BALL_SPEED;
			}
			else if (ball.x < pad.x + PAD_WIDTH / 2.5) {
				// west-side
				ball.vx = ball.vx > 0 ? DEFAULT_BALL_SPEED : -MEDIUM_BALL_SPEED;
				ball.vy = ball.vx > 0 ? -MEDIUM_BALL_SPEED : -DEFAULT_BALL_SPEED;
			}
			else if (ball.x > pad.x + PAD_WIDTH - PAD_WIDTH / 2.5) {
				// east-side
				ball.vx = ball.vx > 0 ? MEDIUM_BALL_SPEED : -DEFAULT_BALL_SPEED;
				ball.vy = ball.vx > 0 ? -DEFAULT_BALL_SPEED : -MEDIUM_BALL_SPEED;
			}
			else {
				// middle part of pad
				ball.vx = ball.vx;
				ball.vy = -ball.vy;
			}

			drawAllBricks();

			if (enableSoundFX && audio_hitPad) {
				audio_hitPad.play();
			}
		}

		// ball is in brick area
		if (
			ball.getEast() >= brickMatrixStartX &&
			ball.getWest() <= brickMatrixStartX + NUM_COLS * BRICK_WIDTH &&
			ball.getSouth() >= brickMatrixStartY &&
			ball.getNorth() <= brickMatrixStartY + NUM_ROWS * BRICK_HEIGHT
		) {
			// get the relative 'coordinates' of the brick at this position in the brickMatrix
			brickCol = floor(((ball.vx > 0 ? ball.getEast() : ball.getWest()) - brickMatrixStartX) / BRICK_WIDTH);
			brickRow = floor(((ball.vy > 0 ? ball.getSouth() : ball.getNorth()) - brickMatrixStartY) / BRICK_HEIGHT);

			// correct boundaries
			brickCol = brickCol == NUM_COLS ? brickCol - 1 : brickCol < 0 ? 0 : brickCol;
			brickRow = brickRow == NUM_ROWS ? brickRow - 1 : brickRow < 0 ? 0 : brickRow;

			// rewrite the relative coordinates into absolute coordinates
			brickCoords = {
			                x: (brickCol * BRICK_WIDTH) + brickMatrixStartX,
			                y: (brickRow * BRICK_HEIGHT) + brickMatrixStartY
			              };

			// Because we only know the N, E, S and W coordinates of the ball, it is in certain
			// situations hard to determine which brick the ball hits.
			// The following code checks if the current estimation is wrong, by comparing the ball
			// position to known situations where a wrong brick is estimateed.
			// The comments reflect the situation, where '=' represents a brick, and '*' represents the ball.
			if (ball.vy < 0 && ball.vx < 0 && ball.x > brickCoords.x + BRICK_WIDTH && ball.y > brickCoords.y + BRICK_HEIGHT) {
				// ==
				// =*
				if (brickRow < NUM_ROWS - 1 && brickRow > 0 && brickMatrix[brickCol][brickRow + 1].active) {
					brickRow++;
					brickCoords.y = brickRow * BRICK_HEIGHT + brickMatrixStartY;
				}
				else if (brickCol < NUM_COLS - 1 && brickCol > 0 && brickMatrix[brickCol + 1][brickRow].active) {
					brickCol++;
					brickCoords.x = brickCol * BRICK_WIDTH + brickMatrixStartX;
				}
			}
			else if (ball.vy < 0 && ball.vx > 0 && ball.x < brickCoords.x && ball.y > brickCoords.y + BRICK_HEIGHT) {
				// ==
				// *=
				if (brickCol < NUM_COLS - 1 && brickCol > 0 && brickMatrix[brickCol - 1][brickRow].active) {
					brickCol--;
					brickCoords.x = brickCol * BRICK_WIDTH + brickMatrixStartX;
				}
				else if (brickRow < NUM_ROWS - 1 && brickRow > 0 && brickMatrix[brickCol][brickRow + 1].active) {
					brickRow++;
					brickCoords.y = brickRow * BRICK_HEIGHT + brickMatrixStartY;
				}
			}
			else if (ball.vy > 0 && ball.vx < 0 && ball.x > brickCoords.x + BRICK_WIDTH && ball.y < brickCoords.y) {
				// =*
				// ==
				if (brickRow < NUM_ROWS - 1 && brickRow > 0 && brickMatrix[brickCol][brickRow - 1].active) {
					brickRow--;
					brickCoords.y = brickRow * BRICK_HEIGHT + brickMatrixStartY;
				}
				else if (brickCol < NUM_COLS - 1 && brickCol > 0 && brickMatrix[brickCol + 1][brickRow].active) {
					brickCol++;
					brickCoords.x = brickCol * BRICK_WIDTH + brickMatrixStartX;
				}
			}
			else if (ball.vy > 0 && ball.vx > 0 && ball.x < brickCoords.x && ball.y < brickCoords.y) {
				//*=
				//==
				if (brickCol < NUM_COLS - 1 && brickCol > 0 && brickMatrix[brickCol - 1][brickRow].active) {
					brickCol--;
					brickCoords.x = brickCol * BRICK_WIDTH + brickMatrixStartX;
				}
				else if (brickRow < NUM_ROWS - 1 && brickRow > 0 && brickMatrix[brickCol][brickRow - 1].active) {
					brickRow--;
					brickCoords.y = brickRow * BRICK_HEIGHT + brickMatrixStartY;
				}
			}

			// check if the brick is still active
			if (brickMatrix[brickCol][brickRow].active == true) {
				if ((((ball.vx > 0) && (ball.getEast() >= brickCoords.x) && (ball.getEast() <= brickCoords.x + ball.vx)) ||
				     ((ball.vx < 0) && (ball.getWest() <= brickCoords.x + BRICK_WIDTH) && (ball.getWest() >= brickCoords.x + BRICK_WIDTH + ball.vx))) &&
				    (((ball.vy < 0) && (ball.getNorth() < brickCoords.y + BRICK_HEIGHT - ball.vy)) ||
				     ((ball.vy > 0) && (ball.getSouth() > brickCoords.y + ball.vy)))) {
					// hit a brick from the east or west side
					ball.vx = -ball.vx;
					hitBrick = true;
				}
				else if ((((ball.vy > 0) && (ball.getSouth() >= brickCoords.y) && (ball.getSouth() <= brickCoords.y + ball.vy)) ||
				     ((ball.vy < 0) && (ball.getNorth() <= brickCoords.y + BRICK_HEIGHT) && (ball.getNorth() >= brickCoords.y + BRICK_HEIGHT + ball.vy))) &&
				    (((ball.vx < 0) && (ball.getWest() < brickCoords.x + BRICK_WIDTH - ball.vx)) ||
				     ((ball.vx > 0) && (ball.getEast() > brickCoords.x + ball.vx)))) {
					// hit a brick from the north or south side
					ball.vy = -ball.vy;
					hitBrick = true;
				}

				if (!hitBrick) {
					if (Math.abs(ball.vx) > Math.abs(ball.vy)) {
						ball.vx = -ball.vx;
					}
					else {
						ball.vy = -ball.vy;
					}
				}

				if (enableSoundFX && audio_hitBrick) {
					audio_hitBrick.play();
				}

				brickMatrix[brickCol][brickRow].hit++;

				switch (brickMatrix[brickCol][brickRow].type) {
					case BTYPE_STEEL:
						// subtract points when hitting a steel brick
						score -= (NUM_ROWS - brickRow) * 10;
						if (brickMatrix[brickCol][brickRow].hit < NUM_STEEL_HITS) {
							break;
						}
						// the following 'extra' brick will be subtracted a few lines below...
						numBricksLeft++;
					// explicit fallthrough
					case BTYPE_DOUBLE:
						if (brickMatrix[brickCol][brickRow].hit < 2) {
							break;
						}
					// explicit fallthrough
					default:
						// add points
						score += (NUM_ROWS - brickRow) * 10 * brickMatrix[brickCol][brickRow].type;
						// remove the brick
						brickMatrix[brickCol][brickRow].active = false;
						numBricksLeft--;
						clearBrick(brickCoords);
						break;
				}

				updateGameStatus();
			}
		}

		// give the ball its new position
		ball.y += ball.vy;
		ball.x += ball.vx;
		drawBall();

		if (ball.getSouth() >= pad.y - Math.abs(ball.vy)) {
			drawPad();
		}

		// only redraw bricks when in the brick region
		if (brickCol > -1) {
			// redraw a part of the brick matrix (some graphical artifacts might exist)
			for (var i = brickCol - 1; i <= brickCol + 1; i++) {
				for (var j = brickRow - 1; j <= brickRow + 1; j++) {
					if (brickMatrix[i] != undefined && typeof brickMatrix[i][j] == 'object' && brickMatrix[i][j].active == true) {
						drawBrick({
						            x: (i * BRICK_WIDTH) + brickMatrixStartX,
						            y: (j * BRICK_HEIGHT) + brickMatrixStartY,
						            type: brickMatrix[i][j].type,
						            hit: brickMatrix[i][j].hit
						          });
					}
				}
			}
		}
	}

	/* prepare the canvas */
	function prepareGameArea() {
		// DOM elements
		var BrickItField = null;
		var wrapperDiv = null;

		// place the game in the div 'BrickItField' if present, attach it to the
		// document body otherwise
		if ((BrickItField = document.getElementById(BRICKIT_ID)) == null) {
			BrickItField = document.body;
		}

		// reset the game
		if ((wrapperDiv = document.getElementById(BRICKIT_ID + '_BrickItWrapper')) != null) {
			BrickItField.removeChild(wrapperDiv);
		}

		// div for BrickIt
		wrapperDiv = document.createElement('div');
		wrapperDiv.id = BRICKIT_ID + '_BrickItWrapper';
		wrapperDiv.className = 'BrickItWrapper';
		BrickItField.appendChild(wrapperDiv);

		// canvas where the game will take place
		gameCanvas = document.createElement('canvas');
		gameCanvas.className = 'BrickItGameCanvas';
		gameCanvas.width = GAME_AREA_WIDTH;
		gameCanvas.height = GAME_AREA_HEIGHT;

		try {
			gameContext = gameCanvas.getContext('2d');
		} 
		catch (e) {
			wrapperDiv.className += ' BrickItError';
			wrapperDiv.innerHTML = '<p>HTML5 Canvas is not supported in your browser.</p>' +
			                       '<p>Use a current browser to play BrickIt.</p>';
			return;
		}
		gameContext.fillStyle = '#e3e3e3';
		gameContext.strokeStyle = '#f5f167';
		gameContext.lineWidth = 1;

		// create some of the gradients used for bricks
		brickGradientNormal = gameContext.createLinearGradient(brickMatrixStartX, brickMatrixStartY, brickMatrixStartX, brickMatrixStartY + NUM_ROWS * BRICK_HEIGHT);
		brickGradientNormal.addColorStop(0, '#0d2257');
		brickGradientNormal.addColorStop(0.5, '#1c46af');
		brickGradientNormal.addColorStop(1, '#4e78e2');

		brickGradientBonus = gameContext.createLinearGradient(brickMatrixStartX, brickMatrixStartY, brickMatrixStartX, brickMatrixStartY + NUM_ROWS * BRICK_HEIGHT);
		brickGradientBonus.addColorStop(0, '#ff0000');
		brickGradientBonus.addColorStop(1, '#330000');

		brickGradientGold = gameContext.createLinearGradient(brickMatrixStartX, brickMatrixStartY, brickMatrixStartX, brickMatrixStartY + NUM_ROWS * BRICK_HEIGHT);
		brickGradientGold.addColorStop(0, '#eaff00');
		brickGradientGold.addColorStop(1, '#606900');

		// gradient used for the pad
		padGradient = gameContext.createLinearGradient(0, pad.y, 0, pad.y + PAD_HEIGHT);
		padGradient.addColorStop(0, '#f0f0f0');
		padGradient.addColorStop(1, '#333333');

		// gradient used for banner messages
		textGradient = gameContext.createLinearGradient(0, (GAME_AREA_HEIGHT >> 1) - 50, 0, (GAME_AREA_HEIGHT >> 1) + 50);
		textGradient.addColorStop(0, '#0d2257');
		textGradient.addColorStop(0.5, '#1c46af');
		textGradient.addColorStop(1, '#4e78e2');

		wrapperDiv.appendChild(gameCanvas);
	}

	/* prepares a level */
	function loadLevel() {
		var brickCoords = null;
		numBricksLeft = 0;

		// determine number of brick rows and columns
		NUM_ROWS = Levels[level].length;
		NUM_COLS = Levels[level][0].length;
		brickMatrixStartX = (GAME_AREA_WIDTH - NUM_COLS * BRICK_WIDTH) >> 1;

		// set default pad location
		pad.x = (GAME_AREA_WIDTH - PAD_WIDTH) >> 1;
		pad.y = GAME_AREA_HEIGHT - PAD_BOTTOM_OFFSET;

		// set default ball location
		ball.vx = 0;
		ball.vy = 0;
		ball.x = GAME_AREA_WIDTH >> 1;
		ball.y = floor((GAME_AREA_HEIGHT << 1) / 3) + 15;

		// prepare the canvas
		prepareGameArea();

		// populate the 2-dimensional array that will contain information about the bricks
		brickMatrix = new Array(NUM_COLS);
		for (var i = 0; i < NUM_COLS; i++) {
			brickMatrix[i] = new Array(NUM_ROWS);

			for (var j = 0; j < NUM_ROWS; j++) {
				brickMatrix[i][j] = { 
				                      active: (Levels[level][j][i] > 0), // brick still there?
				                      type: Levels[level][j][i],         // type of brick
				                      hit: 0                             // how many times hit?
				                    };

				if (brickMatrix[i][j].active && brickMatrix[i][j].type != BTYPE_STEEL) {
					// count the number of bricks in the game area
					// steel bricks can be destroyed (after 10 hits), but they are not required
					numBricksLeft++;
				}
			}
		}

		// draw all bricks
		drawAllBricks();

		// if tehre was a timer running (previous game), stop it
		if (timerId != 0) {
			cancelAnimationFrame(timerId);
		}

		// start the timer
		timerId = requestAnimationFrame(coreLoop);

		if (!_isTouchDevice()) {
			gameCanvas.addEventListener('mousemove', mouseHandler, false);
			gameCanvas.addEventListener('click', inGameClick, false);
		}

		// attach handlers for the different input options
		if (attachKeyboard) {
			_attachKeyboardHandlers();
		}

		if (attachTouchControls) {
			if (attachTouchSwipe) {
				gameCanvas.addEventListener('touchmove', touchSwipeHandler, false);
			}

			gameCanvas.addEventListener('touchstart', touchHandler, false);
			gameCanvas.addEventListener('touchend', touchHandler, false);
		}

		if (enableSoundFX && audio_startGame) {
			audio_startGame.play();
		}

		updateGameStatus();
		drawPad();
		drawBall();

		if (level == 0 && touchControlsInUse) {
			// we're playing the first level, and touch controls are used, show instructions using thumbs
			thumbsUp = true;

			gameContext.save();
			gameContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
			gameContext.fillRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);

			leftThumbImg = document.getElementById('leftThumb');
			rightThumbImg = document.getElementById('rightThumb');
			gameContext.drawImage(leftThumbImg, 10, (GAME_AREA_HEIGHT >> 1) - (leftThumbImg.height >> 1) - 30);
			gameContext.drawImage(rightThumbImg, GAME_AREA_WIDTH - rightThumbImg.width - 10, (GAME_AREA_HEIGHT >> 1) - (rightThumbImg.height >> 1) - 30);

			gameContext.fillStyle = '#ffff00';
			gameContext.textAlign = 'center';
			gameContext.font = '20px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillText('MOVE LEFT', 10 + (leftThumbImg.width >> 1), (GAME_AREA_HEIGHT >> 1) + (leftThumbImg.height >> 1) - 20);
			gameContext.fillText('MOVE RIGHT', GAME_AREA_WIDTH - 10 - (rightThumbImg.width >> 1), (GAME_AREA_HEIGHT >> 1) + (leftThumbImg.height >> 1) - 20);
			gameContext.restore();
		}
	}

	/* shows the instructions */
	function loadInstructions() {
		// remove event handlers for main menu
		gameCanvas.removeEventListener('click', menuTouchClick, false);
		gameCanvas.removeEventListener('touchstart', menuTouchClick, false);

		if (!_isTouchDevice()) {
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
		menuGradient.addColorStop(0.5, '#000010');
		menuGradient.addColorStop(1, '#000000');

		if (myBrowser.OS.name == 'Android') {
			gameContext.fillStyle = '#000000';
		}
		else {
			gameContext.fillStyle = menuGradient;
		}
		gameContext.fillRect(0, 0, GAME_AREA_WIDTH, GAME_AREA_HEIGHT);

		var fontSize = (GAME_AREA_HEIGHT / 19) + 3;

		instructionsText = [
			'The objective in BrickIt is to clear all colored',
			'bricks in each level.',
			'',
			'Bricks are cleared when you hit them with the ball.',
			'',
			'You can control the pad using your keyboard,',
			'mouse or touch screen. On a touch screen, touch the',
			'left or right side of the field to move the pad,',
			'and in the middle to release the ball.',
			'',
			'Click, touch or press any key to return to the menu.'
		];

		gameContext.textAlign = 'left';
		gameContext.fillStyle = '#bbbbbb';
		gameContext.font = fontSize + 'px Futura-CondensedExtraBold, Impact, Helvetica';

		var helpTextDimensions = gameContext.measureText(instructionsText[instructionsText.length - 1]);
		var helpTextOffset = (GAME_AREA_WIDTH - helpTextDimensions.width) >> 1;

		for (var i = 0; i < instructionsText.length; i++) {
			gameContext.fillText(instructionsText[i], helpTextOffset, fontSize * i + fontSize * 3);
		}

		gameContext.restore();
	}

	/* shows the menu */
	function loadMenu() {
		var fontSize = GAME_AREA_HEIGHT / 10;

		if (skipMenu) {
			// we're on an iPad with iOS 3, that means no Canvas text :(
			// so let's just start playing
			score = 0;
			level = 0;
			lives = DEFAULT_LIVES;
			loadLevel();
			return;
		}

		// prepare the canvas
		prepareGameArea();

		gameContext.save();

		// gradient for menu background
		var menuGradient = gameContext.createRadialGradient(GAME_AREA_WIDTH >> 2, GAME_AREA_HEIGHT >> 2, 10, GAME_AREA_WIDTH >> 1, GAME_AREA_WIDTH >> 1, GAME_AREA_WIDTH);
		menuGradient.addColorStop(0, '#444444');
		menuGradient.addColorStop(0.5, '#000010');
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
		headGradient.addColorStop(0, '#0d2257');
		headGradient.addColorStop(0.5, '#1c46af');
		headGradient.addColorStop(1, '#4e78e2');

		// BrickIt header
		gameContext.textAlign = 'center';
		gameContext.fillStyle = headGradient;
		gameContext.strokeStyle = '#ffffff';
		gameContext.lineWidth = 2;
		gameContext.font = fontSize * 2.5 + 'px Futura-CondensedExtraBold, Impact, Helvetica';
		gameContext.fillText('BrickIt', GAME_AREA_WIDTH >> 1, fontSize * 2.5 + 10);
		gameContext.strokeText('BrickIt', GAME_AREA_WIDTH >> 1, fontSize * 2.5 + 10);

		// start game option
		gameContext.fillStyle = '#000000';
		gameContext.lineWidth = 1.5;
		gameContext.font = fontSize + 'px Futura-CondensedExtraBold, Impact, Helvetica';
		gameContext.fillText('Start Game', GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);
		gameContext.strokeText('Start Game', GAME_AREA_WIDTH >> 1, GAME_AREA_HEIGHT >> 1);

		// level select option
		gameContext.fillText('Level ' + (level + 1), GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + fontSize * 1.5);
		gameContext.strokeText('Level ' + (level + 1), GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + fontSize * 1.5);

		// instructions option
		gameContext.fillText('Instructions', GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + 3.5 * fontSize);
		gameContext.strokeText('Instructions', GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + 3.5 * fontSize);

		// measurements in order to determine where to draw the triangles and keyboard cursor
		var startTxtDimensions = gameContext.measureText('Start Game');
		var levelsTxtDimensions = gameContext.measureText('Level ' + (level + 1));
		var instrTxtDimensions = gameContext.measureText('Instructions');
		startTxtOffset = (startTxtDimensions.width >> 1) + 25;
		levelTxtOffset = (levelsTxtDimensions.width >> 1) + 25;
		instrTxtOffset = (instrTxtDimensions.width >> 1) + 25;

		// + level triangle
		gameContext.moveTo((GAME_AREA_WIDTH >> 1) + levelTxtOffset, (GAME_AREA_HEIGHT >> 1) - 7 + fontSize);
		gameContext.lineTo((GAME_AREA_WIDTH >> 1) + levelTxtOffset, (GAME_AREA_HEIGHT >> 1) + 20 + fontSize);
		gameContext.lineTo(
			(GAME_AREA_WIDTH >> 1) + levelTxtOffset + 40,
			(GAME_AREA_HEIGHT >> 1) + 20 + fontSize - (((GAME_AREA_HEIGHT >> 1) + 20 + fontSize - ((GAME_AREA_HEIGHT >> 1) - 7 + fontSize)) >> 1)
		);
		gameContext.lineTo((GAME_AREA_WIDTH >> 1) + levelTxtOffset, (GAME_AREA_HEIGHT >> 1) - 7 + fontSize);

		// - level triangle
		gameContext.moveTo((GAME_AREA_WIDTH >> 1) - levelTxtOffset, (GAME_AREA_HEIGHT >> 1) - 7 + fontSize);
		gameContext.lineTo((GAME_AREA_WIDTH >> 1) - levelTxtOffset, (GAME_AREA_HEIGHT >> 1) + 20 + fontSize);
		gameContext.lineTo(
			(GAME_AREA_WIDTH >> 1) - levelTxtOffset - 40,
			(GAME_AREA_HEIGHT >> 1) + 20 + fontSize - (((GAME_AREA_HEIGHT >> 1) + 20 + fontSize - ((GAME_AREA_HEIGHT >> 1) - 7 + fontSize)) >> 1)
		);
		gameContext.lineTo((GAME_AREA_WIDTH >> 1) - levelTxtOffset, (GAME_AREA_HEIGHT >> 1) - 7 + fontSize);
		gameContext.fill();
		gameContext.stroke();

		// selected level name
		gameContext.font = fontSize / 2 + 'px Futura-CondensedExtraBold, Impact, Helvetica';
		gameContext.fillStyle = '#ffff00';
		gameContext.fillText(Levels[level].title, GAME_AREA_WIDTH >> 1, (GAME_AREA_HEIGHT >> 1) + fontSize * 1.5 + fontSize / 1.5);
		gameContext.font = fontSize + 'px Futura-CondensedExtraBold, Impact, Helvetica';

		// enable/disable audio checkbox
		if (AUDIO_ENABLED) {
			// checkbox
			gameContext.fillStyle = enableSoundFX ? '#ff0000' : '#000000';
			gameContext.fillRect(10, GAME_AREA_HEIGHT - 25, 15, 15);
			gameContext.strokeRect(10, GAME_AREA_HEIGHT - 25, 15, 15);

			// text
			gameContext.font = fontSize / 3 + 'px Futura-CondensedExtraBold, Impact, Helvetica';
			gameContext.fillStyle = '#f0f0f0';
			gameContext.textAlign = 'left';
			gameContext.fillText('Sound FX [s]', 35, GAME_AREA_HEIGHT - 11);
		}

		// copyright message
		gameContext.fillStyle = '#cccccc';
		gameContext.font = '13px Helvetica';
		gameContext.textAlign = 'right';
		var aboutText = 'v' + VERSION + ' - By Thijs van As, 2010';
		gameContext.fillText(aboutText, GAME_AREA_WIDTH - 7, GAME_AREA_HEIGHT - 10);

		gameContext.restore();

		if (!_isTouchDevice()) {
			gameCanvas.addEventListener('click', menuTouchClick, false);
		}

		if (attachKeyboard) {
			ball.x = (GAME_AREA_WIDTH >> 1) - instrTxtOffset - 40;
			ball.y = (GAME_AREA_HEIGHT >> 1) + fontSize * (selectedMenuOption == 2 ? 3.5 : 1.5 * selectedMenuOption) - fontSize / 3;
			drawBall();
			_attachKeyboardHandlersMenu();
		}

		if (attachTouchControls) {
			gameCanvas.addEventListener('touchstart', menuTouchClick, false);
		}
	}

	/* starts/resets the game */
	function main(params) {
		/* optional properties in params object
		 *
		 * name                type     value
		 * -------------------+--------+---------------------------------------
		 * level               <int>    level to start with
		 * lives               <int>    number of lives
		 * attachKeyboard      <bool>   enable keyboard controls for this instance
		 * attachTouchControls <bool>   enable touch controls for this instance
		 * attachTouchSwipe    <bool>   enable touch swipe pad controls for this instance
		 * enableSoundFX       <bool>   enable sound effects
		 * audio_hitBrick      <string> id of audio element
		 * audio_hitPad        <string> id of audio element
		 * audio_loseLive      <string> id of audio element
		 * audio_startGame     <string> id of audio element
		 * audio_finishLevel   <string> id of audio element
		 * audio_gameOver      <string> id of audio element
		 * audio_winner        <string> id of audio element
		 * gameAreaWidth       <int>    width of the game area in pixels
		 * gameAreaHeight      <int>    height of the game area in pixels
		 * brickWidth          <int>    width of brick in pixels
		 * brickHeight         <int>    height of brick in pixels
		 * padWidth            <int>    width of pad in pixels
		 * padHeight           <int>    height of pad in pixels
		 * padBottomOffset     <int>    offset in pixels of pad from bottom
		 * ballRadius          <int>    radius of ball in pixels
		 * padSpeed            <int>    speed of pad in pixels/tick
		 * defaultBallSpeed    <int>    default speed of ball in pixels/tick
		 * coreLoopInterval    <int>    number of milliseconds between each tick
		 */

		// parse params
		if (typeof params == 'object') {
			level = params.level != undefined ? params.level - 1 : level;
			DEFAULT_LIVES = params.lives != undefined ? params.lives : DEFAULT_LIVES;
			attachKeyboard = params.attachKeyboard != undefined ? params.attachKeyboard : true;
			attachTouchControls = params.attachTouchControls != undefined ? params.attachTouchControls : true;
			attachTouchSwipe = params.attachTouchSwipe != undefined ? params.attachTouchSwipe : false;
			AUDIO_ENABLED = enableSoundFX = params.enableSoundFX != undefined ? params.enableSoundFX : enableSoundFX;
			audio_hitBrick = params.audio_hitBrick != undefined ? document.getElementById(params.audio_hitBrick) : null;
			audio_hitPad = params.audio_hitPad != undefined ? document.getElementById(params.audio_hitPad) : null;
			audio_loseLive = params.audio_loseLive != undefined ? document.getElementById(params.audio_loseLive) : null;
			audio_startGame = params.audio_startGame != undefined ? document.getElementById(params.audio_startGame) : null;
			audio_finishLevel = params.audio_finishLevel != undefined ? document.getElementById(params.audio_finishLevel) : null;
			audio_gameOver = params.audio_gameOver != undefined ? document.getElementById(params.audio_gameOver) : null;
			audio_winner = params.audio_winner != undefined ? document.getElementById(params.audio_winner) : null;
			GAME_AREA_WIDTH = params.gameAreaWidth != undefined ? params.gameAreaWidth : GAME_AREA_WIDTH;
			GAME_AREA_HEIGHT = params.gameAreaHeight != undefined ? params.gameAreaHeight : GAME_AREA_HEIGHT;
			BRICK_WIDTH = params.brickWidth != undefined ? params.brickWidth : BRICK_WIDTH;
			BRICK_HEIGHT = params.brickHeight != undefined ? params.brickHeight : BRICK_HEIGHT;
			PAD_WIDTH = params.padWidth != undefined ? params.padWidth : PAD_WIDTH;
			PAD_WIDTH_HALF = PAD_WIDTH >> 1;
			PAD_HEIGHT = params.padHeight != undefined ? params.padHeight : PAD_HEIGHT;
			PAD_HEIGHT_HALF = PAD_HEIGHT >> 1;
			PAD_BOTTOM_OFFSET = params.padBottomOffset != undefined ? params.padBottomOffset : PAD_BOTTOM_OFFSET;
			BALL_RADIUS = params.ballRadius != undefined ? params.ballRadius : BALL_RADIUS;
			PAD_SPEED = params.padSpeed != undefined ? params.padSpeed : PAD_SPEED;
			DEFAULT_BALL_SPEED = params.defaultBallSpeed != undefined ? params.defaultBallSpeed : DEFAULT_BALL_SPEED;
			MEDIUM_BALL_SPEED = DEFAULT_BALL_SPEED + 1;
			HIGH_BALL_SPEED = MEDIUM_BALL_SPEED + 1;
			CORELOOP_INTERVAL = params.coreLoopInterval != undefined ? params.coreLoopInterval : CORELOOP_INTERVAL;
			skipMenu = params.skipMenu != undefined ? params.skipMenu : skipMenu;
		}

		// load the menu
		loadMenu();
	}

	/* attach main() and togglePauseGame() to the instance of BrickIt */
	this.main = main;
	this.pause = togglePauseGame;
};
