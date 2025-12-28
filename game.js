const tg = window.Telegram.WebApp;
tg.expand();

// --- НАСТРОЙКИ ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ЦВЕТА (Пастельные, как на картинке 3)
const COLORS = {
    RED: "#ff7675",     // Мини-игры
    BLUE: "#74b9ff",    // Доп ход
    GREEN: "#55efc4",   // Кейс
    YELLOW: "#ffeaa7",  // Доход
    PURPLE: "#a29bfe",  // ? (Вопрос)
    CORNER: "#ffffff",  // Углы
    TEXT: "#2d3436"
};

// Состояние игрока
let state = {
    balance: 2000,
    income: 0,
    pos: 0,
    isRolling: false,
    buildings: [
        { id: "base", name: "База", cost: 0, income: 0, bought: true },
        { id: "cafe", name: "Кафе", cost: 500, income: 100, bought: false },
        { id: "shop", name: "Магазин", cost: 1500, income: 250, bought: false },
        { id: "hotel", name: "Отель", cost: 5000, income: 800, bought: false }
    ]
};
const SAVE_KEY = "zombie_monopoly_save_v1";

function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function loadGame() {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return;

    try {
        const parsed = JSON.parse(data);
        state = parsed;
    } catch (e) {
        console.error("Save load error", e);
    }
}

// --- КАРТА (40 клеток) ---
// Генерируем карту вручную, чтобы расставить цвета
const SIZE = 11;
const boardMap = [];

function pushSide(colors) {
    colors.forEach((c, i) => {
        boardMap.push({
            type: i % 2 === 0 ? "CELL_COLOR" : "CELL_EMPTY",
            color: i % 2 === 0 ? c : null
        });
    });
}

function initMap() {
    // 0: Start (Низ-Лево)
    boardMap.push({ type: "START", color: COLORS.CORNER, text: "Start" });
    
    // 1-9: Левая сторона (вверх)
    const leftColors = [COLORS.RED, COLORS.PURPLE, COLORS.GREEN, COLORS.RED, COLORS.YELLOW, COLORS.BLUE, COLORS.ORANGE, COLORS.RED, COLORS.GREEN];
    leftColors.forEach((c, i) => {
    boardMap.push({
        type: i % 2 === 0 ? "CELL_COLOR" : "CELL_EMPTY",
        color: i % 2 === 0 ? c : null
    });
});

    // 10: Infection (Верх-Лево)
    boardMap.push({ type: "CORNER", color: COLORS.CORNER, text: "Infection" });

    // 11-19: Верхняя сторона (вправо)
    const topColors = [COLORS.RED, COLORS.ORANGE, COLORS.BLUE, COLORS.PURPLE, COLORS.YELLOW, COLORS.GREEN, COLORS.RED, COLORS.BLUE, COLORS.ORANGE];
    pushSide(topColors);

    // 20: Choice (Верх-Право)
    boardMap.push({ type: "CORNER", color: COLORS.CORNER, text: "Choice" });

    // 21-29: Правая сторона (вниз)
    const rightColors = [COLORS.GREEN, COLORS.RED, COLORS.YELLOW, COLORS.PURPLE, COLORS.BLUE, COLORS.RED, COLORS.ORANGE, COLORS.GREEN, COLORS.YELLOW];
   pushSide(rightColors);

    // 30: Attack (Низ-Право)
    boardMap.push({ type: "ATTACK", color: COLORS.CORNER, text: "Attack" });

    // 31-39: Нижняя сторона (влево)
    const botColors = [COLORS.RED, COLORS.BLUE, COLORS.PURPLE, COLORS.YELLOW, COLORS.GREEN, COLORS.ORANGE, COLORS.RED, COLORS.BLUE, COLORS.PURPLE];
    pushSide(botColors);
}

