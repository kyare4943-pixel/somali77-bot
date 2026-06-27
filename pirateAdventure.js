"use strict";

/**
 * pirateAdventure.js — somali77 Pirate Adventure System
 * Commands: !voyage !piratebattle !pirateshop !upgrade !islands !sail !piratedaily !pirateleader !piratestats !kingdomrob
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY DATA
// ─────────────────────────────────────────────────────────────────────────────
const pirates      = new Map(); // userId → PirateProfile
const battleQueue  = new Map(); // challengerId → { challenged, expires }
const robCooldowns = new Map(); // userId → { lastRob, pendingLoss, lossAmount, lossType }

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SHIPS = {
  dinghy:     { id: "dinghy",     name: "⛵ Dinghy",         hp: 100, speed: 10, dmg: 15, cargo: 10, price: 0      },
  sloop:      { id: "sloop",      name: "🚤 Sloop",          hp: 200, speed: 20, dmg: 25, cargo: 20, price: 5000   },
  brigantine: { id: "brigantine", name: "🛥️ Brigantine",     hp: 350, speed: 30, dmg: 40, cargo: 35, price: 15000  },
  galleon:    { id: "galleon",    name: "⚓ Galleon",         hp: 500, speed: 25, dmg: 55, cargo: 50, price: 40000  },
  manowar:    { id: "manowar",    name: "🏴‍☠️ Man-o-War",     hp: 750, speed: 20, dmg: 80, cargo: 60, price: 100000 },
  legendary:  { id: "legendary",  name: "👑 Legendary Ship", hp: 1200, speed: 35, dmg: 120, cargo: 100, price: 500000 },
};

const WEAPONS = {
  cutlass:     { id: "cutlass",     name: "⚔️ Cutlass",       dmg: 10, price: 0     },
  pistol:      { id: "pistol",      name: "🔫 Pistol",         dmg: 18, price: 2500  },
  cannon:      { id: "cannon",      name: "💣 Cannon",         dmg: 30, price: 8000  },
  hwarang:     { id: "hwarang",     name: "🗡️ Hwarang Blade",  dmg: 45, price: 20000 },
  kraken_claw: { id: "kraken_claw", name: "🦑 Kraken Claw",    dmg: 70, price: 50000 },
};

const ARMORS = {
  leather: { id: "leather", name: "🧥 Leather Armor",  def: 8,  price: 0     },
  chain:   { id: "chain",   name: "⛓️ Chain Armor",    def: 15, price: 3000  },
  plate:   { id: "plate",   name: "🛡️ Plate Armor",    def: 25, price: 10000 },
  dragon:  { id: "dragon",  name: "🐉 Dragon Scale",   def: 40, price: 35000 },
  phantom: { id: "phantom", name: "👻 Phantom Cloak",  def: 60, price: 80000 },
};

const ISLANDS = [
  { id: "treasure", name: "💰 Treasure Island", enemy: "Pirate Guard",   bonusMul: 1.5, minG: 300,  maxG: 800,  cd: 60 },
  { id: "skull",    name: "💀 Skull Island",    enemy: "Skull Pirate",   bonusMul: 1.8, minG: 400,  maxG: 1000, cd: 90 },
  { id: "volcano",  name: "🌋 Volcano Island",  enemy: "Fire Demon",     bonusMul: 2.0, minG: 500,  maxG: 1200, cd: 120 },
  { id: "frozen",   name: "🧊 Frozen Island",   enemy: "Ice Wraith",     bonusMul: 2.2, minG: 600,  maxG: 1500, cd: 150 },
  { id: "ghost",    name: "👻 Ghost Island",    enemy: "Ghost Captain",  bonusMul: 2.5, minG: 800,  maxG: 2000, cd: 180 },
];

const AI_ENEMIES = [
  { name: "🏴‍☠️ Rix Burcad",     hp: 80,  atk: 18, def: 5,  goldMin: 200, goldMax: 500,  gemMin: 0, gemMax: 5  },
  { name: "💀 Ninkii Qalati",  hp: 120, atk: 28, def: 10, goldMin: 400, goldMax: 900,  gemMin: 2, gemMax: 10 },
  { name: "🦈 Shark Raider",   hp: 180, atk: 40, def: 18, goldMin: 700, goldMax: 1500, gemMin: 5, gemMax: 20 },
  { name: "🐙 Kraken Spawn",   hp: 300, atk: 55, def: 28, goldMin: 1200, goldMax: 3000, gemMin: 10, gemMax: 40 },
  { name: "👻 Ghost Admiral",  hp: 500, atk: 75, def: 40, goldMin: 2000, goldMax: 5000, gemMin: 20, gemMax: 80 },
];

const VOYAGE_EVENTS = [
  {
    id: "treasure_island", chance: 0.20,
    title: "💰 Jasiirad Dahab!",
    desc:  (g) => `Waxaad ka heshay jasiirad dahab ku jirto — **${fmt(g)} Gold** la qaaday!`,
    reward: (p) => { const g = rnd(100, 400) * tierMul(p); return { gold: g }; },
  },
  {
    id: "hidden_chest", chance: 0.18,
    title: "📦 Khasnad Qarsoon!",
    desc:  (g, gm) => `Khasnad qarsoon baad heshay — **${fmt(g)} Gold** + **${fmt(gm)} Gems**!`,
    reward: (p) => ({ gold: rnd(150, 500) * tierMul(p), gems: rnd(5, 20) }),
  },
  {
    id: "rare_fish", chance: 0.15,
    title: "🐟 Kalluun Naadir!",
    desc:  (g) => `Kalluun naadirka ah baad qabatay — iibisay **${fmt(g)} Gold**!`,
    reward: (p) => ({ gold: rnd(80, 250) * tierMul(p), gems: rnd(1, 5) }),
  },
  {
    id: "storm", chance: 0.15,
    title: "🌊 Duufaanka!",
    desc:  (dmg) => `Duufaan xoog leh baa kugu dhacay — markabkaagu **${dmg} HP** dhaawacmay!`,
    reward: (p) => { const dmg = rnd(10, 40); p.hp = Math.max(1, p.hp - dmg); return { dmg }; },
    bad: true,
  },
  {
    id: "pirate_attack", chance: 0.12,
    title: "⚔️ Burcad-badeed waa ku weeraray!",
    desc:  (lost) => lost > 0 ? `Waxaad ka lurisay **${fmt(lost)} Gold**!` : `Waxaad ka qabatay burcad-badeedka — nothing lost!`,
    reward: (p) => {
      const lost = Math.min(p.gold, rnd(50, 200));
      p.gold = Math.max(0, p.gold - lost);
      return { lost };
    },
    bad: true,
  },
  {
    id: "merchant_trade", chance: 0.10,
    title: "🤝 Ganacsade baad la kulantay!",
    desc:  (g) => `Ganacsade baad la kulantay — **${fmt(g)} Gold** baad ka soo gatay!`,
    reward: (p) => ({ gold: rnd(200, 600) * tierMul(p) }),
  },
  {
    id: "abandoned_ship", chance: 0.05,
    title: "🚢 Markab la daayay!",
    desc:  (g, gm) => `Markab la daayay baad heshay — **${fmt(g)} Gold** + **${fmt(gm)} Gems**!`,
    reward: (p) => ({ gold: rnd(500, 1200) * tierMul(p), gems: rnd(10, 35) }),
  },
  {
    id: "nothing", chance: 0.05,
    title: "😐 Badda Madhan",
    desc:  () => "Waxba la'ayn safarkani — mar dambe isku day!",
    reward: () => ({}),
  },
];

// Rare special events (checked first)
const RARE_EVENTS = [
  { id: "kraken",    name: "🦑 KRAKEN BOSS!",           chance: 0.025, gold: 5000, gems: 50,  xp: 500 },
  { id: "ghostship", name: "👻 GHOST SHIP!",             chance: 0.030, gold: 3000, gems: 30,  xp: 300 },
  { id: "legendary_treasure", name: "🏺 LEGENDARY TREASURE!", chance: 0.035, gold: 4000, gems: 20, xp: 250 },
  { id: "golden_compass", name: "🧭 GOLDEN COMPASS!",   chance: 0.020, gold: 2000, gems: 100, xp: 200 },
  { id: "pirate_sword", name: "🗡️ PIRATE KING SWORD!", chance: 0.010, gold: 1000, gems: 200, xp: 150 },
];

const KINGDOM_LOOT_TIERS = [
  { minLevel: 1,  goldMin: 3000,  goldMax: 8000,  diamondMin: 20000, diamondMax: 35000 },
  { minLevel: 5,  goldMin: 8000,  goldMax: 20000, diamondMin: 30000, diamondMax: 60000 },
  { minLevel: 10, goldMin: 20000, goldMax: 50000, diamondMin: 50000, diamondMax: 100000 },
];

const VOYAGE_CD    = 30 * 60 * 1000;
const BATTLE_CD    = 5  * 60 * 1000;
const DAILY_CD     = 24 * 60 * 60 * 1000;
const KINGDOM_CD   = 2  * 24 * 60 * 60 * 1000; // 2 days
const ISLAND_CD    = 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmt(n)    { return n >= 1000000 ? (n/1000000).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"K" : String(Math.round(n)); }
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function fmtCd(ms) {
  if (ms <= 0) return "Diyaar";
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}s ${m}d` : `${m} daqiiqo`;
}

function tierMul(p) {
  const tier = ["dinghy","sloop","brigantine","galleon","manowar","legendary"].indexOf(p.ship) + 1;
  return 1 + (tier - 1) * 0.3 + (p.level - 1) * 0.1;
}

function getPirate(userId, username) {
  if (!pirates.has(userId)) {
    pirates.set(userId, {
      userId, username,
      ship:    "dinghy",
      shipUpgrades: { speed: 0, hp: 0, dmg: 0, cargo: 0 },
      hp: 100, maxHp: 100,
      crew: 5,
      gold: 500, gems: 10,
      xp: 0, level: 1,
      weapon: "cutlass", armor: "leather",
      lastVoyage: 0, lastBattle: 0, lastDaily: 0,
      islandCooldowns: {},
      stats: { voyages: 0, battlesWon: 0, battlesLost: 0, kingdomRobs: 0, totalGoldEarned: 0 },
    });
  }
  const p = pirates.get(userId);
  if (username) p.username = username;
  return p;
}

function shipStats(p) {
  const base  = { ...SHIPS[p.ship] };
  const up    = p.shipUpgrades;
  base.speed += (up.speed || 0) * 5;
  base.hp    += (up.hp    || 0) * 50;
  base.dmg   += (up.dmg   || 0) * 8;
  base.cargo += (up.cargo || 0) * 10;
  return base;
}
function playerAtk(p) {
  const w = WEAPONS[p.weapon] || WEAPONS.cutlass;
  return shipStats(p).dmg + w.dmg + (p.level - 1) * 3;
}
function playerDef(p) {
  const a = ARMORS[p.armor] || ARMORS.leather;
  return a.def + Math.floor(p.crew / 2) + (p.level - 1) * 2;
}
function xpNeeded(lvl) { return lvl * 200; }
function addXp(p, amount) {
  p.xp += amount;
  let leveled = false;
  while (p.xp >= xpNeeded(p.level)) {
    p.xp -= xpNeeded(p.level);
    p.level++;
    const s = shipStats(p);
    p.maxHp = s.hp;
    p.hp    = Math.min(p.hp + 50, p.maxHp);
    leveled = true;
  }
  return leveled;
}

function hpBar(cur, max) {
  const pct  = Math.max(0, Math.min(20, Math.round((cur / max) * 20)));
  const fill = "🟩".repeat(pct);
  const empty= "⬛".repeat(20 - pct);
  return `${fill}${empty} **${cur}/${max}**`;
}

// ─────────────────────────────────────────────────────────────────────────────
// !piratestats
// ─────────────────────────────────────────────────────────────────────────────
async function handlePirateStats(ctx) {
  const uid  = ctx.author ? ctx.author.id       : ctx.user.id;
  const uname= ctx.author ? ctx.author.username  : ctx.user.username;
  const p    = getPirate(uid, uname);
  const s    = shipStats(p);
  const xpPct= Math.round((p.xp / xpNeeded(p.level)) * 100);

  const embed = new EmbedBuilder()
    .setColor(0x1a6bc4)
    .setTitle(`🏴‍☠️ ${p.username} — Pirate Stats`)
    .addFields(
      { name: "🚢 Markab",     value: SHIPS[p.ship].name,                            inline: true  },
      { name: "⭐ Level",      value: `**${p.level}** (${xpPct}% → ${p.level+1})`,  inline: true  },
      { name: "❤️ HP",         value: hpBar(p.hp, p.maxHp),                         inline: false },
      { name: "⚔️ Weerar",     value: `${playerAtk(p)} ATK`,                        inline: true  },
      { name: "🛡️ Difaac",     value: `${playerDef(p)} DEF`,                        inline: true  },
      { name: "👥 Crew",       value: `${p.crew}`,                                   inline: true  },
      { name: "🪙 Pirate Gold",value: `${fmt(p.gold)} Gold`,                         inline: true  },
      { name: "💎 Gems",       value: `${fmt(p.gems)} Gems`,                         inline: true  },
      { name: "⚔️ Hubka",      value: WEAPONS[p.weapon]?.name || "Cutlass",          inline: true  },
      { name: "🧥 Difaaca",    value: ARMORS[p.armor]?.name   || "Leather",          inline: true  },
      { name: "📊 Xog",
        value: `Voyages: **${p.stats.voyages}** | Guul: **${p.stats.battlesWon}** | Xumi: **${p.stats.battlesLost}** | Robs: **${p.stats.kingdomRobs}**`,
        inline: false },
      { name: "🚢 Ship Stats", value: `HP+${s.hp} SPD+${s.speed} DMG+${s.dmg} CARGO+${s.cargo}`, inline: false },
    )
    .setFooter({ text: "!voyage !piratebattle !pirateshop !upgrade !islands !kingdomrob" })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !voyage
// ─────────────────────────────────────────────────────────────────────────────
async function handleVoyage(ctx) {
  const uid   = ctx.author ? ctx.author.id       : ctx.user.id;
  const uname = ctx.author ? ctx.author.username  : ctx.user.username;
  const p     = getPirate(uid, uname);

  const now = Date.now();
  if (now - p.lastVoyage < VOYAGE_CD) {
    const left = VOYAGE_CD - (now - p.lastVoyage);
    return ctx.reply(`⏳ Safar dambe waa joogso — **${fmtCd(left)}** ku sug!`);
  }
  if (p.hp <= 0) return ctx.reply("❤️ Markabkaagu HP waayo — `!pirateshop` ka iib crew si aad iska daweysid!");

  p.lastVoyage = now;
  p.stats.voyages++;

  // Check rare events first
  for (const rare of RARE_EVENTS) {
    if (Math.random() < rare.chance) {
      p.gold += rare.gold;
      p.gems  += rare.gems;
      addXp(p, rare.xp);
      p.stats.totalGoldEarned += rare.gold;
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle(`✨✨ ${rare.name} ✨✨`)
        .setDescription(
          `**WOW!** Nasiib baad heshay!\n\n` +
          `💰 +**${fmt(rare.gold)} Gold** | 💎 +**${fmt(rare.gems)} Gems** | ⭐ +**${rare.xp} XP**\n\n` +
          `Pirate Gold-gaagu: **${fmt(p.gold)}** | Gems: **${fmt(p.gems)}**`
        )
        .setTimestamp();
      return ctx.reply({ embeds: [embed] });
    }
  }

  // Normal events
  let cumChance = 0;
  const roll    = Math.random();
  let   chosen  = VOYAGE_EVENTS[VOYAGE_EVENTS.length - 1];
  for (const ev of VOYAGE_EVENTS) {
    cumChance += ev.chance;
    if (roll < cumChance) { chosen = ev; break; }
  }

  const reward  = chosen.reward(p);
  let   xpGiven = 0;

  if (reward.gold) {
    p.gold += reward.gold;
    p.stats.totalGoldEarned += reward.gold;
    xpGiven += Math.floor(reward.gold / 20);
  }
  if (reward.gems) {
    p.gems += reward.gems;
    xpGiven += reward.gems * 5;
  }
  if (xpGiven > 0) addXp(p, xpGiven);

  const color = chosen.bad ? 0xe74c3c : 0x2ecc71;
  const desc  = reward.gold
    ? chosen.desc(reward.gold, reward.gems || 0)
    : reward.dmg
    ? chosen.desc(reward.dmg)
    : reward.lost !== undefined
    ? chosen.desc(reward.lost)
    : chosen.desc();

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🗺️ Voyage — ${chosen.title}`)
    .setDescription(desc)
    .addFields(
      { name: "🪙 Pirate Gold", value: fmt(p.gold),              inline: true },
      { name: "💎 Gems",        value: fmt(p.gems),              inline: true },
      { name: "❤️ HP",          value: `${p.hp}/${p.maxHp}`,    inline: true },
      { name: "⭐ XP",          value: `+${xpGiven} XP`,        inline: true },
    )
    .setFooter({ text: `Voyage-ka xiga: ${fmtCd(VOYAGE_CD)}` })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !piratebattle [@user]
// ─────────────────────────────────────────────────────────────────────────────
async function handlePirateBattle(ctx, targetUser) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const p     = getPirate(uid, uname);

  const now = Date.now();
  if (now - p.lastBattle < BATTLE_CD) {
    const left = BATTLE_CD - (now - p.lastBattle);
    return ctx.reply(`⏳ Dagaal dambe ka hore — **${fmtCd(left)}** ku sug!`);
  }
  if (p.hp <= 0) return ctx.reply("❤️ HP waayo — crew cusub iibso!");

  p.lastBattle = now;

  // ── AI Battle ──────────────────────────────────────────────────────────────
  if (!targetUser) {
    const enemyTpl = AI_ENEMIES[Math.min(Math.floor(p.level / 3), AI_ENEMIES.length - 1)];
    const enemy    = { ...enemyTpl, hp: enemyTpl.hp, maxHp: enemyTpl.hp };

    let pHp   = p.hp;
    const atk = playerAtk(p);
    const def = playerDef(p);
    let rounds = 0;
    const log  = [];

    while (pHp > 0 && enemy.hp > 0 && rounds < 20) {
      rounds++;
      const pDmg = Math.max(1, atk - enemy.def + rnd(-5, 5));
      const eDmg = Math.max(1, enemy.atk - def  + rnd(-5, 5));
      enemy.hp -= pDmg;
      if (enemy.hp > 0) pHp -= eDmg;
      if (rounds <= 4) log.push(`Round ${rounds}: ⚔️ -${pDmg}HP ↔️ 💥 -${eDmg}HP`);
    }

    const won = enemy.hp <= 0;
    p.hp      = Math.max(1, won ? pHp : Math.max(1, p.hp - rnd(20, 50)));

    if (won) {
      const g  = rnd(enemyTpl.goldMin, enemyTpl.goldMax);
      const gm = rnd(enemyTpl.gemMin, enemyTpl.gemMax);
      p.gold  += g;
      p.gems  += gm;
      addXp(p, Math.floor(g / 15) + gm * 3);
      p.stats.battlesWon++;
      p.stats.totalGoldEarned += g;

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(`⚔️ Dagaal — Guulaysatay vs ${enemy.name}!`)
        .setDescription(log.join("\n") + (rounds > 4 ? `\n...${rounds} rounds total` : ""))
        .addFields(
          { name: "💰 Abaal",    value: `+${fmt(g)} Gold | +${fmt(gm)} Gems`, inline: true },
          { name: "❤️ HP",       value: `${p.hp}/${p.maxHp}`,                 inline: true },
          { name: "🪙 Total",    value: fmt(p.gold),                           inline: true },
        )
        .setTimestamp();
      return ctx.reply({ embeds: [embed] });
    } else {
      const goldLost = Math.min(p.gold, rnd(100, 400));
      p.gold        -= goldLost;
      p.stats.battlesLost++;
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle(`💀 Dagaal — Lagu adkaaday vs ${enemy.name}!`)
        .setDescription(log.join("\n") + (rounds > 4 ? `\n...${rounds} rounds total` : ""))
        .addFields(
          { name: "💸 Lumay",    value: `-${fmt(goldLost)} Gold`,      inline: true },
          { name: "❤️ HP",       value: `${p.hp}/${p.maxHp}`,          inline: true },
        )
        .setTimestamp();
      return ctx.reply({ embeds: [embed] });
    }
  }

  // ── PvP Battle ─────────────────────────────────────────────────────────────
  if (targetUser.bot || targetUser.id === uid) return ctx.reply("❌ Naflahaaga la dagaalami kartid!");
  const opp  = getPirate(targetUser.id, targetUser.username);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pb_accept_${uid}`).setLabel("✅ Aqbal").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`pb_decline_${uid}`).setLabel("❌ Diid").setStyle(ButtonStyle.Danger),
  );
  battleQueue.set(uid, { challenged: targetUser.id, expires: Date.now() + 60000 });

  const cEmbed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("⚔️ Dagaal PvP!")
    .setDescription(
      `<@${uid}> wuxuu ku diray ${SHIPS[p.ship].name}\n` +
      `<@${targetUser.id}> wuxuu leeyahay ${SHIPS[opp.ship].name}\n\n` +
      `**<@${targetUser.id}>** — ma aqbashaa?`
    )
    .addFields(
      { name: `⚔️ ${uname}`,       value: `ATK: ${playerAtk(p)} | DEF: ${playerDef(p)} | HP: ${p.hp}`,   inline: true },
      { name: `⚔️ ${opp.username}`, value: `ATK: ${playerAtk(opp)} | DEF: ${playerDef(opp)} | HP: ${opp.hp}`, inline: true },
    )
    .setFooter({ text: "60 ilbiriqsi gudahood aqbal" })
    .setTimestamp();
  return ctx.reply({ content: `<@${targetUser.id}>`, embeds: [cEmbed], components: [row] });
}

async function handleBattleButton(interaction) {
  const parts   = interaction.customId.split("_");
  const action  = parts[1];
  const ownerId = parts[2];

  const entry = battleQueue.get(ownerId);
  if (!entry || Date.now() > entry.expires) {
    return interaction.update({ content: "⌛ Waqtiga dagaalku dhaafay.", components: [] });
  }
  if (interaction.user.id !== entry.challenged) {
    return interaction.reply({ content: "❌ Adigu kuma aha loo diray.", ephemeral: true });
  }

  battleQueue.delete(ownerId);

  if (action === "decline") {
    return interaction.update({ content: "❌ Dagaalka waa la diiday.", embeds: [], components: [] });
  }

  // Run battle
  const att = getPirate(ownerId,             interaction.guild?.members?.cache?.get(ownerId)?.user?.username || "Player1");
  const def = getPirate(entry.challenged,    interaction.user.username);

  let aHp = att.hp, dHp = def.hp;
  const log = [];
  let rounds = 0;

  while (aHp > 0 && dHp > 0 && rounds < 20) {
    rounds++;
    const aDmg = Math.max(1, playerAtk(att) - playerDef(def) + rnd(-8, 8));
    const dDmg = Math.max(1, playerAtk(def) - playerDef(att) + rnd(-8, 8));
    dHp -= aDmg; if (dHp > 0) aHp -= dDmg;
    if (rounds <= 4) log.push(`R${rounds}: <@${ownerId}> -${aDmg} ↔️ <@${entry.challenged}> -${dDmg}`);
  }

  const attackerWon = dHp <= 0;
  const winner = attackerWon ? att : def;
  const loser  = attackerWon ? def : att;
  const loserId= attackerWon ? entry.challenged : ownerId;

  const reward   = rnd(300, 800);
  const gemReward= rnd(5, 20);
  const goldTake = Math.min(loser.gold, Math.floor(loser.gold * 0.15));
  winner.gold += reward + goldTake;
  loser.gold   = Math.max(0, loser.gold - goldTake);
  winner.gems  += gemReward;
  addXp(winner, reward / 10);
  winner.stats.battlesWon++;
  loser.stats.battlesLost++;
  winner.stats.totalGoldEarned += reward;
  att.hp = Math.max(1, aHp);
  def.hp = Math.max(1, dHp);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`⚔️ PvP Dagaal — ${winner.username} Guulaysatay!`)
    .setDescription(log.join("\n") + (rounds > 4 ? `\n...${rounds} rounds total` : ""))
    .addFields(
      { name: "🏆 Guulaha",   value: `<@${winner.userId}> | +${fmt(reward + goldTake)} Gold | +${gemReward} Gems`, inline: false },
      { name: "💸 Lunsaday",  value: `<@${loserId}> | -${fmt(goldTake)} Gold`, inline: false },
    )
    .setTimestamp();
  return interaction.update({ embeds: [embed], components: [] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !pirateshop
// ─────────────────────────────────────────────────────────────────────────────
async function handlePirateShop(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const p     = getPirate(uid, uname);
  const sub   = (args[0] || "").toLowerCase();

  if (!sub || sub === "help") return showShopMenu(ctx, p);
  if (sub === "ship")   return buyShip(ctx, p, args[1]);
  if (sub === "weapon") return buyWeapon(ctx, p, args[1]);
  if (sub === "armor")  return buyArmor(ctx, p, args[1]);
  if (sub === "crew")   return buyCrew(ctx, p, parseInt(args[1]) || 1);
  if (sub === "heal")   return healShip(ctx, p);
  return showShopMenu(ctx, p);
}

async function showShopMenu(ctx, p) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("⚓ Pirate Shop")
    .setDescription(`Pirate Gold-gaaga: **${fmt(p.gold)} Gold** | **${fmt(p.gems)} Gems**`)
    .addFields(
      { name: "🚢 Maraakiib",
        value: Object.values(SHIPS).filter(s => s.price > 0)
          .map(s => `\`${s.id}\` ${s.name} — **${fmt(s.price)}G** | HP:${s.hp} SPD:${s.speed} DMG:${s.dmg}`)
          .join("\n"),
        inline: false },
      { name: "⚔️ Hubka (Weapons)",
        value: Object.values(WEAPONS).filter(w => w.price > 0)
          .map(w => `\`${w.id}\` ${w.name} — **${fmt(w.price)}G** | DMG:+${w.dmg}`)
          .join("\n"),
        inline: false },
      { name: "🛡️ Difaac (Armors)",
        value: Object.values(ARMORS).filter(a => a.price > 0)
          .map(a => `\`${a.id}\` ${a.name} — **${fmt(a.price)}G** | DEF:+${a.def}`)
          .join("\n"),
        inline: false },
      { name: "👥 Crew / ❤️ Heal",
        value: "`!pirateshop crew <n>` — 500G/qof (crew badan = defense badan)\n`!pirateshop heal` — 1000G (HP dhammaystir)",
        inline: false },
    )
    .addFields(
      { name: "📌 Amarka",
        value: "`!pirateshop ship <id>` | `!pirateshop weapon <id>` | `!pirateshop armor <id>`",
        inline: false },
    )
    .setFooter({ text: "Pirate Gold lagugu iibsadaa — kuma aha main coins" })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

async function buyShip(ctx, p, shipId) {
  if (!shipId) return ctx.reply("❌ `!pirateshop ship <id>` — ids: dinghy sloop brigantine galleon manowar legendary");
  const ship = SHIPS[shipId];
  if (!ship) return ctx.reply(`❌ Markab \`${shipId}\` la'ayn!`);
  if (p.ship === shipId) return ctx.reply("❌ Hore baa leedahay!");
  if (ship.price === 0) return ctx.reply("❌ Dinghy bilaash starting markab ah — hore baad leedahay!");
  if (p.gold < ship.price) return ctx.reply(`❌ Gold kuma filan! Waxaad u baahan tahay **${fmt(ship.price)}G** — leedahay **${fmt(p.gold)}G**`);
  p.gold -= ship.price;
  p.ship  = shipId;
  p.shipUpgrades = { speed: 0, hp: 0, dmg: 0, cargo: 0 };
  const s = shipStats(p);
  p.maxHp = s.hp;
  p.hp    = s.hp;
  return ctx.reply(`✅ ${ship.name} waa iibsatay! HP dib u cusbooneystay: **${p.maxHp}** | Hadda: **${fmt(p.gold)}G**`);
}

async function buyWeapon(ctx, p, weaponId) {
  if (!weaponId) return ctx.reply("❌ `!pirateshop weapon <id>` — ids: pistol cannon hwarang kraken_claw");
  const w = WEAPONS[weaponId];
  if (!w) return ctx.reply(`❌ Hub \`${weaponId}\` la'ayn!`);
  if (p.weapon === weaponId) return ctx.reply("❌ Hore baa leedahay!");
  if (p.gold < w.price) return ctx.reply(`❌ Gold kuma filan! Waxaad u baahan tahay **${fmt(w.price)}G**`);
  p.gold  -= w.price;
  p.weapon = weaponId;
  return ctx.reply(`✅ ${w.name} waa iibsatay! ATK cusub: **${playerAtk(p)}** | Hadda: **${fmt(p.gold)}G**`);
}

async function buyArmor(ctx, p, armorId) {
  if (!armorId) return ctx.reply("❌ `!pirateshop armor <id>` — ids: chain plate dragon phantom");
  const a = ARMORS[armorId];
  if (!a) return ctx.reply(`❌ Difaac \`${armorId}\` la'ayn!`);
  if (p.armor === armorId) return ctx.reply("❌ Hore baa leedahay!");
  if (p.gold < a.price) return ctx.reply(`❌ Gold kuma filan! Waxaad u baahan tahay **${fmt(a.price)}G**`);
  p.gold -= a.price;
  p.armor = armorId;
  return ctx.reply(`✅ ${a.name} waa iibsatay! DEF cusub: **${playerDef(p)}** | Hadda: **${fmt(p.gold)}G**`);
}

async function buyCrew(ctx, p, n) {
  if (isNaN(n) || n < 1) return ctx.reply("❌ `!pirateshop crew <qof-xad>` — tusaale: `!pirateshop crew 5`");
  const cost = n * 500;
  if (p.gold < cost) return ctx.reply(`❌ **${n} crew** = **${fmt(cost)}G** — leedahay ${fmt(p.gold)}G`);
  p.gold -= cost;
  p.crew  += n;
  return ctx.reply(`✅ +${n} crew ku daray! Crew: **${p.crew}** | DEF cusub: **${playerDef(p)}** | Hadda: **${fmt(p.gold)}G**`);
}

async function healShip(ctx, p) {
  const healCost = 1000;
  if (p.hp >= p.maxHp) return ctx.reply(`✅ Markabkaagu waxa caafi — HP: **${p.hp}/${p.maxHp}**`);
  if (p.gold < healCost) return ctx.reply(`❌ Heal = **1,000G** — leedahay **${fmt(p.gold)}G**`);
  p.gold -= healCost;
  p.hp    = p.maxHp;
  return ctx.reply(`❤️ Markabkaagu waa la daweeyay! HP: **${p.hp}/${p.maxHp}** | Hadda: **${fmt(p.gold)}G**`);
}

// ─────────────────────────────────────────────────────────────────────────────
// !upgrade ship <stat>
// ─────────────────────────────────────────────────────────────────────────────
async function handleUpgrade(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const p     = getPirate(uid, uname);

  const type = (args[1] || "").toLowerCase();
  if ((args[0] || "").toLowerCase() !== "ship" || !type) {
    const upgCosts = { speed: 2000, hp: 3000, dmg: 4000, cargo: 1500 };
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("⬆️ Upgrade — Markabkaaga")
      .setDescription(`Pirate Gold: **${fmt(p.gold)}G**`)
      .addFields(
        { name: "🚤 Speed",  value: `Level: **${p.shipUpgrades.speed}** | Cost: **2,000G** → +5 speed kasta`,  inline: true },
        { name: "❤️ HP",     value: `Level: **${p.shipUpgrades.hp}**    | Cost: **3,000G** → +50 HP kasta`,    inline: true },
        { name: "⚔️ Damage", value: `Level: **${p.shipUpgrades.dmg}**   | Cost: **4,000G** → +8 DMG kasta`,   inline: true },
        { name: "📦 Cargo",  value: `Level: **${p.shipUpgrades.cargo}** | Cost: **1,500G** → +10 cargo kasta`, inline: true },
        { name: "📌 Amarka", value: "`!upgrade ship speed|hp|dmg|cargo`", inline: false },
      )
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  }

  const costs   = { speed: 2000, hp: 3000, dmg: 4000, cargo: 1500 };
  const maxLevs = { speed: 10, hp: 10, dmg: 10, cargo: 10 };

  if (!costs[type]) return ctx.reply("❌ Nooca: `speed` `hp` `dmg` `cargo`");
  if ((p.shipUpgrades[type] || 0) >= maxLevs[type]) return ctx.reply(`❌ Max upgrade level gaadhay (${maxLevs[type]})!`);

  const curLevel = p.shipUpgrades[type] || 0;
  const cost     = costs[type] * (curLevel + 1);
  if (p.gold < cost)
    return ctx.reply(`❌ Upgrade **${type}** Level ${curLevel + 1} = **${fmt(cost)}G** — leedahay **${fmt(p.gold)}G**`);

  p.gold -= cost;
  p.shipUpgrades[type] = curLevel + 1;
  if (type === "hp") {
    p.maxHp += 50;
    p.hp = Math.min(p.hp + 50, p.maxHp);
  }
  const s = shipStats(p);
  return ctx.reply(
    `✅ **${type.toUpperCase()}** upgrade Level **${p.shipUpgrades[type]}**!\n` +
    `Ship stats: HP ${s.hp} | SPD ${s.speed} | DMG ${s.dmg} | Cargo ${s.cargo}\n` +
    `Hadda: **${fmt(p.gold)}G**`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// !islands  /  !sail <island>
// ─────────────────────────────────────────────────────────────────────────────
async function handleIslands(ctx) {
  const uid   = ctx.author ? ctx.author.id       : ctx.user.id;
  const uname = ctx.author ? ctx.author.username  : ctx.user.username;
  const p     = getPirate(uid, uname);
  const now   = Date.now();

  const embed = new EmbedBuilder()
    .setColor(0x1abc9c)
    .setTitle("🏝️ Jasiiradaha — Islands")
    .setDescription("Amarka: `!sail <island_id>` — dagaal ku qabo jasiiradda!")
    .setTimestamp();

  for (const isl of ISLANDS) {
    const cdMs  = (p.islandCooldowns[isl.id] || 0) + isl.cd * 60 * 1000 - now;
    const status= cdMs > 0 ? `⏳ ${fmtCd(cdMs)}` : "✅ Diyaar";
    embed.addFields({
      name:  isl.name,
      value: `Cadow: **${isl.enemy}** | Abaal x**${isl.bonusMul}** | Gold: ${isl.minG}-${isl.maxG}\nID: \`${isl.id}\` | ${status}`,
      inline: false,
    });
  }
  return ctx.reply({ embeds: [embed] });
}

async function handleSail(ctx, args) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const p     = getPirate(uid, uname);
  const islId = (args[0] || "").toLowerCase();

  const isl   = ISLANDS.find(i => i.id === islId);
  if (!isl) return ctx.reply(`❌ Jasiirad \`${islId}\` la'ayn! Islands: ${ISLANDS.map(i=>i.id).join(", ")}`);

  const now   = Date.now();
  const cdEnd = (p.islandCooldowns[isl.id] || 0) + isl.cd * 60 * 1000;
  if (now < cdEnd) {
    const left = cdEnd - now;
    return ctx.reply(`⏳ ${isl.name} — ${fmtCd(left)} ka dib ku soo noqo!`);
  }
  if (p.hp <= 0) return ctx.reply("❤️ HP waayo — crew cusub iibso!");

  p.islandCooldowns[isl.id] = now;

  const atk      = playerAtk(p);
  const def      = playerDef(p);
  const enemyHp  = Math.round(50 * isl.bonusMul);
  const enemyAtk = Math.round(15 * isl.bonusMul);
  const enemyDef = Math.round(8 * isl.bonusMul);

  let pHp = p.hp, eHp = enemyHp, rounds = 0;
  const log = [];
  while (pHp > 0 && eHp > 0 && rounds < 15) {
    rounds++;
    const pDmg = Math.max(1, atk - enemyDef + rnd(-5, 5));
    const eDmg = Math.max(1, enemyAtk - def  + rnd(-5, 5));
    eHp -= pDmg;
    if (eHp > 0) pHp -= eDmg;
    if (rounds <= 3) log.push(`R${rounds}: ⚔️ -${pDmg} ↔️ 💥 -${eDmg}`);
  }

  p.hp = Math.max(1, pHp);

  if (eHp <= 0) {
    const gold = Math.round(rnd(isl.minG, isl.maxG) * isl.bonusMul);
    const gems = rnd(5, 15);
    p.gold += gold;
    p.gems  += gems;
    addXp(p, Math.floor(gold / 10) + gems * 2);
    p.stats.battlesWon++;
    p.stats.totalGoldEarned += gold;

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(`🏝️ ${isl.name} — Guulaysatay vs ${isl.enemy}!`)
      .setDescription(log.join("\n") + (rounds > 3 ? `\n...${rounds} rounds` : ""))
      .addFields(
        { name: "💰 Abaal",   value: `+${fmt(gold)} Gold | +${gems} Gems`, inline: true },
        { name: "❤️ HP",      value: `${p.hp}/${p.maxHp}`,                  inline: true },
        { name: "⭐ Level",   value: String(p.level),                        inline: true },
      )
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  } else {
    const goldLost = Math.min(p.gold, rnd(100, 300));
    p.gold        -= goldLost;
    p.stats.battlesLost++;
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`💀 ${isl.name} — Lagu adkaaday vs ${isl.enemy}!`)
      .setDescription(log.join("\n"))
      .addFields(
        { name: "💸 Lumay",  value: `-${fmt(goldLost)} Gold`, inline: true },
        { name: "❤️ HP",     value: `${p.hp}/${p.maxHp}`,     inline: true },
      )
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// !piratedaily
// ─────────────────────────────────────────────────────────────────────────────
async function handlePirateDaily(ctx) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const p     = getPirate(uid, uname);

  const now  = Date.now();
  if (now - p.lastDaily < DAILY_CD) {
    const left = DAILY_CD - (now - p.lastDaily);
    return ctx.reply(`⏳ Daily hore u qaaday — **${fmtCd(left)}** ku sug!`);
  }
  p.lastDaily = now;

  const gold = rnd(100, 300) * (1 + (p.level - 1) * 0.05);
  const gems  = rnd(3, 10);
  const keys  = 1;
  p.gold += Math.round(gold);
  p.gems  += gems;
  addXp(p, 50);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("🎁 Pirate Daily Reward!")
    .addFields(
      { name: "💰 Gold",      value: `+${fmt(Math.round(gold))}`,  inline: true },
      { name: "💎 Gems",      value: `+${gems}`,                   inline: true },
      { name: "🗝️ Treasure Key", value: `+${keys}`,               inline: true },
      { name: "🪙 Pirate Gold",  value: fmt(p.gold),               inline: true },
      { name: "💎 Gems Total",   value: fmt(p.gems),               inline: true },
    )
    .setFooter({ text: "Maanta waa la qaaday — berrito ku soo noqo!" })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !pirateleader
// ─────────────────────────────────────────────────────────────────────────────
async function handlePirateLeader(ctx) {
  const all   = Array.from(pirates.values());
  const medals= ["🥇","🥈","🥉","4️⃣","5️⃣"];

  const byGold   = [...all].sort((a,b) => b.gold + b.gems * 50  - (a.gold + a.gems * 50));
  const byWins   = [...all].sort((a,b) => b.stats.battlesWon     - a.stats.battlesWon);
  const byXp     = [...all].sort((a,b) => (b.level * 200 + b.xp) - (a.level * 200 + a.xp));

  const top = (list) => list.slice(0,5).map((p, i) =>
    `${medals[i] || `${i+1}.`} **${p.username}** — Level ${p.level} | ${SHIPS[p.ship].name}`
  ).join("\n") || "Cidina kuma jirto";

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("🏆 Pirate Leaderboard")
    .addFields(
      { name: "💰 Ugu Taajirsan (Gold+Gems)",  value: top(byGold), inline: false },
      { name: "⚔️ Ugu Badan Guulaysatay",       value: top(byWins), inline: false },
      { name: "⭐ Ugu XP Badan",                value: top(byXp),  inline: false },
    )
    .setFooter({ text: `${all.length} Pirates ganacsadeyaal` })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// !kingdomrob  (Kingdom Robbery — costs 20K gold + 10K diamond, fixed big reward)
// ─────────────────────────────────────────────────────────────────────────────
const KINGDOM_GOLD_COST    = 20000;  // Pirate gold required (bomb cost)
const KINGDOM_DIAMOND_COST = 10000;  // Main diamond coins required

async function handleKingdomRob(ctx) {
  const uid   = ctx.author ? ctx.author.id      : ctx.user.id;
  const uname = ctx.author ? ctx.author.username : ctx.user.username;
  const p     = getPirate(uid, uname);
  const main  = require("./data");

  const now     = Date.now();
  const robData = robCooldowns.get(uid) || { lastRob: 0 };

  if (now - robData.lastRob < KINGDOM_CD) {
    const left  = KINGDOM_CD - (now - robData.lastRob);
    const hours = Math.floor(left / 3600000);
    const mins  = Math.floor((left % 3600000) / 60000);
    return ctx.reply(`⏳ Kingdom rob hore u samaysay — **${hours}s ${mins}d** ku sug!`);
  }

  // ── Check player has the "bomb" (20K pirate gold + 10K main diamond) ───────
  const mainPlayer = main.getPlayer(uid, uname);
  if (p.gold < KINGDOM_GOLD_COST) {
    return ctx.reply(
      `❌ **Kingdom Rob** waa u baahan tahay **💣 Qaraxa** — haysatid:\n\n` +
      `🏴‍☠️ Pirate Gold: **${fmt(p.gold)}** / **${fmt(KINGDOM_GOLD_COST)}** ❌\n` +
      `💎 Diamond: **${fmt(mainPlayer.diamondCoins)}** / **${fmt(KINGDOM_DIAMOND_COST)}** ${mainPlayer.diamondCoins >= KINGDOM_DIAMOND_COST ? "✅" : "❌"}\n\n` +
      `Labo currency-ba waa lagama maarmaan — **qaraxa** samee!`
    );
  }
  if (mainPlayer.diamondCoins < KINGDOM_DIAMOND_COST) {
    return ctx.reply(
      `❌ **Kingdom Rob** waa u baahan tahay **💣 Qaraxa** — haysatid:\n\n` +
      `🏴‍☠️ Pirate Gold: **${fmt(p.gold)}** / **${fmt(KINGDOM_GOLD_COST)}** ✅\n` +
      `💎 Diamond: **${fmt(mainPlayer.diamondCoins)}** / **${fmt(KINGDOM_DIAMOND_COST)}** ❌\n\n` +
      `Diamond ma filna — \`!war\` ku guul (+50💎) ama \`!daily\` (+10💎).`
    );
  }

  // ── Deduct the bomb cost ───────────────────────────────────────────────────
  p.gold -= KINGDOM_GOLD_COST;
  main.removeDiamond(uid, uname, KINGDOM_DIAMOND_COST);
  robCooldowns.set(uid, { lastRob: now });

  // ── Fixed reward: 100K coins + 10 gold + 15 diamond ───────────────────────
  const coinsReward   = 100000;
  const goldReward    = 10;
  const diamondReward = 15;

  main.addCoins(uid, uname, coinsReward);
  main.addGold(uid, uname, goldReward);
  main.addDiamond(uid, uname, diamondReward);

  p.stats.kingdomRobs++;
  addXp(p, 300);

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("💥🏰 KINGDOM QARAXA — GUULAYSATAY! 🏰💥")
    .setDescription(
      `# ⚔️ BOOOM! Boqortooyadii waa la qarxiyay!\n` +
      `Khasnadihii boqortooyadda waa la furtay — **abaal weyn** ayaad heshay!`
    )
    .addFields(
      { name: "💣 Qaraxda",        value: `-${fmt(KINGDOM_GOLD_COST)} 🏴‍☠️ Gold\n-${fmt(KINGDOM_DIAMOND_COST)} 💎 Diamond`, inline: true  },
      { name: "🎁 Abaalka",        value: `+**${fmt(coinsReward)} 🪙** Coins\n+**${goldReward} 💛** Dahab\n+**${diamondReward} 💎** Diamond`, inline: true  },
      { name: "🏰 Kingdom Robs",   value: String(p.stats.kingdomRobs),           inline: true  },
      { name: "🪙 Coins Hadda",    value: fmt(main.getPlayer(uid, uname).coins),  inline: true  },
      { name: "⏰ Xigta",          value: "**2 maalin** ka dib baad dib u samayn kartaa",        inline: false },
    )
    .setFooter({ text: "Kingdom Rob — labo maalin cooldown" })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  pirates,
  handlePirateStats,
  handleVoyage,
  handlePirateBattle,
  handleBattleButton,
  handlePirateShop,
  handleUpgrade,
  handleIslands,
  handleSail,
  handlePirateDaily,
  handlePirateLeader,
  handleKingdomRob,
};
