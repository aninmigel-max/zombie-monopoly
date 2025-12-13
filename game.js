// Telegram
const tg = window.Telegram.WebApp;
tg.expand();

const name = tg.initDataUnsafe?.user?.first_name || "Игрок";
document.getElementById("playerName").textContent = name;

// Canvas
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const SIZE = 11;
const cell = canvas.width / SIZE;

// 🎲 Dice
const dice = document.getElementById("dice");
const rollBtn = document.getElementById("rollBtn");

function rnd() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice() {
  const value = rnd();
  dice.textContent = "?";
  dice.classList.remove("roll");

  setTimeout(() => {
    dice.classList.add("roll");
    setTimeout(() => {
      dice.textContent = value;
      tg.HapticFeedback.impactOccurred("medium");
    }, 700);
  }, 30);
}

rollBtn.onclick = rollDice;

// 🟩 Board
function drawBoard() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;

  for (let i=0;i<SIZE;i++){
    for (let j=0;j<SIZE;j++){
      if (i===0 || j===0 || i===SIZE-1 || j===SIZE-1) {
        ctx.strokeRect(i*cell, j*cell, cell, cell);

        // точки
        ctx.beginPath();
        ctx.fillStyle = ["#e74c3c","#2ecc71","#3498db","#f1c40f"][Math.floor(Math.random()*4)];
        ctx.arc(i*cell+cell/2, j*cell+cell/2, cell*0.15, 0, Math.PI*2);
        ctx.fill();
      }
    }
  }

  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#111";
  ctx.fillText("START", cell*0.2, canvas.height - cell*0.3);
}

drawBoard();
