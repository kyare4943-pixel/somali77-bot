"use strict";

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const db = require("./data");

// ── Format helpers ────────────────────────────────────────────────────────────
function fmtPrice(p) {
  if (p >= 1000000) return (p / 1000000).toFixed(p % 1000000 === 0 ? 0 : 1) + "M";
  if (p >= 1000)    return (p / 1000).toFixed(p % 1000 === 0 ? 0 : 1) + "K";
  return String(p);
}

// ── Horses: 500K – 1M, speed 200–500 ─────────────────────────────────────────
const HORSES = [
  { id: "horse_basic",  name: "🐎 Faras Caadi",    price: 500000,  speedBonus: 200, luckBonus: 50,  desc: "Ugu jaban — Speed 200" },
  { id: "horse_fast",   name: "⚡ Faras Xawli",     price: 650000,  speedBonus: 300, luckBonus: 80,  desc: "Dhaqso badan — Speed 300" },
  { id: "horse_lucky",  name: "🍀 Faras Nasiib",    price: 700000,  speedBonus: 280, luckBonus: 220, desc: "Nasiib badan — Luck 220" },
  { id: "horse_elite",  name: "🏆 Faras Champion",  price: 850000,  speedBonus: 400, luckBonus: 200, desc: "Champion — Speed 400" },
  { id: "horse_shadow", name: "🌑 Shadow Stallion", price: 1000000, speedBonus: 500, luckBonus: 300, desc: "Ugu qaali — Speed 500, Luck 300" },
];

// ── Race Boosters: 3 items × 10K ─────────────────────────────────────────────
const RACE_BOOSTERS = [
  { id: "boost_turbo",   name: "🚀 Turbo Boost",  price: 10000, type: "race_booster", effect: "turbo",   desc: "Race speed +80 hal goor",  uses: 1 },
  { id: "boost_lucky",   name: "🍀 Lucky Charm",  price: 10000, type: "race_booster", effect: "lucky",   desc: "Luck +60 dhan race",        uses: 1 },
  { id: "boost_shield",  name: "🛡️ Race Shield",  price: 10000, type: "race_booster", effect: "shield",  desc: "Xaaladaha xun ka difaaci",  uses: 1 },
];

// ── War Items: 3 items × 10K ──────────────────────────────────────────────────
const WAR_ITEMS = [
  { id: "weapon_pistol", name: "🔫 Baasabuur",    price: 10000, type: "weapon", attack: 30,   desc: "Hub fudud, weerarka +30" },
  { id: "armor_heavy",   name: "🛡️ Difaac Culus", price: 10000, type: "armor",  defense: 30,  desc: "Difaac culus +30" },
  { id: "medkit",        name: "💉 Medkit",        price: 10000, type: "heal",   heal: 40,     desc: "HP +40 dib u celi" },
];

// ── Escape: 10K ───────────────────────────────────────────────────────────────
const ESCAPE_ITEMS = [
  { id: "bailout", name: "🏦 Bailout Card", price: 10000, type: "escape", desc: "Xabsiga ka bax hal goor" },
];

// ── Debuff items (Qalabka Lugu Dhacayo): 3 × 30K ─────────────────────────────
// !use @qof <item_id> — ku isticmaal war-ka ama race-ka
const DEBUFF_ITEMS = [
  {
    id:     "trap_mud",
    name:   "🪤 Dabin Dhoobo",
    price:  30000,
    type:   "debuff",
    debuff: "mud_trap",
    target: "race",
    desc:   "Race: opponent faras-kiisa -80 speed 3 ticks",
    useMsg: (u, t) => `🪤 **${u}** ayaa dabin ku dhigay **${t}** fardihiisa!`,
  },
  {
    id:     "curse_hex",
    name:   "💀 Xumbo",
    price:  30000,
    type:   "debuff",
    debuff: "hex",
    target: "war",
    desc:   "War: opponent HP -40 bilawga dagaalka",
    useMsg: (u, t) => `💀 **${u}** ayaa xumbo saaray **${t}**! HP -40!`,
  },
  {
    id:     "storm_bottle",
    name:   "⛈️ Buudh Roob",
    price:  30000,
    type:   "debuff",
    debuff: "storm",
    target: "race",
    desc:   "Race: jid guud cimilada Qasriga Rob (⛈️) ku qaad",
    useMsg: (u) => `⛈️ **${u}** ayaa **Qasriga Rob** soo dhoofiyay! Dhammaan fardaha waa u adag tahay!`,
  },
];

