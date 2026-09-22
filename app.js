// ---- Settings -------------------------------------------------------------
const RICKROLL_CHANCE = 1 / 50;     // 2% of scans
const RICKROLL_COOLDOWN = 15;       // no rickroll within this many scans of the last one
const SCAN_KEY_GAP_MS = 100;        // scanners type fast; slower keys = a human

// ---- Seeded random --------------------------------------------------------
function hashString(s) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// ---- Nonsense store items -------------------------------------------------
const BRANDS = [
  "Grandma's", "Captain Crunkle's", "Mr. Wobbly's", "Aunt Gertie's", "Blorpco",
  "Snazzle", "Farmer Fizz's", "Professor Plum's", "Dr. Bonkers'", "Happy Hippo",
  "Great Value-ish", "Sir Noodleton's", "Moonbeam Farms", "Zippity", "Kinda Kraft",
  "Uncle Wiggles'", "Totally Organic", "Barnaby's", "Sparkle & Sons", "Ol' Rusty's",
];
const ADJECTIVES = [
  "Extra-Crunchy", "Sparkly", "Low-Fat", "Mega", "Fun-Size", "Jumbo", "Frosted",
  "Wiggly", "Glow-in-the-Dark", "Double-Stuffed", "Invisible", "Family-Pack",
  "Super-Spicy", "Squishy", "Fizzy", "Gluten-Free", "Rainbow", "Turbo", "Tiny",
  "Unsalted", "Deluxe", "Bouncy", "Whole-Grain", "Honey-Glazed", "Sugar-Free",
];
const FLAVORS = [
  "", "", "", "Banana", "Pickle", "Bubblegum", "Chocolate", "Cheese", "Blueberry",
  "Marshmallow", "Pizza", "Strawberry", "Broccoli", "Cinnamon", "Taco", "Lemon",
];
const NOUNS = [
  "Moon Noodles", "Dino Nuggets", "Cloud Crackers", "Space Beans", "Pudding Cups",
  "Toaster Waffles", "Sock Puppets", "Bubble Bath", "Unicorn Flakes", "Fish Sticks",
  "Robot Juice", "Pancake Mix", "Toothpaste", "Gummy Worms", "Spaghetti-O's",
  "Tater Tots", "Jelly Beans", "Rubber Ducks", "Cheese Puffs", "Fruit Snacks",
  "Paper Towels", "Crayons", "Hot Sauce", "Ice Pops", "Mac & Cheese", "Slime",
  "Bagel Bites", "Muffins", "Popcorn", "Yogurt Tubes", "Dog Biscuits", "Glitter Glue",
];
const SIZES = [
  "12 oz", "1 lb", "6-pack", "2 L", "family size", "24 ct", "8 oz", "3 lb bag",
  "1 gallon", "snack size", "value pack", "16 oz", "4-pack", "500 ct",
];
const EMOJIS = ["🍌", "🥒", "🍫", "🧀", "🫐", "🍕", "🍓", "🥦", "🌮", "🍋", "🍪",
  "🧃", "🦆", "🧸", "🍭", "🥨", "🍩", "🧁", "🥫", "🍿", "🦖", "🚀", "🦄", "🧦"];

function itemFor(code) {
  const rng = mulberry32(hashString(code));
  const flavor = pick(rng, FLAVORS);
  const name = [pick(rng, BRANDS), pick(rng, ADJECTIVES), flavor, pick(rng, NOUNS)]
    .filter(Boolean).join(" ");
  const size = pick(rng, SIZES);
  // Mostly cheap groceries, occasionally a pricey thing
  const dollars = rng() < 0.85 ? Math.floor(rng() * 12) : 12 + Math.floor(rng() * 38);
  const cents = pick(rng, [99, 49, 79, 29, 99, 99]);
  const price = dollars + cents / 100;
  return { name: `${name}, ${size}`, price, emoji: pick(rng, EMOJIS) };
}

const money = (n) => `$${n.toFixed(2)}`;

// ---- Barcodes ----------------------------------------------------------------
const TAG_COLORS = ["#3fa7d6", "#59cd90", "#ee6352", "#fac05e", "#b07bd9", "#ff8fb1"];
const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

