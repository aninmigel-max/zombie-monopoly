const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const dice = document.getElementById("dice");
const btn = document.getElementById("rollBtn");

const cells = 11;
const size = canvas.width;
const cell = size / cells;

/* РИСУЕМ ДОСКУ */
function drawBoard() {
  ctx.clearRect(0,0,size,size);

  for (let i=0;i<cells;i++) {
    for (let j=0;j<cells;j++) {
      if (i===0 || j===0 || i===cells-1 || j===cells-1) {
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.strokeRect(i*cell, j*cell, cell, cell);
      }
    }
  }

  ctx.font = `${cell*0.22}px Arial`;
  ctx.fillStyle = "#111";
  ctx.textAlign = "center";

  ctx.fillText("START", cell/2, size-cell/3);
}

drawBoard();

/* КУБИК */
function roll() {
  const value = Math.floor(Math.random()*6)+1;

  dice.classList.remove("drop");
  dice.textContent = "?";

  setTimeout(()=>{
    dice.classList.add("drop");

    setTimeout(()=>{
      dice.textContent = value;

      // тут потом будет логика хода
      console.log("Ход на:", value);

    }, 850);
  }, 30);
}

dice.onclick = roll;
btn.onclick = roll;