// 🔒 Police & Spy — OWNER KALIYA (shopka laga ma iibsan karo)
const POLICE_ITEMS_OWNER_ONLY = [
  { id: "handcuffs", name: "🔗 Silsilado (Police)", type: "police", desc: "Police badge" },
  { id: "spy_kit",   name: "🕵️ Spy Kit (Ciidanka)", type: "spy",    desc: "Spy badge" },
];

const ALL_SHOP_ITEMS = [...RACE_BOOSTERS, ...WAR_ITEMS, ...ESCAPE_ITEMS, ...DEBUFF_ITEMS];

// ── Embed builders ────────────────────────────────────────────────────────────
function buildShopEmbed(category) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTimestamp()
    .setFooter({ text: "somali77 Shop • !shop" });

  if (category === "horses") {
    embed.setTitle("🐎 Shop — Fardaha (500K–1M)")
         .setDescription("Faras ku orod race-ka. Speed 200–500.\n💡 Qaali = dhaqso badan!");
    HORSES.forEach((h) => {
      embed.addFields({
        name:  `${h.name} — 🪙 ${fmtPrice(h.price)}`,
        value: `${h.desc}\n🏃 Speed: **${h.speedBonus}** | 🍀 Luck: **${h.luckBonus}**`,
        inline: false,
      });
    });

  } else if (category === "boosters") {
    embed.setTitle("⚡ Shop — Race Boosters (10K x3)")
         .setDescription("3 boosters — mid walba 10,000 🪙. Hal-goor isticmaal.");
    RACE_BOOSTERS.forEach((i) => {
      embed.addFields({ name: `${i.name} — 🪙 ${fmtPrice(i.price)}`, value: i.desc, inline: true });
    });

  } else if (category === "war") {
    embed.setTitle("⚔️ Shop — War Items (10K x3)")
         .setDescription("3 war items — mid walba 10,000 🪙.");
    WAR_ITEMS.forEach((i) => {
      const stat = i.attack ? `Weerar: +${i.attack}` : i.defense ? `Difaac: +${i.defense}` : `Heal: +${i.heal}`;
      embed.addFields({ name: `${i.name} — 🪙 ${fmtPrice(i.price)}`, value: `${i.desc}\n${stat}`, inline: true });
    });

  } else if (category === "escape") {
    embed.setTitle("🏦 Shop — Escape (10K)")
         .setDescription("Xabsiga ka bax!");
    ESCAPE_ITEMS.forEach((i) => {
      embed.addFields({ name: `${i.name} — 🪙 ${fmtPrice(i.price)}`, value: i.desc, inline: false });
    });

  } else if (category === "debuff") {
    embed.setColor(0x8e44ad)
         .setTitle("💀 Shop — Qalabka Lugu Dhacayo (30K x3)")
         .setDescription(
           "Qalabkan **opponent-kaaga** ku isticmaal!\n" +
           "Isticmaal: `!use @qof <item_id>`\n" +
           "⚠️ Mid walba waxaa kaa qaada **30,000 🪙**"
         );
    DEBUFF_ITEMS.forEach((i) => {
      embed.addFields({
        name:  `${i.name} — 🪙 ${fmtPrice(i.price)}`,
        value: `📝 ${i.desc}\n🎯 Target: **${i.target === "race" ? "Race 🐎" : "War ⚔️"}**`,
        inline: false,
      });
    });

  } else {
    // Main menu
    embed.setTitle("🛒 somali77 Shop v3")
         .setDescription(
           "**💛 Dahab iyo 💎 Diamond** — `!market` ku iibso!\n" +
           "🔒 **Police 👮 & Spy 🕵️** — Owner kaliya bixiyaa (`!give`)"
         )
         .addFields(
           { name: "🐎 Fardaha",          value: "500K–1M 🪙 | Speed 200–500",              inline: true },
           { name: "⚡ Race Boosters",    value: "3 items × 10K 🪙",                         inline: true },
           { name: "⚔️ War Items",        value: "3 items × 10K 🪙",                         inline: true },
           { name: "🏦 Escape",           value: "Bailout Card 10K 🪙",                      inline: true },
           { name: "💀 Qalabka Dhacaya",  value: "3 debuff items × **30K 🪙**",              inline: true },
           { name: "🏪 Suuqa (Market)",   value: "`!market` — 💛3K gold | 💎10K diamond",   inline: true },
           { name: "💰 Sida Lacag Loo Heshaa",
             value: "`!daily` 200-299🪙 +15💛 +10💎\n`!race` win: +50💛\n`!war` win: +50💎",
             inline: false },
         );
  }

  return embed;
}

