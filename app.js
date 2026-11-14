const boardElement = document.querySelector("#board");
const turnElement = document.querySelector("#turn");
const messageElement = document.querySelector("#message");

const cells = Array(9).fill("");
const scores = { X: 0, O: 0, draw: 0 };

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

let currentPlayer = "X";
let gameOver = false;
let mode = "ai";
let difficulty = "medium";
let round = 1;

function renderBoard() {
  boardElement.replaceChildren();

  cells.forEach((mark, index) => {
    const button = document.createElement("button");
    button.className = `cell ${mark === "O" ? "o" : ""}`;
    button.type = "button";
    button.textContent = mark;
    button.setAttribute(
      "aria-label",
      mark ? `Square ${index + 1}: ${mark}` : `Square ${index + 1}: empty`
    );

    button.disabled =
      Boolean(mark) ||
      gameOver ||
      (mode === "ai" && currentPlayer === "O");

    button.addEventListener("click", () => playMove(index));
    boardElement.append(button);
  });
}

function findWinner(state) {
  for (const line of winningLines) {
    const [a, b, c] = line;

    if (state[a] && state[a] === state[b] && state[b] === state[c]) {
      return { player: state[a], line };
    }
  }

  return null;
}

function playMove(index) {
  if (gameOver || cells[index]) return;

  const moveFeedback = rateMove(currentPlayer, index);
  cells[index] = currentPlayer;

  const result = findWinner(cells);
  if (result) {
    finishRound(result.player, result.line, moveFeedback);
    return;
  }

  if (cells.every(Boolean)) {
    finishRound("draw", [], moveFeedback);
    return;
  }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  renderBoard();

  if (mode === "ai" && currentPlayer === "O") {
    messageElement.textContent = `${moveFeedback} The AI is thinking…`;

    window.setTimeout(() => {
      if (gameOver || currentPlayer !== "O") return;

      const move = chooseAiMove();
      cells[move] = "O";

      const aiResult = findWinner(cells);
      if (aiResult) {
        finishRound(aiResult.player, aiResult.line);
        return;
      }

      if (cells.every(Boolean)) {
        finishRound("draw");
        return;
      }

      currentPlayer = "X";
      updateStatus();
      renderBoard();
      messageElement.textContent = `${moveFeedback} Choose a square to play.`;
    }, 300);
  } else {
    updateStatus();
    messageElement.textContent = moveFeedback;
  }
}

function rateMove(player, moveIndex) {
  let bestScore = -Infinity;
  let selectedScore = -Infinity;

  for (let index = 0; index < cells.length; index++) {
    if (cells[index]) continue;

    cells[index] = player;
    const result = findWinner(cells);
    const opponentScore = result
      ? result.player === "O" ? 10 : -10
      : minimax(cells, player === "X", 0);
    const score = player === "X" ? -opponentScore : opponentScore;
    cells[index] = "";

    bestScore = Math.max(bestScore, score);
    if (index === moveIndex) selectedScore = score;
  }

  return selectedScore === bestScore
    ? "Nice move!"
    : "Bad move — a stronger move was available.";
}

function chooseAiMove() {
  const openSquares = cells
    .map((value, index) => value ? -1 : index)
    .filter(index => index !== -1);

  if (difficulty === "easy") {
    return randomChoice(openSquares);
  }

  const aiWin = findTacticalMove("O");
  if (aiWin !== null) return aiWin;

  if (difficulty === "medium") {
    const playerThreat = findTacticalMove("X");
    if (playerThreat !== null) return playerThreat;

    if (!cells[4]) return 4;

    const corners = [0, 2, 6, 8].filter(index => !cells[index]);
    return corners.length ? randomChoice(corners) : randomChoice(openSquares);
  }

  return chooseHardMove();
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function findTacticalMove(player) {
  for (let index = 0; index < cells.length; index++) {
    if (cells[index]) continue;

    cells[index] = player;
    const wins = Boolean(findWinner(cells));
    cells[index] = "";

    if (wins) return index;
  }

  return null;
}

function chooseHardMove() {
  let bestScore = -Infinity;
  let bestMoves = [];

  for (let index = 0; index < cells.length; index++) {
    if (cells[index]) continue;

    cells[index] = "O";
    const score = minimax(cells, false, 0);
    cells[index] = "";

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  }

  return randomChoice(bestMoves);
}

function minimax(state, isAiTurn, depth) {
  const result = findWinner(state);

  if (result?.player === "O") return 10 - depth;
  if (result?.player === "X") return depth - 10;
  if (state.every(Boolean)) return 0;

  let bestScore = isAiTurn ? -Infinity : Infinity;

  for (let index = 0; index < state.length; index++) {
    if (state[index]) continue;

    state[index] = isAiTurn ? "O" : "X";
    const score = minimax(state, !isAiTurn, depth + 1);
    state[index] = "";

    bestScore = isAiTurn
      ? Math.max(bestScore, score)
      : Math.min(bestScore, score);
  }

  return bestScore;
}

function finishRound(result, winningLine = [], moveFeedback = "") {
  gameOver = true;

  if (result === "draw") {
    scores.draw++;
    turnElement.textContent = "It’s a draw";
    messageElement.textContent =
      `${moveFeedback ? `${moveFeedback} ` : ""}Well played — try another round.`;
  } else {
    scores[result]++;
    turnElement.textContent =
      result === "X"
        ? "You win!"
        : mode === "ai" ? "AI wins!" : "Player 2 wins!";

    messageElement.textContent =
      `${moveFeedback ? `${moveFeedback} ` : ""}${
        result === "X" ? "Three in a row. Nice work!" : "Try again in the next round."
      }`;
  }

  renderBoard();

  winningLine.forEach(index => {
    boardElement.children[index].classList.add("winner");
  });

  updateScores();
}

function updateStatus() {
  if (mode === "ai") {
    turnElement.textContent =
      currentPlayer === "X" ? "Your turn (X)" : "AI’s turn (O)";
  } else {
    turnElement.textContent =
      currentPlayer === "X" ? "Player 1’s turn (X)" : "Player 2’s turn (O)";
  }

  document.querySelector("#round").textContent = `Round ${round}`;
}

function updateScores() {
  document.querySelector("#score-x").textContent = scores.X;
  document.querySelector("#score-o").textContent = scores.O;
  document.querySelector("#score-draw").textContent = scores.draw;
}

function startNewRound() {
  cells.fill("");
  currentPlayer = "X";
  gameOver = false;
  round++;

  updateStatus();
  renderBoard();
  messageElement.textContent = "Choose a square to play.";
}

document.querySelector("#mode").addEventListener("change", event => {
  mode = event.target.value;

  const isAi = mode === "ai";
  document.querySelector("#difficulty").hidden = !isAi;
  document.querySelector("#difficulty-label").hidden = !isAi;
  document.querySelector("#opponent-label").textContent =
    isAi ? "AI (O)" : "Player 2 (O)";

  startNewRound();
});

document.querySelector("#difficulty").addEventListener("change", event => {
  difficulty = event.target.value;
  startNewRound();
});

document.querySelector("#restart").addEventListener("click", startNewRound);

document.querySelector("#reset").addEventListener("click", () => {
  scores.X = 0;
  scores.O = 0;
  scores.draw = 0;
  round = 0;

  updateScores();
  startNewRound();
});

updateStatus();
renderBoard();