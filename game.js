const ports = {
  london: { name: "London", x: 10.7, y: 18.8, owner: "England", market: "Home Office", desc: "Home office, shipyard, and final market.", risk: 1.0, profit: 0 },
  lisbon: { name: "Lisbon", x: 4.7, y: 35.3, owner: "Portugal", market: "European Rival Hub", desc: "A nearby market. Low risk, low reward.", risk: 1.05, profit: 110 },
  cape: { name: "Cape Town", x: 12.6, y: 90.0, owner: "Local Ruler", market: "Cape Resupply", desc: "The long Atlantic route around Africa. Slow but useful.", risk: 1.22, profit: 260 },
  goa: { name: "Goa", x: 61.3, y: 53.1, owner: "Portugal", market: "Pepper and Cotton", desc: "A fortified Portuguese port on India’s western coast.", risk: 1.32, profit: 520 },
  calicut: { name: "Calicut", x: 65.1, y: 63.6, owner: "Local Ruler", market: "Pepper Coast", desc: "The classic pepper run. Good money, good danger.", risk: 1.28, profit: 620 },
  ceylon: { name: "Ceylon", x: 69.5, y: 69.2, owner: "Local Ruler", market: "Cinnamon", desc: "Cinnamon, monsoons, and a useful crossing point.", risk: 1.35, profit: 710 },
  bengal: { name: "Bengal", x: 75.9, y: 48.8, owner: "Local Ruler", market: "Textiles and Opium", desc: "A rich textile region with stronger long-run profits.", risk: 1.4, profit: 840 },
  malacca: { name: "Malacca", x: 82.8, y: 69.6, owner: "Local Ruler", market: "Spice Chokepoint", desc: "A narrow trade gate where fortunes are made.", risk: 1.48, profit: 990 },
  batavia: { name: "Batavia", x: 89.3, y: 78.7, owner: "Dutch VOC", market: "Nutmeg Monopoly", desc: "Dutch competition is fierce, but spices sell themselves.", risk: 1.6, profit: 1180 },
  canton: { name: "Canton", x: 93.8, y: 41.1, owner: "Qing China", market: "Tea, Silk, Porcelain", desc: "Long route, high taxes, ridiculous profit.", risk: 1.7, profit: 1320 }
};

const shipTypes = {
  sloop: { name: "Sloop", cost: 800, speed: 17, cargo: 1, upkeep: 7, icon: "⛵" },
  merchantman: { name: "Merchantman", cost: 2200, speed: 24, cargo: 2.4, upkeep: 16, icon: "🚢" },
  indiaman: { name: "East Indiaman", cost: 5200, speed: 35, cargo: 5.2, upkeep: 42, icon: "🛳️" },
  clipper: { name: "Clipper", cost: 7600, speed: 19, cargo: 3.3, upkeep: 38, icon: "⛵" }
};

const slogans = [
  "Pepper today. Profit tomorrow.",
  "Why conquer when you can invoice?",
  "Tea tastes better with dividends.",
  "The sun never sets on quarterly growth.",
  "A ship in harbor earns nothing.",
  "Respectable commerce. Questionable margins.",
  "Buy low in Calicut. Sell high in London."
];

let state = {
  cash: 8000,
  debt: 0,
  month: 1,
  selectedPort: "calicut",
  paused: false,
  adLevel: 1,
  logisticsLevel: 1,
  monopolyLevel: 0,
  nextShipId: 1,
  ships: [],
  log: ["The board demands growth. Build ships, select a port, and assign automatic trade routes."],
  lastIncome: 0
};

const mapEl = document.getElementById("map");
const actionsEl = document.getElementById("actions");
const fleetList = document.getElementById("fleetList");
const upgradeList = document.getElementById("upgradeList");
const adOffice = document.getElementById("adOffice");
const logEl = document.getElementById("log");
const toastEl = document.getElementById("toast");
const pauseBtn = document.getElementById("pauseBtn");

