"use strict";

/**
 * market.js — Suuqa Dahab iyo Diamond
 * Players waxay ku iibin karaan oo ku iibsan karaan premium items
 * Qiimaha: 25,000 regular coins ama dahab/diamond
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const db = require("./data");

const MARKET_FEE   = 0.05; // 5% listing fee
// Gold items: 3,000 💛 each  |  Diamond items: 10,000 💎 each
const PREMIUM_ITEMS = [
  // ── Dahab items — 3,000 gold each ─────────────────────────────────────────
  { id: "gold_sword",    name: "⚔️ Seef Dahab",     currency: "gold",    price: 3000, type: "weapon",       attack: 70,  desc: "Hub dahab ah, weerarka +70" },
  { id: "gold_armor",    name: "🛡️ Difaac Dahab",   currency: "gold",    price: 3000, type: "armor",         defense: 60, desc: "Difaac dahab, +60" },
  { id: "gold_boost",    name: "✨ Turbo Dahab",     currency: "gold",    price: 3000, type: "race_booster",  effect: "turbo", speedBoost: 150, desc: "Race speed +150 hal goor" },
  { id: "gold_medkit",   name: "💛 Medkit Dahab",   currency: "gold",    price: 3000, type: "heal",          heal: 80,    desc: "HP +80 dib u celi" },
  { id: "gold_trap",     name: "🪤 Dabin Dahab",    currency: "gold",    price: 3000, type: "debuff",        debuff: "slow", desc: "War-ka opponent speed -50%" },

  // ── Diamond items — 10,000 diamond each ───────────────────────────────────
  { id: "diamond_blade", name: "💎 Mindi Diamond",  currency: "diamond", price: 10000, type: "weapon",      attack: 150, desc: "Hub diamond ah, weerarka +150" },
  { id: "diamond_shield",name: "🔷 Gashi Diamond",  currency: "diamond", price: 10000, type: "armor",        defense: 120, desc: "Difaac diamond, +120" },
  { id: "diamond_horse", name: "💠 Horse Diamond",  currency: "diamond", price: 10000, type: "horse_gear",   speedBonus: 250, luckBonus: 200, desc: "Horsegear — Speed+250 Luck+200" },
  { id: "diamond_bomb",  name: "💣 Bamb Diamond",   currency: "diamond", price: 10000, type: "weapon",       attack: 200, aoe: true, desc: "AoE +200, ugu xoog badan" },
  { id: "diamond_poison",name: "☠️ Sun Diamond",    currency: "diamond", price: 10000, type: "debuff",       debuff: "poison", desc: "War-ka HP -8 per turn" },
];

function fmtPrice(p) {
  if (p >= 1000000) return (p / 1000000).toFixed(p % 1000000 === 0 ? 0 : 1) + "M";
  if (p >= 1000)    return (p / 1000).toFixed(p % 1000 === 0 ? 0 : 1) + "K";
  return String(p);
}

// ── !market / !suuq ───────────────────────────────────────────────────────────
async function handleMarket(ctx, args) {
  const sub = (args[0] || "").toLowerCase();

  if (!sub || sub === "help") return showMarketHelp(ctx);
  if (sub === "catalog")      return showCatalog(ctx);
  if (sub === "list")         return showListings(ctx);
  if (sub === "sell")         return sellItem(ctx, args);
  if (sub === "buy") {
    // Numeric ID → buy from player listing (25K coins)
    // Item ID string → buy directly from catalog (gold/diamond)
    const arg = args[1] || "";
    return /^\d+$/.test(arg) ? buyListing(ctx, args) : buyCatalogItem(ctx, args);
  }
  return showMarketHelp(ctx);
}

async function showMarketHelp(ctx) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("🏪 Suuqa Dahab & Diamond")
    .setDescription(
      "Catalog-ka ku iibso dahab/diamond. Player listings 25K coins."
    )
    .addFields(
      { name: "📋 `!market catalog`",         value: "Premium items eeg (gold/diamond)",               inline: false },
      { name: "💛 `!market buy <item_id>`",    value: "Catalog ka iibso — 3,000 💛 Dahab",             inline: false },
      { name: "💎 `!market buy <item_id>`",    value: "Catalog ka iibso — 10,000 💎 Diamond",          inline: false },
      { name: "🛒 `!market list`",             value: "Player listings eeg",                           inline: false },
      { name: "💰 `!market sell <item_id>`",   value: "Naftaada item player market ku geli (25K)",     inline: false },
      { name: "🤝 `!market buy <num_id>`",     value: "Player listing ka iibso (25K 🪙)",              inline: false },
      { name: "💛 Sida Dahab Loo Heshaa",      value: "`!race` guul: +50💛 | `!daily`: +15💛",         inline: true  },
      { name: "💎 Sida Diamond Loo Heshaa",    value: "`!war` guul: +50💎 | `!daily`: +10💎",          inline: true  },
    )
    .setFooter({ text: "somali77 Suuq • !market catalog si aad alaabta u aragto" })
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

async function showCatalog(ctx) {
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("📦 Premium Catalog — Dahab & Diamond")
    .setTimestamp()
    .setFooter({ text: "!market buy <item_id> si aad u iibsato" });

  const goldItems    = PREMIUM_ITEMS.filter((i) => i.currency === "gold");
  const diamondItems = PREMIUM_ITEMS.filter((i) => i.currency === "diamond");

  embed.addFields({ name: "─────── 💛 DAHAB — 3,000 gold kasta ───────", value: "\u200b", inline: false });
  goldItems.forEach((i) => {
    embed.addFields({
      name:  `${i.name}`,
      value: `${i.desc}\n💛 **3,000 Dahab** | \`!market buy ${i.id}\``,
      inline: true,
    });
  });

  embed.addFields({ name: "─────── 💎 DIAMOND — 10,000 diamond kasta ───────", value: "\u200b", inline: false });
  diamondItems.forEach((i) => {
    embed.addFields({
      name:  `${i.name}`,
      value: `${i.desc}\n💎 **10,000 Diamond** | \`!market buy ${i.id}\``,
      inline: true,
    });
  });

  return ctx.reply({ embeds: [embed] });
}

// ── Direct buy from catalog (gold or diamond) ─────────────────────────────────
async function buyCatalogItem(ctx, args) {
  const userId   = ctx.author ? ctx.author.id : ctx.user.id;
  const username = ctx.author ? ctx.author.username : ctx.user.username;
  const itemId   = args[1];
  if (!itemId) return ctx.reply("❌ `!market buy <item_id>` — catalog eeg: `!market catalog`");

  const item = PREMIUM_ITEMS.find((i) => i.id === itemId);
  if (!item) return ctx.reply(`❌ **${itemId}** catalog-ka kuma jirto.\n\`!market catalog\` ku eeg.`);

  const p = db.getPlayer(userId, username);

  if (item.currency === "gold") {
    if (p.goldCoins < item.price) {
      return ctx.reply(
        `❌ Dahab kuma filan!\nWaxaad leedahay: **${fmtPrice(p.goldCoins)} 💛** — waxaa kaa baahan: **${fmtPrice(item.price)} 💛**\n` +
        `💡 \`!race\` ku guul: +50💛 | \`!daily\`: +15💛`
      );
    }
    db.removeGold(userId, username, item.price);
    db.addItem(userId, username, item);
    const np = db.getPlayer(userId, username);
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("💛 Iibsashada Guulaysatay — Dahab!")
      .addFields(
        { name: "📦 Item",       value: item.name,                             inline: true },
        { name: "💛 La bixiyay", value: `${fmtPrice(item.price)} Dahab`,       inline: true },
        { name: "💛 Hadda",      value: `${fmtPrice(np.goldCoins)} Dahab`,     inline: true },
      )
      .setDescription(`✅ **${item.name}** waa kuu geeyay!`)
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  }

  if (item.currency === "diamond") {
    if (p.diamondCoins < item.price) {
      return ctx.reply(
        `❌ Diamond kuma filan!\nWaxaad leedahay: **${fmtPrice(p.diamondCoins)} 💎** — waxaa kaa baahan: **${fmtPrice(item.price)} 💎**\n` +
        `💡 \`!war\` ku guul: +50💎 | \`!daily\`: +10💎`
      );
    }
    db.removeDiamond(userId, username, item.price);
    db.addItem(userId, username, item);
    const np = db.getPlayer(userId, username);
    const embed = new EmbedBuilder()
      .setColor(0x9b59b6)
      .setTitle("💎 Iibsashada Guulaysatay — Diamond!")
      .addFields(
        { name: "📦 Item",       value: item.name,                                   inline: true },
        { name: "💎 La bixiyay", value: `${fmtPrice(item.price)} Diamond`,           inline: true },
        { name: "💎 Hadda",      value: `${fmtPrice(np.diamondCoins)} Diamond`,      inline: true },
      )
      .setDescription(`✅ **${item.name}** waa kuu geeyay!`)
      .setTimestamp();
    return ctx.reply({ embeds: [embed] });
  }

  return ctx.reply("❌ Item-ka noociisa lama garanin.");
}

async function showListings(ctx) {
  const listings = db.getAllListings();
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("🏪 Suuqa — Items La Iibinaayo")
    .setTimestamp()
    .setFooter({ text: "!market buy <ID> si aad u iibsato" });

  if (listings.length === 0) {
    embed.setDescription("❌ Suuqa waxba kuma jiraan hadda.\n`!market sell <item_id>` ku geli!");
  } else {
    listings.slice(0, 10).forEach((l) => {
      embed.addFields({
        name:  `#${l.id} — ${l.item.name}`,
        value: `💰 **25,000 🪙** regular coins\n👤 Iibin: ${l.sellerName}\n📝 ${l.item.desc}`,
        inline: true,
      });
    });
  }

  return ctx.reply({ embeds: [embed] });
}

async function sellItem(ctx, args) {
  const userId   = ctx.author ? ctx.author.id : ctx.user.id;
  const username = ctx.author ? ctx.author.username : ctx.user.username;
  const itemId   = args[1];
  if (!itemId) return ctx.reply("❌ Isticmaal: `!market sell <item_id>`\nCatalog eeg: `!market catalog`");

  const p    = db.getPlayer(userId, username);
  const item = p.items.find((i) => i.id === itemId);
  if (!item) return ctx.reply(`❌ **${itemId}** item-kan ma lihid!\n\`!balance\` ku eeg items-taada.`);

  // Remove from inventory, list on market
  db.removeItem(userId, itemId);
  const listId = db.addListing(userId, username, item, 25000, "coins");

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("✅ Suuqa La Geliyay!")
    .addFields(
      { name: "📦 Item",    value: item.name,       inline: true },
      { name: "💰 Qiime",  value: "25,000 🪙",      inline: true },
      { name: "🆔 ID",     value: `#${listId}`,     inline: true },
    )
    .setDescription("Qof kale waxay ku iibsan karaan `!market buy " + listId + "`")
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

async function buyListing(ctx, args) {
  const userId   = ctx.author ? ctx.author.id : ctx.user.id;
  const username = ctx.author ? ctx.author.username : ctx.user.username;
  const listId   = args[1];
  if (!listId) return ctx.reply("❌ Isticmaal: `!market buy <ID>`\nListings eeg: `!market list`");

  const listing = db.getListing(listId);
  if (!listing) return ctx.reply(`❌ Listing **#${listId}** ma jirto ama waa la iibiyay.`);
  if (listing.sellerId === userId) return ctx.reply("❌ Naftaada item-ka kama iibsan kartid!");

  const PRICE = 25000;
  const taken = db.removeCoins(userId, username, PRICE);
  if (!taken) {
    const p = db.getPlayer(userId, username);
    return ctx.reply(`❌ Lacag kuma filan! Waxaad leedahay **${fmtPrice(p.coins)} 🪙** — waxaa kaa baahan **25K 🪙**`);
  }

  db.removeListing(listId);
  db.addItem(userId, username, listing.item);

  // Pay seller (minus 5% fee)
  const sellerPayout = Math.floor(PRICE * (1 - MARKET_FEE));
  db.addCoins(listing.sellerId, listing.sellerName, sellerPayout);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🤝 Iibsashada Guulaysatay!")
    .addFields(
      { name: "📦 Item",       value: listing.item.name,               inline: true },
      { name: "💰 La bixiyay", value: `${fmtPrice(PRICE)} 🪙`,         inline: true },
      { name: "👤 Iibinaaha",  value: listing.sellerName,              inline: true },
    )
    .setDescription(`✅ **${listing.item.name}** waa kuu geeyay!`)
    .setTimestamp();
  return ctx.reply({ embeds: [embed] });
}

module.exports = { PREMIUM_ITEMS, handleMarket, fmtPrice };
