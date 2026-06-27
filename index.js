"use strict";

/**
 * somali77 Discord Bot v3.7
 *
 * OWNER: 1255817591331618838
 *
 * COMMANDS (!prefix):
 *   !help  !shop  !daily  !balance  !race  !blackjack  !war  !snipe
 *   !market / !suuq
 *   !voyage  !piratestats  !piratebattle  !pirateshop  !upgrade  !islands  !sail  !piratedaily  !pirateleader  !kingdomrob
 *   !setup  (Private Room Control Panel)
 *
 * OWNER ONLY:
 *   !admin
 *   !give @user coins/police/spy/booster/gold/diamond <amount>
 *   !take @user police/spy
 *   !jail @user   !release @user
 *   !steal @user <amount> gold/diamond/coins
 *
 * SLASH: /race /shop /daily /balance /blackjack /war /snipe
 */

require("dotenv").config();

const {
  Client, GatewayIntentBits, Events, Partials,
  EmbedBuilder, REST, Routes, SlashCommandBuilder,
} = require("discord.js");

const { createRace, joinRace, startRace, handleButton: raceBtn, handleSelectMenu } = require("./horseRace");
const { handleShop, handleShopButton, handleBuySelect, handleDaily, handleBalance, RACE_BOOSTERS, fmtPrice } = require("./shop");
const { startBlackjack, handleBJButton } = require("./blackjack");
const { handleWarChallenge, handleWarButton }  = require("./warGame");
const { handleMarket } = require("./market");
const pirate   = require("./pirateAdventure");
const detective= require("./detectiveMystery");
const db       = require("./data");
const { handleSetup, handleVoiceStateUpdate, handleRoomButton, handleRoomModal, handleRoomSelect } = require("./privateRoom");
const { cacheGuildInvites, handleMemberJoin, handleInviteCommand } = require("./invite");
const { handleClear, handleVerify } = require("./moderation");
const hw = require("./hackerWars");


// ── OWNER ID ──────────────────────────────────────────────────────────────────
const OWNER_ID = "1255817591331618838";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ DISCORD_BOT_TOKEN la helin! Replit Secrets ku dar.");
  setInterval(() => {}, 10000);
} else {
  startBot(TOKEN);
}

function isOwner(userId) { return userId === OWNER_ID; }

async function handleCilad(message, args) {
  const text = args.join(" ").trim();
  if (!text) return message.reply("❌ `!cilad <dhibaatada sharax>`\nTusaale: `!cilad bot !help ma shaqeynayso`");
  try {
    const owner = await message.client.users.fetch(OWNER_ID);
    await owner.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("🐛 Cilad / Bug Report")
          .addFields(
            { name: "👤 Ka yimid",  value: message.author.tag + " (<@" + message.author.id + ">)", inline: false },
            { name: "🆔 User ID",   value: "`" + message.author.id + "`",                        inline: true  },
            { name: "🏠 Server",    value: message.guild.name,                                      inline: true  },
            { name: "🏠 Server ID", value: "`" + message.guild.id + "`",                         inline: true  },
            { name: "📝 Dhibaatada", value: text,                                                  inline: false },
          )
          .setTimestamp(),
      ],
    });
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Cilad-kaaga la gudbiyay!").setDescription("Owner-ka ayaa ku soo wada xiriiri doonaa. Mahadsanid!").setTimestamp()] });
  } catch (e) {
    return message.reply("❌ La diray waayay: " + e.message);
  }
}

async function handleDM(message, args) {
  if (!isOwner(message.author.id)) return;
  const mention = message.mentions.users.first();
  const text    = args.slice(mention ? 2 : 1).join(" ").trim();
  const userId  = !mention && args[1] ? args[1] : null;
  if (!mention && !userId) return message.reply("❌ `!dm @user <fariin>` ama `!dm <user_id> <fariin>`");
  if (!text) return message.reply("❌ Fariin gali.");
  try {
    const target = mention || await message.client.users.fetch(userId);
    await target.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("📩 Fariin — somali77 Admin").setDescription(text).setFooter({ text: "Owner ka yimid" }).setTimestamp()] });
    return message.reply("✅ Fariin la geeyay **" + target.username + "**");
  } catch (e) {
    return message.reply("❌ DM la diray waayay: " + e.message);
  }
}

