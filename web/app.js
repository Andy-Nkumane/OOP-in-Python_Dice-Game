const $ = (selector) => document.querySelector(selector);
const dice = [...document.querySelectorAll('.die')];
const menu = $('#main-menu');
const settings = $('#settings');
const savedSides = Math.min(20, Math.max(4, Number(localStorage.getItem('diceSides')) || 6));
const savedTheme = localStorage.getItem('diceTheme') === 'light' ? 'light' : 'dark';
const savedStartingScore = Math.max(10, Number(localStorage.getItem('diceStartingScore')) || 100);
const state = { gameId: null, phase: 'menu', selected: new Set(), sides: savedSides, theme: savedTheme, startingScore: savedStartingScore };
let themeBeforeSettings = state.theme;

applySettings();
menu.showModal();
menu.addEventListener('cancel', event => event.preventDefault());
settings.addEventListener('cancel', event => {
  event.preventDefault();
  document.documentElement.dataset.theme = themeBeforeSettings;
  settings.close();
  if (state.phase === 'menu') menu.showModal();
});

async function request(path, data) {
  const response = await fetch(path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong.');
  return result;
}

function showError(message = '') { $('#error').textContent = message; }
function animateDice() { dice.forEach((die, i) => { setTimeout(() => die.classList.add('rolling'), i * 45); setTimeout(() => die.classList.remove('rolling'), 550 + i * 45); }); }
function applySettings() {
  document.documentElement.dataset.theme = state.theme;
  $('#sides').value = state.sides;
  $('#starting-score').value = state.startingScore;
  document.querySelector(`input[name="theme"][value="${state.theme}"]`).checked = true;
  $('#menu-sides').textContent = state.sides;
  $('#menu-score').textContent = state.startingScore;
  $('#menu-theme').textContent = state.theme[0].toUpperCase() + state.theme.slice(1);
}
function setGameControls(enabled) {
  document.querySelectorAll('.game-control').forEach(button => button.disabled = !enabled);
}

async function startGame() {
  showError();
  try {
    const data = await request('/api/game', { sides: state.sides, startingScore: state.startingScore });
    state.gameId = data.gameId; state.phase = 'ready'; state.selected.clear();
    if (menu.open) menu.close();
    setGameControls(true); render(data);
  } catch (error) { showError(error.message); }
}

function render(data) {
  $('#score').textContent = data.score;
  const payout = $('#hand-payout');
  payout.textContent = data.hand ? (data.points > 0 ? `Winning hand · +${data.points} points` : 'No payout · +0 points') : '';
  payout.classList.toggle('no-win', Boolean(data.hand) && data.points === 0);
  dice.forEach((die, index) => {
    die.querySelector('span').textContent = data.dice[index] ?? '?';
    die.classList.toggle('selected', state.selected.has(index));
    die.disabled = state.phase !== 'choice';
  });
  $('#table-title').textContent = data.gameOver ? 'The house wins' : (data.hand || 'Ready to roll?');
  $('#roll').hidden = state.phase === 'choice' || data.gameOver;
  $('#roll').disabled = !state.gameId || data.gameOver;
  $('#roll').textContent = data.gameOver ? 'Game over' : 'Roll the dice';
  $('#keep').hidden = state.phase !== 'choice' || data.gameOver;
  $('#reroll').hidden = state.phase !== 'choice' || data.gameOver;
  $('#game-over-actions').hidden = !data.gameOver;
  $('#reroll').disabled = state.selected.size === 0;
  $('#reroll').textContent = state.selected.size ? `Reroll ${state.selected.size} selected` : 'Select dice to reroll';
  $('#hint').textContent = data.gameOver ? 'You need 10 points to play. Refresh to start again.' : state.phase === 'choice' ? 'Tap any dice you want to redraw, or keep this hand.' : 'Your next roll costs 10 points.';
}

$('#start-button').addEventListener('click', startGame);
$('#restart-button').addEventListener('click', startGame);
function exitToMenu() {
  state.gameId = null; state.phase = 'menu'; state.selected.clear();
  setGameControls(false);
  render({ score: 100, dice: [], hand: '', points: 0, gameOver: false });
  menu.showModal();
}
$('#end-button').addEventListener('click', exitToMenu);
$('#game-over-restart').addEventListener('click', startGame);
$('#game-over-exit').addEventListener('click', exitToMenu);

function openSettings() {
  themeBeforeSettings = state.theme;
  applySettings();
  if (menu.open) menu.close();
  settings.showModal();
}
$('#settings-button').addEventListener('click', openSettings);
$('#menu-settings-button').addEventListener('click', openSettings);
$('#cancel-settings').addEventListener('click', () => {
  document.documentElement.dataset.theme = themeBeforeSettings;
  settings.close();
  if (state.phase === 'menu') menu.showModal();
});
document.querySelectorAll('input[name="theme"]').forEach(input => {
  input.addEventListener('change', () => {
    document.documentElement.dataset.theme = input.value;
  });
});
$('#settings-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const sides = Number($('#sides').value);
  const startingScore = Number($('#starting-score').value);
  if (!Number.isInteger(sides) || sides < 4 || sides > 20 || !Number.isInteger(startingScore) || startingScore < 10) return;
  state.sides = sides;
  state.startingScore = startingScore;
  state.theme = document.querySelector('input[name="theme"]:checked').value;
  localStorage.setItem('diceSides', state.sides);
  localStorage.setItem('diceStartingScore', state.startingScore);
  localStorage.setItem('diceTheme', state.theme);
  applySettings(); settings.close();
  if (state.phase === 'menu') menu.showModal();
  else startGame();
});

$('#minus').addEventListener('click', () => $('#sides').value = Math.max(4, Number($('#sides').value) - 1));
$('#plus').addEventListener('click', () => $('#sides').value = Math.min(20, Number($('#sides').value) + 1));

$('#roll').addEventListener('click', async () => {
  showError(); animateDice();
  try { const data = await request('/api/roll', { gameId: state.gameId }); state.phase = 'choice'; state.selected.clear(); setTimeout(() => render(data), 300); }
  catch (error) { showError(error.message); }
});

dice.forEach((die, index) => die.addEventListener('click', () => {
  state.selected.has(index) ? state.selected.delete(index) : state.selected.add(index);
  die.classList.toggle('selected');
  $('#reroll').disabled = state.selected.size === 0;
  $('#reroll').textContent = state.selected.size ? `Reroll ${state.selected.size} selected` : 'Select dice to reroll';
}));

async function finishRound(path) {
  showError(); animateDice();
  try { const data = await request(path, { gameId: state.gameId, indexes: [...state.selected] }); state.phase = 'ready'; state.selected.clear(); setTimeout(() => render(data), 300); }
  catch (error) { showError(error.message); }
}
$('#reroll').addEventListener('click', () => finishRound('/api/reroll'));
$('#keep').addEventListener('click', () => finishRound('/api/score'));
