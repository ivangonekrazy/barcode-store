// ---- Settings -------------------------------------------------------------
const RICKROLL_CHANCE = 1 / 30;     // ~3% of scans
const RICKROLL_COOLDOWN = 10;       // no rickroll within this many scans of the last one
const BARCODE_COUNT = 8;
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

// ---- Barcode shelf ---------------------------------------------------------
const shelf = document.getElementById("shelf");
const TAG_COLORS = ["#3fa7d6", "#59cd90", "#ee6352", "#fac05e", "#b07bd9", "#ff8fb1"];

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
      format: kind.toUpperCase(), width: 3, height: 110, margin: 16, fontSize: 18,
    });
  }
}

function renderShelf() {
  shelf.innerHTML = "";
  // Roughly a third QR, the rest split between 1D formats, in random order
  const kinds = Array.from({ length: BARCODE_COUNT }, (_, i) =>
    i % 3 === 0 ? "qr" : i % 3 === 1 ? "code128" : "ean13");
  kinds.sort(() => Math.random() - 0.5);

  kinds.forEach((kind, i) => {
    const code = KINDS[kind]();
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.dataset.code = code;
    tag.style.setProperty("--c", TAG_COLORS[i % TAG_COLORS.length]);
    tag.innerHTML = `<div class="emoji">${itemFor(code).emoji}</div>`;
    shelf.appendChild(tag);
    drawTag(tag, kind, code);
  });
}

// Scanners sometimes add/drop a leading 0 or check digit, so match loosely
function findTag(code) {
  return [...shelf.children].find((t) => {
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
  pick(Math.random, JINGLES)(0.18);                 // then a surprise
}

// ---- Register --------------------------------------------------------------
const display = document.getElementById("display");
const nameEl = document.getElementById("item-name");
const priceEl = document.getElementById("item-price");
const receipt = document.getElementById("receipt");
const totalEl = document.getElementById("total");
let total = 0;
let scansSinceRick = RICKROLL_COOLDOWN;

function handleScan(code) {
  if (!rickEl.hidden) { closeRick(); return; }

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
  totalEl.textContent = money(total);

  if (tag) {
    tag.classList.remove("hit");
    void tag.offsetWidth;
    tag.classList.add("hit");
  }

  scansSinceRick++;
  if (scansSinceRick > RICKROLL_COOLDOWN && Math.random() < RICKROLL_CHANCE) {
    scansSinceRick = 0;
    setTimeout(rickroll, 700);
  }
}

// ---- Rickroll ---------------------------------------------------------------
const rickEl = document.getElementById("rickroll");
const videoEl = document.getElementById("video");

function rickroll() {
  videoEl.innerHTML =
    `<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&controls=0&rel=0"
      allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  rickEl.hidden = false;
}
function closeRick() {
  rickEl.hidden = true;
  videoEl.innerHTML = ""; // stops the video
}
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
document.getElementById("shuffle").addEventListener("click", (e) => {
  renderShelf();
  e.currentTarget.blur(); // so a scanner's Enter doesn't re-click it
});
document.getElementById("clear").addEventListener("click", (e) => {
  receipt.innerHTML = "";
  total = 0;
  totalEl.textContent = money(0);
  nameEl.textContent = "Scan something!";
  priceEl.textContent = money(0);
  e.currentTarget.blur();
});

renderShelf();

// Handy for testing: rickroll() in the console, or simulate a scan:
window.scanTest = handleScan;
window.rickroll = rickroll;