function randomDigits(n) {
  let s = String(1 + Math.floor(Math.random() * 9));
  while (s.length < n) s += Math.floor(Math.random() * 10);
  return s;
}

function ean13(twelve) {
  const sum = [...twelve].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return twelve + ((10 - (sum % 10)) % 10);
}

// Each kind returns the exact text the scanner will type back to us.
// Uppercase letters + digits only, so keyboard layout can't garble QR payloads.
const KINDS = {
  qr:      () => "MART" + randomDigits(8),
  code128: () => randomDigits(12),
  ean13:   () => ean13(randomDigits(12)),
};
const KIND_WEIGHTS = ["qr", "code128", "ean13"]; // one of each = a third QR

function drawTag(tag, kind, code) {
  if (kind === "qr") {
    const qr = qrcode(0, "M");
    qr.addData(code);
    qr.make();
    tag.insertAdjacentHTML("beforeend", qr.createSvgTag({ cellSize: 8, margin: 4, scalable: true }));
    tag.lastElementChild.classList.add("qr");
  } else {
    tag.insertAdjacentHTML("beforeend", "<svg></svg>");
    JsBarcode(tag.lastElementChild, code, {
      format: kind.toUpperCase(), width: 3, height: 100, margin: 14, fontSize: 18,
    });
  }
}

function makeTag(kind) {
  const code = KINDS[kind]();
  const tag = document.createElement("div");
  tag.className = "tag";
  tag.dataset.code = code;
  tag.style.setProperty("--c", pick(Math.random, TAG_COLORS));
  // Jumbled like a pile of groceries (kept mild so scanners can still read them)
  tag.style.setProperty("--rot", `${r(-14, 14).toFixed(1)}deg`);
  tag.style.setProperty("--dx", `${r(-14, 14).toFixed(0)}px`);
  tag.style.setProperty("--dy", `${r(-10, 10).toFixed(0)}px`);
  tag.innerHTML = `<div class="emoji">${itemFor(code).emoji}</div>`;
  drawTag(tag, kind, code);
  return tag;
}

// ---- Conveyor belt -------------------------------------------------------------
// The lane is a column-reverse flexbox: the first row sits at the cashier end
// (bottom) and new rows join at the top.
const beltEl = document.getElementById("belt");
const lane = document.getElementById("lane");
const CUSTOMER_ITEMS = [3, 10];     // items per customer (min, max)
const ROOM_FOR_ROW = 240;           // px of free belt needed before the next pile rolls in
let itemsLeftForCustomer = randInt(...CUSTOMER_ITEMS);
let fillTimer = null;
let beltStopTimer = null;

function runBelt(ms = 700) {
  beltEl.classList.add("moving");
  clearTimeout(beltStopTimer);
  beltStopTimer = setTimeout(() => beltEl.classList.remove("moving"), ms);
}

// FLIP: measure, change the DOM, then animate everything from where it was
function flip(mutate) {
  const els = [...lane.querySelectorAll(".row, .tag")];
  const before = new Map(els.map((el) => [el, el.getBoundingClientRect()]));
  mutate();
  for (const el of els) {
    if (!el.isConnected) continue;
    const was = before.get(el), now = el.getBoundingClientRect();
    const dx = was.left - now.left, dy = was.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
    el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
      { duration: 450, easing: "cubic-bezier(.3, .7, .4, 1)", composite: "add" },
    );
  }
  runBelt();
}

function makeRow() {
  const row = document.createElement("div");
  if (itemsLeftForCustomer === 0) {
    itemsLeftForCustomer = randInt(...CUSTOMER_ITEMS);
    row.className = "row divider";
    row.innerHTML = `<div class="bar">🛑 NEXT CUSTOMER 🛑</div>`;
    return row;
  }
  const n = Math.min(randInt(1, 4), itemsLeftForCustomer);
  itemsLeftForCustomer -= n;
  row.className = "row pile";
  for (let i = 0; i < n; i++) row.appendChild(makeTag(pick(Math.random, KIND_WEIGHTS)));
  return row;
}

