const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const moneyEl = document.getElementById("money");

// Настройки игры
const SIZE = 11;
const cell = canvas.width / SIZE;
let balance = 1000;
let playerPos = 0;
let cellsCoords = [];

// Генерация координат клеток по периметру (всего 40 клеток)
function initPath() {
    for (let i = 0; i < SIZE; i++) cellsCoords.push({x: i, y: 0}); // Верх
    for (let i = 1; i < SIZE; i++) cellsCoords.push({x: SIZE-1, y: i}); // Право
    for (let i = SIZE-2; i >= 0; i--) cellsCoords.push({x: i, y: SIZE-1}); // Низ
    for (let i = SIZE-2; i > 0; i--) cellsCoords.push({x: 0, y: i}); // Лево
}

// Отрисовка доски
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем клетки
    cellsCoords.forEach((c, index) => {
        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x * cell, c.y * cell, cell, cell);
        
        // Декор клеток
        if (index % 5 === 0) {
            ctx.fillStyle = "rgba(229, 57, 53, 0.2)";
            ctx.fillRect(c.x * cell, c.y * cell, cell, cell);
        }
    });

    // Рисуем Старт
    ctx.fillStyle = "#111";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("START", cellsCoords[0].x * cell + 5, cellsCoords[0].y * cell + 15);

    // Рисуем Игрока (Зомби)
    const p = cellsCoords[playerPos];
    ctx.font = "34px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🧟", p.x * cell + cell/2, p.y * cell + cell/2);
}

// Кубик
const pipsMap = {
    1: [4], 2: [0, 8], 3: [0, 4, 8],
    4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
};

function renderDice(val) {
    const d = document.getElementById("dice");
    d.innerHTML = "";
    pipsMap[val].forEach(p => {
        const dot = document.createElement("div");
        dot.className = "pip";
        d.appendChild(dot);
    });
}

function rollDice() {
    const btn = document.getElementById("rollBtn");
    btn.disabled = true;
    
    const value = Math.floor(Math.random() * 6) + 1;
    document.getElementById("dice").classList.add("roll-anim");
    
    tg.HapticFeedback.impactOccurred("light");

    setTimeout(() => {
        document.getElementById("dice").classList.remove("roll-anim");
        renderDice(value);
        
        // Перемещение
        let oldPos = playerPos;
        playerPos = (playerPos + value) % cellsCoords.length;
        
        // Если прошли через СТАРТ - даем денег
        if (playerPos < oldPos) {
            balance += 500;
            updateUI();
            tg.HapticFeedback.notificationOccurred("success");
        }

        draw();
        btn.disabled = false;
    }, 600);
}

// Переключение вкладок
function switchTab(tabId, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById(tabId + '-screen').style.display = 'block';
    el.classList.add('active');
}

function updateUI() {
    moneyEl.innerText = balance;
}

function upgradeHouse(id) {
    if (balance >= 200) {
        balance -= 200;
        let lvl = document.getElementById('h1-lvl');
        lvl.innerText = parseInt(lvl.innerText) + 1;
        updateUI();
        tg.HapticFeedback.impactOccurred("medium");
    } else {
        tg.showAlert("Недостаточно денег!");
    }
}

document.getElementById("rollBtn").onclick = rollDice;

// Инициализация
initPath();
renderDice(1);
draw();