function buildShopButtons(category) {
  const s = (id) => category === id ? ButtonStyle.Primary : ButtonStyle.Secondary;
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_horses").setLabel("🐎 Fardaha").setStyle(s("horses")),
      new ButtonBuilder().setCustomId("shop_boosters").setLabel("⚡ Boosters").setStyle(s("boosters")),
      new ButtonBuilder().setCustomId("shop_war").setLabel("⚔️ War").setStyle(s("war")),
      new ButtonBuilder().setCustomId("shop_escape").setLabel("🏦 Escape").setStyle(s("escape")),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("shop_debuff").setLabel("💀 Qalabka Dhacaya").setStyle(s("debuff")),
    ),
  ];
}

function buildBuyMenu(category) {
  let items = [];
  if (category === "horses")   items = HORSES;
  if (category === "boosters") items = RACE_BOOSTERS;
  if (category === "war")      items = WAR_ITEMS;
  if (category === "escape")   items = ESCAPE_ITEMS;
  if (category === "debuff")   items = DEBUFF_ITEMS;
  if (!items.length) return null;

  const options = items.map((i) => ({
    label:       `${i.name.replace(/\p{Emoji}/gu, "").trim().slice(0, 50)} — ${fmtPrice(i.price)}`,
    value:        i.id,
    description:  i.desc.slice(0, 100),
  }));

  return [new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`shop_buy_${category}`)
      .setPlaceholder("Wax iibso...")
      .addOptions(options)
  )];
}

// ── Handlers ──────────────────────────────────────────────────────────────────
async function handleShop(ctx) {
  return ctx.reply({ embeds: [buildShopEmbed("main")], components: buildShopButtons("main") });
}

async function handleShopButton(interaction) {
  const map = { shop_horses: "horses", shop_boosters: "boosters", shop_war: "war", shop_escape: "escape", shop_debuff: "debuff" };
  const category = map[interaction.customId];
  if (!category) return;
  const navRows = buildShopButtons(category);
  const buyRows = buildBuyMenu(category) || [];
  return interaction.reply({ embeds: [buildShopEmbed(category)], components: [...navRows, ...buyRows], ephemeral: true });
}

async function handleBuySelect(interaction) {
  if (!interaction.customId.startsWith("shop_buy_")) return;
  const userId   = interaction.user.id;
  const username = interaction.user.username;
  const itemId   = interaction.values[0];

  const catalog = [...HORSES, ...ALL_SHOP_ITEMS];
  const item    = catalog.find((i) => i.id === itemId);
  if (!item) return interaction.reply({ content: "❌ Item ma jirto.", ephemeral: true });

  if (item.id.startsWith("horse_") && db.hasHorse(userId, item.id)) {
    return interaction.reply({ content: `❌ Horay ayaad u lahayd **${item.name}**!`, ephemeral: true });
  }

  const taken = db.removeCoins(userId, username, item.price);
  if (!taken) {
    const p = db.getPlayer(userId, username);
    return interaction.reply({
      content: `❌ Lacag kuma filan!\nWaxaad leedahay: **${fmtPrice(p.coins)} 🪙** — waxaa kaa baahan: **${fmtPrice(item.price)} 🪙**`,
      ephemeral: true,
    });
  }

  if (item.id.startsWith("horse_")) {
    db.addHorse(userId, username, { id: item.id, name: item.name, speedBonus: item.speedBonus, luckBonus: item.luckBonus, active: true });
    const p = db.getPlayer(userId, username);
    p.horses.forEach((h) => (h.active = h.id === item.id));
  } else {
    db.addItem(userId, username, item);
  }

  const p = db.getPlayer(userId, username);
  return interaction.reply({
    content: `✅ **${item.name}** iibsatay!\n🪙 Coins: **${fmtPrice(p.coins)}**`,
    ephemeral: true,
  });
}

// ── !daily ────────────────────────────────────────────────────────────────────
const dailyCooldowns = new Map();

