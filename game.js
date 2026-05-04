const ports = {
  london: { name: "London", x: 11.4, y: 20.0, owner: "England", market: "Home Office", desc: "Home office, shipyard, and final market.", risk: 1.0, profit: 0 },
  lisbon: { name: "Lisbon", x: 8.4, y: 35.8, owner: "Portugal", market: "European Rival Hub", desc: "A nearby market. Low risk, low reward.", risk: 1.05, profit: 120 },
  cape: { name: "Cape Town", x: 25.0, y: 90.2, owner: "Local Ruler", market: "Cape Resupply", desc: "The long Atlantic route around Africa. Slow but useful.", risk: 1.22, profit: 270 },
  goa: { name: "Goa", x: 60.8, y: 53.6, owner: "Portugal", market: "Pepper and Cotton", desc: "A fortified Portuguese port on India’s western coast.", risk: 1.32, profit: 540 },
  calicut: { name: "Calicut", x: 64.8, y: 63.7, owner: "Local Ruler", market: "Pepper Coast", desc: "The classic pepper run. Good money, good danger.", risk: 1.28, profit: 650 },
  ceylon: { name: "Ceylon", x: 68.8, y: 70.8, owner: "Local Ruler", market: "Cinnamon", desc: "Cinnamon, monsoons, and a useful crossing point.", risk: 1.35, profit: 720 },
  bengal: { name: "Bengal", x: 75.6, y: 49.5, owner: "Local Ruler", market: "Textiles and Opium", desc: "A rich textile region with stronger long-run profits.", risk: 1.4, profit: 860 },
  malacca: { name: "Malacca", x: 82.4, y: 70.2, owner: "Local Ruler", market: "Spice Chokepoint", desc: "A narrow trade gate where fortunes are made.", risk: 1.48, profit: 1010 },
  batavia: { name: "Batavia", x: 88.3, y: 80.0, owner: "Dutch VOC", market: "Nutmeg Monopoly", desc: "Dutch competition is fierce, but spices sell themselves.", risk: 1.6, profit: 1190 },
  canton: { name: "Canton", x: 91.2, y: 50.2, owner: "Qing China", market: "Tea, Silk, Porcelain", desc: "South China coast: tea, silk, porcelain, taxes, and huge profit.", risk: 1.7, profit: 1340 }
};

const shipTypes = {
  sloop: { name: "Sloop Fleet", cost: 900, speed: 1.22, cargo: 1.0, upkeep: 8 },
  merchantman: { name: "Merchantman Fleet", cost: 2400, speed: 0.92, cargo: 2.5, upkeep: 17 },
  indiaman: { name: "East Indiaman Fleet", cost: 5600, speed: 0.68, cargo: 5.6, upkeep: 45 },
  clipper: { name: "Tea Clipper Fleet", cost: 8200, speed: 1.42, cargo: 3.2, upkeep: 40 }
};

const namePool = ["Albion", "Red Lion", "Charter", "Crown", "St. George", "Mercury", "Golden Ledger", "Admiralty", "Prospect", "Royal Pepper"];

const routes = {
  lisbon: ["london", "lisbon"],
  cape: ["london", "lisbon", "cape"],
  goa: ["london", "lisbon", "cape", "goa"],
  calicut: ["london", "lisbon", "cape", "goa", "calicut"],
  ceylon: ["london", "lisbon", "cape", "goa", "calicut", "ceylon"],
  bengal: ["london", "lisbon", "cape", "goa", "bengal"],
  malacca: ["london", "lisbon", "cape", "goa", "calicut", "ceylon", "malacca"],
  batavia: ["london", "lisbon", "cape", "goa", "calicut", "ceylon", "malacca", "batavia"],
  canton: ["london", "lisbon", "cape", "goa", "calicut", "ceylon", "malacca", "canton"]
};

const rivals = [
  { name: "Dutch VOC", className: "dutch", cash: 9000, power: 1.08, routes: ["batavia", "malacca", "ceylon"], fleets: [] },
  { name: "French Company", className: "french", cash: 6500, power: 0.92, routes: ["cape", "bengal", "canton"], fleets: [] },
  { name: "Portuguese Crown Traders", className: "portuguese", cash: 7200, power: 0.96, routes: ["goa", "calicut", "lisbon"], fleets: [] }
];