function money(n) { return `£${Math.round(n).toLocaleString()}`; }
function selectedPort() { return ports[state.selectedPort]; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function distance(a, b) { return Math.hypot(ports[a].x - ports[b].x, ports[a].y - ports[b].y); }
function addLog(text) { state.log.push(text); if (state.log.length > 90) state.log.shift(); }
function toast(text) { toastEl.textContent = text; toastEl.classList.remove("hidden"); setTimeout(() => toastEl.classList.add("hidden"), 2200); }

function routeSeconds(portId, shipType) {
  const d = distance("london", portId) * 0.58;
  return Math.max(7, Math.round(d + shipTypes[shipType].speed));
}

function expectedProfit(portId, shipType) {
  const port = ports[portId];
  const ship = shipTypes[shipType];
  const adBonus = 1 + state.adLevel * 0.08;
  const logisticsBonus = 1 + state.logisticsLevel * 0.06;
  const monopolyBonus = 1 + state.monopolyLevel * 0.12;
  const gross = port.profit * ship.cargo * adBonus * logisticsBonus * monopolyBonus;
  const cost = ship.upkeep * port.risk * 3;
  return Math.max(20, Math.round(gross - cost));
}

function buildShip(type) {
  const def = shipTypes[type];
  if (state.cash < def.cost) return toast("Not enough cash.");
  state.cash -= def.cost;
  const ship = {
    id: state.nextShipId++, type, route: null, phase: "idle", progress: 0,
    from: "london", to: "london", x: ports.london.x, y: ports.london.y, timer: 0, tripSeconds: 1,
    lifetimeProfit: 0
  };
  state.ships.push(ship);
  addLog(`Built ${def.name}. The shareholders applaud politely.`);
  render();
}

function assignRoute(portId) {
  if (portId === "london") return toast("London is home. Pick an overseas market.");
  const idle = state.ships.find(s => !s.route || s.phase === "idle");
  if (!idle) return toast("No idle ships. Build another ship or wait for a return.");
  idle.route = portId;
  startOutbound(idle);
  addLog(`${shipTypes[idle.type].name} assigned to the ${ports[portId].name} route.`);
  render();
}

function assignAllIdle(portId) {
  let count = 0;
  state.ships.forEach(s => {
    if (!s.route || s.phase === "idle") { s.route = portId; startOutbound(s); count++; }
  });
  if (!count) return toast("No idle ships to assign.");
  addLog(`${count} ship${count === 1 ? "" : "s"} assigned to ${ports[portId].name}.`);
  render();
}

function startOutbound(ship) {
  ship.phase = "outbound";
  ship.from = "london";
  ship.to = ship.route;
  ship.timer = 0;
  ship.tripSeconds = routeSeconds(ship.route, ship.type);
  ship.progress = 0;
}

function startReturn(ship) {
  ship.phase = "returning";
  ship.from = ship.route;
  ship.to = "london";
  ship.timer = 0;
  ship.tripSeconds = routeSeconds(ship.route, ship.type);
  ship.progress = 0;
}

function finishTrip(ship) {
  if (ship.phase === "outbound") {
    startReturn(ship);
    addLog(`${shipTypes[ship.type].name} loaded cargo at ${ports[ship.route].name}.`);
  } else if (ship.phase === "returning") {
    const base = expectedProfit(ship.route, ship.type);
    const riskHit = Math.random() < 0.08 * ports[ship.route].risk;
    const profit = riskHit ? Math.round(base * rand(0.35, 0.75)) : Math.round(base * rand(0.88, 1.18));
    state.cash += profit;
    state.lastIncome += profit;
    ship.lifetimeProfit += profit;
    addLog(`${shipTypes[ship.type].name} returned from ${ports[ship.route].name}. Profit: ${money(profit)}.${riskHit ? " Pirates, taxes, or weather cut into the margin." : ""}`);
    startOutbound(ship);
  }
}

function upgrade(kind) {
  const costs = { ad: 1400 * state.adLevel, logistics: 1800 * state.logisticsLevel, monopoly: 3000 * (state.monopolyLevel + 1) };
  const cost = costs[kind];
  if (state.cash < cost) return toast("The treasury says no.");
  state.cash -= cost;
  if (kind === "ad") { state.adLevel++; addLog("New advertisements promise prosperity, respectability, and discounted pepper."); }
  if (kind === "logistics") { state.logisticsLevel++; addLog("Better docks, ledgers, and clerks improved shipping efficiency."); }
  if (kind === "monopoly") { state.monopolyLevel++; addLog("The company secured another monopoly privilege. Competition weeps."); }
  render();
}

function takeLoan() {
  state.cash += 2500;
  state.debt += 3000;
  addLog("The company issued bonds. Future problems have been converted into present cash.");
  render();
}

function repayDebt() {
  const pay = Math.min(state.cash, state.debt, 1000);
  if (pay <= 0) return toast("No debt to repay.");
  state.cash -= pay;
  state.debt -= pay;
  addLog(`Repaid ${money(pay)} in company debt.`);
  render();
}

function tick(dt) {
  if (state.paused) return;
  state.lastIncome = 0;
  state.ships.forEach(ship => {
    if (!ship.route || ship.phase === "idle") return;
    ship.timer += dt;
    ship.progress = Math.min(1, ship.timer / ship.tripSeconds);
    const a = ports[ship.from], b = ports[ship.to];
    ship.x = a.x + (b.x - a.x) * ship.progress;
    ship.y = a.y + (b.y - a.y) * ship.progress;
    if (ship.progress >= 1) finishTrip(ship);
  });
  state.cash -= state.debt > 0 ? (state.debt * 0.00002 * dt) : 0;
  renderLight();
}

let monthTimer = 0;
function monthTick(dt) {
  if (state.paused) return;
  monthTimer += dt;
  if (monthTimer >= 30) {
    monthTimer = 0;
    state.month++;
    const interest = Math.round(state.debt * 0.015);
    if (interest > 0) { state.cash -= interest; addLog(`Monthly bond interest paid: ${money(interest)}.`); }
    document.getElementById("slogan").textContent = slogans[Math.floor(Math.random() * slogans.length)];
    render();
  }
}

function renderMap() {
  mapEl.innerHTML = "";
  Object.entries(ports).forEach(([id, p]) => {
    const btn = document.createElement("button");
    btn.className = `port ${id === state.selectedPort ? "selected" : ""}`;
    btn.style.left = `${p.x}%`; btn.style.top = `${p.y}%`;
    btn.title = p.name;
    btn.addEventListener("click", () => { state.selectedPort = id; render(); });
    mapEl.appendChild(btn);
  });
  state.ships.forEach(ship => {
    const token = document.createElement("div");
    token.className = "ship-token";
    token.style.left = `${ship.x}%`; token.style.top = `${ship.y}%`;
    token.innerHTML = `${shipTypes[ship.type].icon}<span class="bubble">#${ship.id}</span>`;
    mapEl.appendChild(token);
  });
}

function renderPanels() {
  const p = selectedPort();
  document.getElementById("selectedPortName").textContent = p.name;
  document.getElementById("selectedPortDesc").textContent = p.desc;
  document.getElementById("portDetails").innerHTML = [
    ["Owner", p.owner], ["Market", p.market], ["Route Profit", p.profit ? money(p.profit) : "Home market"], ["Risk", `${Math.round(p.risk * 100)}%`]
  ].map(([a,b]) => `<div class="detail-row"><strong>${a}</strong><span>${b}</span></div>`).join("");

  const active = state.ships.filter(s => s.route).length;
  const idle = state.ships.length - active;
  const minuteEstimate = state.ships.reduce((sum, s) => s.route ? sum + expectedProfit(s.route, s.type) * (60 / (routeSeconds(s.route, s.type) * 2)) : sum, 0);
  document.getElementById("companyDetails").innerHTML = [
    ["Cash", money(state.cash)], ["Debt", money(state.debt)], ["Month", state.month], ["Fleet", `${state.ships.length} ships`], ["Idle Ships", idle], ["Projected Income", `${money(minuteEstimate)}/min`], ["Advertising", `Level ${state.adLevel}`], ["Logistics", `Level ${state.logisticsLevel}`], ["Monopoly", `Level ${state.monopolyLevel}`]
  ].map(([a,b]) => `<div class="detail-row"><strong>${a}</strong><span>${b}</span></div>`).join("");

  document.getElementById("cashLabel").textContent = money(state.cash);
  document.getElementById("shipLabel").textContent = `${state.ships.length} Ship${state.ships.length === 1 ? "" : "s"}`;
  document.getElementById("incomeLabel").textContent = `${money(minuteEstimate)}/min`;
}

function renderActions() {
  const p = selectedPort();
  document.getElementById("actionHint").textContent = p.name === "London"
    ? "Build ships in London, then select an overseas port to assign automatic routes."
    : `Selected ${p.name}. Assign ships here and they will sail London ↔ ${p.name} forever.`;
  const buttons = [];
  Object.entries(shipTypes).forEach(([id, s]) => buttons.push(btn(`Build ${s.name} (${money(s.cost)})`, "build", () => buildShip(id), state.cash < s.cost)));
  if (state.selectedPort !== "london") {
    buttons.push(btn(`Assign 1 Ship to ${p.name}`, "route", () => assignRoute(state.selectedPort), !state.ships.some(s => !s.route || s.phase === "idle")));
    buttons.push(btn(`Assign All Idle to ${p.name}`, "route", () => assignAllIdle(state.selectedPort), !state.ships.some(s => !s.route || s.phase === "idle")));
  }
  buttons.push(btn("Take Bond Loan (+£2,500)", "ad", takeLoan));
  buttons.push(btn("Repay Debt (£1,000)", "danger", repayDebt, state.debt <= 0 || state.cash <= 0));
  actionsEl.innerHTML = ""; buttons.forEach(b => actionsEl.appendChild(b));
}

function btn(text, cls, fn, disabled=false) {
  const b = document.createElement("button");
  b.className = `action-btn ${cls}`; b.textContent = text; b.disabled = disabled; b.addEventListener("click", fn); return b;
}

function renderLists() {
  fleetList.innerHTML = state.ships.length ? state.ships.map(s => {
    const route = s.route ? ports[s.route].name : "Unassigned";
    const status = s.route ? `${s.phase === "outbound" ? "To" : "Returning from"} ${route}` : "Idle in London";
    return `<div class="item"><strong>#${s.id} ${shipTypes[s.type].name}</strong><small>${status}</small><small>Lifetime profit: ${money(s.lifetimeProfit)}</small><div class="progress"><div style="width:${Math.round(s.progress*100)}%"></div></div></div>`;
  }).join("") : `<div class="item"><strong>No ships yet.</strong><small>Build a fleet and let the routes run automatically.</small></div>`;

  upgradeList.innerHTML = `
    <div class="item"><strong>Advertising Campaign</strong><small>More demand, better margins. Current level: ${state.adLevel}</small><button class="action-btn ad" onclick="upgrade('ad')">Upgrade (${money(1400 * state.adLevel)})</button></div>
    <div class="item"><strong>Logistics Office</strong><small>Faster paperwork and port handling. Current level: ${state.logisticsLevel}</small><button class="action-btn build" onclick="upgrade('logistics')">Upgrade (${money(1800 * state.logisticsLevel)})</button></div>
    <div class="item"><strong>Monopoly Charter</strong><small>Higher profit through legal privilege. Current level: ${state.monopolyLevel}</small><button class="action-btn danger" onclick="upgrade('monopoly')">Purchase (${money(3000 * (state.monopolyLevel + 1))})</button></div>`;

  adOffice.innerHTML = `
    <div class="item"><strong>Current Slogan</strong><small>${document.getElementById("slogan").textContent}</small></div>
    <div class="item"><strong>Best Route</strong><small>${bestRouteText()}</small></div>
    <div class="item"><strong>Rule of the Game</strong><small>You choose ships and destinations. Ships automatically sail, return, sell goods, and repeat.</small></div>`;

  logEl.innerHTML = state.log.map(x => `<div class="log-entry">${x}</div>`).join("");
}

function bestRouteText() {
  const sample = Object.keys(ports).filter(id => id !== "london").map(id => [ports[id].name, expectedProfit(id, "merchantman")]);
  sample.sort((a,b) => b[1]-a[1]);
  return `${sample[0][0]} is currently the strongest Merchantman route at about ${money(sample[0][1])} per completed loop.`;
}

function render() { renderMap(); renderPanels(); renderActions(); renderLists(); }
function renderLight() { renderMap(); renderPanels(); renderLists(); }

pauseBtn.addEventListener("click", () => { state.paused = !state.paused; pauseBtn.textContent = state.paused ? "Resume" : "Pause"; addLog(state.paused ? "The board paused operations." : "Operations resumed."); render(); });

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  tick(dt);
  monthTick(dt);
  requestAnimationFrame(loop);
}

buildShip("merchantman");
state.selectedPort = "calicut";
render();
requestAnimationFrame(loop);
