/* net.pretopia.FloodIt
 *
 * A client-side JavaScript implementation of the FloodIt game.
 *
 * Copyright (c) 2010, 2014, Thijs van As <t.vanas@gmail.com>
 *
 * floodit.js
 */

/* create/check namespace net.pretopia.FloodIt
 *
 * Namespace implementation taken from the book
 * JavaScript: The Definitive Guide by David Flanagan
 */
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

if (net.pretopia.FloodIt) {
	throw new Error('net.pretopia.FloodIt already exists');
}

/* end of namespace initialization, actual code begins here */
net.pretopia.FloodIt = function (div) {
	if (div != null && div != '') {
		var FLOODIT_ID = div;
	}
	else {
		var FLOODIT_ID = 'FloodItInstance';
	}

	var GAME_WIDTH = 600; // width of the game field

	var NUM_ROWSCOLS = 12; // row and column count
	var MAX_TURNS = 22; // maximum number of turns

	var lastKey = -1; // last color chosen
	var turns = -1; // actual number of turns left
	var turnsUsed = -1; // how many turns left

	var occupiedSquares = null; // array containing flooded squares

	var highScore = 99999;

	var ColorSets = [];

	// squares
	ColorSets[0] = [
		'rgb(206, 86, 49)',   // red
		'rgb(135, 150, 52)',  // green
		'rgb(90, 102, 164)',  // purple
		'rgb(222, 127, 161)', // pink
		'rgb(248, 236, 78)',  // yellow
		'rgb(91, 179, 222)'   // blue
	];
	// pickers
	ColorSets[1] = [
		'rgb(174,73,41)',  // red
		'rgb(109,121,42)', // green
		'rgb(76,86,139)',  // purple
		'rgb(210,80,127)', // pink
		'rgb(246,230,21)', // yellow
		'rgb(49,159,213)'  // blue
	];

	// 2014 tweaks: removed theme changer
	/*	
	ColorSets[2] = [
		'rgb(243,108,96)',  // red
		'rgb(66,189,65)',   // green
		'rgb(126,87,194)',  // purple
		'rgb(161,136,127)', // brown
		'rgb(255,238,88)',  // yellow
		'rgb(115,143,254)'  // blue
	];
	ColorSets[3] = [
		'rgb(255, 0, 0)',
		'rgb(0, 255, 0)',
		'rgb(0, 0, 255)',
		'rgb(255, 0, 255)',
		'rgb(255, 255, 0)',
		'rgb(0, 255, 255)'
	];
	ColorSets[4] = [
		'rgb(4, 55, 108)',
		'rgb(13, 88, 166)',
		'rgb(75, 136, 211)',
		'rgb(255, 153, 0)',
		'rgb(191, 134, 48)',
		'rgb(255, 199, 115)'
	];
	ColorSets[5] = [
		'rgb(243, 108, 96)',  // red
		'rgb(66, 189, 65)',   // green
		'rgb(149, 117, 205)', // purple
		'rgb(240, 98, 146)',  // pink
		'rgb(255, 241, 118)', // yellow
		'rgb(145, 167, 255)'. // blue
	];
	*/

	var currentTheme = 0;
	var Colors = ColorSets[currentTheme];

	function getTopYCoordinate(element) {
		var y = element.offsetTop;

		while ((element = element.offsetParent)) {
			y += element.offsetTop;
		}

		return y;
	}

	/* check if the game is won */
	function isComplete() {
		var prevColor = document.getElementById(FLOODIT_ID + '_col_0_0').style.backgroundColor;
		var currentColor;

		for (var i = 0; i < NUM_ROWSCOLS; i++) {
			for (var j = 0; j < NUM_ROWSCOLS; j++) {
				currentColor = prevColor;
				prevColor = document.getElementById(FLOODIT_ID + '_col_' + j + '_' + i).style.backgroundColor;

				if (prevColor != currentColor) {
					return false;
				}
			}
		}

		return true;
	}

	/* get color of square (x,y) */
	function getColor(x, y) {
		return document.getElementById(FLOODIT_ID + '_col_' + x + '_' + y).style.backgroundColor;
	}

	/* set color of square (x,y) to newColor */
	function setColor(x, y, newColor) {
		document.getElementById(FLOODIT_ID + '_col_' + x + '_' + y).style.background = newColor;
	}

	function toggleTheme() {
		var newTheme = currentTheme == ColorSets.length - 1 ? 0 : currentTheme + 1;
		var currentColor = null;

		for (var i = 0; i < NUM_ROWSCOLS; i++) {
			for (var j = 0; j < NUM_ROWSCOLS; j++) {
				currentColor = getColor(i, j);
				for (var k = 0; k < Colors.length; k++) {
					if (Colors[k] == currentColor) {
						setColor(i, j, ColorSets[newTheme][k]);
						break;
					}
				}
			}
		}

		Colors = ColorSets[newTheme];
		currentTheme = newTheme;

		// change legend colors
		for (var l = 0; l < Colors.length; l++) {
			document.getElementById(FLOODIT_ID + '_legend_' + l).style.background = Colors[l];
		}
	}

	/* pick a color */
	function chooseColor(key) {
		var newColor;
		var tmpColor;
		var x;
		var y;

		var turnsDiv = document.getElementById(FLOODIT_ID + '_FloodItTurns');

		// build a matrix to keep track of squares already checked
		var passedSquares = new Array(NUM_ROWSCOLS);
		for (var i = 0; i < NUM_ROWSCOLS; i++) {
			passedSquares[i] = new Array(NUM_ROWSCOLS);
		}

		// check whether we're still playing
		if (key == lastKey || turns <= 0 || isComplete()) {
			return;
		}

		lastKey = key;

		for (var i = 0, len = occupiedSquares.length; i < len; i++) {
			x = occupiedSquares[i].x;
			y = occupiedSquares[i].y;

			setColor(x, y, Colors[key]);
			newColor = getColor(x, y);

			passedSquares[x][y] = true;

			// check square right of current square
			if (x < NUM_ROWSCOLS - 1) {
				tmpColor = getColor(x + 1, y);
				if (tmpColor == newColor && !passedSquares[x + 1][y]) {
					occupiedSquares[len++] = {
						x: x + 1,
						y: y
					};
				}
			}

			// check square above current square
			if (y < NUM_ROWSCOLS - 1) {
				tmpColor = getColor(x, y + 1);
				if (tmpColor == newColor && !passedSquares[x][y + 1]) {
					occupiedSquares[len++] = {
						x: x,
						y: y + 1
					};
				}
			}

			// check square left of current square
			if (x > 0) {
				tmpColor = getColor(x - 1, y);
				if (tmpColor == newColor && !passedSquares[x - 1][y]) {
					occupiedSquares[len++] = {
						x: x - 1,
						y: y
					};
				}
			}

			// check square below current square
			if (y > 0) {
				tmpColor = getColor(x, y - 1);
				if (tmpColor == newColor && !passedSquares[x][y - 1]) {
					occupiedSquares[len++] = {
						x: x,
						y: y - 1
					};
				}
			}
		}

		// we used one turn
		turns--;
		turnsUsed = MAX_TURNS - turns;

		if (turns == MAX_TURNS) {
			// show start message
			turnsDiv.innerHTML = 'Tap a color to start';

			if (highScore <= MAX_TURNS + 1) {
				// render known highscore
				turnsDiv.innerHTML += '<div style="font-size: 14px; color: #78909c;">Personal best: ' + highScore + ' turns</div>';
			}
		}
		else {
			// we're in the game
			turnsDiv.innerHTML = turnsUsed + ' of ' + MAX_TURNS + ' turns used';

			if (highScore <= MAX_TURNS) {
				// render known highscore
				turnsDiv.innerHTML += '<div style="font-size: 14px; color: #78909c;">Personal best: ' + highScore + ' turns</div>';
			}
		}

		if (isComplete()) {
			if (turnsUsed < highScore) {
				localStorage['net.pretopia.FloodIt.highScore'] = turnsUsed;

				var endGamePanel = document.getElementById('endGamePanel');
				endGamePanel.className = 'slider';
				endGamePanel.style.fontSize = '60px';
				endGamePanel.innerHTML = '<div style="margin-top: 35px; color: #7dff52;">Woohoo!</div>';
				endGamePanel.innerHTML += '<div style="margin-top: 15px; font-size: 20px;">You flooded the board in <span style="color: #7dff52;">' + turnsUsed + '</span> turns, a new personal best!</div>';

				var tmpDiv = document.createElement('div');
				tmpDiv.className = 'retryButton';
				tmpDiv.innerHTML = 'Play again';

				tmpDiv.addEventListener('click', function () {
					loadGame();
				}, false);

				tmpDiv.addEventListener('touchstart', function () {
					loadGame();
				}, false);

				endGamePanel.appendChild(tmpDiv);
			}
			else {
				var endGamePanel = document.getElementById('endGamePanel');
				endGamePanel.className = 'slider';
				endGamePanel.style.fontSize = '60px';
				endGamePanel.innerHTML = '<div style="margin-top: 35px; color: #7dff52;">Hooray!</div>';
				endGamePanel.innerHTML += '<div style="margin-top: 15px; font-size: 20px;">You flooded the board in <span style="color: #7dff52;">' + turnsUsed + '</span> turns</div>';
				endGamePanel.innerHTML += '<div style="margin-top: 15px; font-size: 20px;">Try beating your personal best of ' + highScore + '</div>';

				var tmpDiv = document.createElement('div');
				tmpDiv.className = 'retryButton';
				tmpDiv.innerHTML = 'Play again';
				tmpDiv.addEventListener('click', function () {
					loadGame();
				}, false);
				tmpDiv.addEventListener('touchstart', function () {
					loadGame();
				}, false);
				endGamePanel.appendChild(tmpDiv);
			}
		}
		else if (turns <= 0) {
			var endGamePanel = document.getElementById('endGamePanel');
			endGamePanel.className = 'slider';
			endGamePanel.style.fontSize = '60px';
			endGamePanel.innerHTML = '<div style="margin-top: 35px;">Game Over</div>';
			var tmpDiv = document.createElement('div');
			tmpDiv.className = 'retryButton';
			tmpDiv.innerHTML = 'Play again';

			tmpDiv.addEventListener('click', function () {
				loadGame();
			}, false);

			tmpDiv.addEventListener('touchstart', function () {
				loadGame();
			}, false);

			endGamePanel.appendChild(tmpDiv);
		}
	}

	/* render playing field */
	function renderBoard() {
		var squareColor = '#ff0000';
		var squareHeight = -1;
		var colorKey = -1;
		var zeroSquareKey = -1;
		var squareWidthHeight = Math.floor(GAME_WIDTH / NUM_ROWSCOLS);
		var legendSquareWidthHeight = GAME_WIDTH / Colors.length;

		// DOM elements
		var tmpDiv = null;
		var FloodItField = null;
		var wrapperDiv = null;
		var boardDiv = null;
		var numTurnsDiv = null;
		var legendDiv = null;

		document.getElementById('endGamePanel').className = 'slider closed';

		// place the game in the div with id FLOODIT_ID if present, attach it to the
		// document body otherwise
		if ((FloodItField = document.getElementById(FLOODIT_ID)) == null) {
			FloodItField = document.body;
		}

		highScore = localStorage['net.pretopia.FloodIt.highScore'] < 99999 ? localStorage['net.pretopia.FloodIt.highScore'] : 99999;

		// reset the game
		occupiedSquares = new Array();
		occupiedSquares[0] = {
			x: 0,
			y: 0
		};
		lastKey = -1;
		turns = MAX_TURNS + 1;

		if ((wrapperDiv = document.getElementById(FLOODIT_ID + '_FloodItWrapper')) != null) {
			FloodItField.removeChild(wrapperDiv);
		}

		// div for FloodIt
		wrapperDiv = document.createElement('div');
		wrapperDiv.id = FLOODIT_ID + '_FloodItWrapper';
		wrapperDiv.className = 'FloodItWrapper';
		FloodItField.appendChild(wrapperDiv);

		// div where number of turns left are displayed
		numTurnsDiv = document.createElement('div');
		numTurnsDiv.id = FLOODIT_ID + '_FloodItTurns';
		numTurnsDiv.style.fontSize = '34px';
		numTurnsDiv.style.position = 'relative';
		numTurnsDiv.style.color = '#37474f';
		numTurnsDiv.style.width = GAME_WIDTH + 'px';
		numTurnsDiv.className = 'FloodItTurns';

		// div for FloodIt board
		boardDiv = document.createElement('div');
		boardDiv.className = 'FloodItBoard';
		wrapperDiv.appendChild(boardDiv);
		wrapperDiv.appendChild(numTurnsDiv);

		for (var i = 0; i < NUM_ROWSCOLS; i++) {
			for (var j = 0; j < NUM_ROWSCOLS; j++) {
				colorKey = Math.floor(Math.random() * 6);
				squareColor = Colors[colorKey];

				if (i == 0 && j == 0) {
					zeroSquareKey = colorKey;
				}

				tmpDiv = document.createElement('div');
				tmpDiv.id = FLOODIT_ID + '_col_' + j + '_' + i;
				tmpDiv.style.position = 'relative';
				tmpDiv.style.cssFloat = 'left';
				tmpDiv.style.width = squareWidthHeight + 'px';
				tmpDiv.style.height = squareWidthHeight + 'px';
				tmpDiv.style.background = squareColor;
				boardDiv.appendChild(tmpDiv);

				if (j == NUM_ROWSCOLS - 1) {
					tmpDiv = document.createElement('div');
					tmpDiv.style.width = '0px';
					boardDiv.appendChild(tmpDiv);
				}
			}
		}

		document.getElementById('copyright').style.width = GAME_WIDTH + 'px';
		document.getElementById('copyright').style.marginLeft = -(GAME_WIDTH / 2) + 'px';

		// div for legend
		legendDiv = document.createElement('div');
		legendDiv.className = 'FloodItLegend';
		legendDiv.style.width = GAME_WIDTH + 'px';
		legendDiv.style.marginLeft = -(GAME_WIDTH / 2) + 'px';
		legendDiv.id = FLOODIT_ID + '_legend';
		wrapperDiv.appendChild(legendDiv);

		for (var k = 0; k < ColorSets[1].length; k++) {
			tmpDiv = document.createElement('div');
			tmpDiv.className = 'FloodItLegendSquare';
			tmpDiv.style.background = ColorSets[1][k];
			tmpDiv.id = FLOODIT_ID + '_legend_' + k;
			tmpDiv.value = k;

			var emptyDiv = document.createElement('div');
			emptyDiv.innerHTML = '&nbsp;';
			tmpDiv.appendChild(emptyDiv);

			tmpDiv.style.width = legendSquareWidthHeight - 5 + 'px';
			tmpDiv.style.height = legendSquareWidthHeight - 5 + 'px';
			if (k != 5) {
				tmpDiv.style.marginRight = '6px';
			}

			tmpDiv.addEventListener('click', function () {
				chooseColor(this.value);
			}, false);

			tmpDiv.addEventListener('touchstart', function () {
				chooseColor(this.value);
			}, false);

			legendDiv.appendChild(tmpDiv);
		}

		var spaceAvailable = getTopYCoordinate(legendDiv) - (getTopYCoordinate(FloodItField) + squareWidthHeight * NUM_ROWSCOLS);

		if (spaceAvailable > 150) {
			document.body.style.paddingTop = '40px';
			spaceAvailable -= 40;
		}

		spaceAvailable /= 2;

		squareHeight = parseInt(document.getElementById(FLOODIT_ID + '_col_0_0').offsetHeight);
		boardDiv.style.width = NUM_ROWSCOLS * squareHeight + 'px';

		numTurnsDiv.style.top = spaceAvailable - 36 + 'px';

		return zeroSquareKey;
	}

	function main(numRowsCols, maxTurns, gameWidth) {
		numRowsCols = parseInt(numRowsCols);
		maxTurns = parseInt(maxTurns);
		gameWidth = parseInt(gameWidth);

		GAME_WIDTH = gameWidth < 540 ? gameWidth : 540;
		GAME_WIDTH = GAME_WIDTH - 20; // padding body is 2x10=20px

		NUM_ROWSCOLS = numRowsCols != null && numRowsCols > 1 && numRowsCols < 40 ? numRowsCols : 12;
		MAX_TURNS = maxTurns != null && maxTurns > 0 && maxTurns < 1000 ? maxTurns : 22;

		var zeroSquareKey = -1;

		// create the game board
		zeroSquareKey = renderBoard();

		// evaluate the current state of the board
		chooseColor(zeroSquareKey);
	}

	/* attach toggleTheme() to the instance of FloodIt */
	this.toggleTheme = toggleTheme;

	/* attach main() to the instance of FloodIt */
	this.main = main;
};