const slogans = [
  "Pepper today. Profit tomorrow.",
  "Why conquer when you can invoice?",
  "Tea tastes better with dividends.",
  "The sun never sets on quarterly growth.",
  "A ship in harbor earns nothing.",
  "Respectable commerce. Questionable margins.",
  "Buy low in Calicut. Sell high in London.",
  "Civilization advances one invoice at a time."
];

let state = {
  cash: 10000,
  debt: 0,
  month: 1,
  selectedPort: "calicut",
  selectedFleet: null,
  paused: false,
  adLevel: 1,
  logisticsLevel: 1,
  monopolyLevel: 0,
  nextFleetId: 1,
  fleets: [],
  log: ["The board demands growth. Build a fleet, choose a port, and assign an automatic route."],
  lastIncome: 0,
  hotPort: null,
  hotTimer: 0
};

const mapEl = document.getElementById("map");
const actionsEl = document.getElementById("actions");
const fleetList = document.getElementById("fleetList");
const upgradeList = document.getElementById("upgradeList");
const rivalList = document.getElementById("rivalList");
const logEl = document.getElementById("log");
const toastEl = document.getElementById("toast");
const pauseBtn = document.getElementById("pauseBtn");

function money(n) { return `£${Math.round(n).toLocaleString()}`; }
function selectedPort() { return ports[state.selectedPort]; }
function rand(min, max) { return Math.random() * (max - min) + min; }
function addLog(text) { state.log.push(text); if (state.log.length > 100) state.log.shift(); }
function toast(text) { toastEl.textContent = text; toastEl.classList.remove("hidden"); setTimeout(() => toastEl.classList.add("hidden"), 2200); }
function activeFleets() { return state.fleets.filter(f => f.status !== "idle" && !f.paused).length; }

function routeFor(portId, reverse = false) {
  const base = routes[portId] || ["london", portId];
  return reverse ? [...base].reverse() : [...base];
}

function pathPoints(portId, reverse = false) {
  return routeFor(portId, reverse).map(id => ports[id]);
}

function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
  return total;
}