function startBot(token) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildInvites,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  const snipeCache = new Map();

  function hasImages(atts) {
    return atts.some((a) => (a.contentType && a.contentType.startsWith("image/")) ||
      /\.(png|jpg|jpeg|gif|webp)$/i.test(a.name || ""));
  }
  function fmtSize(b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  }
  function buildDeletedEmbed(info) {
    const hasText = !!info.content && info.content.trim();
    const hasImg  = hasImages(info.attachments);
    const embed   = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setAuthor({ name: info.authorTag, iconURL: info.authorAvatar || undefined })
      .setTimestamp(info.deletedAt)
      .setFooter({ text: "#" + info.channelName + " • " + info.authorId });
    if (!hasText && hasImg)       embed.setTitle("🖼️ Sawir la tirtiray").setDescription(`**${info.authorTag}** waxay tirtireen sawir`);
    else if (hasText && hasImg)   embed.setTitle("🗑️ Fariin+Sawir").setDescription(`**${info.authorTag}**:\n${info.content}`);
    else if (info.attachments.length) embed.setTitle("📎 Fayl").setDescription(`**${info.authorTag}**${hasText ? `:\n${info.content}` : ""}`);
    else                          embed.setTitle("🗑️ Fariin la tirtiray").setDescription(`**${info.authorTag}**:\n${info.content}`);
    if (info.attachments.length) {
      embed.addFields({ name: "Faylasha", value: info.attachments.map((a) => `• [${a.name}](${a.url}) (${fmtSize(a.size)})`).join("\n") });
    }
    return embed;
  }

  async function adminGive(message, args) {
    if (!isOwner(message.author.id)) return message.reply("❌ **Owner kaliya** ayaa `!give` isticmaali kara.");
    const mention = message.mentions.users.first();
    const type    = (args[1] || "").toLowerCase();
    const extra   = args[2] || "";
    if (!mention) return message.reply("❌ `!give @user coins/police/spy/booster/gold/diamond <amount>`");

    if (type === "coins") {
      const amt = parseInt(extra);
      if (!amt || amt <= 0) return message.reply("❌ `!give @user coins <tiro>`");
      db.addCoins(mention.id, mention.username, amt);
      const p = db.getPlayer(mention.id);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x2ecc71).setTitle("💰 Coins La Siiyay")
        .addFields(
          { name: "👤 User",    value: `<@${mention.id}>`,         inline: true },
          { name: "➕ Coins",   value: `+${fmtPrice(amt)} 🪙`,      inline: true },
          { name: "💰 Wadarta", value: `${fmtPrice(p.coins)} 🪙`,  inline: true },
        ).setFooter({ text: `Admin: ${message.author.username}` }).setTimestamp()] });
    }
    if (type === "gold") {
      const amt = parseInt(extra);
      if (!amt || amt <= 0) return message.reply("❌ `!give @user gold <tiro>`");
      db.addGold(mention.id, mention.username, amt);
      const p = db.getPlayer(mention.id);
      return message.reply(`✅ <@${mention.id}> waxay heshay **+${fmtPrice(amt)} 💛 Dahab** → ${fmtPrice(p.goldCoins)} total`);
    }
    if (type === "diamond") {
      const amt = parseInt(extra);
      if (!amt || amt <= 0) return message.reply("❌ `!give @user diamond <tiro>`");
      db.addDiamond(mention.id, mention.username, amt);
      const p = db.getPlayer(mention.id);
      return message.reply(`✅ <@${mention.id}> waxay heshay **+${fmtPrice(amt)} 💎 Diamond** → ${fmtPrice(p.diamondCoins)} total`);
    }
    if (type === "police") {
      db.addItem(mention.id, mention.username, { id: "handcuffs", name: "🔗 Silsilado (Police)", type: "police", desc: "Police badge" });
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x2c3e50).setTitle("👮 Police Badge La Siiyay")
        .setDescription(`<@${mention.id}> hadda waa Police!\n\`!jail\` / \`!release\` isticmaali kara`)
        .setFooter({ text: `Admin: ${message.author.username}` }).setTimestamp()] });
      try { const u = await client.users.fetch(mention.id); await u.send({ embeds: [new EmbedBuilder().setColor(0x2c3e50).setTitle("👮 Police Badge!").setDescription(`**${message.author.username}** (Owner) ayaa kuu siiyay Police badge!`).setTimestamp()] }); } catch (_) {}
      return;
    }
    if (type === "spy") {
      db.addItem(mention.id, mention.username, { id: "spy_kit", name: "🕵️ Spy Kit (Ciidanka)", type: "spy", desc: "Spy badge" });
      await message.reply({ embeds: [new EmbedBuilder().setColor(0x8e44ad).setTitle("🕵️ Spy Badge La Siiyay")
        .setDescription(`<@${mention.id}> hadda waa Ciidanka Sirdoonka!`)
        .setFooter({ text: `Admin: ${message.author.username}` }).setTimestamp()] });
      try { const u = await client.users.fetch(mention.id); await u.send({ embeds: [new EmbedBuilder().setColor(0x8e44ad).setTitle("🕵️ Spy Badge!").setDescription(`**${message.author.username}** (Owner) ayaa kuu siiyay Ciidanka Sirdoonka badge!`).setTimestamp()] }); } catch (_) {}
      return;
    }
    if (type === "booster") {
      const effect = extra.toLowerCase();
      const item   = RACE_BOOSTERS.find((b) => b.effect === effect);
      if (!item) return message.reply("❌ Booster: `turbo`, `lucky`, `shield`");
      db.addItem(mention.id, mention.username, item);
      return message.reply(`✅ <@${mention.id}> waxay heshay **${item.name}** booster!`);
    }
    return message.reply("❌ Nooca: `coins`, `gold`, `diamond`, `police`, `spy`, `booster <turbo|lucky|shield>`");
  }

  async function adminTake(message, args) {
    if (!isOwner(message.author.id)) return message.reply("❌ Owner kaliya `!take`");
    const mention = message.mentions.users.first();
    const type    = (args[1] || "").toLowerCase();
    if (!mention) return message.reply("❌ `!take @user police/spy`");
    if (type === "police") { db.removeItem(mention.id, "handcuffs"); return message.reply(`✅ **${mention.username}** Police badge waa la qaatay.`); }
    if (type === "spy")    { db.removeItem(mention.id, "spy_kit");   return message.reply(`✅ **${mention.username}** Spy badge waa la qaatay.`); }
    return message.reply("❌ `police` ama `spy`");
  }

  async function adminJail(message) {
    const p       = db.getPlayer(message.author.id, message.author.username);
    const canJail = isOwner(message.author.id) || p.items.some((i) => i.id === "handcuffs");
    if (!canJail) return message.reply("❌ Owner ama Police (silsilado leh) kaliya!");
    const mention = message.mentions.users.first();
    if (!mention) return message.reply("❌ `!jail @user`");
    db.jailPlayer(mention.id, mention.username, 10 * 60 * 1000);
    await message.reply({ embeds: [new EmbedBuilder().setColor(0x2c3e50).setTitle("🚔 Xabsi!").setDescription(`**${message.author.username}** ayaa xabsiga galinayaa **${mention.username}**! ⏱️ 10 daqiiqo`).setTimestamp()] });
    try { const u = await client.users.fetch(mention.id); await u.send({ embeds: [new EmbedBuilder().setColor(0x2c3e50).setTitle("🚔 Xabsiga Ayaad Ku Jirtaa!").setDescription(`**${message.author.username}** ayaa xabsiga kugu galiyay!\n⏱️ 10 daqiiqo\n💡 Bailout Card iibso \`!shop\` ➜ Escape`).setTimestamp()] }); } catch (_) {}
  }

  async function adminRelease(message) {
    const p       = db.getPlayer(message.author.id, message.author.username);
    const canFree = isOwner(message.author.id) || p.items.some((i) => i.id === "handcuffs");
    if (!canFree) return message.reply("❌ Owner ama Police kaliya!");
    const mention = message.mentions.users.first();
    if (!mention) return message.reply("❌ `!release @user`");
    db.releaseFromJail(mention.id);
    return message.reply(`✅ **${mention.username}** waa xabsiga ka la saaray.`);
  }

  function buildAdminEmbed(name) {
    return new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("🔐 Admin Panel — Owner Kaliya")
      .setDescription(`Ku soo dhawow **${name}**! ID: \`${OWNER_ID}\``)
      .addFields(
        { name: "💰 Coins",         value: "`!give @user coins <n>`",                           inline: false },
        { name: "💛 Gold Dahab",    value: "`!give @user gold <n>` (max 10,000)",               inline: false },
        { name: "💎 Diamond",       value: "`!give @user diamond <n>` (max 10,000)",            inline: false },
        { name: "👮 Police",        value: "`!give @user police` / `!take @user police`",     inline: false },
        { name: "🕵️ Spy",           value: "`!give @user spy` / `!take @user spy`",          inline: false },
        { name: "⚡ Booster",       value: "`!give @user booster <turbo|lucky|shield>`",        inline: false },
        { name: "🚔 Xabsi",         value: "`!jail @user` / `!release @user`",               inline: false },
        { name: "🤫 Sir Steal",     value: "`!steal @user <amount> gold|diamond|coins`",        inline: false },
        { name: "🏠 Private Room",  value: "`!setup` — Auto-create category + voice + control panel", inline: false },
        { name: "📩 DM User",       value: "`!dm @user <fariin>` ama `!dm <id> <fariin>`",       inline: false },
        { name: "🐛 Cilad Log",     value: "Cilad-yada waxaa kuu soo dira `!cilad` users",        inline: false },
      )
      .setFooter({ text: "somali77 Admin v3.7" })
      .setTimestamp();
  }

  async function adminSteal(message, args) {
    if (!isOwner(message.author.id)) return;
    const mention = message.mentions.users.first();
    if (!mention) return message.reply("❌ `!steal @user <amount> gold|diamond|coins`");
    const amount = parseInt(args[2]);
    const type   = (args[3] || "").toLowerCase();
    if (!amount || amount < 1) return message.reply("❌ Amount sax ah gali");
    if (!["gold","diamond","coins"].includes(type)) return message.reply("❌ Type: `gold` `diamond` `coins`");
    const target = db.getPlayer(mention.id, mention.username);
    let actual   = 0;
    if (type === "gold")    { actual = Math.min(target.goldCoins, amount);    if (actual > 0) db.removeGold(mention.id, mention.username, actual); }
    else if (type === "diamond") { actual = Math.min(target.diamondCoins, amount); if (actual > 0) db.removeDiamond(mention.id, mention.username, actual); }
    else                    { actual = Math.min(target.coins, amount);         if (actual > 0) db.removeCoins(mention.id, mention.username, actual); }
    db.logSecretSteal(mention.id, message.author.id, actual, type);
    return message.reply({ content: `✅ **Sir** — **${mention.username}** ka la qaaday: **${actual.toLocaleString()} ${type}** (notification la'aan)` });
  }

  client.once(Events.ClientReady, async (rc) => {
    console.log("✅ somali77 v3.7 | Tag: " + rc.user.tag + " | Owner: " + OWNER_ID);
    rc.guilds.cache.forEach((guild) => { cacheGuildInvites(guild).catch(() => {}); });
    const rest = new REST({ version: "10" }).setToken(token);
    const cmds = [
      new SlashCommandBuilder().setName("snipe").setDescription("Fariin u dambeysay ee la tirtiray").toJSON(),
      new SlashCommandBuilder().setName("race").setDescription("Horse Racing")
        .addSubcommand((s) => s.setName("create").setDescription("Samee tartam"))
        .addSubcommand((s) => s.setName("join").setDescription("Ku biir"))
        .addSubcommand((s) => s.setName("start").setDescription("Bilow")).toJSON(),
      new SlashCommandBuilder().setName("shop").setDescription("Iibso fardaha, hub, boosters").toJSON(),
      new SlashCommandBuilder().setName("daily").setDescription("Daily bonus — coins + dahab + diamond").toJSON(),
      new SlashCommandBuilder().setName("balance").setDescription("Eeg coins, dahab, diamond, stats").toJSON(),
      new SlashCommandBuilder().setName("blackjack").setDescription("Blackjack card game")
        .addIntegerOption((o) => o.setName("bet").setDescription("Coins (10-2000)").setRequired(true).setMinValue(10).setMaxValue(2000)).toJSON(),
      new SlashCommandBuilder().setName("war").setDescription("2-player RPG war")
        .addUserOption((o) => o.setName("opponent").setDescription("Opponent").setRequired(true)).toJSON(),
      ...hw.SLASH_COMMANDS,
    ];
    try {
      await rest.put(Routes.applicationCommands(rc.user.id), { body: cmds });
      console.log("✅ Slash commands registered");
    } catch (e) { console.error("Slash reg error: " + e.message); }
  });

  client.on(Events.MessageDelete, async (message) => {
    try {
      if (message.author && message.author.bot) return;
      const hasText     = message.content && message.content.trim();
      const attachments = Array.from((message.attachments && message.attachments.values()) || []).map((a) => ({
        name: a.name || "unknown", url: a.url, contentType: a.contentType, size: a.size || 0,
      }));
      if (!hasText && !attachments.length) return;
      const info = {
        content:      message.content || null,
        authorTag:    (message.author && message.author.tag)                || "Qof aan la garanin",
        authorId:     (message.author && message.author.id)                 || "0",
        authorAvatar: (message.author && message.author.displayAvatarURL()) || null,
        channelId:    message.channelId || "",
        channelName:  (message.channel && message.channel.name)             || "channel",
        attachments,
        deletedAt: new Date(),
      };
      snipeCache.set(info.channelId, info);
    } catch (e) { console.error("MessageDelete: " + e.message); }
  });

  // 📥 Cache invites on guild add
  client.on(Events.GuildCreate, async (guild) => {
    await cacheGuildInvites(guild).catch(() => {});
  });

  // 📥 GuildMemberAdd — Invite Tracker
  client.on(Events.GuildMemberAdd, async (member) => {
    try { await handleMemberJoin(member); } catch (e) { console.error("MemberAdd: " + e.message); }
  });

  // 🔊 Voice State Update — Private Rooms auto-create/delete
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try { await handleVoiceStateUpdate(oldState, newState); } catch (e) { console.error("VoiceState: " + e.message); }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.content || !message.content.startsWith("!")) return;

    const args    = message.content.slice(1).trim().split(/\s+/);
    const command = (args[0] || "").toLowerCase();
    const sub     = (args[1] || "").toLowerCase();

    if (command === "help") {
      const ownerSection = isOwner(message.author.id)
        ? "\n\n🔐 **Admin (Owner):**\n`!admin` | `!give` | `!take` | `!jail` | `!release` | `!steal`"
        : "";
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🤖 somali77 Bot v3.6")
        .setDescription("Dhammaan amarrada:" + ownerSection)
        .addFields(
          { name: "🗑️ Auto Log",              value: "Fariimaha la tirtiray soo bandhig",                    inline: false },
          { name: "🎯 `!snipe`",               value: "Fariin u dambeysay ee la tirtiray",                    inline: false },
          { name: "🛒 `!shop`",                value: "Fardaha 500K-1M | War/Boosters/Debuffs 10-30K",        inline: false },
          { name: "🏪 `!market`",              value: "Suuqa Dahab💛 & Diamond💎 premium items",             inline: false },
          { name: "🎁 `!daily`",               value: "Coins + 💛 Dahab + 💎 Diamond bilaash",               inline: false },
          { name: "💰 `!balance`",             value: "Coins, Dahab, Diamond, faras, stats",                 inline: false },
          { name: "🏇 `!race create/join/start`", value: "Horse Race — cimilada + debuffs",                  inline: false },
          { name: "⚔️ `!war @qof`",            value: "2-player RPG war",                                    inline: false },
          { name: "🃏 `!blackjack <bet>`",     value: "Blackjack 10-2000 coins",                             inline: false },
          { name: "🏠 `!setup`",               value: "Admin: Auto-samee Private Rooms system (category+voice+panel)", inline: false },
          { name: "🗑️ `!clear [N]`",             value: "Fariimaha tirtir (1-100) — bot excluded count",        inline: false },
          { name: "✅ `!verify`",               value: "Role Verified qaado — channel verify-ka ku qor",       inline: false },
          { name: "🐛 `!cilad <dhibaato>`",      value: "Bug/dhibaato owner-ka u dir",                          inline: false },

          { name: "─── 🏴‍☠️ PIRATE ADVENTURE ───", value: "\u200b",                                          inline: false },
          { name: "🗺️ `!voyage`",              value: "Safar — random events, treasure, storms (30min CD)",  inline: false },
          { name: "📊 `!piratestats`",         value: "Pirate profile, ship, level, gold, gems",             inline: false },
          { name: "⚔️ `!piratebattle [@qof]`", value: "AI ama PvP dagaal — gold + gems abaal",               inline: false },
          { name: "🛒 `!pirateshop`",          value: "Ships 5K-500K | Weapons | Armor | Crew 500G",         inline: false },
          { name: "⬆️ `!upgrade ship <stat>`", value: "Speed/HP/DMG/Cargo upgrade markabkaaga",              inline: false },
          { name: "🏝️ `!islands`",             value: "Jasiiradaha eeg",                                     inline: false },
          { name: "⛵ `!sail <island>`",        value: "Jasiirad tag — dagaal + loot",                        inline: false },
          { name: "🎁 `!piratedaily`",         value: "Daily pirate gold + gems",                            inline: false },
          { name: "🏆 `!pirateleader`",        value: "Pirate leaderboard",                                  inline: false },
          { name: "🏰 `!kingdomrob`",          value: "Kingdom rob — DAHAB + DIAMOND badan! (2-day CD)",     inline: false },
        )
        .setFooter({ text: "somali77 v3.7 • prefix: !" })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    if (command === "admin") {
      if (!isOwner(message.author.id)) return message.reply("❌ Admin panel **Owner kaliya**.");
      return message.reply({ embeds: [buildAdminEmbed(message.author.username)] });
    }

    if (command === "give")    return adminGive(message, args);
    if (command === "take")    return adminTake(message, args);
    if (command === "jail")    return adminJail(message);
    if (command === "release") return adminRelease(message);
    if (command === "steal") { if (!isOwner(message.author.id)) return; return adminSteal(message, args); }

    // 📥 Invite Tracker
    if (command === "invite" || command === "invites") return handleInviteCommand(message, args.slice(1));

    // 🏠 Private Room
    if (command === "setup")  return handleSetup(message);

    // 🗑️ Clear + ✅ Verify
    if (command === "clear")  return handleClear(message, args.slice(1));
    if (command === "verify") return handleVerify(message);

    // 🐛 Cilad / Bug Report
    if (command === "cilad") return handleCilad(message, args.slice(1));

    // 📩 DM (owner only)
    if (command === "dm") return handleDM(message, args);



    if (command === "snipe") {
      const cached = snipeCache.get(message.channelId);
      if (!cached) return message.reply("❌ Wax la tirtiray kuma jiraan xusuusta.");
      return message.reply({ embeds: [buildDeletedEmbed(cached)] });
    }

    if (command === "shop")                         return handleShop(message);
    if (command === "daily")                        return handleDaily(message);
    if (command === "balance" || command === "bal") return handleBalance(message);
    if (command === "market" || command === "suuq") return handleMarket(message, args.slice(1));

    if (command === "race") {
      if (sub === "create") return createRace(message);
      if (sub === "join")   return joinRace(message);
      if (sub === "start")  return startRace(message);
      return message.reply("❓ `!race create` | `!race join` | `!race start`");
    }

    if (command === "blackjack" || command === "bj") return startBlackjack(message, parseInt(args[1]));
    if (command === "war")  return handleWarChallenge(message, message.mentions.users.first(), client);

    if (command === "piratestats" || command === "ps")   return pirate.handlePirateStats(message);
    if (command === "voyage")                            return pirate.handleVoyage(message);
    if (command === "piratedaily" || command === "pd")   return pirate.handlePirateDaily(message);
    if (command === "pirateleader" || command === "pl")  return pirate.handlePirateLeader(message);
    if (command === "kingdomrob"   || command === "kr")  return pirate.handleKingdomRob(message);
    if (command === "islands")                           return pirate.handleIslands(message);
    if (command === "sail")                              return pirate.handleSail(message, args.slice(1));
    if (command === "pirateshop"   || command === "pshop") return pirate.handlePirateShop(message, args.slice(1));
    if (command === "upgrade")                           return pirate.handleUpgrade(message, args.slice(1));
    if (command === "piratebattle" || command === "pb")  return pirate.handlePirateBattle(message, message.mentions.users.first());

    if (command === "case")                               return detective.handleCase(message, args.slice(1));
    if (command === "investigate" || command === "inv")   return detective.handleInvestigate(message, args.slice(1));
    if (command === "question"    || command === "q")     return detective.handleQuestion(message, args.slice(1));
    if (command === "analyze"     || command === "ana")   return detective.handleAnalyze(message);
    if (command === "solve")                              return detective.handleSolve(message, args.slice(1));
    if (command === "detectiveshop"  || command === "dshop") return detective.handleDetectiveShop(message, args.slice(1));
    if (command === "detectivestats" || command === "ds")    return detective.handleDetectiveStats(message);
    if (command === "detectiveleader"|| command === "dl")    return detective.handleDetectiveLeader(message);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    // 🏠 Private Room buttons + modals
    if (interaction.isButton() && interaction.customId.startsWith("pr_")) {
      return handleRoomButton(interaction, client).catch((e) => {
        console.error("pr_button: " + e.message);
        if (!interaction.replied && !interaction.deferred) interaction.reply({ content: "❌ Khalad yar: " + e.message, ephemeral: true }).catch(() => {});
      });
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith("pr_modal_")) {
      return handleRoomModal(interaction, client).catch((e) => {
        console.error("pr_modal: " + e.message);
        if (!interaction.replied && !interaction.deferred) interaction.reply({ content: "❌ Khalad: " + e.message, ephemeral: true }).catch(() => {});
      });
    }

    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id.startsWith("hw_vote_")) return hw.handleVoteButton(interaction).catch((e) => { console.error("hw_vote: " + e.message); });
      if (id.startsWith("race_")) return raceBtn(interaction);
      if (id.startsWith("shop_")) return handleShopButton(interaction);
      if (id.startsWith("bj_"))   return handleBJButton(interaction);
      if (id.startsWith("war_"))  return handleWarButton(interaction, client);
      if (id.startsWith("pb_"))   return pirate.handleBattleButton(interaction);
      return;
    }
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "race_kick_select")   return handleSelectMenu(interaction);
      if (interaction.customId.startsWith("shop_buy_")) return handleBuySelect(interaction);
      if (interaction.customId === "pr_settings_menu" || interaction.customId === "pr_perms_menu") {
        return handleRoomSelect(interaction, client).catch((e) => {
          console.error("pr_select: " + e.message);
          if (!interaction.replied && !interaction.deferred) interaction.reply({ content: "❌ Khalad: " + e.message, ephemeral: true }).catch(() => {});
        });
      }
      return;
    }
    if (!interaction.isChatInputCommand()) return;

    const name = interaction.commandName;
    const sub  = interaction.options.getSubcommand(false);

    if (name === "snipe") {
      const c = snipeCache.get(interaction.channelId);
      if (!c) return interaction.reply({ content: "❌ Wax la tirtiray kuma jiraan.", ephemeral: true });
      return interaction.reply({ embeds: [buildDeletedEmbed(c)] });
    }
    if (name === "shop")      return handleShop(interaction);
    if (name === "daily")     return handleDaily(interaction);
    if (name === "balance")   return handleBalance(interaction);
    if (name === "blackjack") return startBlackjack(interaction, interaction.options.getInteger("bet"));
    if (name === "war")       return handleWarChallenge(interaction, interaction.options.getUser("opponent"), client);
    if (name === "race") {
      if (sub === "create") return createRace(interaction);
      if (sub === "join")   return joinRace(interaction);
      if (sub === "start")  return startRace(interaction);
    }

    // ── Hacker Wars ──────────────────────────────────────────────────────────
    if (name === "hacker") {
      if (sub === "join")    return hw.handleJoin(interaction).catch((e) => console.error("hw join: " + e.message));
      if (sub === "leave")   return hw.handleLeave(interaction).catch((e) => console.error("hw leave: " + e.message));
      if (sub === "start")   return hw.handleStart(interaction).catch((e) => console.error("hw start: " + e.message));
      if (sub === "endvote") return hw.handleEndVote(interaction).catch((e) => console.error("hw endvote: " + e.message));
    }
    if (name === "bomb")   return hw.handleBomb(interaction).catch((e) => console.error("hw bomb: " + e.message));
    if (name === "defuse") return hw.handleDefuse(interaction).catch((e) => console.error("hw defuse: " + e.message));
  });

  client.on("error", (e) => console.error("Client: " + e.message));
  process.on("unhandledRejection", (e) => console.error("Unhandled: " + (e?.message || e)));
  client.login(token).catch((e) => console.error("Login failed: " + e.message));
}
