const tg = window.Telegram.WebApp;
tg.expand();
// ===== ODD GAME BANK =====
let ODD_BANK = [];

async function loadOddBank() {
  try {
    const res = await fetch("odd_bank.json");
    const data = await res.json();

    if (Array.isArray(data)) {
      ODD_BANK = data;
      console.log("✅ odd_bank загружен:", ODD_BANK.length);
    } else {
      console.error("❌ odd_bank не массив");
    }
  } catch (e) {
    console.error("❌ Ошибка загрузки odd_bank.json", e);
  }
}

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
  const leftColors = [
  COLORS.RED, COLORS.PURPLE, COLORS.GREEN,
  COLORS.YELLOW, COLORS.BLUE,
  COLORS.PURPLE, COLORS.RED,
  COLORS.GREEN, COLORS.YELLOW
];
    leftColors.forEach((c, i) => {
    boardMap.push({
        type: i % 2 === 0 ? "CELL_COLOR" : "CELL_EMPTY",
        color: i % 2 === 0 ? c : null
    });
});

    // 10: Infection (Верх-Лево)
    boardMap.push({ type: "CORNER", color: COLORS.CORNER, text: "Infection" });

    // 11-19: Верхняя сторона (вправо)
  const topColors = [
  COLORS.RED,     // 0 ✅
  COLORS.GREEN,   // 1 ❌
  COLORS.BLUE,    // 2 ✅
  COLORS.PURPLE,  // 3 ❌
  COLORS.RED,     // 4 ✅
  COLORS.YELLOW,  // 5 ❌
  COLORS.GREEN,   // 6 ✅
  COLORS.BLUE,    // 7 ❌
  COLORS.PURPLE   // 8 ✅
];
pushSide(topColors);

    // 20: Choice (Верх-Право)
    boardMap.push({ type: "CORNER", color: COLORS.CORNER, text: "Choice" });

    // 21-29: Правая сторона (вниз)
   const rightColors = [
  COLORS.YELLOW, COLORS.GREEN, COLORS.PURPLE,
  COLORS.BLUE, COLORS.RED,
  COLORS.YELLOW, COLORS.GREEN,
  COLORS.PURPLE, COLORS.RED
];
   pushSide(rightColors);

    // 30: Attack (Низ-Право)
    boardMap.push({ type: "ATTACK", color: COLORS.CORNER, text: "Attack" });

    // 31-39: Нижняя сторона (влево)
    const botColors = [
  COLORS.PURPLE, COLORS.BLUE, COLORS.GREEN,
  COLORS.YELLOW, COLORS.RED,
  COLORS.PURPLE, COLORS.BLUE,
  COLORS.GREEN, COLORS.RED
];
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
  { name: "➕ Математика", start: startMathGame },
  { name: "❓ Найди лишнее", start: startOddGame },
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
loadOddBank(); 
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

// =====================
// MEMORY GAME (4x4, накопление, 5 уровней)
// =====================

const MEMORY_SIZE = 4;
const MEMORY_CELLS = MEMORY_SIZE * MEMORY_SIZE; // 16
const MEMORY_MAX_LEVEL = 5;

let memoryLevel = 1;
let memorySequence = [];
let memoryInput = [];
let memoryLocked = true;

function startMemoryGame() {
  document.getElementById("memory-game").classList.remove("hidden");
  memoryLevel = 1;
  memorySequence = [];   // очищаем только при старте всей мини-игры
  nextMemoryLevel();
}

function nextMemoryLevel() {
  memoryInput = [];
  memoryLocked = true;

  document.getElementById("memory-level").innerText =
    `Уровень ${memoryLevel} / ${MEMORY_MAX_LEVEL}`;
  document.getElementById("memory-status").innerText = "";

  const grid = document.getElementById("memory-grid");
  grid.innerHTML = "";

  // создаём 16 клеток (4x4)
  for (let i = 0; i < MEMORY_CELLS; i++) {
    const cell = document.createElement("div");
    cell.className = "memory-cell";
    cell.onclick = () => onMemoryClick(i, cell);
    grid.appendChild(cell);
  }

  // добавляем 1 новую клетку к уже существующей последовательности
  let next;
  do {
    next = Math.floor(Math.random() * MEMORY_CELLS);
  } while (memorySequence.includes(next)); // без повторов (можно убрать, если хочешь повторы)

  memorySequence.push(next);

  showMemorySequence();
}

