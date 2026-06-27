"use strict";

/**
 * detectiveMystery.js — somali77 Detective Mystery System
 * Commands: !case !investigate !question !analyze !solve !detectiveshop !detectivestats !detectiveleader
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

// ─────────────────────────────────────────────────────────────────────────────
// RANKS & TOOLS
// ─────────────────────────────────────────────────────────────────────────────
const RANKS = [
  { name: "🔰 Rookie Detective",   minCases: 0   },
  { name: "🔍 Investigator",       minCases: 5   },
  { name: "🎯 Inspector",          minCases: 15  },
  { name: "⭐ Chief Detective",    minCases: 30  },
  { name: "🏆 Master Detective",   minCases: 60  },
  { name: "👑 Legendary Detective",minCases: 100 },
];

const TOOLS = {
  flashlight: { id: "flashlight", name: "🔦 Flashlight",       bonus: 0.10, price: 500  },
  magnifier:  { id: "magnifier",  name: "🔍 Magnifying Glass",  bonus: 0.15, price: 1000 },
  camera:     { id: "camera",     name: "📸 Camera",            bonus: 0.12, price: 800  },
  gloves:     { id: "gloves",     name: "🧤 Gloves",            bonus: 0.08, price: 400  },
  forensics:  { id: "forensics",  name: "🧪 Forensics Kit",     bonus: 0.20, price: 2000 },
};

// ─────────────────────────────────────────────────────────────────────────────
// CASE TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────
const CASE_TYPES = [
  {
    type: "house", icon: "🏠", name: "Guri",
    intro: "Ganacsade caanka ah oo laga waayay gurigiisa. Naanaysiisa ayaa la helay waa qarxay — baaritaan ayaa loo baahan yahay!",
    rooms: ["Qolka Fadhiga","Jikada","Qolka Hurdada","Beerta","Dhismaha Hoose"],
  },
  {
    type: "bank", icon: "🏦", name: "Bangiga",
    intro: "Bangiga weyn ayaa caawa la dhacay — lacag gaar ah oo xidhan. Maanka iyo kalluunka ayaa xidhan.",
    rooms: ["Qolka Lacagta","Xafiiska Maamulka","Qolka Amniga","Barxadda","Qolka Serverka"],
  },
  {
    type: "school", icon: "🏫", name: "Dugsiga",
    intro: "Macallin dugsiga ah oo laga waayay dhammaadka maalmaha imtixaanka. Ardaydu waydaareen!",
    rooms: ["Fasalka","Maktabadda","Sheybaarka","Goobta Ciyaaraha","Xafiiska Maamulaha"],
  },
  {
    type: "ship", icon: "🚢", name: "Markabka",
    intro: "Markab safareed oo badda dhexdeeda ah — masuul muhiim ah oo laga waayay. Baddu waxba ma sheegto.",
    rooms: ["Xeebta Sareysa","Qolka Mashiinnada","Kaabinta Madaxweynaha","Jikada","Anbaarka"],
  },
  {
    type: "museum", icon: "🏛️", name: "Matxafka",
    intro: "Walax taariikhi ah oo qiimo badan — ku maqan matxafka habeenka! Dareenka baaritaanka ayaa jira.",
    rooms: ["Qolka Muuqaalka","Kaydka","Qolka Amniga","Sheybaarka","Dukaanka Hediyada"],
  },
  {
    type: "train", icon: "🚂", name: "Tareenka",
    intro: "Tareen xawaare leh oo dhex maraya xerada — qof muhiim ah oo maqan. Cidda baxay?",
    rooms: ["Kaabinta Mashiinka","Kaabinta Cuntada","Qolka #1","Qolka #2","Kaabinta Xamuulka"],
  },
  {
    type: "hotel", icon: "🏨", name: "Hoteelka",
    intro: "Hoteelka casriga ah — maamulaha hoteelka oo xidhan qolkiisa. Ilmo dhalay maanta wuxuu yidhi ma galin.",
    rooms: ["Barxadda","Qolka 101","Qolka 202","Jikada","Saqafka"],
  },
];

const SUSPECT_POOL = [
  { name: "Alex",    job: "Xisaabiye",  trait: "Caqli badan",     secret: "Lacag beenta ah ayuu haysatay" },
  { name: "Sarah",   job: "Khabiir",    trait: "Xasaasiga",       secret: "Xaaskii ayay nacaysay" },
  { name: "Mike",    job: "Askari",     trait: "Adag",            secret: "Dhib weyn ayuu hore u galnaa" },
  { name: "Fatima",  job: "Dhakhtar",   trait: "Aqoon badan",     secret: "Qof buu u shaqeeyay" },
  { name: "Ibrahim", job: "Ganacsade",  trait: "Lacag jecel",     secret: "Shirkad uu lumiyay" },
  { name: "Chen",    job: "Cilmi-yahan",trait: "Qalin jecel",     secret: "Buugaag la waayay ayuu gaadhsiiyay" },
  { name: "Yusuf",   job: "Taliye",     trait: "Xukunka jecel",   secret: "Amar xun ayuu qaatay" },
  { name: "Silva",   job: "Saxaafi",    trait: "Wax soo baare",   secret: "Sir weyn ayuu og yahay" },
  { name: "Morgan",  job: "Booliiski",  trait: "Xeelaynta jecel", secret: "Shaqada gudaha wuxuu yiqiin" },
];

const EVIDENCE_POOL = [
  { id: "blood",    icon: "🩸", name: "Raadad",           desc: "Raadad cas ah oo dhulka ku yaal"         },
  { id: "key",      icon: "🔑", name: "Fure",             desc: "Fure aan laga garanayn cidda leh"         },
  { id: "message",  icon: "📱", name: "Farriimo",         desc: "Farriimo sir ah oo telefoonka ku jira"    },
  { id: "photo",    icon: "📷", name: "Sawiro",           desc: "Sawirro la qaatay meesha dambi ku dhacay" },
  { id: "jewelry",  icon: "💍", name: "Alaaboyin",        desc: "Alaab qaaliya oo la illoobay"             },
  { id: "footprint",icon: "👣", name: "Taag-cag",         desc: "Taag-cag cusub oo dhulka ku jira"         },
  { id: "note",     icon: "📝", name: "Warqad",           desc: "Warqad qarsoon oo gacanta lagu qoray"     },
  { id: "chemical", icon: "🧪", name: "Kiimiko",          desc: "Kiimiko gaar ah oo la helay"              },
  { id: "clothing", icon: "🧥", name: "Dhar",             desc: "Ugbaad dhar ah oo la dhex dhigay"         },
  { id: "weapon",   icon: "🔫", name: "Hub",              desc: "Hub la isticmaalay",                      },
];

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATA
// ─────────────────────────────────────────────────────────────────────────────
const detectives  = new Map();  // userId → DetectiveProfile
const activeCases = new Map();  // userId → ActiveCase

function rnd(a, b)  { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle(a) { return [...a].sort(() => Math.random() - 0.5); }
function fmt(n)     { return n >= 1000 ? (n/1000).toFixed(1)+"K" : String(n); }

function getDetective(userId, username) {
  if (!detectives.has(userId)) {
    detectives.set(userId, {
      userId, username,
      rank: 0, casesSolved: 0, casesAttempted: 0,
      xp: 0, coins: 0, mysteryKeys: 0,
      tools: [],
      streak: 0,
      stats: { perfect: 0, failed: 0, totalEvidence: 0 },
    });
  }
  const d = detectives.get(userId);
  if (username) d.username = username;
  return d;
}

function getRank(d) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (d.casesSolved >= r.minCases) rank = r;
  }
  return rank;
}

function toolBonus(d) {
  return d.tools.reduce((sum, tid) => sum + (TOOLS[tid]?.bonus || 0), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// CASE GENERATION
// ─────────────────────────────────────────────────────────────────────────────
function generateCase(caseNumber) {
  const template   = pick(CASE_TYPES);
  const suspects   = shuffle(SUSPECT_POOL).slice(0, 3);
  const guiltyIdx  = rnd(0, 2);
  const guilty     = suspects[guiltyIdx];

  // Generate alibis — guilty one has a weak/false alibi
  const alibis = suspects.map((s, i) => {
    if (i === guiltyIdx) {
      return pick([
        "Guriga ayuu ku jiray — laakiin cid kama jirin",
        "Barxadda ayuu fadhiyay — wax cadeyn ah ma lahan",
        "Internet ayuu isticmaalayay — kama muuqdo tariikhda",
      ]);
    }
    return pick([
      "Saaxiib ayuu la jiray oo xaqiijiyay",
      "Camera-du waxay muujisay meesha uu jiray",
      "Shaqo ayuu ku jiray — maamul ayaa xaqiijiyay",
      "Cunto kariye meelaha u yiil — markhaati buu leeyahay",
    ]);
  });

  // Generate evidence: 2-3 clues per room, some point to guilty
  const rooms = template.rooms.map(roomName => {
    const clues = [];
    const numClues = rnd(1, 3);
    for (let i = 0; i < numClues; i++) {
      const ev = pick(EVIDENCE_POOL);
      const pointsToGuilty = Math.random() < 0.4;
      clues.push({
        ...ev,
        pointsToGuilty,
        hint: pointsToGuilty
          ? `${ev.name} waxay xiriir la leedahay **${guilty.name}** — ${guilty.secret}`
          : `${ev.name} waa dhaleeceyn been abuur ah — cadeyn muhiim ah ma ahan`,
      });
    }
    return { name: roomName, clues, searched: false };
  });

  // Generate questions for each suspect
  const questions = suspects.map((s, i) => ({
    asked: false,
    response: i === guiltyIdx
      ? pick([
          `"Ma oga waxa dhacay" — laakiin dhaadhicin buu ku jiray`,
          `"Meeshan ma jooginin!" — laakiin indho weecin ayuu hayay`,
          `"Waxaad i weyddiisaysaa maxaa?" — cadho ayuu muujiyay`,
        ])
      : pick([
          `"Runta waan sheegeynaa — meeshan uma soo galin" — xasilloon`,
          `"Maya, waxba ka ogaan ma'elo" — markhaati ayuu leeyahay`,
          `"Xamaasad lama filaan ah — si cad ayuu uga jawaabay"`,
        ]),
  }));

  return {
    id: caseNumber,
    template,
    description: template.intro,
    suspects: suspects.map((s, i) => ({
      ...s,
      alibi: alibis[i],
      questioned: false,
    })),
    guiltyIdx,
    guilty: guilty.name,
    rooms,
    collectedEvidence: [],
    questionsAsked: 0,
    actionsUsed: 0,
    startedAt: Date.now(),
    solved: false,
    questions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// !case — Start or show current case
// ─────────────────────────────────────────────────────────────────────────────
async function handleCase(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const d     = getDetective(uid, uname);
  const sub   = (args[0] || "").toLowerCase();

  // Show active case status
  let active = activeCases.get(uid);

  if (active && sub !== "new") {
    // Show current case status
    const embed = new EmbedBuilder()
      .setColor(0x2c3e50)
      .setTitle(`🕵️ Case #${active.id} — ${active.template.icon} ${active.template.name}`)
      .setDescription(active.description)
      .addFields(
        { name: "👤 Dadka Looga Shakisan Yahay",
          value: active.suspects.map((s, i) => `${i+1}. **${s.name}** (${s.job}) — ${s.questioned ? "✅ La wareystay" : "❌ La wareystay maa'ahan"}`).join("\n"),
          inline: false },
        { name: "🏠 Qolalka",
          value: active.rooms.map(r => `${r.searched ? "✅" : "❌"} **${r.name}**`).join(" | "),
          inline: false },
        { name: "🔍 Cadeymaha La Helay",
          value: active.collectedEvidence.length
            ? active.collectedEvidence.map(e => `${e.icon} ${e.name}`).join(", ")
            : "Wax cadeyn ah lama helin",
          inline: false },
        { name: "📊 Xaaladda",
          value: `Ficillo la qaatay: **${active.actionsUsed}** | Wakhtiga: ${Math.round((Date.now()-active.startedAt)/60000)} min`,
          inline: false },
      )
      .addFields({ name: "📌 Amarrada",
        value: "`!investigate <qolka>` | `!question <magaca>` | `!analyze` | `!solve <magaca>`",
        inline: false })
      .setFooter({ text: "!case new — kiis cusub bilow" })
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  }

  // New case
  const caseNum  = d.casesAttempted + 1;
  active = generateCase(caseNum);
  activeCases.set(uid, active);
  d.casesAttempted++;

  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle(`🕵️ Case #${caseNum} — ${active.template.icon} ${active.template.name}`)
    .setDescription(`## ⚠️ Kiis Cusub!\n${active.description}`)
    .addFields(
      { name: "👤 Dadka Looga Shakisan Yahay",
        value: active.suspects.map((s, i) => `**${i+1}. ${s.name}** | Shaqo: ${s.job} | Dabeecad: ${s.trait}`).join("\n"),
        inline: false },
      { name: "🏠 Qolalka La Baarayn",
        value: active.rooms.map(r => `• ${r.name}`).join("\n"),
        inline: false },
      { name: "📌 Bilow Baaritaanka",
        value: "`!investigate <qolka>` — qolka raadso\n`!question <magaca>` — qofka wareyso\n`!analyze` — cadeymaha falanqee\n`!solve <magaca>` — xallinaan",
        inline: false },
    )
    .setFooter({ text: `Detective: ${getRank(d).name}` })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !investigate <room>
// ─────────────────────────────────────────────────────────────────────────────
async function handleInvestigate(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const d     = getDetective(uid, uname);
  const active= activeCases.get(uid);

  if (!active) return ctx.reply("❌ Kiis furan ma lihid — `!case` ku bilow kiis cusub!");

  const query = args.join(" ").toLowerCase();
  if (!query)  return ctx.reply(`❌ Qolka magaciisa qor — Qolalka: ${active.rooms.map(r => `**${r.name}**`).join(", ")}`);

  const room = active.rooms.find(r => r.name.toLowerCase().includes(query) || query.includes(r.name.toLowerCase().split(" ")[0].toLowerCase()));
  if (!room) return ctx.reply(`❌ Qolkan ma aqoonin. Qolalka: ${active.rooms.map(r => r.name).join(" | ")}`);
  if (room.searched) return ctx.reply(`❌ **${room.name}** hore baad baarisay!`);

  room.searched = true;
  active.actionsUsed++;

  const baseChance = 0.65 + toolBonus(d);
  const found      = room.clues.filter(() => Math.random() < baseChance);
  d.stats.totalEvidence += found.length;

  // Add to collected evidence (avoid duplicates)
  const newlyFound = [];
  for (const clue of found) {
    if (!active.collectedEvidence.find(e => e.id === clue.id)) {
      active.collectedEvidence.push(clue);
      newlyFound.push(clue);
    }
  }

  const color  = newlyFound.length > 0 ? 0x27ae60 : 0x95a5a6;
  const embed  = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🔍 Baaritaan — ${room.name}`)
    .setTimestamp();

  if (newlyFound.length === 0) {
    embed.setDescription("😐 Wax cadeyn ah kuma helin qolkaan — mar dambe isku day ama qol kale raadso.");
  } else {
    embed.setDescription(`✅ **${newlyFound.length}** cadeyn baad ka heshay **${room.name}**!`);
    newlyFound.forEach(e => {
      embed.addFields({ name: `${e.icon} ${e.name}`, value: e.desc, inline: false });
    });
  }

  embed.addFields({
    name: "📊 Xaaladda",
    value: `Cadeymaha total: **${active.collectedEvidence.length}** | Ficillo: **${active.actionsUsed}**`,
    inline: false,
  });

  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !question <suspect>
// ─────────────────────────────────────────────────────────────────────────────
async function handleQuestion(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const d     = getDetective(uid, uname);
  const active= activeCases.get(uid);

  if (!active) return ctx.reply("❌ Kiis furan ma lihid — `!case` bilow!");

  const query   = args.join(" ").toLowerCase();
  if (!query)   return ctx.reply(`❌ Magaca qor — Dadka: ${active.suspects.map(s => s.name).join(", ")}`);

  const sIdx = active.suspects.findIndex(s => s.name.toLowerCase().includes(query));
  if (sIdx === -1) return ctx.reply(`❌ Qofkan ma aqoonin. Dadka: ${active.suspects.map(s => s.name).join(", ")}`);

  const suspect = active.suspects[sIdx];
  active.actionsUsed++;

  const isGuilty   = sIdx === active.guiltyIdx;
  const alreadyAsked = suspect.questioned;
  suspect.questioned = true;

  const response = active.questions[sIdx].response;
  const color    = isGuilty ? 0xe74c3c : 0x3498db;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`👤 Wareysiga — ${suspect.name}`)
    .setDescription(`**${suspect.name}** wuxuu yidhi:\n\n*"${response}"*`)
    .addFields(
      { name: "💼 Shaqo",    value: suspect.job,     inline: true },
      { name: "🎭 Dabeecad", value: suspect.trait,   inline: true },
      { name: "📍 Alibi",    value: suspect.alibi,   inline: false },
    );

  if (alreadyAsked) embed.setFooter({ text: "Hore baad weydiisay — jawaabta isla tahay" });
  else embed.setFooter({ text: `Ficillo: ${active.actionsUsed}` });

  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !analyze — analyze collected evidence
// ─────────────────────────────────────────────────────────────────────────────
async function handleAnalyze(ctx) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const d     = getDetective(uid, uname);
  const active= activeCases.get(uid);

  if (!active) return ctx.reply("❌ Kiis furan ma lihid — `!case` bilow!");
  if (active.collectedEvidence.length === 0)
    return ctx.reply("❌ Wax cadeyn ah lama helin — `!investigate <qolka>` raadso!");

  active.actionsUsed++;

  const guiltyEvidence = active.collectedEvidence.filter(e => e.pointsToGuilty);
  const hasStrong      = guiltyEvidence.length >= 2;
  const hint           = hasStrong
    ? `Cadeymaha waxay si xoog leh ugu tilmaamaysaa **${active.guilty}**!`
    : guiltyEvidence.length === 1
    ? `Cadeyn mid ah ayaa u muuqata inay xiriir la leedahay qof gaar ah.`
    : `Cadeymaha waxba cad uma muuqanaan — sii raadso.`;

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("🧪 Falanqaynta Cadeymaha")
    .setDescription(hint)
    .addFields(
      { name: "📦 Cadeymaha La Helay",
        value: active.collectedEvidence.map(e => `${e.icon} **${e.name}**: ${e.desc}`).join("\n") || "Wax ma jiraan",
        inline: false },
    );

  if (guiltyEvidence.length > 0 && hasStrong) {
    embed.addFields({
      name:  "🎯 Muujinta Cadeymaha",
      value: guiltyEvidence.map(e => `${e.icon} ${e.hint}`).join("\n"),
      inline: false,
    });
  }

  embed.setFooter({ text: `Qolalka: ${active.rooms.filter(r=>r.searched).length}/${active.rooms.length} la baaray | !solve <magaca> xallin` });
  embed.setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !solve <suspect>
// ─────────────────────────────────────────────────────────────────────────────
async function handleSolve(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const d     = getDetective(uid, uname);
  const active= activeCases.get(uid);
  const db    = require("./data");

  if (!active) return ctx.reply("❌ Kiis furan ma lihid — `!case` bilow!");

  const guess = args.join(" ").toLowerCase();
  if (!guess) return ctx.reply(`❌ Magaca qofka qor — Dadka: ${active.suspects.map(s => s.name).join(", ")}`);

  const suspect = active.suspects.find(s => s.name.toLowerCase().includes(guess));
  if (!suspect) return ctx.reply(`❌ Qofkan la aqoonin. Dadka: ${active.suspects.map(s => s.name).join(", ")}`);

  activeCases.delete(uid);
  active.solved = true;

  const correct      = suspect.name === active.guilty;
  const timeTakenMin = Math.round((Date.now() - active.startedAt) / 60000);
  const rooms        = active.rooms.filter(r => r.searched).length;
  const evidCount    = active.collectedEvidence.length;

  if (correct) {
    // Score bonus: fewer actions = more XP
    const efficiency = Math.max(1, 30 - active.actionsUsed);
    const xpGained   = 100 + efficiency * 10;
    const coinsEarned= 200 + efficiency * 20;
    const keysEarned = active.actionsUsed <= 8 ? 2 : 1;
    const isPerfect  = active.actionsUsed <= 6 && evidCount >= 3;

    d.xp            += xpGained;
    d.casesSolved++;
    d.streak++;
    d.mysteryKeys   += keysEarned;
    d.stats.totalEvidence += evidCount;
    if (isPerfect) d.stats.perfect++;

    // Update rank
    const newRankIdx = RANKS.findLastIndex(r => d.casesSolved >= r.minCases);
    if (newRankIdx > d.rank) d.rank = newRankIdx;

    // Give coins to main economy
    db.addCoins(uid, uname, coinsEarned);

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`${isPerfect ? "✨ PERFECT SOLVE!" : "🎉"} Kiiska Waa La Xaliyay!`)
      .setDescription(
        `## ✅ Sax! **${suspect.name}** ayaa dembi galay!\n\n` +
        `${active.template.icon} ${active.template.name} — **${timeTakenMin} min** gudahood xaliyay!`
      )
      .addFields(
        { name: "🦹 Dambiileyaha",  value: `**${active.guilty}** — ${active.suspects[active.guiltyIdx].secret}`, inline: false },
        { name: "⭐ XP",            value: `+${xpGained}`,     inline: true },
        { name: "🪙 Coins",         value: `+${coinsEarned}`,  inline: true },
        { name: "🗝️ Mystery Keys",  value: `+${keysEarned}`,   inline: true },
        { name: "📊 Natiijadaada",  value: `Ficillo: ${active.actionsUsed} | Cadeymaha: ${evidCount} | Qolal: ${rooms}/${active.rooms.length}`, inline: false },
        { name: "🏆 Kiisaska",      value: `Wax-xalinta: **${d.casesSolved}** | Streak: **${d.streak}** | Rank: **${getRank(d).name}**`, inline: false },
      )
      .setFooter({ text: isPerfect ? "🌟 Perfect Solve — minimum ficillo & max cadeymaha!" : "!case — kiis cusub bilow" })
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  } else {
    // Wrong answer
    const xpLost = 20, coinsLost = 50;
    d.streak = 0;
    d.stats.failed++;
    db.removeCoins(uid, uname, coinsLost);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("❌ Khaldan! Dambiileyaha Baxay!")
      .setDescription(
        `**${suspect.name}** ma ahayn dambiileyaha!\n\n` +
        `Dambiileyaha runta ah wuxuu ahaa **${active.guilty}** — badbaaday!`
      )
      .addFields(
        { name: "💔 Ganaax",        value: `-${xpLost} XP | -${coinsLost} Coins`, inline: true },
        { name: "😞 Streak",        value: "Dib u bilow",                          inline: true },
        { name: "🦹 Runta",         value: `${active.guilty} — ${active.suspects[active.guiltyIdx].secret}`, inline: false },
      )
      .setFooter({ text: "!case — kiis cusub isku day" })
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// !detectiveshop
// ─────────────────────────────────────────────────────────────────────────────
async function handleDetectiveShop(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const d     = getDetective(uid, uname);
  const db    = require("./data");
  const sub   = (args[0] || "").toLowerCase();

  if (!sub) {
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🛒 Detective Shop")
      .setDescription("Qalab ku kor u qaad fursadda cadeymaha helitaanka!")
      .addFields(
        Object.values(TOOLS).map(t => ({
          name:  `${t.name} \`${t.id}\``,
          value: `Bonus: +${Math.round(t.bonus * 100)}% | Qiime: **${fmt(t.price)} Coins** | !detectiveshop buy ${t.id}`,
          inline: false,
        }))
      )
      .addFields({ name: "📌 Amarka", value: "`!detectiveshop buy <id>`", inline: false })
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  }

  if (sub === "buy") {
    const toolId = (args[1] || "").toLowerCase();
    const tool   = TOOLS[toolId];
    if (!tool) return ctx.reply(`❌ Qalab \`${toolId}\` la'ayn! Tools: ${Object.keys(TOOLS).join(", ")}`);
    if (d.tools.includes(toolId)) return ctx.reply("❌ Qalabkan hore baad leedahay!");

    const p = db.getPlayer(uid, uname);
    if (p.coins < tool.price)
      return ctx.reply(`❌ Coins kuma filan! Waxaad u baahan tahay **${fmt(tool.price)} 🪙** — leedahay **${fmt(p.coins)} 🪙**`);

    db.removeCoins(uid, uname, tool.price);
    d.tools.push(toolId);
    const totalBonus = Math.round(toolBonus(d) * 100);

    return ctx.reply(`✅ **${tool.name}** waa iibsatay! Cadeymaha bonus: **+${totalBonus}%** | Qalab: ${d.tools.length}`);
  }

  return ctx.reply("❌ `!detectiveshop` ama `!detectiveshop buy <id>`");
}

// ─────────────────────────────────────────────────────────────────────────────
// !detectivestats
// ─────────────────────────────────────────────────────────────────────────────
async function handleDetectiveStats(ctx) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const d     = getDetective(uid, uname);
  const rank  = getRank(d);
  const next  = RANKS[Math.min(d.rank + 1, RANKS.length - 1)];
  const active= activeCases.has(uid) ? "🔍 Kiis socda" : "✅ Xor";

  const embed = new EmbedBuilder()
    .setColor(0x2c3e50)
    .setTitle(`🕵️ ${d.username} — Detective Profile`)
    .addFields(
      { name: "🏆 Rank",          value: rank.name,                                  inline: true  },
      { name: "⭐ XP",            value: fmt(d.xp),                                  inline: true  },
      { name: "🔍 Xaaladda",      value: active,                                     inline: true  },
      { name: "✅ Xaliyay",       value: String(d.casesSolved),                      inline: true  },
      { name: "📝 Isku Dayay",    value: String(d.casesAttempted),                   inline: true  },
      { name: "🔥 Streak",        value: String(d.streak),                           inline: true  },
      { name: "🗝️ Mystery Keys",  value: String(d.mysteryKeys),                      inline: true  },
      { name: "✨ Perfect",       value: String(d.stats.perfect),                    inline: true  },
      { name: "🧪 Qalab",        value: d.tools.length ? d.tools.map(t=>TOOLS[t].name).join(", ") : "Wax ma laha", inline: false },
      { name: "📈 Xiga",         value: `${next.name} — ${next.minCases} kiis lagama jiraan`, inline: false },
    )
    .setFooter({ text: `+${Math.round(toolBonus(d)*100)}% cadeymaha bonus — qalab ku badan` })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !detectiveleader
// ─────────────────────────────────────────────────────────────────────────────
async function handleDetectiveLeader(ctx) {
  const all   = Array.from(detectives.values());
  if (all.length === 0) return ctx.reply("❌ Wali baare ma jiraan!");

  const medals = ["🥇","🥈","🥉","4️⃣","5️⃣"];

  const bySolved  = [...all].sort((a,b) => b.casesSolved   - a.casesSolved);
  const byXp      = [...all].sort((a,b) => b.xp            - a.xp);
  const byPerfect = [...all].sort((a,b) => b.stats.perfect  - a.stats.perfect);

  const top = (list, fn) => list.slice(0,5)
    .map((d,i) => `${medals[i]||`${i+1}.`} **${d.username}** — ${getRank(d).name}\n   ${fn(d)}`)
    .join("\n") || "Cidna kuma jirto";

  const embed = new EmbedBuilder()
    .setColor(0x8e44ad)
    .setTitle("🏆 Detective Leaderboard")
    .addFields(
      { name: "✅ Ugu Kiis Badan Xaliyay",    value: top(bySolved,  d=>`${d.casesSolved} kiis | Streak: ${d.streak}`), inline: false },
      { name: "⭐ Ugu XP Badan",              value: top(byXp,     d=>`${fmt(d.xp)} XP`),                             inline: false },
      { name: "✨ Ugu Perfect Badan",          value: top(byPerfect,d=>`${d.stats.perfect} perfect solves`),           inline: false },
    )
    .setFooter({ text: `${all.length} Baarayaal guud` })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  detectives,
  activeCases,
  handleCase,
  handleInvestigate,
  handleQuestion,
  handleAnalyze,
  handleSolve,
  handleDetectiveShop,
  handleDetectiveStats,
  handleDetectiveLeader,
};