function pointAlong(points, t) {
  if (points.length === 1) return { x: points[0].x, y: points[0].y, angle: 0 };
  const total = pathLength(points);
  let target = total * Math.max(0, Math.min(1, t));
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (target <= seg || i === points.length - 1) {
      const u = seg === 0 ? 0 : target / seg;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, angle: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
    }
    target -= seg;
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

function tripSeconds(portId, type) {
  const points = pathPoints(portId);
  const base = pathLength(points) * 0.52;
  const speed = shipTypes[type].speed * (1 + state.logisticsLevel * 0.035);
  return Math.max(7, base / speed);
}

function rivalPressure(portId) {
  let pressure = 0;
  rivals.forEach(r => {
    r.fleets.forEach(f => { if (f.route === portId) pressure += 0.035 * r.power; });
  });
  return Math.min(0.32, pressure);
}

function expectedProfit(portId, type) {
  if (portId === "london") return 0;
  const port = ports[portId];
  const ship = shipTypes[type];
  const adBonus = 1 + state.adLevel * 0.08;
  const logisticsBonus = 1 + state.logisticsLevel * 0.05;
  const monopolyBonus = 1 + state.monopolyLevel * 0.12;
  const hotBonus = state.hotPort === portId && state.hotTimer > 0 ? 1.45 : 1;
  const competitionPenalty = 1 - rivalPressure(portId);
  const gross = port.profit * ship.cargo * adBonus * logisticsBonus * monopolyBonus * hotBonus * competitionPenalty;
  const cost = ship.upkeep * port.risk * 3;
  return Math.max(20, Math.round(gross - cost));
}

function fleetName(type) {
  const base = shipTypes[type].name;
  const prefix = namePool[(state.nextFleetId - 1) % namePool.length];
  return `${prefix} ${base}`;
}

function buildFleet(type) {
  const def = shipTypes[type];
  if (state.cash < def.cost) return toast("Not enough cash.");
  state.cash -= def.cost;
  const fleet = {
    id: state.nextFleetId++,
    name: fleetName(type),
    type,
    route: null,
    phase: "idle",
    status: "idle",
    progress: 0,
    timer: 0,
    duration: 1,
    x: ports.london.x,
    y: ports.london.y,
    angle: 0,
    lifetimeProfit: 0,
    stopAfterReturn: false,
    paused: false
  };
  state.fleets.push(fleet);
  state.selectedFleet = fleet.id;
  addLog(`Built ${fleet.name}. Investors describe it as visionary.`);
  render();
}

function getFleet(id = state.selectedFleet) { return state.fleets.find(f => f.id === id); }

function assignFleetToSelected() {
  const fleet = getFleet();
  if (!fleet) return toast("Select a fleet in the ledger first.");
  if (state.selectedPort === "london") return toast("London is home. Pick an overseas port.");
  if (fleet.status !== "idle") return toast("That fleet is already sailing. Stop it after return or recall it first.");
  beginOutbound(fleet, state.selectedPort);
  addLog(`${fleet.name} assigned to London ↔ ${ports[state.selectedPort].name}.`);
  render();
}

function assignAllIdle() {
  if (state.selectedPort === "london") return toast("Pick an overseas port first.");
  let count = 0;
  state.fleets.forEach(f => {
    if (f.status === "idle") { beginOutbound(f, state.selectedPort); count++; }
  });
  if (!count) return toast("No idle fleets to assign.");
  addLog(`${count} idle fleet${count === 1 ? "" : "s"} assigned to ${ports[state.selectedPort].name}.`);
  render();
}

function beginOutbound(fleet, portId) {
  fleet.route = portId;
  fleet.phase = "outbound";
  fleet.status = "sailing";
  fleet.progress = 0;
  fleet.timer = 0;
  fleet.duration = tripSeconds(portId, fleet.type);
  fleet.paused = false;
  fleet.stopAfterReturn = false;
  updateFleetPosition(fleet);
}

function beginReturn(fleet) {
  fleet.phase = "returning";
  fleet.status = "sailing";
  fleet.progress = 0;
  fleet.timer = 0;
  fleet.duration = tripSeconds(fleet.route, fleet.type);
  updateFleetPosition(fleet);
}

function finishFleetLeg(fleet) {
  if (fleet.phase === "outbound") {
    beginReturn(fleet);
    addLog(`${fleet.name} loaded cargo at ${ports[fleet.route].name}.`);
    return;
  }
  const base = expectedProfit(fleet.route, fleet.type);
  const riskHit = Math.random() < 0.065 * ports[fleet.route].risk;
  const profit = riskHit ? Math.round(base * rand(0.38, 0.72)) : Math.round(base * rand(0.9, 1.18));
  state.cash += profit;
  state.lastIncome += profit;
  fleet.lifetimeProfit += profit;
  addLog(`${fleet.name} returned from ${ports[fleet.route].name}. Profit: ${money(profit)}.${riskHit ? " Pirates, taxes, or weather cut into the margin." : ""}`);
  if (fleet.stopAfterReturn) {
    fleet.phase = "idle";
    fleet.status = "idle";
    fleet.route = null;
    fleet.progress = 0;
    fleet.timer = 0;
    fleet.x = ports.london.x;
    fleet.y = ports.london.y;
    addLog(`${fleet.name} stopped safely in London.`);
  } else {
    beginOutbound(fleet, fleet.route);
  }
}

function updateFleetPosition(fleet) {
  if (fleet.status === "idle" || !fleet.route) {
    fleet.x = ports.london.x; fleet.y = ports.london.y; fleet.angle = 0; return;
  }
  const reverse = fleet.phase === "returning";
  const p = pointAlong(pathPoints(fleet.route, reverse), fleet.progress);
  fleet.x = p.x; fleet.y = p.y; fleet.angle = p.angle;
}

function stopAfterReturn(id) {
  const fleet = getFleet(id);
  if (!fleet || fleet.status === "idle") return;
  fleet.stopAfterReturn = true;
  addLog(`${fleet.name} will stop after its next return to London.`);
  render();
}

function recallFleet(id) {
  const fleet = getFleet(id);
  if (!fleet || fleet.status === "idle" || !fleet.route) return;
  if (fleet.phase === "returning") return toast("That fleet is already returning.");
  fleet.phase = "returning";
  fleet.timer = (1 - fleet.progress) * fleet.duration;
  fleet.progress = Math.min(1, fleet.timer / fleet.duration);
  fleet.stopAfterReturn = true;
  addLog(`${fleet.name} recalled. It will follow the route back to London.`);
  render();
}

function toggleFleetPause(id) {
  const fleet = getFleet(id);
  if (!fleet || fleet.status === "idle") return;
  fleet.paused = !fleet.paused;
  addLog(`${fleet.name} ${fleet.paused ? "anchored temporarily" : "resumed sailing"}.`);
  render();
}

function takeLoan() {
  state.cash += 2500;
  state.debt += 3000;
  addLog("The company issued bonds. Future problems became present cash.");
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

function upgrade(kind) {
  const costs = { ad: 1450 * state.adLevel, logistics: 1900 * state.logisticsLevel, monopoly: 3300 * (state.monopolyLevel + 1) };
  const cost = Math.round(costs[kind]);
  if (state.cash < cost) return toast("The treasury says no.");
  state.cash -= cost;
  if (kind === "ad") { state.adLevel++; addLog("New advertisements promise prosperity, respectability, and discounted pepper."); }
  if (kind === "logistics") { state.logisticsLevel++; addLog("Better docks, ledgers, and clerks made routes faster."); }
  if (kind === "monopoly") { state.monopolyLevel++; addLog("Another monopoly privilege secured. Competition complains in writing."); }
  render();
}

function initRivals() {
  rivals.forEach(rival => {
    for (let i = 0; i < 2; i++) {
      const route = rival.routes[i % rival.routes.length];
      rival.fleets.push({
        route,
        type: i === 0 ? "merchantman" : "sloop",
        progress: Math.random(),
        phase: Math.random() > 0.5 ? "outbound" : "returning",
        timer: 0,
        duration: 35 + Math.random() * 25,
        x: ports.london.x,
        y: ports.london.y,
        angle: 0
      });
    }
  });
}

function updateRivals(dt) {
  rivals.forEach(rival => {
    rival.fleets.forEach(f => {
      f.timer += dt;
      const speedMod = rival.power * (f.type === "sloop" ? 1.18 : 0.9);
      f.progress += dt / f.duration * speedMod;
      if (f.progress >= 1) {
        if (f.phase === "outbound") {
          f.phase = "returning";
          f.progress = 0;
        } else {
          const earn = Math.round((ports[f.route].profit || 100) * rival.power * rand(.55, .9));
          rival.cash += earn;
          if (Math.random() < 0.22) f.route = rival.routes[Math.floor(Math.random() * rival.routes.length)];
          f.phase = "outbound";
          f.progress = 0;
        }
      }
      const reverse = f.phase === "returning";
      const p = pointAlong(pathPoints(f.route, reverse), f.progress);
      f.x = p.x; f.y = p.y; f.angle = p.angle;
    });
  });
}

function createRouteOverlay() {
  const svgNS = "http://www.w3.org/2000/svg";
  const border = document.createElementNS(svgNS, "svg");
  border.setAttribute("viewBox", "0 0 100 100");
  border.classList.add("country-borders");
  const borderPaths = [
    "M7 24 C12 22 18 25 23 28 C28 31 32 34 38 36",
    "M22 37 C26 46 28 58 27 70 C26 80 24 86 25 92",
    "M43 31 C48 36 51 43 55 50 C58 56 61 57 64 55",
    "M59 46 C62 51 64 58 65 64 C66 69 68 72 70 73",
    "M72 45 C76 50 78 59 80 66 C82 72 86 75 89 79",
    "M84 34 C88 38 91 43 92 50 C94 55 96 60 97 66"
  ];
  borderPaths.forEach(d => {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    border.appendChild(path);
  });
  mapEl.appendChild(border);

  const sea = document.createElementNS(svgNS, "svg");
  sea.setAttribute("viewBox", "0 0 100 100");
  sea.classList.add("sea-route");
  const seen = new Set();
  Object.values(routes).forEach(route => {
    const key = route.join("-");
    if (seen.has(key)) return;
    seen.add(key);
    const d = route.map((id, idx) => `${idx === 0 ? "M" : "L"}${ports[id].x} ${ports[id].y}`).join(" ");
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    sea.appendChild(path);
  });
  mapEl.appendChild(sea);
}

function renderStaticMap() {
  mapEl.innerHTML = "";
  createRouteOverlay();
  Object.entries(ports).forEach(([id, p]) => {
    const btn = document.createElement("button");
    btn.className = `port ${id === state.selectedPort ? "selected" : ""}`;
    btn.style.left = `${p.x}%`; btn.style.top = `${p.y}%`;
    btn.title = p.name;
    btn.addEventListener("click", () => { state.selectedPort = id; render(); });
    mapEl.appendChild(btn);

    const label = document.createElement("div");
    label.className = "port-label";
    label.style.left = `${p.x}%`; label.style.top = `${p.y}%`;
    label.textContent = p.name;
    mapEl.appendChild(label);
  });
  renderTokens();
}

function shipHTML(cls, name) {
  return `<div class="ship-model ${cls}"><span class="mast"></span><span class="sail-main"></span><span class="sail-fore"></span><span class="hull"></span><span class="flag"></span></div><span class="fleet-name-tag">${name}</span>`;
}

function renderTokens() {
  mapEl.querySelectorAll(".token-wrap").forEach(el => el.remove());
  state.fleets.forEach(fleet => {
    const wrap = document.createElement("div");
    wrap.className = "token-wrap";
    wrap.style.left = `${fleet.x}%`;
    wrap.style.top = `${fleet.y}%`;
    wrap.style.transform = `translate(-50%, -50%) rotate(${fleet.angle * 0.08}deg)`;
    wrap.innerHTML = shipHTML("player", fleet.name.split(" ").slice(0, 2).join(" "));
    mapEl.appendChild(wrap);
  });
  rivals.forEach(rival => {
    rival.fleets.forEach(f => {
      const wrap = document.createElement("div");
      wrap.className = "token-wrap";
      wrap.style.left = `${f.x}%`;
      wrap.style.top = `${f.y}%`;
      wrap.style.opacity = ".78";
      wrap.innerHTML = shipHTML(`rival ${rival.className}`, rival.name.split(" ")[0]);
      mapEl.appendChild(wrap);
    });
  });
}

function renderPanels() {
  const p = selectedPort();
  document.getElementById("selectedPortName").textContent = p.name;
  document.getElementById("selectedPortDesc").textContent = p.desc;
  document.getElementById("portDetails").innerHTML = [
    ["Owner", p.owner],
    ["Market", p.market],
    ["Base Route Profit", p.profit ? money(p.profit) : "Home market"],
    ["Risk", `${Math.round(p.risk * 100)}%`],
    ["Rival Pressure", `${Math.round(rivalPressure(state.selectedPort) * 100)}%`],
    ["Current Boom", state.hotPort === state.selectedPort && state.hotTimer > 0 ? `${Math.ceil(state.hotTimer)}s left` : "None"]
  ].map(([a,b]) => `<div class="detail-row"><strong>${a}</strong><span>${b}</span></div>`).join("");

  const minuteEstimate = state.fleets.reduce((sum, f) => {
    if (!f.route) return sum;
    const roundTrip = tripSeconds(f.route, f.type) * 2;
    return sum + expectedProfit(f.route, f.type) * (60 / roundTrip);
  }, 0);
  document.getElementById("companyDetails").innerHTML = [
    ["Cash", money(state.cash)],
    ["Debt", money(state.debt)],
    ["Month", state.month],
    ["Selected Fleet", getFleet() ? getFleet().name : "None"],
    ["Ad Office", `Level ${state.adLevel}`],
    ["Logistics", `Level ${state.logisticsLevel}`],
    ["Monopoly", `Level ${state.monopolyLevel}`]
  ].map(([a,b]) => `<div class="detail-row"><strong>${a}</strong><span>${b}</span></div>`).join("");

  document.getElementById("cashLabel").textContent = money(state.cash);
  document.getElementById("fleetLabel").textContent = `${state.fleets.length} Fleet${state.fleets.length === 1 ? "" : "s"}`;
  document.getElementById("incomeLabel").textContent = `${money(minuteEstimate)}/min`;
}

function renderActions() {
  const p = selectedPort();
  const fleet = getFleet();
  document.getElementById("actionHint").textContent = p.name === "London"
    ? "London is the shipyard. Build fleets here, then select an overseas port."
    : fleet ? `Selected ${fleet.name}. Assign it to London ↔ ${p.name}, or assign all idle fleets.` : `Selected ${p.name}. Select or build a fleet first.`;

  const buttons = [];
  Object.entries(shipTypes).forEach(([id, s]) => buttons.push(btn(`Build ${s.name} (${money(s.cost)})`, "build", () => buildFleet(id), state.cash < s.cost)));
  if (state.selectedPort !== "london") {
    buttons.push(btn(`Assign Selected Fleet to ${p.name}`, "route", assignFleetToSelected, !fleet || fleet.status !== "idle"));
    buttons.push(btn(`Assign All Idle to ${p.name}`, "route", assignAllIdle, !state.fleets.some(f => f.status === "idle")));
  }
  buttons.push(btn("Take Bond Loan (+£2,500)", "ad", takeLoan));
  buttons.push(btn("Repay Debt (£1,000)", "danger", repayDebt, state.debt <= 0 || state.cash <= 0));
  actionsEl.innerHTML = ""; buttons.forEach(b => actionsEl.appendChild(b));
}

function btn(text, cls, fn, disabled=false) {
  const b = document.createElement("button");
  b.className = `action-btn ${cls}`;
  b.textContent = text;
  b.disabled = disabled;
  b.addEventListener("click", fn);
  return b;
}

function renderFleets() {
  if (!state.fleets.length) {
    fleetList.innerHTML = `<div class="item"><strong>No fleets yet.</strong><small>Build one from Capitalist Actions.</small></div>`;
    return;
  }
  fleetList.innerHTML = state.fleets.map(f => {
    const routeText = f.route ? `London ↔ ${ports[f.route].name}` : "Unassigned in London";
    const statusText = f.paused ? "Anchored" : f.status === "idle" ? "Idle" : f.phase === "outbound" ? "Outbound" : "Returning";
    const eta = f.status === "idle" ? "Ready" : `${Math.max(0, Math.ceil(f.duration - f.timer))}s to next port`;
    const profit = f.route ? expectedProfit(f.route, f.type) : 0;
    return `<div class="item ${state.selectedFleet === f.id ? "selected" : ""}">
      <strong>${f.name}</strong>
      <small>${shipTypes[f.type].name} · ${routeText}</small>
      <small>Status: ${statusText} · ${eta}</small>
      <small>Expected return profit: ${profit ? money(profit) : "None"} · Lifetime: ${money(f.lifetimeProfit)}</small>
      <div class="progress"><div style="width:${Math.round(f.progress * 100)}%"></div></div>
      <div class="item-actions">
        <button class="mini-btn" onclick="selectFleet(${f.id})">Select</button>
        <button class="mini-btn" onclick="toggleFleetPause(${f.id})" ${f.status === "idle" ? "disabled" : ""}>${f.paused ? "Resume" : "Anchor"}</button>
        <button class="mini-btn" onclick="stopAfterReturn(${f.id})" ${f.status === "idle" ? "disabled" : ""}>Stop After Return</button>
        <button class="mini-btn" onclick="recallFleet(${f.id})" ${f.status === "idle" ? "disabled" : ""}>Recall</button>
      </div>
    </div>`;
  }).join("");
}

window.selectFleet = function(id) { state.selectedFleet = id; render(); };
window.toggleFleetPause = toggleFleetPause;
window.stopAfterReturn = stopAfterReturn;
window.recallFleet = recallFleet;

function renderUpgrades() {
  const adCost = Math.round(1450 * state.adLevel);
  const logisticsCost = Math.round(1900 * state.logisticsLevel);
  const monopolyCost = Math.round(3300 * (state.monopolyLevel + 1));
  const rows = [
    ["Advertising Office", `Level ${state.adLevel}. Higher London demand and better margins.`, adCost, () => upgrade("ad")],
    ["Route Logistics", `Level ${state.logisticsLevel}. Fleets move faster and unload better.`, logisticsCost, () => upgrade("logistics")],
    ["Monopoly Privileges", `Level ${state.monopolyLevel}. Larger profit cut on every route.`, monopolyCost, () => upgrade("monopoly")]
  ];
  upgradeList.innerHTML = rows.map(([title, desc, cost], i) => `<div class="item"><strong>${title}</strong><small>${desc}</small><small>Cost: ${money(cost)}</small><div class="item-actions"><button class="mini-btn" onclick="buyUpgrade(${i})">Buy</button></div></div>`).join("");
  window.buyUpgrade = i => rows[i][3]();
}

function renderRivals() {
  rivalList.innerHTML = rivals.map(r => {
    const routesUsed = [...new Set(r.fleets.map(f => ports[f.route].name))].join(", ");
    return `<div class="item"><strong>${r.name}</strong><small>Cash: ${money(r.cash)} · Fleets: ${r.fleets.length}</small><small>Active routes: ${routesUsed}</small><small>They reduce profits on ports they crowd.</small></div>`;
  }).join("");
}

function renderLog() {
  logEl.innerHTML = state.log.map(entry => `<div class="log-entry">${entry}</div>`).join("");
}

function render() {
  renderStaticMap();
  renderPanels();
  renderActions();
  renderFleets();
  renderUpgrades();
  renderRivals();
  renderLog();
  pauseBtn.textContent = state.paused ? "Resume Time" : "Pause Time";
  pauseBtn.classList.toggle("paused", state.paused);
}

function lightRender() {
  renderTokens();
  renderPanels();
  renderFleets();
  renderRivals();
}

function triggerMarketBoom() {
  const choices = Object.keys(ports).filter(p => p !== "london");
  state.hotPort = choices[Math.floor(Math.random() * choices.length)];
  state.hotTimer = 45;
  addLog(`Advertisement boom: ${ports[state.hotPort].market} goods are fashionable in London for 45 seconds.`);
  document.getElementById("slogan").textContent = `${ports[state.hotPort].name} is hot. Buy the dream, sell the cargo.`;
}

let monthTimer = 0;
function updateCompanyClock(dt) {
  monthTimer += dt;
  if (state.hotTimer > 0) state.hotTimer = Math.max(0, state.hotTimer - dt);
  if (monthTimer >= 30) {
    monthTimer = 0;
    state.month++;
    const interest = Math.round(state.debt * 0.015);
    if (interest > 0) { state.cash -= interest; addLog(`Monthly bond interest paid: ${money(interest)}.`); }
    if (Math.random() < 0.58) triggerMarketBoom();
    else document.getElementById("slogan").textContent = slogans[Math.floor(Math.random() * slogans.length)];
    renderLog();
  }
}

function tick(dt) {
  if (state.paused) return;
  state.lastIncome = 0;
  state.fleets.forEach(fleet => {
    if (fleet.status === "idle" || fleet.paused || !fleet.route) return;
    fleet.timer += dt;
    fleet.progress = Math.min(1, fleet.timer / fleet.duration);
    updateFleetPosition(fleet);
    if (fleet.progress >= 1) finishFleetLeg(fleet);
  });
  updateRivals(dt);
  state.cash -= state.debt > 0 ? (state.debt * 0.000015 * dt) : 0;
  updateCompanyClock(dt);
}

let last = performance.now();
let lightTimer = 0;
function loop(now) {
  const dt = Math.min(0.08, (now - last) / 1000);
  last = now;
  tick(dt);
  lightTimer += dt;
  if (lightTimer >= 0.18) { lightTimer = 0; lightRender(); }
  requestAnimationFrame(loop);
}

pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
  render();
});

initRivals();
render();
requestAnimationFrame(loop);
