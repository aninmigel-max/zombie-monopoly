const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const SIZE = 11;
const cell = canvas.width / SIZE;

const dice = document.getElementById("dice");
const rollBtn = document.getElementById("rollBtn");

/* 🎲 точки кубика */
const pipsMap = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
};

function setDice(value){
  dice.innerHTML = "";
  pipsMap[value].forEach(p=>{
    const dot = document.createElement("div");
    dot.className = "pip";
    dot.style.left = p[0]+"%";
    dot.style.top = p[1]+"%";
    dice.appendChild(dot);
  });
}

function rollDice(){
  const value = Math.floor(Math.random()*6)+1;
  dice.classList.remove("roll");
  setDice(1);

  setTimeout(()=>{
    dice.classList.add("roll");
    setTimeout(()=>{
      setDice(value);
      tg.HapticFeedback.impactOccurred("medium");
    },700);
  },30);
}

rollBtn.onclick = rollDice;

/* 🟩 ДОСКА */
function drawBoard(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  for(let i=0;i<SIZE;i++){
    for(let j=0;j<SIZE;j++){
      if(i===0||j===0||i===SIZE-1||j===SIZE-1){
        ctx.strokeRect(i*cell, j*cell, cell, cell);

        ctx.beginPath();
        ctx.fillStyle = ["#e74c3c","#2ecc71","#3498db","#f1c40f"][Math.floor(Math.random()*4)];
        ctx.arc(i*cell+cell/2, j*cell+cell/2, cell*0.14, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  ctx.font = "bold 12px Arial";
  ctx.fillStyle = "#111";
  ctx.fillText("START", cell*0.15, canvas.height - cell*0.15);
}

drawBoard();