function spawnRow() {
  const row = makeRow();
  lane.appendChild(row);
  // Slide in from above the top of the belt
  const from = -(row.offsetTop + row.offsetHeight + 40);
  row.animate([{ transform: `translateY(${from}px)` }, { transform: "translateY(0)" }],
    { duration: 900, easing: "cubic-bezier(.25, .6, .35, 1)" });
  runBelt(900);
  markFront();
}

// Keep piles coming, a little apart, while there's room at the top of the belt
function fillBelt() {
  if (fillTimer) return;
  const top = lane.lastElementChild;
  // The next customer's groceries wait until this customer's divider is gone
  if (top?.classList.contains("divider")) return;
  const free = top ? top.offsetTop : lane.clientHeight;
  if (free < ROOM_FOR_ROW) return;
  spawnRow();
  fillTimer = setTimeout(() => { fillTimer = null; fillBelt(); }, randInt(500, 1100));
}

// When the divider reaches the cashier, that customer is done: print their
// receipt, then take the divider off the belt so the next customer moves up.
function markFront() {
  const front = lane.firstElementChild;
  if (!front?.classList.contains("divider") || front.classList.contains("ready")) return;
  front.classList.add("ready");
  setTimeout(() => {
    if (!front.isConnected) return;
    if (items.length) checkout();
    setTimeout(() => {
      if (!front.isConnected) return;
      knockOff(front.querySelector(".bar"));
      nextCustomer();
    }, 900);
  }, 500);
}

// A fixed-position copy of el hops up and tumbles off the bottom of the screen
function dropAway(el) {
  const rect = el.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight; // unrotated size
  const faller = el.cloneNode(true);
  faller.removeAttribute("id");
  faller.classList.remove("swap", "arrive");
  faller.classList.add("falling");
  Object.assign(faller.style, {
    left: `${rect.left + rect.width / 2 - w / 2}px`, top: `${rect.top + rect.height / 2 - h / 2}px`,
    width: `${w}px`, height: `${h}px`,
  });
  faller.style.setProperty("--spin", `${(Math.random() < 0.5 ? -1 : 1) * r(25, 75)}deg`);
  faller.style.setProperty("--drift", `${r(-150, 150)}px`);
  document.body.appendChild(faller);
  faller.addEventListener("animationend", () => faller.remove());
}

// The scanned thing falls off; the belt closes the gap
function knockOff(el) {
  dropAway(el);
  flip(() => {
    const row = el.closest(".row");
    el.remove();
    if (row && !row.querySelector(".tag, .bar")) row.remove();
  });
  markFront();
  setTimeout(fillBelt, 300);
}

function resetBelt() {
  clearTimeout(fillTimer);
  fillTimer = null;
  lane.innerHTML = "";
  itemsLeftForCustomer = randInt(...CUSTOMER_ITEMS);
  nextCustomer();
  fillBelt();
}

// ---- Customer face ---------------------------------------------------------------
const customerEl = document.getElementById("customer");
const FACES = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍",
  "🤩", "😘", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤨", "😐", "😑",
  "😶", "😏", "😒", "🙄", "😬", "😌", "😔", "😪", "🤤", "😴", "🤢", "🤮", "🤧", "🥵", "🥶",
  "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲",
  "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩",
  "😫", "🥱", "😤", "😡", "😠", "🤬",
];

// The mood faces only come in yellow, so tint them: classic yellow plus five skin tones
const SKIN_TONES = [
  "",
  "sepia(.35) saturate(.9) hue-rotate(-12deg) brightness(1.12)",
  "sepia(.7) saturate(1.3) hue-rotate(-18deg) brightness(1)",
  "sepia(1) saturate(2) hue-rotate(-26deg) brightness(.85)",
  "sepia(1) saturate(2.3) hue-rotate(-32deg) brightness(.66)",
  "sepia(1) saturate(2.1) hue-rotate(-36deg) brightness(.5)",
];
let skinTone = pick(Math.random, SKIN_TONES);

function showFace(animation) {
  let face;
  do face = pick(Math.random, FACES); while (face === customerEl.textContent);
  customerEl.textContent = face;
  customerEl.style.filter = `${skinTone} drop-shadow(0 6px 8px rgba(0,0,0,.6))`;
  customerEl.classList.remove("swap", "arrive");
  void customerEl.offsetWidth; // restart animation
  customerEl.classList.add(animation);
}
const newFace = () => showFace("swap");

