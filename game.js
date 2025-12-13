const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

const SIZE = 11;
const cell = canvas.width / SIZE;

const dice = document.getElementById("dice");
const rollBtn = document.getElementById("rollBtn");

/* ----- КУБИК С ТОЧКАМИ ----- */
const pips = {
  1:[[50,50]],
  2:[[25,25],[75,75]],
  3:[[25,25],[50,50],[75,75]],
  4:[[25,25],[75,25],[25,75],[75,75]],
  5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
  6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
};

function drawDice(n){
  dice.innerHTML="";
  pips[n].forEach(p=>{
    const d=document.createElement("div");
    d.className="pip";
    d.style.left=p[0]+"%";
    d.style.top=p[1]+"%";
    dice.appendChild(d);
  });
}

/* ----- ДОСКА ----- */
const path=[];
(function(){
  for(let i=0;i<SIZE;i++) path.push({x:i,y:SIZE-1});
  for(let j=SIZE-2;j>=0;j--) path.push({x:SIZE-1,y:j});
  for(let i=SIZE-2;i>=0;i--) path.push({x:i,y:0});
  for(let j=1;j<SIZE-2;j++) path.push({x:0,y:j});
})();

let player=0;
let buildings=2;
let money=1000;

/* спец клетки */
const INFECT = path.length-(SIZE*2-1);
const CHOICE = path.length-(SIZE-1);
const ATTACK = SIZE-1;

/* ----- БРОСОК ----- */
rollBtn.onclick=()=>{
  const v=Math.floor(Math.random()*6)+1;
  dice.classList.remove("roll");
  drawDice(1);
  setTimeout(()=>{
    dice.classList.add("roll");
    setTimeout(()=>{
      drawDice(v);
      move(v);
    },600);
  },30);
};

function move(steps){
  let i=0;
  const t=setInterval(()=>{
    player=(player+1)%path.length;
    draw();
    i++;
    if(i>=steps){
      clearInterval(t);
      cellAction();
    }
  },250);
}

function cellAction(){
  if(player===INFECT) alert("☣️ ЗАРАЖЕНИЕ");
  if(player===CHOICE) alert("❓ ВЫБОР КЛЕТКИ");
  if(player===ATTACK){
    const tax=buildings*100;
    money-=tax;
    alert(`⚔️ АТАКА\n-${tax}`);
  }
}

/* ----- РЕНДЕР ----- */
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  for(let x=0;x<SIZE;x++){
    for(let y=0;y<SIZE;y++){
      if(x===0||y===0||x===SIZE-1||y===SIZE-1){
        ctx.strokeRect(x*cell,y*cell,cell,cell);
        ctx.beginPath();
        ctx.arc(x*cell+cell/2,y*cell+cell/2,cell*0.12,0,Math.PI*2);
        ctx.fillStyle="#999";
        ctx.fill();
      }
    }
  }

  corner(0,0,"☣️");
  corner(SIZE-1,0,"❓");
  corner(SIZE-1,SIZE-1,"⚔️");

  const p=path[player];
  ctx.beginPath();
  ctx.arc(p.x*cell+cell/2,p.y*cell+cell/2,cell*0.18,0,Math.PI*2);
  ctx.fillStyle="#e53935";
  ctx.fill();
}

function corner(x,y,t){
  ctx.font="14px Arial";
  ctx.fillText(t,x*cell+10,y*cell+20);
}

draw();
drawDice(1);
