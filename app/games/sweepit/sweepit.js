/* net.pretopia.SweepIt
 *
 * A client-side JavaScript implementation of the SweepIt game.
 *
 * Copyright (c) 2010, 2014, Thijs van As <t.vanas@gmail.com>
 *
 * sweepit.js
 */

/* create/check namespace net.pretopia.SweepIt
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

if (net.pretopia.SweepIt) {
	throw new Error('net.pretopia.SweepIt already exists');
}

/* end of namespace initialization, actual code begins here */
net.pretopia.SweepIt = function (div) {
	var SweepIt_ID = div != null && div != '' ? div : 'SweepItInstance';
	var NUM_ROWS = 8;
	var NUM_COLS = 8;
	var NUM_MINES = 10;

	var GAME_WIDTH = 600; // width of the game field

	var MINE = -1;
	var CLEAN = 0;

	var numClosedCells = NUM_ROWS * NUM_COLS;
	var mineField = null;
	var isAlive = true;
	var clickIsDig = true;
	var numClicks = 0;
	var numSecs = 0;
	var timerId = 0;
	var IE = /*@cc_on!@*/ false;

	var touchStartCoord = '';
	var touchHoldTimer = null;

	var ISTOUCHDEVICE = false;
	var cameFromLongTouch = false;

	var highScore = 999;

	/* helper function: check if needle (value) is in haystack (array) */
	function _inArray(haystack, needle) {
		var inArray = false;

		for (var i = 0; i < haystack.length; i++) {
			if (haystack[i] == needle) {
				inArray = true;
				break;
			}
		}

		return inArray;
	}

	/* helper function: returns an array with numValues unique random
	 * values, with maxValue being the maximum value allowed */
	function _getUniqueRandomValues(numValues, maxValue) {
		var randomValues = new Array(numValues);
		var rnd = -1;
		var needUnique = true;

		for (var i = 0; i < numValues; i++) {
			while (needUnique) {
				rnd = Math.floor(Math.random() * maxValue);

				for (var j = 0; j <= i; j++) {
					if (randomValues[j] == rnd) {
						needUnique = true;
						break;
					}
					else {
						needUnique = false;
					}
				}
			}

			randomValues[i] = rnd;
			needUnique = true;
		}

		return randomValues;
	}

	function getTopYCoordinate(element) {
		var y = element.offsetTop;

		while ((element = element.offsetParent)) {
			y += element.offsetTop;
		}

		return y;
	}

	/* set clickIsDig, which determines whether a left 'mouse click' is
	 * a mine dig action or a mine flag action. Useful for touch screen devices */
	function setPointerDeviceMode(mode) {
		switch (mode) {
			case 'dig':
				clickIsDig = true;
				document.getElementById(SweepIt_ID + '_digOption').className = 'SweepItDigFlagOption SweepItDigFlagSelected';
				document.getElementById(SweepIt_ID + '_flagOption').className = 'SweepItDigFlagOption SweepItDigFlagNotSelected';
				break;
			case 'flag':
				clickIsDig = false;
				document.getElementById(SweepIt_ID + '_digOption').className = 'SweepItDigFlagOption SweepItDigFlagNotSelected';
				document.getElementById(SweepIt_ID + '_flagOption').className = 'SweepItDigFlagOption SweepItDigFlagSelected';
				break;
			default:
				break;
		}
	}

	/* updates the timer (callback function for setInterval) */
	function updateTimer() {
		if (numSecs >= 999) {
			clearInterval(timerId);
			timerId = 0;
			isAlive = false;
			openAllCells(false);

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
			return;
		}

		numSecs++;

		var mins = Math.floor(numSecs / 60);
		var secs = numSecs - mins * 60;
		document.getElementById(SweepIt_ID + '_numSecs').innerHTML = mins + ':' + (secs < 10 ? '0' : '') + secs;
	}

	/* handles 'mouse click' events, and determines whether a right or left click
	 * was meant (for touch screens) */
	function handleClick(cellCoords, e, isFlag) {
		var x_y_array = cellCoords.split('_');
		var x = parseInt(x_y_array[0]);
		var y = parseInt(x_y_array[1]);

		if (!isAlive || mineField[y][x].state == 'open') {
			return;
		}

		if (timerId == 0) {
			timerId = setInterval(function () {
				updateTimer();
			}, 1000);
			document.getElementById(SweepIt_ID + '_numSecs').innerHTML = '0:00';
		}

		// right mouse click
		if (isFlag) {
			toggleFlag(x, y);
			return;
		}

		switch (clickIsDig) {
			case true:
				if (mineField[y][x].state == 'flagged') {
					break;
				}
				openCell(x, y);
				break;
			case false:
				toggleFlag(x, y);
				break;
			default:
				break;
		}
	}

	/* returns an array of surrounding cells */
	function getSurroundingCells(x, y) {
		var tmpCells = new Array(8);
		var numCells = 0;
		var surroundingCells = null;

		if (x > 0) {
			tmpCells[numCells] = {
				x: x - 1,
				y: y
			};
			numCells++;

			if (y > 0) {
				tmpCells[numCells] = {
					x: x - 1,
					y: y - 1
				};
				numCells++;
			}

			if (y < NUM_ROWS - 1) {
				tmpCells[numCells] = {
					x: x - 1,
					y: y + 1
				};
				numCells++;
			}
		}

		if (x < NUM_COLS - 1) {
			tmpCells[numCells] = {
				x: x + 1,
				y: y
			};
			numCells++;

			if (y > 0) {
				tmpCells[numCells] = {
					x: x + 1,
					y: y - 1
				};
				numCells++;
			}

			if (y < NUM_ROWS - 1) {
				tmpCells[numCells] = {
					x: x + 1,
					y: y + 1
				};
				numCells++;
			}
		}

		if (y > 0) {
			tmpCells[numCells] = {
				x: x,
				y: y - 1
			};
			numCells++;
		}

		if (y < NUM_ROWS - 1) {
			tmpCells[numCells] = {
				x: x,
				y: y + 1
			};
			numCells++;
		}

		surroundingCells = new Array(numCells);

		for (var i = 0; i < numCells; i++) {
			surroundingCells[i] = tmpCells[i];
		}

		return surroundingCells;
	}

	/* opens all cells */
	function openAllCells(isWin) {
		var cell = null;

		for (var i = 0; i < NUM_ROWS; i++) {
			for (var j = 0; j < NUM_COLS; j++) {
				cell = document.getElementById(SweepIt_ID + '_col_' + j + '_' + i);
				cell.innerHTML = mineField[i][j].value > CLEAN ? mineField[i][j].value : '';

				cell.style.backgroundImage = '';
				cell.style.backgroundColor = '';

				if (mineField[i][j].value == MINE) {
					cell.style.backgroundImage = "url('img/bomb.png')";
					cell.style.backgroundRepeat = 'no-repeat';
					cell.style.backgroundSize = '50%';
					cell.style.backgroundPosition = 'center center';
				}

				cell.className = isWin ? 'SweepItSquarePosition SweepItSquareSize SweepItSquareOpen' : 'SweepItSquarePosition SweepItSquareSize SweepItSquareLoose';

				switch (mineField[i][j].value) {
					case MINE:
						cell.style.color = '#bb0000';
						break;
					case CLEAN:
						cell.style.color = '#999999';
						break;
					case 1:
						cell.style.color = '#142afa';
						break;
					case 2:
						cell.style.color = '#307108';
						break;
					case 3:
						cell.style.color = '#e62e25';
						break;
					case 4:
						cell.style.color = '#08126d';
						break;
					case 5:
						cell.style.color = '#6b1611';
						break;
					case 6:
						cell.style.color = '#2b6f6d';
						break;
					case 7:
						cell.style.color = '#000000';
						break;
					case 8:
						cell.style.color = '#6d6d6d';
						break;
					default:
						cell.style.color = '#0000ff';
						break;
				}
			}
		}
	}

	/* toggles the flag status of a cell */
	function toggleFlag(x, y) {
		var cell = document.getElementById(SweepIt_ID + '_col_' + x + '_' + y);

		switch (mineField[y][x].state) {
			case 'closed':
				// flag it
				mineField[y][x].state = 'flagged';
				cell.style.color = '#008800';
				cell.style.backgroundColor = '#ffffff';
				cell.style.backgroundImage = "url('img/flag.png')";
				cell.style.backgroundRepeat = 'no-repeat';
				cell.style.backgroundSize = '50%';
				cell.style.backgroundPosition = 'center center';
				break;
			case 'flagged':
				cell.style.backgroundImage = '';
				cell.style.backgroundColor = '';
				// question mark it
				/*
			mineField[y][x].state = 'unknown';
			cell.innerHTML = '?';
			break;
		case 'unknown':
            */
				// reset it
				mineField[y][x].state = 'closed';
				cell.innerHTML = '';
				break;
			default:
				break;
		}
	}

	/* opens a cell */
	function openCell(x, y) {
		var surroundingCells = null;
		var timerDiv = document.getElementById(SweepIt_ID + '_timer');
		var cell = document.getElementById(SweepIt_ID + '_col_' + x + '_' + y);

		cell.innerHTML = mineField[y][x].value > CLEAN ? mineField[y][x].value : '';

		cell.style.backgroundImage = '';
		cell.style.backgroundColor = '';

		if (mineField[y][x].value == MINE) {
			cell.style.backgroundImage = "url('img/bomb.png')";
			cell.style.backgroundRepeat = 'no-repeat';
			cell.style.backgroundSize = '50%';
			cell.style.backgroundPosition = 'center center';
		}

		cell.className = 'SweepItSquarePosition SweepItSquareSize SweepItSquareOpen';
		mineField[y][x].state = 'open';
		numClosedCells--;

		switch (mineField[y][x].value) {
			case MINE:
				cell.style.color = '#ff0000';
				break;
			case CLEAN:
				cell.style.color = '#999999';
				break;
			case 1:
				cell.style.color = '#142afa';
				break;
			case 2:
				cell.style.color = '#307108';
				break;
			case 3:
				cell.style.color = '#e62e25';
				break;
			case 4:
				cell.style.color = '#08126d';
				break;
			case 5:
				cell.style.color = '#6b1611';
				break;
			case 6:
				cell.style.color = '#2b6f6d';
				break;
			case 7:
				cell.style.color = '#000000';
				break;
			case 8:
				cell.style.color = '#6d6d6d';
				break;
			default:
				cell.style.color = '#0000ff';
				break;
		}

		if (mineField[y][x].value == MINE) {
			// you just lost the game
			clearInterval(timerId);
			timerId = 0;
			isAlive = false;
			openAllCells(false);

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

			return;
		}
		else if (mineField[y][x].value == CLEAN) {
			surroundingCells = getSurroundingCells(x, y);

			for (var i = 0; i < surroundingCells.length; i++) {
				// recursion
				if (mineField[surroundingCells[i].y][surroundingCells[i].x].state != 'open') {
					openCell(surroundingCells[i].x, surroundingCells[i].y);
				}
			}
		}

		if (isAlive && numClosedCells == NUM_MINES) {
			/* you just won the game */
			clearInterval(timerId);
			timerId = 0;
			isAlive = false;
			openAllCells(true);
			timerDiv.innerHTML = '';

			var mins = Math.floor(numSecs / 60);
			var secs = numSecs - mins * 60;
			var scoreString = mins + ':' + (secs < 10 ? '0' : '') + secs;

			if (numSecs < highScore) {
				localStorage['net.pretopia.SweepIt.highScore'] = numSecs;

				var endGamePanel = document.getElementById('endGamePanel');
				endGamePanel.className = 'slider';
				endGamePanel.style.fontSize = '60px';
				endGamePanel.innerHTML = '<div style="margin-top: 35px; color: #7dff52;">Woohoo!</div>';
				endGamePanel.innerHTML +=
					'<div style="margin-top: 15px; font-size: 20px;">You cleard the minefield in <span style="color: #7dff52;">' + scoreString + '</span>, a new personal best!</div>';

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
				var hMins = Math.floor(highScore / 60);
				var hSecs = highScore - hMins * 60;
				var highScoreString = hMins + ':' + (hSecs < 10 ? '0' : '') + hSecs;

				var endGamePanel = document.getElementById('endGamePanel');
				endGamePanel.className = 'slider';
				endGamePanel.style.fontSize = '60px';
				endGamePanel.innerHTML = '<div style="margin-top: 35px; color: #7dff52;">Hooray!</div>';
				endGamePanel.innerHTML += '<div style="margin-top: 15px; font-size: 20px;">You cleared the minefield in <span style="color: #7dff52;">' + scoreString + '</span>!</div>';
				endGamePanel.innerHTML += '<div style="margin-top: 15px; font-size: 20px;">Try beating your personal best of ' + highScoreString + '</div>';

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

			return;
		}
	}

	/* create a mineField and populate it with mines */
	function populateField() {
		mineField = new Array(NUM_ROWS);
		var mineIndexes = new Array(NUM_MINES);
		var numNeighborMines = 0;
		var surroundingCells = null;

		// get indexes for MINE locations
		mineIndexes = _getUniqueRandomValues(NUM_MINES, NUM_ROWS * NUM_COLS);

		// place MINEs in field
		for (var i = 0; i < NUM_ROWS; i++) {
			mineField[i] = new Array(NUM_COLS);

			for (var j = 0; j < NUM_COLS; j++) {
				mineField[i][j] = {
					value: _inArray(mineIndexes, i * NUM_COLS + j) ? MINE : CLEAN,
					state: 'closed'
				};
			}
		}

		// calculate other values
		for (var i = 0; i < NUM_ROWS; i++) {
			for (var j = 0; j < NUM_COLS; j++) {
				if (mineField[i][j].value != MINE) {
					surroundingCells = getSurroundingCells(j, i);

					for (var k = 0; k < surroundingCells.length; k++) {
						if (mineField[surroundingCells[k].y][surroundingCells[k].x].value == MINE) {
							numNeighborMines++;
						}
					}

					mineField[i][j].value = numNeighborMines;
					numNeighborMines = 0;
				}
			}
		}
	}

	/* render playing field */
	function renderField() {
		// DOM elements
		var tmpDiv = null;
		var SweepItField = null;
		var wrapperDiv = null;
		var timerDiv = null;
    var numSecsDiv = null;
    var highScoreDiv = null;
    var fieldDiv = null;
		var squareWidthHeight = Math.floor(GAME_WIDTH / NUM_COLS) - 2;

		document.getElementById('endGamePanel').className = 'slider closed';

		highScore = localStorage['net.pretopia.SweepIt.highScore'] < 999 ? localStorage['net.pretopia.SweepIt.highScore'] : 999;

		// place the game in the div 'SweepItField' if present, attach it to the
		// document body otherwise
		if ((SweepItField = document.getElementById(SweepIt_ID)) == null) {
			SweepItField = document.body;
		}

		// reset the game
		if ((wrapperDiv = document.getElementById(SweepIt_ID + '_SweepItWrapper')) != null) {
			SweepItField.removeChild(wrapperDiv);
		}

		// div for SweepIt
		wrapperDiv = document.createElement('div');
		wrapperDiv.id = SweepIt_ID + '_SweepItWrapper';
		wrapperDiv.className = 'SweepItWrapper';
		SweepItField.appendChild(wrapperDiv);

		// div where number of seconds used is displayed
		timerDiv = document.createElement('div');
		timerDiv.id = SweepIt_ID + '_timer';
		timerDiv.className = 'SweepItTimer';
		timerDiv.style.fontSize = '34px';
		timerDiv.style.position = 'relative';
		timerDiv.style.width = GAME_WIDTH + 'px';
		timerDiv.style.color = '#37474f';
		timerDiv.innerHTML = '';

		numSecsDiv = document.createElement('div');
		numSecsDiv.id = SweepIt_ID + '_numSecs';
		numSecsDiv.style.textAlign = 'center';
		numSecsDiv.innerHTML = numSecs > 0 ? numSecs : 'Tap a square to start';
		timerDiv.appendChild(numSecsDiv);

		highScoreDiv = document.createElement('div');
		highScoreDiv.id = SweepIt_ID + '_highScore';
		highScoreDiv.style.textAlign = 'center';
		if (highScore < 999) {
			var mins = Math.floor(highScore / 60);
			var secs = highScore - mins * 60;
			highScoreDiv.innerHTML = '<div style="font-size: 14px; color: #4f6672;">Personal best: ' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</div>';
		}
		timerDiv.appendChild(highScoreDiv);

		// div for SweepIt board
		fieldDiv = document.createElement('div');
		fieldDiv.id = SweepIt_ID + '_field';
		fieldDiv.className = 'SweepItBoard';
		fieldDiv.style.width = (squareWidthHeight + 4) * NUM_COLS + 'px';
		wrapperDiv.appendChild(fieldDiv);
		wrapperDiv.appendChild(timerDiv);

		// create the mine squares
		for (var i = 0; i < NUM_ROWS; i++) {
			for (var j = 0; j < NUM_COLS; j++) {
				tmpDiv = document.createElement('div');
				tmpDiv.id = SweepIt_ID + '_col_' + j + '_' + i;
				tmpDiv.className = 'SweepItSquarePosition SweepItSquareClosed';
				tmpDiv.value = j + '_' + i;
				tmpDiv.style.width = squareWidthHeight + 'px';
				tmpDiv.style.height = squareWidthHeight + 'px';
				tmpDiv.style.fontSize = squareWidthHeight * 0.6 + 'px';
				tmpDiv.style.lineHeight = squareWidthHeight * 1 + 'px';
				tmpDiv.oncontextmenu = function () {
					return false;
				};

				if (ISTOUCHDEVICE) {
					tmpDiv.addEventListener(
						'touchstart',
						function () {
							touchStartCoord = this.value;

							touchHoldTimer = window.setTimeout(function () {
								handleClick(touchStartCoord, event, true);
								cameFromLongTouch = true;
							}, 200);
						},
						false
					);

					tmpDiv.addEventListener(
						'touchend',
						function () {
							clearTimeout(touchHoldTimer);
							touchEndCOurd = this.value;

							if (!cameFromLongTouch) {
								handleClick(this.value, event, false);
							}

							cameFromLongTouch = false;
						},
						false
					);
				} 
				else {
					tmpDiv.addEventListener(
						'click',
						function () {
							handleClick(this.value, event, false);
						},
						false
					);

					tmpDiv.addEventListener(
						'contextmenu',
						function () {
							handleClick(this.value, event, true);
						},
						false
					);

					tmpDiv.addEventListener(
						'mouseover',
						function () {
							var x_y_array = this.value.split('_');
							var x = parseInt(x_y_array[0]);
							var y = parseInt(x_y_array[1]);

							if (mineField[y][x].state == 'closed') {
								this.style.backgroundColor = '#ffffff';
							}
						},
						false
					);

					tmpDiv.addEventListener(
						'mouseout',
						function () {
							var x_y_array = this.value.split('_');
							var x = parseInt(x_y_array[0]);
							var y = parseInt(x_y_array[1]);

							if (mineField[y][x].state == 'closed') {
								this.style.backgroundColor = '#e0e0e0';
							}
						},
						false
					);
				}

				fieldDiv.appendChild(tmpDiv);

				if (j == NUM_COLS - 1) {
					tmpDiv = document.createElement('div');
					tmpDiv.style.width = '0px';
					tmpDiv.style.height = squareWidthHeight + 'px';
					fieldDiv.appendChild(tmpDiv);
				}
			}
		}

		var copyrightDiv = document.getElementById('copyright');

		copyrightDiv.style.width = GAME_WIDTH + 'px';
		copyrightDiv.style.marginLeft = -(GAME_WIDTH / 2) + 'px';

		var spaceAvailable = getTopYCoordinate(copyrightDiv) - (getTopYCoordinate(SweepItField) + (squareWidthHeight + 4) * NUM_ROWS);

		if (spaceAvailable > 200) {
			document.body.style.paddingTop = '60px';
			spaceAvailable -= 60;
		}

		spaceAvailable /= 2;

		timerDiv.style.top = spaceAvailable - 36 + 'px';

		/* not showing buttons for dig/flag anymore
		
		// div where the dig/flag options are displayed
		digFlagOptionsDiv = document.createElement('div');
		digFlagOptionsDiv.id = SweepIt_ID + '_SweepItDigFlagOptions';
		digFlagOptionsDiv.className = 'SweepItDigFlagOptions';

		// div where left mouse button (dig) can be made active
		digDiv = document.createElement('div');
		digDiv.id = SweepIt_ID + '_digOption';
		digDiv.className = 'SweepItDigFlagOption SweepItDigFlagSelected';
		digDiv.innerHTML = 'dig (left click)';
		digDiv.onclick = function () { setPointerDeviceMode('dig'); };

		// div where right mouse button (flag) can be made active
		flagDiv = document.createElement('div');
		flagDiv.id = SweepIt_ID + '_flagOption';
		flagDiv.className = 'SweepItDigFlagOption SweepItDigFlagNotSelected';
		flagDiv.innerHTML = 'flag (right click)';
		flagDiv.onclick = function () { setPointerDeviceMode('flag'); };

		digFlagOptionsDiv.appendChild(digDiv);
		digFlagOptionsDiv.appendChild(flagDiv);
		wrapperDiv.appendChild(digFlagOptionsDiv);

		*/
	}

	/* starts/resets the game
	 * arguments numRows, numCols and numMines are optional */
	function main(gameWidth, numRows, numCols, numMines) {
		NUM_ROWS = numRows != null && numRows > 0 && numRows < 25 ? numRows : 8;
		NUM_COLS = numCols != null && numCols > 0 && numCols < 33 ? numCols : 8;
		NUM_MINES = numMines != null && numMines > 0 && numMines < numRows * numCols ? numMines : Math.ceil((NUM_ROWS * NUM_COLS) / 7);

		ISTOUCHDEVICE = myBrowser.isMobile;

		gameWidth = parseInt(gameWidth);

		GAME_WIDTH = gameWidth < 540 ? gameWidth : 540;
		GAME_WIDTH = GAME_WIDTH - 25; // 25 is magic value: padding body is 2x10=20px, but that results in artifacts

		isAlive = true;
		clickIsDig = true;
		numClosedCells = NUM_ROWS * NUM_COLS;
		numSecs = 0;

		if (timerId != 0) {
			clearInterval(timerId);
			timerId = 0;
		}

		populateField();

		renderField();
	}

	/* attach main() to the instance of SweepIt */
	this.main = main;
};