// Вычисляем координаты для отрисовки
let cellCoords = [];
function calcCoords() {
    cellCoords = [];
    // Важно: Канвас имеет внутреннее разрешение выше для четкости
    const W = canvas.width; 
    const step = W / SIZE;

    // 0 -> 10 (Вверх)
    for(let y=SIZE-1; y>=0; y--) cellCoords.push({x: 0, y: y});
    // 11 -> 20 (Вправо)
    for(let x=1; x<SIZE; x++) cellCoords.push({x: x, y: 0});
    // 21 -> 30 (Вниз)
    for(let y=1; y<SIZE; y++) cellCoords.push({x: SIZE-1, y: y});
    // 31 -> 39 (Влево)
    for(let x=SIZE-2; x>0; x--) cellCoords.push({x: x, y: SIZE-1});

    // Добавляем размеры клетки в координаты
    cellCoords = cellCoords.map(c => ({
        x: c.x * step,
        y: c.y * step,
        w: step,
        h: step
    }));
}

// --- ОТРИСОВКА ---
function draw() {
    // Чистим
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем клетки
    boardMap.forEach((cell, i) => {
        const c = cellCoords[i];
        
        // Рамка
        ctx.strokeStyle = "#b2bec3";
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x, c.y, c.w, c.h);

        // Заливка (если угол или цветной)
        if (cell.text) {
            // УГЛЫ
            ctx.fillStyle = "#fff";
            ctx.fillRect(c.x+1, c.y+1, c.w-2, c.h-2);
            
            ctx.fillStyle = "#000";
            ctx.font = "bold 24px Arial"; // Крупный шрифт для Retina
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(cell.text, c.x + c.w/2, c.y + c.w/2);
            
            if(cell.type === "ATTACK") {
                ctx.fillStyle = COLORS.RED;
                ctx.font = "bold 18px Arial";
                ctx.fillText("-100$", c.x + c.w/2, c.y + c.w/2 + 25);
            }
        }  else if (cell.type === "CELL_COLOR") {
    // ЦВЕТНЫЕ КРУГИ
    ctx.beginPath();
    let r = c.w * 0.35;
    ctx.arc(c.x + c.w/2, c.y + c.w/2, r, 0, Math.PI*2);
    ctx.fillStyle = cell.color;
    ctx.fill();

    if(cell.color === COLORS.PURPLE) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("?", c.x + c.w/2, c.y + c.w/2);
    }
}});

    // РИСУЕМ ИГРОКА
    const p = cellCoords[state.pos];
    ctx.font = "60px serif"; // Эмодзи покрупнее
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🧟", p.x + p.w/2, p.y + p.w/2 - 5); // Чуть выше центра
}

// --- ЛОГИКА ИГРЫ ---

function processCell() {
    const cell = boardMap[state.pos];
    const color = cell.color;

    console.log("Встал на:", cell);

    if (cell.type === "ATTACK") {
        state.balance -= 100;
        showToast("💥 Атака! -100$");
        tg.HapticFeedback.notificationOccurred("error");
    } 
    else if (cell.type === "START") {
        showToast("🏁 Круг пройден!");
    }
    else if (color === COLORS.RED) {
         openMinigameMenu();
    }
    else if (color === COLORS.BLUE) {
        showToast("🔵 Дополнительный ход!");
        tg.HapticFeedback.notificationOccurred("success");
        // Не блокируем кнопку броска, даем кинуть еще раз
        return; 
    }
    else if (color === COLORS.GREEN) {
        let prize = Math.floor(Math.random() * 200) + 50;
        state.balance += prize;
        showModal("📦 Кейс", `Вы нашли припасы! +${prize}$`);
    }
    else if (color === COLORS.YELLOW) {
        let income = 100;
        state.balance += income;
        showToast(`💰 Прибыль +${income}$`);
    }
    else if (color === COLORS.ORANGE) {
        showModal("📝 Задание", "Постройте 2 здания, чтобы получить награду.");
    }
    else if (color === COLORS.PURPLE) {
        showModal("❓ Тайна", "Случайное событие...");
    }

    updateUI();
    saveGame();
}

// --- КУБИК И ДВИЖЕНИЕ ---
const rollBtn = document.getElementById("rollBtn");
const diceEl = document.getElementById("dice-container");

