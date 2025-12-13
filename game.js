const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const SIZE = 11;
const cell = canvas.width / SIZE;

const dice = document.getElementById("dice");
const rollBtn = document.getElementById("rollBtn");

/* ---------------- КУБИК ---------------- */

const pipsMap = {
  1:[[50,50]],
  2:[[25,25],[75,75]],
  3:[[25,25],[50,50],[75,75]],
  4:[[25,25],[75,25],[25,75],[75,75]],
  5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
  6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
};

function setDice(val){
  dice.innerHTML="";
  pipsMap[val].forEach(p=>{
    const d=document.createElement("div");
    d.className="pip";
    d.style.left=p[0]+"%";
    d.style.top=p[1]+"%";
    dice.appendChild(d);
  });
}

/* ---------------- ИГРА ---------------- */

let playerPos = 0;
let money = 1000;
let buildings = 2;

/* периметр */
const path = [];
(function buildPath(){
  for(let i=0;i<SIZE;i++) path.push({x:i,y:SIZE-1}); // низ
  for(let j=SIZE-2;j>=0;j--) path.push({x:SIZE-1,y:j}); // право
  for(let i=SIZE-2;i>=0;i--) path.push({x:i,y:0}); // верх
  for(let j=1;j<SIZE-1;j++) path.push({x:0,y:j}); // лево
})();

/* спец клетки */
const CELLS = {
  INFECT: path.length - (SIZE*2 - 1), // верх левый
  CHOICE: path.length - (SIZE - 1),    // верх правый
  ATTACK: SIZE - 1                     // низ правый
};

/* ---------------- БРОСОК ---------------- */

function rollDice(){
  const val = Math.floor(Math.random()*6)+1;
  dice.classList.remove("roll");
  setDice(1);

  setTimeout(()=>{
    dice.classList.add("roll");
    setTimeout(()=>{
      setDice(val);
      movePlayer(val);
      tg.HapticFeedback.impactOccurred("medium");
    },700);
  },20);
}

rollBtn.onclick = rollDice;

/* ---------------- ДВИЖЕНИЕ ---------------- */

function movePlayer(steps){
  let i=0;
  const interval = setInterval(()=>{
    playerPos = (playerPos+1)%path.length;
    drawBoard();
    i++;
    if(i>=steps){
      clearInterval(interval);
      handleCell();
    }
  },300);
}

/* ---------------- ЛОГИКА КЛЕТОК ---------------- */

function handleCell(){
  if(playerPos===CELLS.INFECT){
    alert("☣️ ЗАРАЖЕНИЕ!");
  }
  if(playerPos===CELLS.CHOICE){
    alert("❓ ВЫБОР КЛЕТКИ");
  }
  if(playerPos===CELLS.ATTACK){
    const tax = buildings * 100;
    money -= tax;
    alert(`⚔️ АТАКА!\n-${tax} 💸`);
  }
}

/* ---------------- РЕНДЕР ---------------- */

function drawBoard(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(let i=0;i<SIZE;i++){
    for(let j=0;j<SIZE;j++){
      if(i===0||j===0||i===SIZE-1||j===SIZE-1){
        ctx.strokeRect(i*cell,j*cell,cell,cell);

        ctx.beginPath();
        ctx.fillStyle="#aaa";
        ctx.arc(i*cell+cell/2,j*cell+cell/2,cell*0.13,0,Math.PI*2);
        ctx.fill();
      }
    }
  }

  /* спец клетки */
  drawCorner(0,0,"☣️");
  drawCorner(SIZE-1,0,"❓");
  drawCorner(SIZE-1,SIZE-1,"⚔️");

  /* игрок */
  const p = path[playerPos];
  ctx.beginPath();
  ctx.fillStyle="#e53935";
  ctx.arc(p.x*cell+cell/2,p.y*cell+cell/2,cell*0.18,0,Math.PI*2);
  ctx.fill();
}

function drawCorner(x,y,text){
  ctx.fillStyle="#111";
  ctx.font="bold 14px Arial";
  ctx.fillText(text,x*cell+cell*0.35,y*cell+cell*0.65);
}

drawBoard();
