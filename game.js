const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Цвета
const COLORS = {
    RED: "#ff7675", BLUE: "#74b9ff", GREEN: "#55efc4", 
    YELLOW: "#ffeaa7", ORANGE: "#fab1a0", PURPLE: "#a29bfe",
    CORNER: "#ffffff"
};

let state = { balance: 2000, income: 0, pos: 0, rolling: false };

// Карта (упрощенная для теста, можешь расширить как в прошлый раз)
const boardMap = [];
for(let i=0; i<40; i++) {
    if(i % 10 === 0) boardMap.push({type: 'CORNER', text: i===0?'Start':i===10?'Inf':i===20?'Choice':'Attack'});
    else boardMap.push({type: 'CELL', color: Object.values(COLORS)[i % 6]});
}

function draw() {
    const W = canvas.width;
    const step = W / 11;
    ctx.clearRect(0,0,W,W);

    // Рисуем сетку
    let x=0, y=10; 
    const coords = [];
    // Лево вверх
    for(let i=0; i<10; i++) coords.push({x:0, y:10-i});
    // Верх право
    for(let i=0; i<10; i++) coords.push({x:i, y:0});
    // Право вниз
    for(let i=0; i<10; i++) coords.push({x:10, y:i});
    // Низ лево
    for(let i=0; i<10; i++) coords.push({x:10-i, y:10});

    coords.forEach((pos, i) => {
        const cell = boardMap[i];
        ctx.strokeStyle = "#ddd";
        ctx.strokeRect(pos.x * step, pos.y * step, step, step);
        
        if(cell.color) {
            ctx.beginPath();
            ctx.arc(pos.x * step + step/2, pos.y * step + step/2, step/3, 0, Math.PI*2);
            ctx.fillStyle = cell.color;
            ctx.fill();
        } else {
            ctx.fillStyle = "#000";
            ctx.font = "bold 20px Arial";
            ctx.textAlign = "center";
            ctx.fillText(cell.text[0], pos.x * step + step/2, pos.y * step + step/2);
        }
    });

    // Игрок
    const p = coords[state.pos];
    ctx.font = "50px serif";
    ctx.fillText("🧟", p.x * step + step/2, p.y * step + step/2 + 15);
}

// КУБИК
const pipEls = document.querySelectorAll(".pip");
const diceLayouts = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 3, 6, 2, 5, 8]
};

function renderDice(val) {
    pipEls.forEach((p, i) => {
        p.classList.toggle("show", diceLayouts[val].includes(i));
    });
}

document.getElementById("rollBtn").onclick = () => {
    if(state.rolling) return;
    state.rolling = true;
    const diceDiv = document.getElementById("dice");
    diceDiv.classList.add("anim-roll");
    
    let res = Math.floor(Math.random()*6)+1;
    setTimeout(() => {
        diceDiv.classList.remove("anim-roll");
        renderDice(res);
        
        let move = setInterval(() => {
            state.pos = (state.pos + 1) % 40;
            draw();
            res--;
            if(res <= 0) {
                clearInterval(move);
                state.rolling = false;
                tg.HapticFeedback.notificationOccurred("success");
            }
        }, 200);
    }, 500);
};

// Исправление "белого экрана": принудительная установка размера
function init() {
    canvas.width = 1000; // Фиксируем внутреннее разрешение
    canvas.height = 1000;
    draw();
    renderDice(1);
}

window.onload = init;