async function handleDaily(ctx) {
  const userId   = ctx.user ? ctx.user.id : ctx.author.id;
  const username = ctx.user ? ctx.user.username : ctx.author.username;
  const today    = new Date().toDateString();

  if (dailyCooldowns.get(userId) === today) {
    return ctx.reply({ content: "❌ Maanta horay ayaad u qaadatay daily-gaaga! Berri soo noqo.", ephemeral: !!ctx.user });
  }

  dailyCooldowns.set(userId, today);
  const coins   = 200 + Math.floor(Math.random() * 100);
  const gold    = 10  + Math.floor(Math.random() * 10);  // 10-19 dahab
  const diamond = 5   + Math.floor(Math.random() * 8);   // 5-12 diamond

  db.addCoins(userId, username, coins);
  db.addGold(userId, username, gold);
  db.addDiamond(userId, username, diamond);

  const p = db.getPlayer(userId, username);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🎁 Daily Bonus!")
    .setDescription(`<@${userId}> waxay heshay daily bonus-kooda!`)
    .addFields(
      { name: "🪙 Coins",   value: `+${coins}  → ${fmtPrice(p.coins)}`,       inline: true },
      { name: "💛 Dahab",   value: `+${gold}   → ${fmtPrice(p.goldCoins)}`,    inline: true },
      { name: "💎 Diamond", value: `+${diamond} → ${fmtPrice(p.diamondCoins)}`, inline: true },
    )
    .setFooter({ text: "Berri soo noqo daily cusub! Max dahab/diamond: 5,000" })
    .setTimestamp();

  return ctx.reply({ embeds: [embed] });
}

// ── !balance ──────────────────────────────────────────────────────────────────
async function handleBalance(ctx) {
  const userId   = ctx.user ? ctx.user.id : ctx.author.id;
  const username = ctx.user ? ctx.user.username : ctx.author.username;
  const p        = db.getPlayer(userId, username);
  const horse    = db.getActiveHorse(userId);

  const weapons  = p.items.filter((i) => i.type === "weapon").map((i) => i.name).join(", ")      || "Waxba";
  const armor    = p.items.filter((i) => i.type === "armor").map((i) => i.name).join(", ")        || "Waxba";
  const boosters = p.items.filter((i) => i.type === "race_booster").map((i) => i.name).join(", ") || "Waxba";
  const premium  = p.items.filter((i) => ["weapon","armor","heal","horse_gear","debuff"].includes(i.type) && (i.id.startsWith("gold_") || i.id.startsWith("diamond_"))).map((i) => i.name).join(", ") || "Waxba";

  const faction  = p.items.some((i) => i.id === "handcuffs") ? "👮 Police"
                 : p.items.some((i) => i.id === "spy_kit")   ? "🕵️ Ciidanka Sirdoonka"
                 : "👤 Civilian";

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`💰 ${username} — Xisaabta`)
    .addFields(
      { name: "🪙 Coins",         value: fmtPrice(p.coins),                                              inline: true },
      { name: "💛 Dahab",         value: fmtPrice(p.goldCoins),                                          inline: true },
      { name: "💎 Diamond",       value: fmtPrice(p.diamondCoins),                                       inline: true },
      { name: "🎖️ Xubinta",       value: faction,                                                        inline: true },
      { name: "🐎 Faras Active",  value: horse ? `${horse.name} (Speed:${horse.speedBonus})` : "Caadi",  inline: false },
      { name: "🔫 Hub",           value: weapons,                                                        inline: true },
      { name: "🛡️ Difaac",        value: armor,                                                          inline: true },
      { name: "⚡ Boosters",      value: boosters,                                                       inline: true },
      { name: "💎 Premium Items", value: premium,                                                        inline: false },
      { name: "📊 Stats",
        value: `Race: ${p.stats.racesWon}/${p.stats.racesPlayed} | War: ${p.stats.warsWon}/${p.stats.warsPlayed} | BJ: ${p.stats.blackjackWon}/${p.stats.blackjackPlayed}`,
        inline: false },
      { name: "🏛️ Xabsi", value: p.inJail ? `✅ (${p.jailUntil ? Math.ceil((p.jailUntil - Date.now()) / 60000) + " min" : "?"})` : "❌ Maya", inline: true },
    )
    .setTimestamp()
    .setFooter({ text: "somali77 Bot v3" });

  return ctx.reply({ embeds: [embed] });
}

module.exports = {
  HORSES, RACE_BOOSTERS, WAR_ITEMS, ESCAPE_ITEMS, DEBUFF_ITEMS, POLICE_ITEMS_OWNER_ONLY,
  ALL_SHOP_ITEMS, fmtPrice,
  handleShop, handleShopButton, handleBuySelect,
  handleDaily, handleBalance,
};