// Координаты точек (индексы от 0 до 8 в сетке 3х3)
const diceLayouts = {
    1: [4],                // Центр
    2: [0, 8],             // Верх-лево, низ-право
    3: [0, 4, 8],          // Диагональ
    4: [0, 2, 6, 8],       // Четыре угла
    5: [0, 2, 4, 6, 8],    // Углы и центр
    6: [0, 3, 6, 2, 5, 8]  // Два вертикальных ряда
};

function renderDice(val) {
    diceEl.innerHTML = ""; // Очищаем кубик
    
    // Всегда создаем 9 невидимых точек
    for (let i = 0; i < 9; i++) {
        let d = document.createElement("div");
        d.className = "pip";
        
        // Если индекс i есть в списке для выпавшей цифры — включаем точку
        if (diceLayouts[val].includes(i)) {
            d.classList.add("on");
        }
        diceEl.appendChild(d);
    }
}

rollBtn.onclick = () => {
    if(state.isRolling) return;
    state.isRolling = true;
    rollBtn.disabled = true;

    // Анимация
    diceEl.classList.add("roll-anim");
    let rollResult = Math.floor(Math.random() * 6) + 1;
    
    tg.HapticFeedback.impactOccurred("medium");

    setTimeout(() => {
        diceEl.classList.remove("roll-anim");
        renderDice(rollResult);
        
        // Движение по клеткам
        let stepsLeft = rollResult;
        let moveInt = setInterval(() => {
            state.pos = (state.pos + 1) % 40;
            
            // Если прошли старт (переход с 39 на 0)
            if (state.pos === 0) {
                state.balance += 500; // Зарплата за круг
                showToast("🏁 Прошел круг! +500$");
            }

            draw();
            tg.HapticFeedback.selectionChanged();
            stepsLeft--;

            if (stepsLeft <= 0) {
                clearInterval(moveInt);
                state.isRolling = false;
                rollBtn.disabled = false;
                processCell(); // Обработка клетки
                saveGame(); // Сохраняем прогресс

            }
        }, 150); // Скорость прыжка
    }, 600);
};

// --- UI ФУНКЦИИ ---
function updateUI() {
    document.getElementById("balance").innerText = state.balance;
    document.getElementById("income").innerText = state.income;
}

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2000);
}

function showModal(title, text) {
    document.getElementById("modal-title").innerText = title;
    document.getElementById("modal-text").innerText = text;
    document.getElementById("modal").classList.remove("hidden");
}

window.closeModal = function() {
    document.getElementById("modal").classList.add("hidden");
}

window.setTab = function(tab) {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    event.currentTarget.classList.add("active"); // Подсветка кнопки

    if(tab === 'game') {
        document.getElementById("city-screen").classList.add("hidden");
    } else {
        renderBuildings();
        document.getElementById("city-screen").classList.remove("hidden");
    }
}

// Генерация зданий
function renderBuildings() {
    const list = document.getElementById("buildings-list");
    list.innerHTML = "";
    state.buildings.forEach(b => {
        let div = document.createElement("div");
        div.className = `building-card ${b.bought ? 'bought' : ''}`;
        div.innerHTML = `
            <div>
                <h3>${b.name}</h3>
                <small>Доход: ${b.income}$/час</small>
            </div>
            ${b.bought ? '✅' : `<button class="buy-btn" onclick="buy('${b.id}')">${b.cost}$</button>`}
        `;
        list.appendChild(div);
    });
}

window.buy = function(id) {
    let b = state.buildings.find(x => x.id === id);
    if(state.balance >= b.cost) {
        state.balance -= b.cost;
        b.bought = true;
        state.income += b.income;
        updateUI();
        renderBuildings();
        saveGame();
        tg.HapticFeedback.notificationOccurred("success");

        
    } else {
        tg.showAlert("Не хватает денег!");
         // Сохраняем прогресс
    }
};

