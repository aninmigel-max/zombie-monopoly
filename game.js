const tg = window.Telegram.WebApp;
tg.expand();

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const toast = document.getElementById("msg-toast");

// --- КОНФИГУРАЦИЯ ---
let balance = 2000;
let passiveIncome = 0; 
let playerPos = 0; // Начинаем с угла 0 (Старт)

// Цвета клеток (по твоему ТЗ)
const C_RED = "#e53935";   // Мини-игры
const C_BLUE = "#1e88e5";  // Доп ход
const C_GREEN = "#43a047"; // Кейс
const C_YELLOW = "#fdd835";// Доход
const C_PURPLE = "#8e24aa";// ?
const C_ORANGE = "#fb8c00";// Задания

// Схема периметра (40 клеток для поля 11x11)
// 0=Start, 1-9=Left, 10=TopLeft, 11-19=Top, 20=TopRight, 21-29=Right, 30=BotRight, 31-39=Bot
// Мы идем ПО ЧАСОВОЙ СТРЕЛКЕ: Старт (Низ-Лево) -> Вверх -> Вправо -> Вниз -> Влево -> Старт
const boardMap = [
    { type: "corner", text: "Start" }, // 0
    { color: C_RED }, { color: C_PURPLE }, { color: C_GREEN }, { color: C_RED }, { color: C_YELLOW }, { color: C_BLUE }, { color: C_ORANGE }, { color: C_RED }, { color: C_GREEN }, // 1-9 (Left side going up)
    { type: "corner", text: "Infection" }, // 10 (Top Left)
    { color: C_RED }, { color: C_ORANGE }, { color: C_BLUE }, { color: C_PURPLE }, { color: C_YELLOW }, { color: C_GREEN }, { color: C_RED }, { color: C_BLUE }, { color: C_ORANGE }, // 11-19 (Top)
    { type: "corner", text: "Choice" }, // 20 (Top Right)
    { color: C_GREEN }, { color: C_RED }, { color: C_YELLOW }, { color: C_PURPLE }, { color: C_BLUE }, { color: C_RED }, { color: C_ORANGE }, { color: C_GREEN }, { color: C_YELLOW }, // 21-29 (Right side going down)
    { type: "corner", text: "Attack" }, // 30 (Bottom Right)
    { color: C_RED }, { color: C_BLUE }, { color: C_PURPLE }, { color: C_YELLOW }, { color: C_GREEN }, { color: C_ORANGE }, { color: C_RED }, { color: C_BLUE }, { color: C_PURPLE } // 31-39 (Bottom)
];

// Координаты клеток
const cellsCoords = [];
const SIZE = 11;
const cellW = canvas.width / SIZE;

// Генерация пути (от 0 вверх по часовой)
function initCoords() {
    // 0 -> 10 (Вверх по левому краю)
    for(let y=SIZE-1; y>=0; y--) cellsCoords.push({x:0, y:y});
    // 11 -> 20 (Вправо по верхнему краю)
    for(let x=1; x<SIZE; x++) cellsCoords.push({x:x, y:0});
    // 21 -> 30 (Вниз по правому краю)
    for(let y=1; y<SIZE; y++) cellsCoords.push({x:SIZE-1, y:y});
    // 31 -> 39 (Влево по нижнему краю)
    for(let x=SIZE-2; x>0; x--) cellsCoords.push({x:x, y:SIZE-1});
}

// --- ОТРИСОВКА ---
function drawBoard() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    // 1. Сетка и цвета
    cellsCoords.forEach((c, i) => {
        let conf = boardMap[i] || {};
        let px = c.x * cellW;
        let py = c.y * cellW;

        // Рамка клетки
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellW, cellW);

        // Угловые клетки
        if (conf.type === "corner") {
            ctx.fillStyle = "#fff";
            ctx.fillRect(px+1, py+1, cellW-2, cellW-2);
            ctx.fillStyle = "#000";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(conf.text, px + cellW/2, py + cellW/2);
            if(conf.text === "Attack") {
                ctx.fillStyle = "red";
                ctx.fillText("-100$", px + cellW/2, py + cellW/2 + 12);
            }
        } 
        // Обычные клетки (цветные круги)
        else if (conf.color) {
            ctx.beginPath();
            ctx.arc(px + cellW/2, py + cellW/2, cellW * 0.35, 0, Math.PI*2);
            ctx.fillStyle = conf.color;
            ctx.fill();
            ctx.strokeStyle = "#000"; // Обводка круга
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    });

    // 2. Игрок
    let p = cellsCoords[playerPos];
    ctx.font = "30px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🧟", p.x * cellW + cellW/2, p.y * cellW + cellW/2);
}

// --- ЛОГИКА ИГРЫ ---
function showToast(msg) {
    toast.innerText = msg;
    toast.style.opacity = 1;
    setTimeout(()=>toast.style.opacity=0, 2000);
}

