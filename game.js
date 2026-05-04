const goods = {
  pepper: { name: "Pepper", base: 80, londonDemand: 2.7 },
  cinnamon: { name: "Cinnamon", base: 95, londonDemand: 2.8 },
  tea: { name: "Tea", base: 120, londonDemand: 3.0 },
  porcelain: { name: "Porcelain", base: 135, londonDemand: 2.6 },
  cotton: { name: "Cotton", base: 60, londonDemand: 1.9 },
  silk: { name: "Silk", base: 160, londonDemand: 2.4 },
  nutmeg: { name: "Nutmeg", base: 130, londonDemand: 3.2 },
  opium: { name: "Opium", base: 100, londonDemand: 1.5 }
};

const ports = {
  london: {
    name: "London", x: 14, y: 28, owner: "England", defense: 100, tax: 0.02,
    desc: "Your home port. Build ships and sell Eastern goods here.",
    goods: {}, shipyard: true
  },
  lisbon: {
    name: "Lisbon", x: 20, y: 42, owner: "Portugal", defense: 60, tax: 0.08,
    desc: "A rival European port and a useful stop before the Atlantic crossing.",
    goods: { cotton: 1.4, pepper: 2.1 }
  },
  cape: {
    name: "Cape Town", x: 38, y: 82, owner: "Local Ruler", defense: 45, tax: 0.10,
    desc: "A resupply stop at the Cape. Repairs are cheaper here.",
    goods: { cotton: 1.2 }
  },
  goa: {
    name: "Goa", x: 58, y: 60, owner: "Portugal", defense: 55, tax: 0.12,
    desc: "A Portuguese stronghold on India's western coast.",
    goods: { pepper: 0.85, cotton: 0.9, cinnamon: 1.4 }
  },
  calicut: {
    name: "Calicut", x: 61, y: 66, owner: "Local Ruler", defense: 40, tax: 0.10,
    desc: "The pepper coast. One of the best places to buy spices.",
    goods: { pepper: 0.55, cinnamon: 0.95 }
  },
  ceylon: {
    name: "Ceylon", x: 64, y: 73, owner: "Local Ruler", defense: 42, tax: 0.10,
    desc: "Known for cinnamon and a valuable position in the sea lanes.",
    goods: { cinnamon: 0.55, pepper: 0.95 }
  },
  bengal: {
    name: "Bengal", x: 70, y: 57, owner: "Local Ruler", defense: 58, tax: 0.13,
    desc: "A rich textile region with cotton and opium.",
    goods: { cotton: 0.55, opium: 0.75, silk: 1.15 }
  },
  malacca: {
    name: "Malacca", x: 79, y: 70, owner: "Local Ruler", defense: 65, tax: 0.16,
    desc: "A chokepoint for spice trade between India, China, and the islands.",
    goods: { nutmeg: 0.65, pepper: 0.9, tea: 1.45 }
  },
  batavia: {
    name: "Batavia", x: 81, y: 82, owner: "Dutch VOC", defense: 70, tax: 0.18,
    desc: "Dutch headquarters in the Indies. Rich, fortified, and dangerous.",
    goods: { nutmeg: 0.55, cinnamon: 0.85, pepper: 0.9 }
  },
  canton: {
    name: "Canton", x: 89, y: 49, owner: "Qing China", defense: 92, tax: 0.22,
    desc: "Tea, porcelain, silk, and high taxes. Trade carefully.",
    goods: { tea: 0.55, porcelain: 0.58, silk: 0.75, opium: 1.8 }
  }
};

const routes = [
  ["london", "lisbon"], ["lisbon", "cape"], ["cape", "goa"], ["goa", "calicut"],
  ["calicut", "ceylon"], ["ceylon", "malacca"], ["malacca", "batavia"],
  ["malacca", "canton"], ["goa", "bengal"], ["bengal", "canton"], ["bengal", "malacca"]
];

const shipTypes = {
  sloop: { name: "Sloop", cost: 500, cargo: 20, combat: 8, speed: 3 },
  merchantman: { name: "Merchantman", cost: 1200, cargo: 60, combat: 12, speed: 2 },
  indiaman: { name: "East Indiaman", cost: 2600, cargo: 120, combat: 35, speed: 1 },
  frigate: { name: "Frigate", cost: 3000, cargo: 40, combat: 55, speed: 3 }
};

