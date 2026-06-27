"use strict";

/**
 * horseRace.js v3 — Weather system + Speed 200-500
 */

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
} = require("discord.js");

const db      = require("./data");
const weather = require("./weather");

const TRACK_LENGTH  = 10;
const TICK_INTERVAL = 2000;
const CLEANUP_DELAY = 90000;
const MIN_PLAYERS   = 2;
const MAX_SPEED     = 500;

const START_GIF = "https://tenor.com/view/bravestarr-horse-slap-gif-24857865";

const HORSE_NAMES = [
  "Thunder","Rocket","Blaze","Storm","Lightning","Shadow","Eclipse","Phantom",
  "Comet","Tornado","Inferno","Cyclone","Vortex","Avalanche","Titan",
  "Arrow","Hurricane","Ghost","Fury","Bolt",
];

const STATE = { WAITING: "WAITING", RACING: "RACING", FINISHED: "FINISHED" };

const EVENTS = [
  { id:"turbo",    icon:"🚀", speedMod:+80,  dur:2, msg:(n)=>`🚀 **${n}** gets a TURBO BOOST!` },
  { id:"stumble",  icon:"😵", speedMod:-50,  dur:2, msg:(n)=>`😵 **${n}** stumbles!` },
  { id:"burst",    icon:"⚡", speedMod:+60,  dur:1, msg:(n)=>`⚡ **${n}** unleashes a Speed Burst!` },
  { id:"comeback", icon:"🔥", speedMod:+100, dur:2, msg:(n)=>`🔥 **${n}** INCREDIBLE comeback!` },
  { id:"mud",      icon:"🟫", speedMod:-40,  dur:2, msg:(n)=>`🟫 **${n}** hits mud!` },
  { id:"wind",     icon:"💨", speedMod:+50,  dur:1, msg:(n)=>`💨 **${n}** catches tailwind!` },
];

const GENERAL_LINES = [
  (n)=>  `🎙️ **${n}** is pulling ahead!`,
  (n)=>  `🎙️ **${n}** looks unstoppable!`,
  ()=>   `🎙️ What an incredible race!`,
  ()=>   `🎙️ The crowd is on their feet!`,
  (n)=>  `🎙️ Can anyone stop **${n}**?`,
  ()=>   `🎙️ One for the history books!`,
];

const activeRaces = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sleep(ms)       { return new Promise((r) => setTimeout(r, ms)); }

function pickHorseName(usedNames) {
  const pool = HORSE_NAMES.filter((n) => !usedNames.has(n));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : "Horse" + rand(100, 999);
}

function getShopBonus(userId) {
  const horse = db.getActiveHorse(userId);
  if (!horse) return { speedBonus: 0, luckBonus: 0, name: null };
  // Check diamond horse gear too
  const p         = db.getPlayer(userId);
  const diamondGear = p.items.find((i) => i.id === "diamond_horse" || i.type === "horse_gear");
  return {
    speedBonus: (horse.speedBonus || 0) + (diamondGear ? (diamondGear.speedBonus || 0) : 0),
    luckBonus:  (horse.luckBonus  || 0) + (diamondGear ? (diamondGear.luckBonus  || 0) : 0),
    name: horse.name,
  };
}

function getBooster(userId, effect) {
  return db.getPlayer(userId).items.some((i) => i.type === "race_booster" && i.effect === effect);
}
function consumeBooster(userId, effect) {
  const p   = db.getPlayer(userId);
  const idx = p.items.findIndex((i) => i.type === "race_booster" && i.effect === effect);
  if (idx !== -1) p.items.splice(idx, 1);
}

function createHorse(userId, username, usedNames) {
  const name  = pickHorseName(usedNames);
  usedNames.add(name);
  const bonus = getShopBonus(userId);

  const hasTurbo   = getBooster(userId, "turbo");
  const hasLucky   = getBooster(userId, "lucky");
  const hasShield  = getBooster(userId, "shield");
  if (hasTurbo) consumeBooster(userId, "turbo");
  if (hasLucky) consumeBooster(userId, "lucky");

  const baseSpeed   = bonus.speedBonus > 0 ? bonus.speedBonus : rand(130, 180);
  const baseLuck    = bonus.luckBonus  > 0 ? bonus.luckBonus  : rand(40, 80);
  const baseStamina = rand(150, 250);

  return {
    name:     bonus.name ? `${bonus.name} (${name})` : name,
    userId, username,
    speed:    Math.min(MAX_SPEED, baseSpeed   + (hasTurbo ? 80 : 0)),
    luck:     Math.min(MAX_SPEED, baseLuck    + (hasLucky ? 60 : 0)),
    stamina:  baseStamina,
    position: 0,
    finished: false, finishRank: null,
    currentEvent: null, eventTicks: 0,
    shielded: hasShield,
    isShop:   bonus.speedBonus > 0,
  };
}