// --- ИНИЦИАЛИЗАЦИЯ ---
// Настраиваем канвас под высокое разрешение (Retina)
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Внутреннее разрешение
    canvas.width = 1200; 
    canvas.height = 1200;
    
    // Пересчитываем координаты под новый размер
    calcCoords();
    draw();
}
const MINIGAMES = [
  { name: "🧠 Запомни порядок", start: startMemoryGame },
  { name: "➕ Математика", start: () => alert("Будет позже") },
  { name: "❓ Найди лишнее", start: () => alert("Будет позже") },
  { name: "🧩 Лабиринт", start: () => alert("Будет позже") },
  { name: "🎯 Mini OSU", start: () => alert("Будет позже") },
  { name: "🧩 Пазл", start: () => alert("Будет позже") },
  { name: "🧠 Мемори", start: () => alert("Будет позже") },
  { name: "🎨 Соедини цвета", start: () => alert("Будет позже") }
];

function openMinigameMenu() {
  const list = document.getElementById("minigame-list");
  list.innerHTML = "";

  MINIGAMES.forEach(g => {
    const btn = document.createElement("button");
    btn.className = "minigame-btn";
    btn.innerText = g.name;
    btn.onclick = () => {
      closeMinigameMenu();
      g.start();
    };
    list.appendChild(btn);
  });

  document.getElementById("minigame-menu").classList.remove("hidden");
}

function closeMinigameMenu() {
  document.getElementById("minigame-menu").classList.add("hidden");
}

initMap();
loadGame();
updateUI();
renderBuildings();

// Ждем загрузки DOM
setTimeout(() => {
    resizeCanvas();
    renderDice(1); // Показать одну точку в центре при старте
}, 100);

// 🔁 Автосохранение каждые 10 секунд
setInterval(() => {
    if (!state.isRolling) {
        saveGame();
    }
}, 10000);

// Перерисовка при изменении размера окна
window.onresize = () => {
    // В CSS aspect-ratio сделает свое дело, но можно вызвать перерисовку если надо
    // resizeCanvas(); // Обычно не нужно, если координаты в % от ширины
};
// =====================
// MEMORY GAME (5x5)
// =====================

let memoryLevel = 1;
let memorySequence = [];
let memoryInput = [];
let memoryLocked = true;

function startMemoryGame() {
    document.getElementById("memory-game").classList.remove("hidden");
    memoryLevel = 1;
    nextMemoryLevel();
}

function nextMemoryLevel() {
    memorySequence = [];
    memoryInput = [];
    memoryLocked = true;

    document.getElementById("memory-level").innerText = `Уровень ${memoryLevel}`;
    document.getElementById("memory-status").innerText = "";

    const grid = document.getElementById("memory-grid");
    grid.innerHTML = "";

    for (let i = 0; i < 25; i++) {
        const cell = document.createElement("div");
        cell.className = "memory-cell";
        cell.onclick = () => onMemoryClick(i, cell);
        grid.appendChild(cell);
    }

    for (let i = 0; i < memoryLevel; i++) {
        memorySequence.push(Math.floor(Math.random() * 25));
    }

    showMemorySequence();
}

function showMemorySequence() {
    const cells = document.querySelectorAll(".memory-cell");
    let i = 0;

    const interval = setInterval(() => {
        if (i > 0) cells[memorySequence[i - 1]].classList.remove("active");

        if (i === memorySequence.length) {
            clearInterval(interval);
            memoryLocked = false;
            return;
        }

        cells[memorySequence[i]].classList.add("active");
        i++;
    }, 600);
}

function onMemoryClick(index, cell) {
    if (memoryLocked) return;

    const expected = memorySequence[memoryInput.length];
    memoryInput.push(index);

    if (index === expected) {
        cell.classList.add("correct");

        if (memoryInput.length === memorySequence.length) {
            memoryLevel++;
            setTimeout(nextMemoryLevel, 800);
        }
    } else {
        cell.classList.add("wrong");
        document.getElementById("memory-status").innerText = "❌ Ошибка";
        memoryLocked = true;
    }
}

function exitMemoryGame() {
    document.getElementById("memory-game").classList.add("hidden");
}
function openMemoryGame() {
    document.getElementById("memoryOverlay").classList.remove("hidden");
    startMemory();
}

function closeMemory() {
    document.getElementById("memoryOverlay").classList.add("hidden");
}