// Old customer tumbles away; a new one (with a different skin tone) bounces in
function nextCustomer() {
  dropAway(customerEl);
  customerEl.style.visibility = "hidden";
  let tone;
  do tone = pick(Math.random, SKIN_TONES); while (tone === skinTone);
  skinTone = tone;
  setTimeout(() => {
    customerEl.style.visibility = "";
    showFace("arrive");
  }, 450);
}

showFace("arrive");

// Scanners sometimes add/drop a leading 0 or check digit, so match loosely
function findTag(code) {
  return [...lane.querySelectorAll(".tag")].find((t) => {
    const c = t.dataset.code;
    if (c === code) return true;
    if (code.length < 10) return false;
    return c.endsWith(code) || code.endsWith(c) || c.startsWith(code) || code.startsWith(c);
  });
}

// ---- Sounds (Web Audio, no files) -----------------------------------------
let audio;
function ctx() {
  audio ??= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function tone(freq, start, dur, type = "square", vol = 0.15, endFreq) {
  const a = ctx();
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, a.currentTime + start + dur);
  gain.gain.setValueAtTime(vol, a.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + start + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.02);
}

// White noise, shared by all the squishy/fart/printer sounds
let noiseBuf;
function noiseBuffer() {
  const a = ctx();
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

// Filtered voice: an oscillator (or noise if type === "noise") through a filter.
// freq can be a number or an array of points to glide through.
function voice({ start = 0, dur, type = "sawtooth", freq = 200, vol = 0.2,
                 filter = "lowpass", cutoff = 2000, cutoffEnd, q = 1 }) {
  const a = ctx(), t0 = a.currentTime + start;
  let src;
  if (type === "noise") {
    src = a.createBufferSource();
    src.buffer = noiseBuffer();
  } else {
    src = a.createOscillator();
    src.type = type;
    if (Array.isArray(freq)) src.frequency.setValueCurveAtTime(Float32Array.from(freq), t0, dur);
    else src.frequency.setValueAtTime(freq, t0);
  }
  const f = a.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(cutoff, t0);
  if (cutoffEnd) f.frequency.exponentialRampToValueAtTime(cutoffEnd, t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 4));
  g.gain.setValueAtTime(vol, t0 + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// A pitch curve that wobbles around a falling line — the secret of a good fart
function wobble(from, to, n, jitter) {
  return Array.from({ length: n }, (_, i) =>
    Math.max(30, from + (to - from) * (i / (n - 1)) + (Math.random() - 0.5) * jitter));
}

const SILLY = [
  function fart(t) {
    const dur = r(0.35, 0.9), base = r(70, 120);
    voice({ start: t, dur, type: "sawtooth", freq: wobble(base, base * r(0.5, 0.8), 40, base * 0.6),
            cutoff: r(300, 600), q: 4, vol: 0.5 });
    voice({ start: t, dur, type: "noise", filter: "lowpass", cutoff: 300, vol: 0.25 });
  },
  function tinyFarts(t) {
    for (let i = 0, at = t; i < 3 + Math.floor(r(0, 3)); i++) {
      const dur = r(0.08, 0.18), base = r(90, 160);
      voice({ start: at, dur, type: "sawtooth", freq: wobble(base, base * 0.8, 12, 40), cutoff: 500, q: 4, vol: 0.45 });
      at += dur + r(0.03, 0.1);
    }
  },
  function squish(t) {
    voice({ start: t, dur: 0.28, type: "noise", filter: "bandpass", cutoff: r(250, 400), cutoffEnd: r(1500, 2500), q: 6, vol: 0.9 });
    voice({ start: t + 0.02, dur: 0.18, type: "sine", freq: wobble(180, 90, 10, 30), filter: "lowpass", cutoff: 800, vol: 0.3 });
  },
  function slime(t) {
    voice({ start: t, dur: 0.5, type: "noise", filter: "bandpass", cutoff: 1800, cutoffEnd: 200, q: 8, vol: 1 });
    voice({ start: t + 0.35, dur: 0.12, type: "sine", freq: [300, 900], filter: "lowpass", cutoff: 3000, vol: 0.3 }); // bloop
  },
  function squeakyToy(t) {
    const f = r(1100, 1500);
    [0, 0.22].forEach((d) =>
      voice({ start: t + d, dur: 0.17, type: "triangle", freq: [f, f * 1.4, f * 1.2, f * 0.9], cutoff: 5000, vol: 0.25 }));
  },
  function burp(t) {
    voice({ start: t, dur: r(0.4, 0.7), type: "sawtooth", freq: wobble(r(70, 95), 60, 30, 25), cutoff: 700, q: 6, vol: 0.5 });
  },
  function pop(t) {
    voice({ start: t, dur: 0.07, type: "sine", freq: [700, 120], filter: "lowpass", cutoff: 4000, vol: 0.6 });
    voice({ start: t, dur: 0.05, type: "noise", filter: "highpass", cutoff: 2000, vol: 0.3 });
  },
  function raspberry(t) {
    const dur = r(0.5, 0.8);
    voice({ start: t, dur, type: "sawtooth", freq: wobble(r(140, 200), 130, 60, 90), cutoff: 1200, q: 3, vol: 0.35 });
    voice({ start: t, dur, type: "noise", filter: "bandpass", cutoff: 900, q: 2, vol: 0.4 });
  },
  function quack(t) {
    [0, 0.2].forEach((d) =>
      voice({ start: t + d, dur: 0.14, type: "sawtooth", freq: [520, 480, 380], filter: "bandpass", cutoff: 1100, q: 3, vol: 0.5 }));
  },
  function slipAndThud(t) {
    tone(1400, t, 0.4, "sine", 0.2, 250);
    voice({ start: t + 0.42, dur: 0.25, type: "sine", freq: [120, 45], filter: "lowpass", cutoff: 400, vol: 0.8 });
    voice({ start: t + 0.42, dur: 0.15, type: "noise", filter: "lowpass", cutoff: 600, vol: 0.5 });
  },
];

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // pentatonic-ish
const note = (base, step) => base * Math.pow(2, step / 12);
const WAVES = ["square", "triangle", "sawtooth", "sine"];
const r = (lo, hi) => lo + Math.random() * (hi - lo);

const JINGLES = [
  function arpeggio(t) {
    const base = r(260, 520), wave = pick(Math.random, WAVES), n = 3 + Math.floor(r(0, 5));
    const speed = r(0.06, 0.12), up = Math.random() < 0.7;
    for (let i = 0; i < n; i++) {
      const step = SCALE[up ? i % SCALE.length : (n - i) % SCALE.length];
      tone(note(base, step), t + i * speed, speed * 1.5, wave);
    }
  },
  function slideWhistle(t) {
    const lo = r(300, 500), hi = r(900, 1600);
    Math.random() < 0.5
      ? tone(lo, t, 0.45, "sine", 0.25, hi)
      : tone(hi, t, 0.45, "sine", 0.25, lo);
  },
  function boing(t) {
    const f = r(120, 220);
    for (let i = 0; i < 3; i++) tone(f * (1 + i * 0.5), t + i * 0.09, 0.2, "triangle", 0.3, f * 3);
  },
  function coin(t) {
    const f = r(900, 1300);
    tone(f, t, 0.08, "square", 0.12);
    tone(f * 1.335, t + 0.08, 0.35, "square", 0.12);
  },
  function kazoo(t) {
    const base = r(180, 300);
    for (let i = 0; i < 4; i++) {
      tone(note(base, pick(Math.random, SCALE.slice(0, 6))), t + i * 0.13, 0.12, "sawtooth", 0.1);
    }
  },
  function fanfare(t) {
    const base = r(330, 440);
    [0, 4, 7, 12].forEach((s, i) => tone(note(base, s), t + i * 0.1, i === 3 ? 0.5 : 0.1, "square", 0.12));
  },
  function laser(t) {
    for (let i = 0; i < 3; i++) tone(r(1500, 2500), t + i * 0.12, 0.12, "sawtooth", 0.1, r(100, 300));
  },
];

function playScanSound() {
  tone(1850, 0, 0.12, "square", 0.12);             // classic register beep
  const pool = Math.random() < 0.5 ? SILLY : JINGLES; // half musical, half gross
  pick(Math.random, pool)(0.18);
}

// ---- Register --------------------------------------------------------------
const display = document.getElementById("display");
const nameEl = document.getElementById("item-name");
const priceEl = document.getElementById("item-price");
const receipt = document.getElementById("receipt");
const totalEl = document.getElementById("total");
let total = 0;
let items = [];
let scansSinceRick = RICKROLL_COOLDOWN;

function handleScan(code) {
  if (!rickEl.hidden) { rickUnmute() || closeRick(); return; }

  const tag = findTag(code);
  const item = itemFor(tag ? tag.dataset.code : code); // same item as the emoji on the tag
  playScanSound();

  nameEl.textContent = `${item.emoji} ${item.name}`;
  priceEl.textContent = money(item.price);
  display.classList.remove("flash", "idle");
  void display.offsetWidth; // restart animation
  display.classList.add("flash");

  const li = document.createElement("li");
  li.innerHTML = `<span></span><span>${money(item.price)}</span>`;
  li.firstChild.textContent = `${item.emoji} ${item.name}`;
  receipt.appendChild(li);
  while (receipt.children.length > 30) receipt.firstChild.remove();
  receipt.scrollTop = receipt.scrollHeight;
  total += item.price;
  items.push(item);
  totalEl.textContent = money(total);

  if (tag) knockOff(tag);
  newFace();

  scansSinceRick++;
  if (scansSinceRick > RICKROLL_COOLDOWN && Math.random() < RICKROLL_CHANCE) {
    scansSinceRick = 0;
    setTimeout(rickroll, 500);
  }
}

// ---- Receipt printer ----------------------------------------------------------
const printerEl = document.getElementById("printer");
let printing = false;

const FOOTERS = [
  "You saved $0.00 today!", "Please come again. Or don't. We're a pretend store.",
  "No refunds on invisible items.", "Ask about our Moon Noodle rewards card!",
  "Cashier: a very good kid", "Items may contain traces of silliness.",
  "Now with 30% more beeps!", "Keep this receipt forever (or 5 minutes).",
];

function printerChatter(start, dur) {
  for (let t = 0; t < dur; t += 0.045) {   // dot-matrix zzt-zzt-zzt
    voice({ start: start + t, dur: 0.03, type: "noise", filter: "bandpass", cutoff: r(2500, 3500), q: 3, vol: 0.5 });
  }
  voice({ start, dur, type: "sawtooth", freq: 95, filter: "lowpass", cutoff: 300, vol: 0.08 }); // motor hum
}
function tearSound(start = 0) {
  voice({ start, dur: 0.3, type: "noise", filter: "highpass", cutoff: 1500, cutoffEnd: 5000, q: 1, vol: 0.6 });
}
function sadBuzz() { tone(110, 0, 0.35, "square", 0.15, 90); }

function receiptLines(list) {
  const now = new Date();
  const subtotal = list.reduce((sum, it) => sum + it.price, 0);
  const tax = Math.round(subtotal * 7) / 100;
  const row = (l, rt, cls = "") => `<div class="line ${cls}"><span>${l}</span><span>${rt}</span></div>`;
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
  return [
    `<div class="line center big">🛒 SCAN-O-MART 🛒</div>`,
    `<div class="line center">${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>`,
    `<div class="line rule"></div>`,
    ...list.map((it) => row(`${it.emoji} ${esc(it.name)}`, money(it.price))),
    `<div class="line rule"></div>`,
    row("SUBTOTAL", money(subtotal)),
    row("FUN TAX 7%", money(tax)),
    row("TOTAL", money(subtotal + tax), "big"),
    row("PAID IN", pick(Math.random, ["HUGS", "SMILES", "PRETEND $", "JELLY BEANS", "HIGH FIVES"])),
    `<div class="line rule"></div>`,
    `<div class="line center">${pick(Math.random, FOOTERS)}</div>`,
    `<div class="line center">*** THANK YOU ***</div>`,
  ];
}

function resetRegister() {
  receipt.innerHTML = "";
  items = [];
  total = 0;
  totalEl.textContent = money(0);
  nameEl.textContent = "Scan something!";
  priceEl.textContent = money(0);
}

function checkout() {
  if (printing) return;
  if (!items.length) { sadBuzz(); nameEl.textContent = "Scan some stuff first!"; return; }
  printing = true;

  const lines = receiptLines(items);
  resetRegister();
  nameEl.textContent = "🧾 Printing receipt...";

  const paper = document.createElement("div");
  paper.className = "paper";
  printerEl.appendChild(paper);

  const LINE_MS = 100;
  printerChatter(0, (lines.length * LINE_MS) / 1000);
  lines.forEach((html, i) => setTimeout(() => {
    paper.insertAdjacentHTML("beforeend", html);
  }, i * LINE_MS));

  // Let it hang for a moment, then rip it off and fling it away
  setTimeout(() => {
    tearSound();
    paper.classList.add("torn");
    paper.addEventListener("animationend", () => paper.remove(), { once: true });
    nameEl.textContent = "Next customer!";
    printing = false;
  }, lines.length * LINE_MS + 1800);
}

// ---- Rickroll ---------------------------------------------------------------
const rickEl = document.getElementById("rickroll");
const videoWrap = document.getElementById("video-wrap");
const soundHint = document.getElementById("sound-hint");
const RICK_ID = "dQw4w9WgXcQ";
let player = null;

function rickroll() {
  rickEl.hidden = false;
  soundHint.hidden = true;
  videoWrap.innerHTML = "<div></div>";
  const target = videoWrap.firstChild;

  if (!window.YT?.Player) { // API didn't load; plain embed as a fallback
    target.outerHTML = `<iframe src="https://www.youtube.com/embed/${RICK_ID}?autoplay=1&controls=0&rel=0&playsinline=1"
      allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    return;
  }
  player = new YT.Player(target, {
    videoId: RICK_ID,
    playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, modestbranding: 1 },
    events: {
      onReady: (e) => {
        e.target.unMute();
        e.target.setVolume(100);
        e.target.playVideo();
        // If the browser blocked playback with sound, play muted and ask for a tap/scan
        setTimeout(() => {
          if (player === e.target && player.getPlayerState() !== YT.PlayerState.PLAYING) {
            player.mute();
            player.playVideo();
            soundHint.hidden = false;
          }
        }, 1000);
      },
    },
  });
}

// Returns true if this press was used to turn sound on (so it shouldn't close)
function rickUnmute() {
  if (!player || soundHint.hidden) return false;
  player.unMute();
  player.setVolume(100);
  player.playVideo();
  soundHint.hidden = true;
  return true;
}

function closeRick() {
  rickEl.hidden = true;
  player?.destroy();
  player = null;
  videoWrap.innerHTML = ""; // stops the video
}
rickEl.addEventListener("click", (e) => {
  if (e.target.id !== "close-rick") rickUnmute();
});
document.getElementById("close-rick").addEventListener("click", closeRick);

// ---- Scanner input (scanner = fast keyboard + Enter) ------------------------
let buffer = "";
let lastKey = 0;
window.addEventListener("keydown", (e) => {
  const now = performance.now();
  if (e.key === "Escape") { closeRick(); return; }
  if (now - lastKey > SCAN_KEY_GAP_MS) buffer = "";
  lastKey = now;

  if (e.key === "Enter") {
    if (buffer.length >= 3) {
      e.preventDefault();
      handleScan(buffer);
    }
    buffer = "";
  } else if (e.key.length === 1) {
    buffer += e.key;
  }
});

// ---- Buttons ----------------------------------------------------------------
// Clicking a barcode scans it (handy for testing without a scanner)
lane.addEventListener("click", (e) => {
  const target = e.target.closest("[data-code]");
  if (target) handleScan(target.dataset.code);
});
document.getElementById("shuffle").addEventListener("click", (e) => {
  resetBelt();
  e.currentTarget.blur(); // so a scanner's Enter doesn't re-click it
});
document.getElementById("clear").addEventListener("click", (e) => {
  checkout();
  e.currentTarget.blur();
});
window.addEventListener("resize", () => fillBelt());

fillBelt();

// Handy for testing: rickroll() in the console, or simulate a scan:
window.scanTest = handleScan;
window.rickroll = rickroll;