function showMemorySequence() {
  const cells = document.querySelectorAll("#memory-grid .memory-cell");
  let i = 0;

  const interval = setInterval(() => {
    // выключаем предыдущую подсветку
    if (i > 0) cells[memorySequence[i - 1]].classList.remove("active");

    // закончили показ
    if (i === memorySequence.length) {
      clearInterval(interval);
      memoryLocked = false;
      return;
    }

    // подсветить текущую
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

    // если ввёл всю последовательность верно
    if (memoryInput.length === memorySequence.length) {
      if (memoryLevel >= MEMORY_MAX_LEVEL) {
        document.getElementById("memory-status").innerText = "🏆 Победа!";
        memoryLocked = true;

        // (по желанию) награда:
        // state.balance += 300; updateUI(); saveGame();

        setTimeout(exitMemoryGame, 800);
        return;
      }

      memoryLevel++;
      setTimeout(nextMemoryLevel, 700);
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

function closeMemory() {
    document.getElementById("memoryOverlay").classList.add("hidden");
}
// =====================
// MATH RUSH (5 уровней, 7 секунд)
// =====================

const MATH_MAX_LEVEL = 5;
const MATH_TIME_LIMIT = 5.0; // сек

let mathLevel = 1;
let mathCorrectAnswer = null;
let mathLocked = false;
let mathTimer = MATH_TIME_LIMIT;
let mathTimerInt = null;

// Запуск
function startMathGame() {
  document.getElementById("math-game").classList.remove("hidden");
  mathLevel = 1;
  nextMathLevel();
}
// =====================
// ODD ONE OUT GAME
// =====================

// =====================
// ODD ONE OUT GAME (UI + TIMER)
// =====================
let oddLevel = 1;
const ODD_MAX_LEVEL = 5;
let oddCorrect = "";
let oddTimer = null;

function startOddGame() {
  if (!ODD_BANK.length) {
    alert("Банк слов не загружен");
    return;
  }

  document.getElementById("odd-game").classList.remove("hidden");
  oddLevel = 1;
  nextOddLevel();
}

function nextOddLevel() {
  document.getElementById("odd-status").innerText = "";
  document.getElementById("odd-level").innerText =
    `Уровень ${oddLevel} / ${ODD_MAX_LEVEL}`;

  const round = generateOddRound();
  oddCorrect = round.correct;

  const box = document.getElementById("odd-answers");
  box.innerHTML = "";

  round.options.forEach(word => {
    const btn = document.createElement("button");
    btn.className = "odd-btn";
    btn.innerText = word;
    btn.onclick = () => pickOdd(word, btn);
    box.appendChild(btn);
  });

  startOddTimer();
}

function generateOddRound() {
  const a = rand(0, ODD_BANK.length - 1);
  let b;
  do {
    b = rand(0, ODD_BANK.length - 1);
  } while (b === a);

  const main = shuffle([...ODD_BANK[a].words]).slice(0, 4);
  const odd = shuffle([...ODD_BANK[b].words])[0];

  return {
    options: shuffle([...main, odd]),
    correct: odd
  };
}

function pickOdd(word, btn) {
  clearTimeout(oddTimer);

  if (word === oddCorrect) {
    btn.classList.add("correct");
    document.getElementById("odd-status").innerText = "✅ Верно";

    setTimeout(() => {
      if (oddLevel >= ODD_MAX_LEVEL) {
        exitOddGame();
      } else {
        oddLevel++;
        nextOddLevel();
      }
    }, 600);
  } else {
  btn.classList.add("wrong");
  document.getElementById("odd-status").innerText = "❌ Неверно";

  setTimeout(() => {
    exitOddGame(); // ⬅️ ВОТ ЭТОГО НЕ ХВАТАЛО
  }, 600);
  }
} 

function startOddTimer() {
  clearTimeout(oddTimer);
  const bar = document.getElementById("odd-timer-bar");

  bar.style.transition = "none";
  bar.style.width = "100%";

  setTimeout(() => {
    bar.style.transition = "width 7s linear";
    bar.style.width = "0%";
  }, 50);

  oddTimer = setTimeout(() => {
    document.getElementById("odd-status").innerText = "⏰ Время вышло";
    setTimeout(exitOddGame, 800);
  }, 7000);
}

function exitOddGame() {
  clearTimeout(oddTimer);
  document.getElementById("odd-game").classList.add("hidden");
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function pickRandom(arr, n) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

// Следующий уровень
function nextMathLevel() {
  mathLocked = false;
  document.getElementById("math-status").innerText = "";
  document.getElementById("math-level").innerText = `Уровень ${mathLevel} / ${MATH_MAX_LEVEL}`;

  const q = generateMathQuestion(mathLevel);
  mathCorrectAnswer = q.answer;

  document.getElementById("math-question").innerText = q.text;

  renderMathAnswers(q.options, q.answer);

  startMathTimer();
}

// Таймер
function updateMathTimerUI() {
  const bar = document.getElementById("math-timer-bar");
  if (!bar) return;

  const pct = Math.max(0, Math.min(1, mathTimer / MATH_TIME_LIMIT));
  bar.style.width = (pct * 100) + "%";
  if (pct > 0.5) bar.style.background = "#2ed573";
  else if (pct > 0.25) bar.style.background = "#ffa502";
  else bar.style.background = "#ff4757";
}


function stopMathTimer() {
  if (mathTimerInt) {
    clearInterval(mathTimerInt);
    mathTimerInt = null;
  }
}
function startMathTimer() {
  stopMathTimer();
  mathTimer = MATH_TIME_LIMIT;
  updateMathTimerUI();

  mathTimerInt = setInterval(() => {
    if (mathLocked) { stopMathTimer(); return; }

    mathTimer -= 0.05; // шаг 50ms
    if (mathTimer <= 0) {
      mathTimer = 0;
      updateMathTimerUI();
      stopMathTimer();
      onMathTimeout();
      return;
    }
    updateMathTimerUI();
  }, 50);
}
function onMathTimeout() {
  if (mathLocked) return;
  mathLocked = true;

  document.getElementById("math-status").innerText = "⏳ Время вышло!";
  // можно штраф:
  // state.balance -= 50; updateUI(); saveGame();

  // подсветим правильный
  highlightMathCorrect();

  setTimeout(() => {
    // проигрыш — остаёмся/выходим (как хочешь)
    exitMathGame();
  }, 900);
}

// Отрисовка вариантов
function renderMathAnswers(options, correct) {
  const box = document.getElementById("math-answers");
  box.innerHTML = "";

  options.forEach(val => {
    const btn = document.createElement("button");
    btn.className = "math-ans-btn";
    btn.innerText = val;
    btn.onclick = () => onMathPick(val, btn);
    box.appendChild(btn);
  });
}

function onMathPick(val, btn) {
  if (mathLocked) return;
  mathLocked = true;
  stopMathTimer();

  const buttons = document.querySelectorAll("#math-answers .math-ans-btn");

  if (val === mathCorrectAnswer) {
    btn.classList.add("correct");
    document.getElementById("math-status").innerText = "✅ Правильно!";

    // награда за уровень (можно настроить)
    // state.balance += 50 * mathLevel; updateUI(); saveGame();

    setTimeout(() => {
      if (mathLevel >= MATH_MAX_LEVEL) {
        document.getElementById("math-status").innerText = "🏆 Победа! 5/5";

        // финальная награда (по желанию)
        // state.balance += 300; updateUI(); saveGame();

        setTimeout(exitMathGame, 700);
        return;
      }

      mathLevel++;
      nextMathLevel();
    }, 600);

  } else {
    btn.classList.add("wrong");
    document.getElementById("math-status").innerText = "❌ Неправильно!";

    highlightMathCorrect();

    // штраф (по желанию)
    // state.balance -= 100; updateUI(); saveGame();

    setTimeout(() => exitMathGame(), 900);
  }
}

function highlightMathCorrect() {
  const buttons = document.querySelectorAll("#math-answers .math-ans-btn");
  buttons.forEach(b => {
    if (Number(b.innerText) === mathCorrectAnswer) b.classList.add("correct");
  });
}

// Выход
function exitMathGame() {
  stopMathTimer();
  document.getElementById("math-game").classList.add("hidden");
}

// Генератор вопросов
function generateMathQuestion(level) {
  // сложность растёт от уровня
  // 1: маленькие числа, 5: побольше
  const max = [10, 20, 50, 100, 200][Math.min(level - 1, 4)];

  const ops = ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a, b, answer, text;

  if (op === "+") {
    a = rand(1, max);
    b = rand(1, max);
    answer = a + b;
    text = `${a} + ${b} = ?`;
  }

  if (op === "-") {
    a = rand(1, max);
    b = rand(1, max);
    // сделаем так, чтобы не было отрицательных на маленьких уровнях
    if (b > a) [a, b] = [b, a];
    answer = a - b;
    text = `${a} - ${b} = ?`;
  }

  if (op === "×") {
    const mmax = [6, 8, 10, 12, 15][Math.min(level - 1, 4)];
    a = rand(2, mmax);
    b = rand(2, mmax);
    answer = a * b;
    text = `${a} × ${b} = ?`;
  }

  if (op === "÷") {
    // деление делаем “красивым”, всегда целое
    const dmax = [6, 8, 10, 12, 15][Math.min(level - 1, 4)];
    b = rand(2, dmax);
    answer = rand(2, dmax);
    a = b * answer;
    text = `${a} ÷ ${b} = ?`;
  }

  const options = makeOptions(answer, level);

  return { text, answer, options };
}

function makeOptions(answer, level) {
  const set = new Set();
  set.add(answer);

  // разброс “ложных” ответов зависит от уровня
  const spread = [3, 6, 10, 15, 25][Math.min(level - 1, 4)];

  while (set.size < 4) {
    const wrong = answer + rand(-spread, spread);
    if (wrong !== answer && wrong >= 0) set.add(wrong);
  }

  // перемешиваем
  return Array.from(set).sort(() => Math.random() - 0.5);
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