let state = {
  month: 1,
  money: 2500,
  selectedPort: "london",
  location: "london",
  ships: [
    { id: 1, type: "merchantman", hp: 100 }
  ],
  cargo: {},
  influence: 0,
  rivals: [
    { name: "Portuguese Crown Traders", money: 2300, home: "lisbon", location: "goa", power: 38, color: "red" },
    { name: "Dutch VOC", money: 2700, home: "batavia", location: "batavia", power: 48, color: "blue" },
    { name: "French Company", money: 1900, home: "lisbon", location: "cape", power: 30, color: "green" }
  ],
  log: ["The Crown has granted your company a charter. One merchantman waits in London."],
  gameOver: false
};

const mapEl = document.getElementById("map");
const actionsEl = document.getElementById("actions");
const logEl = document.getElementById("log");
const modalEl = document.getElementById("modal");

function money(n) {
  return `£${Math.round(n).toLocaleString()}`;
}

function cargoUsed() {
  return Object.values(state.cargo).reduce((a, b) => a + b, 0);
}

function cargoCapacity() {
  return state.ships.reduce((sum, ship) => sum + shipTypes[ship.type].cargo, 0);
}

function fleetCombat() {
  return state.ships.reduce((sum, ship) => sum + shipTypes[ship.type].combat * (ship.hp / 100), 0);
}

function currentPort() {
  return ports[state.location];
}

function selectedPort() {
  return ports[state.selectedPort];
}

function priceAt(portId, goodId) {
  const port = ports[portId];
  const good = goods[goodId];
  if (portId === "london") return Math.round(good.base * good.londonDemand);
  const multiplier = port.goods[goodId] || 1.7;
  const ownerTax = port.owner === "England" ? 0.03 : port.tax;
  return Math.round(good.base * multiplier * (1 + ownerTax));
}

function addLog(text) {
  state.log.push(`Month ${state.month}: ${text}`);
  if (state.log.length > 80) state.log.shift();
}

function showModal(title, text) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalText").textContent = text;
  modalEl.classList.remove("hidden");
}

function renderMap() {
  mapEl.innerHTML = "";

  routes.forEach(([a, b]) => {
    const p1 = ports[a];
    const p2 = ports[b];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const line = document.createElement("div");
    line.className = "route-line";
    line.style.left = `${p1.x}%`;
    line.style.top = `${p1.y}%`;
    line.style.width = `${length}%`;
    line.style.transform = `rotate(${angle}deg)`;
    mapEl.appendChild(line);
  });

  Object.entries(ports).forEach(([id, port]) => {
    const btn = document.createElement("button");
    btn.className = `port ${id === state.selectedPort ? "selected" : ""}`;
    btn.style.left = `${port.x}%`;
    btn.style.top = `${port.y}%`;
    btn.title = port.name;
    btn.addEventListener("click", () => {
      state.selectedPort = id;
      render();
    });
    mapEl.appendChild(btn);

    const label = document.createElement("div");
    label.className = "port-label";
    label.style.left = `${port.x}%`;
    label.style.top = `${port.y}%`;
    label.textContent = port.name;
    mapEl.appendChild(label);
  });

  const ship = document.createElement("div");
  ship.className = "ship-token";
  ship.style.left = `${currentPort().x}%`;
  ship.style.top = `${currentPort().y}%`;
  ship.textContent = "⛵";
  mapEl.appendChild(ship);
}

function renderPortPanel() {
  const port = selectedPort();
  document.getElementById("selectedPortName").textContent = port.name;
  document.getElementById("selectedPortDesc").textContent = port.desc;

  const rows = [
    ["Owner", port.owner],
    ["Defense", port.defense],
    ["Tax", `${Math.round(port.tax * 100)}%`],
    ["Goods", Object.keys(port.goods).map(g => goods[g].name).join(", ") || "Home market"]
  ];

  document.getElementById("portDetails").innerHTML = rows.map(([a,b]) =>
    `<div class="detail-row"><strong>${a}</strong><span>${b}</span></div>`
  ).join("");
}

function renderCompany() {
  document.getElementById("turnLabel").textContent = `Month ${state.month}`;
  document.getElementById("moneyLabel").textContent = money(state.money);
  document.getElementById("shipCountLabel").textContent = `${state.ships.length} Ship${state.ships.length === 1 ? "" : "s"}`;

  const rows = [
    ["Location", currentPort().name],
    ["Money", money(state.money)],
    ["Cargo", `${cargoUsed()} / ${cargoCapacity()}`],
    ["Fleet Combat", Math.round(fleetCombat())],
    ["Influence", state.influence]
  ];

  document.getElementById("companyDetails").innerHTML = rows.map(([a,b]) =>
    `<div class="detail-row"><strong>${a}</strong><span>${b}</span></div>`
  ).join("");
}

