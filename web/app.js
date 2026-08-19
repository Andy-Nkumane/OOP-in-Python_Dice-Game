const $ = s => document.querySelector(s);
const diceButtons = [...document.querySelectorAll('.die')];
const menu = $('#main-menu');
const settings = $('#settings');
const payouts = {'No winning hand':0,'Pair':2,'Two pair':5,'Three of a kind':8,'Full house':12,'Four of a kind':15,'Straight':20,'Five of a kind':30};
const state = {
  phase:'menu', selected:new Set(),
  sides:Math.min(20,Math.max(4,Number(localStorage.getItem('diceSides'))||6)),
  theme:localStorage.getItem('diceTheme')==='light'?'light':'dark',
  startingScore:Math.max(10,Number(localStorage.getItem('diceStartingScore'))||100),
  score:100,dice:[],hand:'',points:0,gameOver:false
};
let themeBeforeSettings=state.theme;

function rollDie(){return Math.floor(Math.random()*state.sides)+1}
function evaluateHand(values){
  const sorted=[...values].sort((a,b)=>a-b);
  const counts=[...new Set(sorted)].map(v=>sorted.filter(d=>d===v).length).sort((a,b)=>b-a);
  if(counts[0]===5)return 'Five of a kind';
  if(counts[0]===4)return 'Four of a kind';
  if(counts[0]===3&&counts[1]===2)return 'Full house';
  if(sorted.every((v,i)=>i===0||v===sorted[i-1]+1))return 'Straight';
  if(counts[0]===3)return 'Three of a kind';
  if(counts[0]===2&&counts[1]===2)return 'Two pair';
  if(counts[0]===2)return 'Pair';
  return 'No winning hand';
}
function applySettings(){
  document.documentElement.dataset.theme=state.theme;
  $('#sides').value=state.sides;$('#starting-score').value=state.startingScore;
  document.querySelector(`input[name="theme"][value="${state.theme}"]`).checked=true;
  $('#menu-sides').textContent=state.sides;$('#menu-score').textContent=state.startingScore;
  $('#menu-theme').textContent=state.theme[0].toUpperCase()+state.theme.slice(1);
}
function setGameControls(on){document.querySelectorAll('.game-control').forEach(b=>b.disabled=!on)}
function animateDice(){diceButtons.forEach((d,i)=>{setTimeout(()=>d.classList.add('rolling'),i*45);setTimeout(()=>d.classList.remove('rolling'),550+i*45)})}
function render(){
  $('#score').textContent=state.score;
  const payout=$('#hand-payout');
  payout.textContent=state.hand?(state.points?`Winning hand · +${state.points} points`:'No payout · +0 points'):'';
  payout.classList.toggle('no-win',Boolean(state.hand)&&!state.points);
  diceButtons.forEach((b,i)=>{b.querySelector('span').textContent=state.dice[i]??'?';b.classList.toggle('selected',state.selected.has(i));b.disabled=state.phase!=='choice'});
  $('#table-title').textContent=state.gameOver?'The house wins':(state.hand||'Ready to roll?');
  $('#roll').hidden=state.phase==='choice'||state.gameOver;$('#roll').disabled=state.phase!=='ready'||state.gameOver;
  $('#keep').hidden=state.phase!=='choice'||state.gameOver;$('#reroll').hidden=state.phase!=='choice'||state.gameOver;
  $('#game-over-actions').hidden=!state.gameOver;$('#reroll').disabled=!state.selected.size;
  $('#reroll').textContent=state.selected.size?`Reroll ${state.selected.size} selected`:'Select dice to reroll';
  $('#hint').textContent=state.gameOver?'Choose Restart Game to play again or Exit to return to the menu.':state.phase==='choice'?'Tap any dice you want to redraw, or keep this hand.':'Your next roll costs 10 points.';
}
function resetGame(phase){Object.assign(state,{phase,score:state.startingScore,dice:[],hand:'',points:0,gameOver:false});state.selected.clear()}
function startGame(){resetGame('ready');if(menu.open)menu.close();setGameControls(true);render()}
function exitToMenu(){resetGame('menu');setGameControls(false);render();menu.showModal()}
function finishRound(reroll){
  if(reroll){state.selected.forEach(i=>state.dice[i]=rollDie());animateDice()}
  state.dice.sort((a,b)=>a-b);state.hand=evaluateHand(state.dice);state.points=payouts[state.hand];state.score+=state.points;
  state.phase='ready';state.selected.clear();state.gameOver=state.score<10;setTimeout(render,reroll?300:0);
}

state.score=state.startingScore;applySettings();render();menu.showModal();
menu.addEventListener('cancel',e=>e.preventDefault());
settings.addEventListener('cancel',e=>{e.preventDefault();document.documentElement.dataset.theme=themeBeforeSettings;settings.close();if(state.phase==='menu')menu.showModal()});
$('#start-button').addEventListener('click',startGame);$('#restart-button').addEventListener('click',startGame);$('#end-button').addEventListener('click',exitToMenu);
$('#game-over-restart').addEventListener('click',startGame);$('#game-over-exit').addEventListener('click',exitToMenu);
function openSettings(){themeBeforeSettings=state.theme;applySettings();if(menu.open)menu.close();settings.showModal()}
$('#settings-button').addEventListener('click',openSettings);$('#menu-settings-button').addEventListener('click',openSettings);
$('#cancel-settings').addEventListener('click',()=>{document.documentElement.dataset.theme=themeBeforeSettings;settings.close();if(state.phase==='menu')menu.showModal()});
document.querySelectorAll('input[name="theme"]').forEach(i=>i.addEventListener('change',()=>document.documentElement.dataset.theme=i.value));
$('#settings-form').addEventListener('submit',e=>{
  e.preventDefault();const sides=Number($('#sides').value),startingScore=Number($('#starting-score').value);
  if(!Number.isInteger(sides)||sides<4||sides>20||!Number.isInteger(startingScore)||startingScore<10)return;
  state.sides=sides;state.startingScore=startingScore;state.theme=document.querySelector('input[name="theme"]:checked').value;
  localStorage.setItem('diceSides',sides);localStorage.setItem('diceStartingScore',startingScore);localStorage.setItem('diceTheme',state.theme);
  applySettings();settings.close();if(state.phase==='menu')menu.showModal();else startGame();
});
$('#minus').addEventListener('click',()=>$('#sides').value=Math.max(4,Number($('#sides').value)-1));
$('#plus').addEventListener('click',()=>$('#sides').value=Math.min(20,Number($('#sides').value)+1));
$('#roll').addEventListener('click',()=>{
  if(state.score<10)return;state.score-=10;state.dice=Array.from({length:5},rollDie).sort((a,b)=>a-b);
  state.hand=evaluateHand(state.dice);state.points=payouts[state.hand];state.phase='choice';state.selected.clear();animateDice();setTimeout(render,300);
});
diceButtons.forEach((b,i)=>b.addEventListener('click',()=>{state.selected.has(i)?state.selected.delete(i):state.selected.add(i);render()}));
$('#reroll').addEventListener('click',()=>finishRound(true));$('#keep').addEventListener('click',()=>finishRound(false));