function processLand() {
    let cell = boardMap[playerPos] || {};
    
    // Логика АТАКИ
    if (cell.text === "Attack") {
        let hasSchool = buildings.find(b=>b.id==="school" && b.bought);
        if(!hasSchool) {
            balance -= 100;
            showToast("Атака! Налог -100$");
            tg.HapticFeedback.notificationOccurred("error");
        } else {
            showToast("Школа защитила от налога!");
            tg.HapticFeedback.notificationOccurred("success");
        }
    }
    // Логика Цветов
    else if (cell.color === C_YELLOW) {
        let gain = 50;
        balance += gain;
        showToast(`Доход: +${gain}$`);
    }
    
    updateUI();
}

// --- КУБИК ---
const diceEl = document.getElementById("dice");
const pipsMap = {
    1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8]
};

function rollDice() {
    document.getElementById("rollBtn").disabled = true;
    let val = Math.floor(Math.random()*6)+1;
    
    diceEl.classList.add("roll-anim");
    diceEl.innerHTML = ""; // очистим
    tg.HapticFeedback.impactOccurred("medium");

    setTimeout(()=>{
        diceEl.classList.remove("roll-anim");
        // Рисуем точки
        pipsMap[val].forEach(i => {
            let pip = document.createElement("div");
            pip.className = "pip";
            diceEl.appendChild(pip);
        });

        // Двигаем
        let steps = val;
        let interval = setInterval(()=>{
            playerPos = (playerPos + 1) % cellsCoords.length;
            drawBoard();
            steps--;
            if(steps <= 0) {
                clearInterval(interval);
                processLand();
                
                // Проверка круга (если прошли Старт)
                if(playerPos < val) { // простой детектор круга
                     // баланс += стартБонус
                }
                
                document.getElementById("rollBtn").disabled = false;
            }
        }, 100);
    }, 600);
}

document.getElementById("rollBtn").onclick = rollDice;

// --- ЗДАНИЯ (ДЕРЕВО ПРОКАЧКИ) ---
// id: уник, name: имя, cost: цена, desc: описание, parent: id родителя (кто нужен до)
const buildings = [
    { id: "base", name: "База", cost: 0, desc: "Стартовая точка", bought: true, parent: null },
    { id: "shop", name: "Магазин", cost: 0, desc: "+1 кубик/час (coming soon)", bought: false, parent: "base" }, // Бесплатно по схеме? Или цена?
    { id: "cafe", name: "Кафе", cost: 500, desc: "+100$/час", bought: false, parent: "shop", income: 100 },
    { id: "armory", name: "Оружейная", cost: 2000, desc: "Бонус на старте", bought: false, parent: "shop" },
    { id: "school", name: "Школа", cost: 5000, desc: "Иммунитет к Атаке", bought: false, parent: "armory" },
    { id: "mine", name: "Шахта", cost: 10000, desc: "+1 кейс/3 дня", bought: false, parent: "school" }
];

function renderBuildings() {
    const list = document.getElementById("buildings-list");
    list.innerHTML = "";

    buildings.forEach(b => {
        // Проверяем доступность (родитель должен быть куплен)
        let parent = buildings.find(p => p.id === b.parent);
        let locked = parent && !parent.bought;

        let el = document.createElement("div");
        el.className = `b-card ${locked ? 'locked' : ''} ${b.bought ? 'bought' : ''}`;
        
        let btnHTML = b.bought 
            ? `<div class="bought-badge">✅</div>`
            : `<button class="b-btn" onclick="buyBuilding('${b.id}')">Купить ${b.cost > 0 ? b.cost+'$' : 'Беспл'}</button>`;

        el.innerHTML = `
            <div class="b-info">
                <h3>${b.name}</h3>
                <p>${locked ? '🔒 Сначала купите предыдущее' : b.desc}</p>
            </div>
            ${btnHTML}
        `;
        list.appendChild(el);
    });
}

window.buyBuilding = function(id) {
    let b = buildings.find(x => x.id === id);
    if(balance >= b.cost) {
        balance -= b.cost;
        b.bought = true;
        if(b.income) passiveIncome += b.income;
        
        tg.HapticFeedback.notificationOccurred("success");
        updateUI();
        renderBuildings(); // Перерисовка списка
    } else {
        tg.showAlert("Не хватает денег!");
    }
};

// --- СИСТЕМА ---
function switchTab(t, btn) {
    document.querySelectorAll(".tab-pane").forEach(e=>e.classList.remove("active"));
    document.querySelectorAll(".tab-item").forEach(e=>e.classList.remove("active"));
    document.getElementById(t+"-screen").classList.add("active");
    btn.classList.add("active");
}

function updateUI() {
    document.getElementById("money").innerText = balance;
    document.getElementById("income").innerText = passiveIncome;
}

// Старт
initCoords();
drawBoard();
renderBuildings();