function renderBar(horse) {
  const filled = Math.min(TRACK_LENGTH, Math.floor((horse.position / 100) * TRACK_LENGTH));
  const empty  = TRACK_LENGTH - filled;
  const ev     = horse.currentEvent ? " " + horse.currentEvent.icon : "";
  return "▰".repeat(filled) + "▱".repeat(empty) + ev + (horse.shielded ? "🛡️" : "") + (horse.finished ? " 🏁" : "");
}

// ── Weather tick helpers ──────────────────────────────────────────────────────
function applyWeatherToSpeed(spd, luck, w) {
  return weather.applyWeather(spd, luck, w);
}

// ── Race tick ─────────────────────────────────────────────────────────────────
// Returns { done, weatherAlert } — weatherAlert is set when a dramatic weather change happens
function advanceRace(race) {
  const prevOrder = [...race.horses].sort((a, b) => b.position - a.position).map((h) => h.name);
  let commentary    = null;
  let weatherAlert  = null; // { weather } if dramatic change

  // Change weather every 4 ticks
  if (race.tick % 4 === 0 && race.tick > 0) {
    const newW = weather.pickWeather();
    if (newW.id !== race.currentWeather.id) {
      race.currentWeather = newW;
      commentary = newW.msg;
      // Dramatic alert for severe weather
      if (["heavy_rain", "hail", "fog"].includes(newW.id)) {
        weatherAlert = newW;
      }
    }
  }

  race.horses.forEach((horse) => {
    if (horse.finished) return;

    if (horse.currentEvent) {
      horse.eventTicks--;
      if (horse.eventTicks <= 0) horse.currentEvent = null;
    }

    if (!horse.currentEvent && Math.random() < 0.12) {
      const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
      if (ev.speedMod < 0 && horse.shielded) {
        horse.shielded = false;
        if (!commentary) commentary = `🛡️ **${horse.name}**'s shield blocked ${ev.icon}!`;
      } else {
        horse.currentEvent = ev;
        horse.eventTicks   = ev.dur;
        if (!commentary) commentary = ev.msg(horse.name);
      }
    }

    const w = race.currentWeather;
    const { speed: wSpeed, luck: wLuck } = applyWeatherToSpeed(horse.speed, horse.luck, w);

    const base      = (wSpeed / MAX_SPEED) * 7.5;
    const luckyMod  = (Math.random() * wLuck / MAX_SPEED) * 4;
    const endurance = horse.position > 55 ? (horse.stamina / MAX_SPEED) * 2 : 0;
    const evBonus   = horse.currentEvent ? horse.currentEvent.speedMod / MAX_SPEED * 7.5 : 0;

    horse.position = Math.min(100, horse.position + base + luckyMod + endurance + evBonus);

    if (horse.position >= 100 && !horse.finished) {
      horse.finished   = true;
      horse.finishRank = race.finishOrder.length + 1;
      race.finishOrder.push(horse);
    }
  });

  if (!commentary) {
    const newOrder = [...race.horses].sort((a, b) => b.position - a.position).map((h) => h.name);
    if (newOrder[0] !== prevOrder[0]) {
      commentary = `🎙️ **${newOrder[0]}** overtakes **${prevOrder[0]}**!`;
    } else if (Math.random() < 0.4) {
      const fn = GENERAL_LINES[Math.floor(Math.random() * GENERAL_LINES.length)];
      commentary = fn(newOrder[0]);
    }
  }

  if (commentary) race.commentary = commentary;
  return { done: race.horses.every((h) => h.finished), weatherAlert };
}

// ── Embeds ────────────────────────────────────────────────────────────────────
function weatherBar(w) {
  return `${w.icon} **${w.name}** | Speed ${w.speedMod >= 0 ? "+" : ""}${Math.round(w.speedMod * 100)}%`;
}