function renderActions() {
  const port = selectedPort();
  const here = state.selectedPort === state.location;
  const buttons = [];

  if (!here) {
    buttons.push(actionButton(`Sail to ${port.name}`, "sail", () => sailTo(state.selectedPort)));
  }

  if (here) {
    Object.keys(port.goods).forEach(goodId => {
      buttons.push(actionButton(`Buy ${goods[goodId].name} (${money(priceAt(state.location, goodId))})`, "money", () => buyGood(goodId)));
    });

    Object.keys(state.cargo).filter(g => state.cargo[g] > 0).forEach(goodId => {
      buttons.push(actionButton(`Sell ${goods[goodId].name} (${money(priceAt(state.location, goodId))})`, "money", () => sellGood(goodId)));
    });

    if (port.shipyard || state.location === "london") {
      Object.entries(shipTypes).forEach(([typeId, ship]) => {
        buttons.push(actionButton(`Build ${ship.name} (${money(ship.cost)})`, "build", () => buildShip(typeId)));
      });
    }

    if (state.location !== "london" && port.owner !== "England") {
      buttons.push(actionButton(`Attack ${port.name}`, "danger", () => attackPort(state.location)));
    }

    buttons.push(actionButton("Repair Fleet", "build", repairFleet));
  }

  actionsEl.innerHTML = "";
  buttons.forEach(btn => actionsEl.appendChild(btn));
}

function actionButton(text, cls, fn) {
  const btn = document.createElement("button");
  btn.className = `action-btn ${cls}`;
  btn.textContent = text;
  btn.addEventListener("click", fn);
  return btn;
}

function sailTo(portId) {
  const travelCost = 80 + state.ships.length * 25;
  if (state.money < travelCost) {
    showModal("Not Enough Money", `You need ${money(travelCost)} to supply the voyage.`);
    return;
  }
  state.money -= travelCost;
  const from = currentPort().name;
  state.location = portId;
  state.selectedPort = portId;
  damageFleet(randomInt(0, 8));
  addLog(`Sailed from ${from} to ${ports[portId].name}. Voyage cost: ${money(travelCost)}.`);
  randomVoyageEvent();
  render();
}

function buyGood(goodId) {
  const amount = 10;
  const price = priceAt(state.location, goodId) * amount;
  if (cargoUsed() + amount > cargoCapacity()) {
    showModal("Cargo Hold Full", "You need more ships or must sell goods before buying more.");
    return;
  }
  if (state.money < price) {
    showModal("Not Enough Money", `Buying 10 units costs ${money(price)}.`);
    return;
  }
  state.money -= price;
  state.cargo[goodId] = (state.cargo[goodId] || 0) + amount;
  addLog(`Bought 10 ${goods[goodId].name} in ${currentPort().name} for ${money(price)}.`);
  render();
}

function sellGood(goodId) {
  const amount = Math.min(10, state.cargo[goodId] || 0);
  if (amount <= 0) return;
  const revenue = priceAt(state.location, goodId) * amount;
  state.money += revenue;
  state.cargo[goodId] -= amount;
  addLog(`Sold ${amount} ${goods[goodId].name} in ${currentPort().name} for ${money(revenue)}.`);
  render();
  checkWin();
}

function buildShip(typeId) {
  const ship = shipTypes[typeId];
  if (state.money < ship.cost) {
    showModal("Not Enough Money", `A ${ship.name} costs ${money(ship.cost)}.`);
    return;
  }
  state.money -= ship.cost;
  state.ships.push({ id: Date.now(), type: typeId, hp: 100 });
  addLog(`Built a ${ship.name}.`);
  render();
}

function repairFleet() {
  const missing = state.ships.reduce((sum, ship) => sum + (100 - ship.hp), 0);
  const cost = Math.round(missing * 6);
  if (missing <= 0) {
    showModal("No Repairs Needed", "Your fleet is already in fine condition.");
    return;
  }
  if (state.money < cost) {
    showModal("Not Enough Money", `Repairs cost ${money(cost)}.`);
    return;
  }
  state.money -= cost;
  state.ships.forEach(ship => ship.hp = 100);
  addLog(`Repaired the fleet for ${money(cost)}.`);
  render();
}

function attackPort(portId) {
  const port = ports[portId];
  const attack = fleetCombat() + randomInt(1, 45);
  const defense = port.defense + randomInt(1, 45);
  if (attack > defense) {
    port.owner = "England";
    port.tax = 0.03;
    port.defense = Math.max(25, port.defense - randomInt(5, 18));
    state.influence += 10;
    damageFleet(randomInt(8, 20));
    addLog(`Captured ${port.name}. The English flag now flies over the port.`);
    showModal("Port Captured", `${port.name} is now under your company's control.`);
  } else {
    damageFleet(randomInt(18, 40));
    state.money = Math.max(0, state.money - 200);
    addLog(`Failed attack on ${port.name}. The fleet took heavy damage.`);
    showModal("Attack Failed", `${port.name} held out. Your fleet suffered damage and losses.`);
  }
  render();
}