function buildComponents(race) {
  const canStart = race.players.size >= MIN_PLAYERS;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("race_join").setLabel("🐎 Join Race").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("race_leave").setLabel("🚪 Leave").setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("race_start").setLabel("▶️ Start").setStyle(ButtonStyle.Primary).setDisabled(!canStart),
      new ButtonBuilder().setCustomId("race_kick").setLabel("👢 Kick").setStyle(ButtonStyle.Secondary).setDisabled(race.players.size === 0),
      new ButtonBuilder().setCustomId("race_myboosters").setLabel("⚡ Boosters").setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function waitingEmbed(race) {
  const lines = race.horses.length === 0
    ? "*Wali qof kuma biirin!*"
    : race.horses.map((h, i) =>
        `\`${String(i+1).padStart(2,"0")}\` 🐎 **${h.name}**${h.isShop ? ` Speed:${h.speed}` : " (caadi)"} — ${h.username}`
      ).join("\n");

  return new EmbedBuilder()
    .setTitle("🏇 Horse Race — Waiting Room")
    .setColor(0x3498db)
    .setDescription(lines)
    .addFields(
      { name: "👥 Players",   value: `${race.players.size}`,             inline: true },
      { name: "⚠️ Min",      value: `${MIN_PLAYERS}`,                    inline: true },
      { name: "👑 Host",      value: `<@${race.createdBy}>`,             inline: true },
      { name: "🌤️ Cimilada",  value: weatherBar(race.currentWeather),   inline: false },
      { name: "💡 Tip",       value: "`!shop` faras iibso (500K–1M)",    inline: false },
    )
    .setFooter({ text: "somali77 Horse Racing v3" })
    .setTimestamp();
}

function liveEmbed(race) {
  const sorted = [...race.horses].sort((a, b) => b.position - a.position);
  const lanes  = sorted.map((h, i) => {
    const pos = ["🥇","🥈","🥉"][i] || `${i+1}.`;
    return `${pos} **${h.name}** *(${h.username})*\n\`${renderBar(h)}\``;
  });

  return new EmbedBuilder()
    .setTitle("🏁 LIVE RACE")
    .setColor(race.currentWeather.color || 0xffd700)
    .setDescription(lanes.join("\n\n"))
    .addFields(
      { name: `${race.currentWeather.icon} Cimilada`, value: weatherBar(race.currentWeather), inline: true },
      { name: "📢 Commentary",                         value: race.commentary || "🎙️ Off!",    inline: false },
    )
    .setFooter({ text: `Tick ${race.tick}` })
    .setTimestamp();
}

function finishEmbed(race) {
  const medals = ["🥇","🥈","🥉"];
  const podium = race.finishOrder.map((h, i) => {
    const r = [300, 150, 75][i] || 0;
    return `${medals[i]||`${i+1}.`} **${h.name}** — <@${h.userId}>${r ? ` +${r}🪙 +50💛` : ""}`;
  }).join("\n");

  return new EmbedBuilder()
    .setTitle("🏆 RACE FINISHED!")
    .setColor(0x00c851)
    .setDescription(podium)
    .addFields(
      { name: "🌤️ Cimiladii",  value: weatherBar(race.currentWeather), inline: true },
      { name: "📢 Final",       value: "🎙️ What an incredible race!",   inline: false },
    )
    .setFooter({ text: "somali77 Horse Racing v3" })
    .setTimestamp();
}

// ── Race engine ───────────────────────────────────────────────────────────────
async function runRace(race) {
  const ch = race.channel;
  await ch.send(START_GIF);
  await ch.send(`${race.currentWeather.icon} **Cimilada: ${race.currentWeather.name}** — ${race.currentWeather.msg}`);
  for (let i = 3; i >= 1; i--) { await ch.send(`⏳ **${i}...**`); await sleep(1000); }
  await ch.send("🚦 **GO GO GO!**");
  await race.raceMessage.edit({ embeds: [liveEmbed(race)], components: [] });

  const interval = setInterval(async () => {
    try {
      race.tick++;
      const { done, weatherAlert } = advanceRace(race);

      // ── Dramatic weather alert (qasri rob etc.) ───────────────────────────
      if (weatherAlert) {
        const isHeavyRain = weatherAlert.id === "heavy_rain";
        const alertEmbed  = new EmbedBuilder()
          .setColor(isHeavyRain ? 0x1a252f : weatherAlert.color)
          .setTitle(
            isHeavyRain
              ? "⛈️ ⛈️ QASRIGA ROB — DUUFAAN XOOG LEH! ⛈️ ⛈️"
              : `${weatherAlert.icon} Cimilada Isbedeshay — ${weatherAlert.name}`
          )
          .setDescription(
            isHeavyRain
              ? "# ⛈️ QASRIGA ROB!\n" +
                "Duufaan xoog leh baa soo degay — dhammaan fardaha **speed -35%**!\n" +
                "Waxaa run ah in tartamka isbedelayo — **nasiib** ayaa hadda go'aamiyaa!"
              : weatherAlert.msg
          )
          .addFields({
            name:  "📉 Saameynta",
            value: `Speed ${weatherAlert.speedMod >= 0 ? "+" : ""}${Math.round(weatherAlert.speedMod * 100)}% | Luck ${weatherAlert.luckMod >= 0 ? "+" : ""}${Math.round(weatherAlert.luckMod * 100)}%`,
            inline: false,
          })
          .setTimestamp();
        await ch.send({ embeds: [alertEmbed] });
      }

      if (done) {
        clearInterval(interval);
        race.state = STATE.FINISHED;
        const rewards = [300, 150, 75];
        race.finishOrder.forEach((h, i) => {
          if (rewards[i]) db.addCoins(h.userId, h.username, rewards[i]);
          if (i === 0) {
            db.addGold(h.userId, h.username, 50);
            db.getPlayer(h.userId, h.username).stats.racesWon++;
          }
          db.getPlayer(h.userId, h.username).stats.racesPlayed++;
        });
        await race.raceMessage.edit({ embeds: [finishEmbed(race)], components: [] });
        const w = race.finishOrder[0];
        await ch.send(`🏆 **${w.name}** (<@${w.userId}>) wins! +300 🪙 +50 💛`);
        setTimeout(() => activeRaces.delete(race.guildId), CLEANUP_DELAY);
      } else {
        await race.raceMessage.edit({ embeds: [liveEmbed(race)], components: [] });
      }
    } catch (err) {
      clearInterval(interval);
      activeRaces.delete(race.guildId);
      console.error("Race tick: " + err.message);
    }
  }, TICK_INTERVAL);
}

// ── Public API ────────────────────────────────────────────────────────────────
async function createRace(ctx) {
  const guildId  = ctx.guildId;
  const authorId = ctx.user ? ctx.user.id : ctx.author.id;

  if (activeRaces.has(guildId)) return ctx.reply({ content: "❌ Tartam hore ayaa socda!", ephemeral: true });
  if (db.checkJail(authorId))   return ctx.reply({ content: "❌ Xabsiga ayaad ku jirtaa!", ephemeral: true });

  const initWeather = weather.pickWeather();
  const race = {
    guildId, state: STATE.WAITING,
    players: new Map(), usedNames: new Set(),
    horses: [], finishOrder: [],
    currentWeather: initWeather,
    commentary: "🎙️ The horses are warming up...",
    tick: 0, raceMessage: null,
    channel: ctx.channel, createdBy: authorId,
  };
  activeRaces.set(guildId, race);

  const sent = await ctx.channel.send({ embeds: [waitingEmbed(race)], components: buildComponents(race) });
  race.raceMessage = sent;
  return ctx.reply({ content: `✅ Race waa la abuuray! ${initWeather.icon} Cimilada: **${initWeather.name}**`, ephemeral: !!ctx.user });
}

async function handleButton(interaction) {
  const guildId  = interaction.guildId;
  const userId   = interaction.user.id;
  const username = interaction.user.username;
  const race     = activeRaces.get(guildId);
  const id       = interaction.customId;

  if (id === "race_myboosters") {
    const p    = db.getPlayer(userId, username);
    const bst  = p.items.filter((i) => i.type === "race_booster");
    const hors = db.getActiveHorse(userId);
    const msg  = bst.length ? bst.map((b) => `• ${b.name}`).join("\n") : "Wax booster ah ma lihid — `!shop`";
    return interaction.reply({
      content: `**Faraskaaga:** ${hors ? `${hors.name} (Speed:${hors.speedBonus})` : "Caadi (~150)"}\n${msg}`,
      ephemeral: true,
    });
  }

  if (!race)                        return interaction.reply({ content: "❌ Tartam ma jiro.", ephemeral: true });
  if (race.state !== STATE.WAITING) return interaction.reply({ content: "❌ Tartamku bilaabmay!", ephemeral: true });

  if (id === "race_join") {
    if (db.checkJail(userId))     return interaction.reply({ content: "❌ Xabsiga ayaad ku jirtaa!", ephemeral: true });
    if (race.players.has(userId)) return interaction.reply({ content: "❌ Horay ayaad uga qayb galeen!", ephemeral: true });
    const horse = createHorse(userId, username, race.usedNames);
    race.players.set(userId, horse);
    race.horses.push(horse);
    await race.raceMessage.edit({ embeds: [waitingEmbed(race)], components: buildComponents(race) });
    return interaction.reply({ content: `🐎 Waad ku biiray! **${horse.name}** Speed:${horse.speed}`, ephemeral: true });
  }

  if (id === "race_leave") {
    if (!race.players.has(userId)) return interaction.reply({ content: "❌ Tartamkan kuma jirtid!", ephemeral: true });
    const horse = race.players.get(userId);
    race.players.delete(userId);
    race.usedNames.delete(horse.name);
    race.horses = race.horses.filter((h) => h.userId !== userId);
    await race.raceMessage.edit({ embeds: [waitingEmbed(race)], components: buildComponents(race) });
    return interaction.reply({ content: "🚪 Waad ka baxday.", ephemeral: true });
  }

  if (id === "race_start") {
    if (userId !== race.createdBy)       return interaction.reply({ content: "❌ Host kaliya!", ephemeral: true });
    if (race.players.size < MIN_PLAYERS) return interaction.reply({ content: `❌ ${MIN_PLAYERS} qof ugu yaraan!`, ephemeral: true });
    race.state = STATE.RACING;
    await interaction.reply({ content: "🏁 Bilaabmaya...", ephemeral: true });
    return runRace(race);
  }

  if (id === "race_kick") {
    if (userId !== race.createdBy) return interaction.reply({ content: "❌ Host kaliya!", ephemeral: true });
    if (!race.horses.length)       return interaction.reply({ content: "❌ Qof kuma jiraan.", ephemeral: true });
    const options = race.horses.map((h) => ({ label: `${h.name} — ${h.username}`, value: h.userId }));
    const menu = new StringSelectMenuBuilder().setCustomId("race_kick_select").setPlaceholder("Dooro...").addOptions(options);
    return interaction.reply({ content: "👢 Yaa?", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
  }
}

async function handleSelectMenu(interaction) {
  if (interaction.customId !== "race_kick_select") return;
  const race = activeRaces.get(interaction.guildId);
  if (!race || race.state !== STATE.WAITING) return interaction.reply({ content: "❌", ephemeral: true });
  if (interaction.user.id !== race.createdBy) return interaction.reply({ content: "❌ Host kaliya.", ephemeral: true });
  const targetId = interaction.values[0];
  const horse    = race.players.get(targetId);
  if (!horse) return interaction.reply({ content: "❌", ephemeral: true });
  race.players.delete(targetId);
  race.usedNames.delete(horse.name);
  race.horses = race.horses.filter((h) => h.userId !== targetId);
  await race.raceMessage.edit({ embeds: [waitingEmbed(race)], components: buildComponents(race) });
  return interaction.reply({ content: `✅ **${horse.username}** ka saaray.`, ephemeral: true });
}

async function joinRace(ctx) {
  const guildId  = ctx.guildId;
  const userId   = ctx.user ? ctx.user.id : ctx.author.id;
  const username = ctx.user ? ctx.user.username : ctx.author.username;
  const race     = activeRaces.get(guildId);
  if (!race)                        return ctx.reply({ content: "❌ Tartam ma jiro. `!race create`" });
  if (race.state !== STATE.WAITING) return ctx.reply({ content: "❌ Tartamku bilaabmay!" });
  if (race.players.has(userId))     return ctx.reply({ content: "❌ Horay ayaad uga qayb galeen!" });
  if (db.checkJail(userId))         return ctx.reply({ content: "❌ Xabsiga ayaad ku jirtaa!" });
  const horse = createHorse(userId, username, race.usedNames);
  race.players.set(userId, horse);
  race.horses.push(horse);
  await race.raceMessage.edit({ embeds: [waitingEmbed(race)], components: buildComponents(race) });
  return ctx.reply({ content: `🐎 **${horse.name}** Speed:${horse.speed}` });
}

async function startRace(ctx) {
  const guildId = ctx.guildId;
  const userId  = ctx.user ? ctx.user.id : ctx.author.id;
  const race    = activeRaces.get(guildId);
  if (!race)                           return ctx.reply({ content: "❌ Tartam ma jiro." });
  if (race.state !== STATE.WAITING)    return ctx.reply({ content: "❌ Horay ayuu u bilaabmay!" });
  if (userId !== race.createdBy)       return ctx.reply({ content: "❌ Host kaliya!" });
  if (race.players.size < MIN_PLAYERS) return ctx.reply({ content: `❌ ${MIN_PLAYERS} qof!` });
  race.state = STATE.RACING;
  await ctx.reply({ content: "🏁 Bilaabmaya..." });
  return runRace(race);
}

module.exports = { createRace, joinRace, startRace, handleButton, handleSelectMenu };