function damageFleet(amount) {
  if (amount <= 0) return;
  state.ships.forEach(ship => ship.hp = Math.max(15, ship.hp - amount));
}

function randomVoyageEvent() {
  const roll = Math.random();
  if (roll < 0.16) {
    const loss = randomInt(100, 350);
    state.money = Math.max(0, state.money - loss);
    damageFleet(randomInt(4, 15));
    addLog(`A monsoon battered the fleet. Repairs and losses cost ${money(loss)}.`);
  } else if (roll < 0.27) {
    const loss = randomInt(80, 260);
    state.money = Math.max(0, state.money - loss);
    addLog(`Pirates struck the convoy. You paid ${money(loss)} to escape.`);
  } else if (roll < 0.36) {
    const gain = randomInt(100, 300);
    state.money += gain;
    addLog(`A lucky contract brought in ${money(gain)}.`);
  }
}

function nextTurn() {
  if (state.gameOver) return;
  state.month += 1;
  updateMarkets();
  runRivals();
  payMaintenance();
  addLog("A new month begins. Prices shift across the ports.");
  render();
  checkLose();
}

function updateMarkets() {
  Object.values(ports).forEach(port => {
    Object.keys(port.goods).forEach(g => {
      const drift = 1 + (Math.random() - 0.5) * 0.12;
      port.goods[g] = clamp(port.goods[g] * drift, 0.45, 2.2);
    });
  });
}

function runRivals() {
  state.rivals.forEach(rival => {
    rival.money += randomInt(80, 260);
    const targets = Object.keys(ports).filter(id => id !== "london");
    rival.location = targets[randomInt(0, targets.length - 1)];

    const target = ports[rival.location];
    if (target.owner !== rival.name && target.owner !== "England" && rival.money > 2600 && Math.random() < 0.24) {
      const attack = rival.power + randomInt(1, 50);
      const defense = target.defense + randomInt(1, 45);
      rival.money -= 800;
      if (attack > defense) {
        target.owner = rival.name;
        target.tax = 0.18;
        addLog(`${rival.name} seized ${target.name}.`);
      } else {
        addLog(`${rival.name} failed to take ${target.name}.`);
      }
    }
  });
}

function payMaintenance() {
  const cost = state.ships.length * 45;
  state.money -= cost;
  addLog(`Fleet wages and maintenance cost ${money(cost)}.`);
}

function checkWin() {
  const englishPorts = Object.values(ports).filter(p => p.owner === "England").length;
  if (state.money >= 50000 || englishPorts >= 6) {
    state.gameOver = true;
    showModal("Victory", "Your company has become the strongest power in the Indian Ocean trade.");
  }
}

function checkLose() {
  if (state.money < -1000 || state.ships.length === 0) {
    state.gameOver = true;
    showModal("Company Ruined", "Debt, rivals, and hard seas have broken the company charter.");
  }
}

function renderLists() {
  document.getElementById("fleetList").innerHTML = state.ships.map(ship => {
    const type = shipTypes[ship.type];
    return `<div class="item"><strong>${type.name}</strong>HP: ${Math.round(ship.hp)} | Cargo: ${type.cargo} | Guns: ${type.combat}</div>`;
  }).join("");

  const cargoItems = Object.entries(state.cargo).filter(([, amt]) => amt > 0);
  document.getElementById("cargoList").innerHTML = cargoItems.length
    ? cargoItems.map(([g, amt]) => `<div class="item"><strong>${goods[g].name}</strong>${amt} units</div>`).join("")
    : `<div class="item">No cargo yet.</div>`;

  document.getElementById("rivalsList").innerHTML = state.rivals.map(r =>
    `<div class="item"><strong>${r.name}</strong>Location: ${ports[r.location].name}<br>Money: ${money(r.money)} | Power: ${r.power}</div>`
  ).join("");

  logEl.innerHTML = state.log.map(entry => `<div class="log-entry">${entry}</div>`).join("");
}

function render() {
  renderMap();
  renderPortPanel();
  renderCompany();
  renderActions();
  renderLists();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

document.getElementById("nextTurnBtn").addEventListener("click", nextTurn);
document.getElementById("modalCloseBtn").addEventListener("click", () => modalEl.classList.add("hidden"));

render();
