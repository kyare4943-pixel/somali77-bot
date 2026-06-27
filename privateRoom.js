"use strict";
/**
 * privateRoom.js — Auto-Create Voice Rooms v3 (DM Control Panel)
 *
 * !setup   (Admin) — Creates category + "Create Your Voice" voice channel
 * On join  → creates private room, sends user a DM with select menus
 * On leave → deletes room when empty
 */

const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
  PermissionsBitField, ChannelType, StringSelectMenuBuilder,
} = require("discord.js");

// guildId -> { createChannelId, categoryId }
const setupConfig  = new Map();
// ownerId -> { channelId, guildId }
const privateRooms = new Map();

// ── DM Embed & Rows (like screenshot) ────────────────────────────────────────
function buildDMEmbed(channelName) {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("⚙️ Welcome to your own temporary voice channel")
    .setDescription(
      "Control your channel using the menus below\n" +
      "• Use the dropdowns to manage settings and permissions\n" +
      "• Alternatively use `/voice` commands\n" +
      "• All changes apply instantly to your channel"
    )
    .addFields({ name: "📻 Channel", value: "`" + channelName + "`", inline: true })
    .setFooter({ text: "somali77 Private Rooms • Only you can see this" })
    .setTimestamp();
}

function buildDMRows() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("pr_settings_menu")
        .setPlaceholder("Change channel settings  ›")
        .addOptions([
          { label: "✏️ Rename Channel",   value: "rename",    description: "Magaca channel-ka bedel"         },
          { label: "👥 Set User Limit",   value: "limit",     description: "Max users go'i (0 = unlimited)"  },
          { label: "🔇 Mute All",         value: "muteall",   description: "Dhammaan mute garee"             },
          { label: "🔊 Unmute All",       value: "unmuteall", description: "Dhammaan unmute garee"           },
          { label: "ℹ️  Channel Info",    value: "info",      description: "Xaaladda channel-ka eeg"         },
          { label: "🗑️ Delete Room",      value: "delete",    description: "Room permanently tirtir"         },
        ])
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("pr_perms_menu")
        .setPlaceholder("Change channel permissions  ›")
        .addOptions([
          { label: "🔒 Lock Channel",         value: "lock",     description: "Dadka cusub ha geli"           },
          { label: "🔓 Unlock Channel",        value: "unlock",   description: "Dadka cusub geli"              },
          { label: "👁️ Hide Channel",          value: "hide",     description: "Channel-ka qari"              },
          { label: "👁️ Show Channel",          value: "show",     description: "Channel-ka muuji"             },
          { label: "➕ Invite User",           value: "invite",   description: "User gaar ah ku dar"           },
          { label: "➖ Remove User",           value: "remove",   description: "User gaar ah ka saar"          },
          { label: "👑 Transfer Ownership",    value: "transfer", description: "Ownership u wareejin"          },
          { label: "👢 Kick User",             value: "kick",     description: "User room ka saar"             },
        ])
    ),
  ];
}

// ── !setup ─────────────────────────────────────────────────────────────────────
async function handleSetup(message) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return message.reply("❌ **Administrator** permission kaliya ayaa `!setup` isticmaali kara.");
  }

  const loading = await message.reply("⏳ Private Rooms system dejinaya...");

  try {
    // 1. Create category
    const category = await message.guild.channels.create({
      name: "🔊 Private Rooms",
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        { id: message.guild.roles.everyone, allow: [PermissionsBitField.Flags.ViewChannel] },
      ],
    });

    // 2. Create "Create Your Voice" voice channel
    const createCh = await message.guild.channels.create({
      name: "➕ Create Your Voice",
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [
        { id: message.guild.roles.everyone, allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel] },
      ],
    });

    // 3. Store guild config (no control-panel channel anymore)
    setupConfig.set(message.guild.id, {
      createChannelId: createCh.id,
      categoryId:      category.id,
    });

    await loading.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("✅ Private Rooms System — Waa La Dejiyay!")
          .addFields(
            { name: "📁 Category",       value: category.name,  inline: true },
            { name: "🎙️ Voice Channel",  value: createCh.name, inline: true },
          )
          .setDescription(
            "**Sidee u shaqeeyaa:**\n" +
            "• User-ku wuxuu ku biiraa **" + createCh.name + "**\n" +
            "• Bot-ku wuxuu u sameeya room cusub oo gaarka ah\n" +
            "• **DM** ayuu user-ku ku helaa control panel-kiisa\n" +
            "• Room-ka wuxuu is-tirtiraa marka uu madoobaado"
          )
          .setFooter({ text: "somali77 Private Rooms v3 • DM-based control" })
          .setTimestamp(),
      ],
      content: null,
    });

    try { await message.delete(); } catch (_) {}

  } catch (e) {
    await loading.edit("❌ Dejintu khalad: " + e.message);
  }
}

// ── Voice State Update — auto create/delete ───────────────────────────────────
async function handleVoiceStateUpdate(oldState, newState) {
  const guildId = (newState.guild || oldState.guild).id;
  const config  = setupConfig.get(guildId);

  // User joined "Create Your Voice" channel
  if (config && newState.channelId === config.createChannelId) {
    const member   = newState.member;
    const guild    = newState.guild;
    const category = guild.channels.cache.get(config.categoryId);
    const chName   = "🔊 " + member.displayName;

    try {
      const newCh = await guild.channels.create({
        name:   chName,
        type:   ChannelType.GuildVoice,
        parent: category ? category.id : undefined,
        permissionOverwrites: [
          {
            id: member.id,
            allow: [
              PermissionsBitField.Flags.Connect,
              PermissionsBitField.Flags.Speak,
              PermissionsBitField.Flags.MoveMembers,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.ViewChannel,
            ],
          },
          {
            id: guild.roles.everyone,
            allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.ViewChannel],
          },
        ],
      });

      await member.voice.setChannel(newCh);
      privateRooms.set(member.id, { channelId: newCh.id, guildId });

      // ── Send DM control panel (like screenshot) ──
      try {
        await member.user.send({
          embeds:     [buildDMEmbed(chName)],
          components: buildDMRows(),
        });
      } catch (_) {
        // User may have DMs closed — silently ignore
      }

    } catch (e) {
      console.error("AutoRoom create error: " + e.message);
    }
    return;
  }

  // User left — delete if empty private room
  if (oldState.channelId) {
    const leftCh = oldState.guild.channels.cache.get(oldState.channelId);
    if (leftCh && leftCh.members.size === 0) {
      for (const [ownerId, room] of privateRooms) {
        if (room.channelId === oldState.channelId) {
          privateRooms.delete(ownerId);
          await leftCh.delete().catch(() => {});
          break;
        }
      }
    }
  }
}

// ── Select Menu handler (DM-based control panel) ──────────────────────────────
async function handleRoomSelect(interaction, client) {
  const userId  = interaction.user.id;
  const room    = privateRooms.get(userId);
  const guild   = interaction.guild || (room && client.guilds.cache.get(room.guildId));
  const channel = room && guild ? guild.channels.cache.get(room.channelId) : null;
  const everyone = guild ? guild.roles.everyone : null;
  const selected = interaction.values[0];
  const isSettings = interaction.customId === "pr_settings_menu";

  if (!room || !channel || !guild) {
    return interaction.reply({
      content: "❌ Room-kaaga lama helin.\n**Talooyin:** Ku biir **➕ Create Your Voice** channel-ka marka hore.",
      ephemeral: true,
    });
  }

  // ── Channel Settings menu ──
  if (isSettings) {
    if (selected === "rename") {
      const m = new ModalBuilder().setCustomId("pr_modal_rename").setTitle("✏️ Room Magac Bedel");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_rename_val").setLabel("Magaca cusub")
          .setStyle(TextInputStyle.Short).setPlaceholder("My Room 🏠").setMaxLength(100).setRequired(true)
      ));
      return interaction.showModal(m);
    }
    if (selected === "limit") {
      const m = new ModalBuilder().setCustomId("pr_modal_limit").setTitle("👥 User Limit");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_limit_val").setLabel("Max users (0 = unlimited)")
          .setStyle(TextInputStyle.Short).setPlaceholder("5").setMaxLength(2).setRequired(true)
      ));
      return interaction.showModal(m);
    }
    if (selected === "muteall") {
      let n = 0;
      for (const [, m] of channel.members) {
        if (!m.user.bot && m.id !== userId) { try { await m.voice.setMute(true); n++; } catch (_) {} }
      }
      return interaction.reply({ content: "🔇 **" + n + "** qof ayaa la mute galay!", ephemeral: true });
    }
    if (selected === "unmuteall") {
      let n = 0;
      for (const [, m] of channel.members) {
        if (!m.user.bot) { try { await m.voice.setMute(false); n++; } catch (_) {} }
      }
      return interaction.reply({ content: "🔊 **" + n + "** qof ayaa la unmute galay!", ephemeral: true });
    }
    if (selected === "info") {
      const perms  = channel.permissionOverwrites.cache.get(everyone.id);
      const locked = perms ? perms.deny.has(PermissionsBitField.Flags.Connect)     : false;
      const hidden = perms ? perms.deny.has(PermissionsBitField.Flags.ViewChannel) : false;
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor(0x5865f2).setTitle("ℹ️ Room Info")
            .addFields(
              { name: "📝 Magaca",   value: channel.name,                                              inline: true },
              { name: "👥 Members",  value: String(channel.members.size),                              inline: true },
              { name: "👥 Limit",    value: channel.userLimit ? String(channel.userLimit) : "No limit", inline: true },
              { name: "🔒 Locked",   value: locked ? "Haa 🔒" : "Maya 🔓",                            inline: true },
              { name: "👁️ Hidden",  value: hidden ? "Haa 👁️" : "Maya 👁️",                           inline: true },
            ).setTimestamp(),
        ],
        ephemeral: true,
      });
    }
    if (selected === "delete") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pr_delete_yes").setLabel("✅ Haa, Tirtir").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("pr_delete_no").setLabel("❌ Jooji").setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({ content: "⚠️ **Room-ka permanently tirtiraysaa?**", components: [row], ephemeral: true });
    }
  }

  // ── Channel Permissions menu ──
  if (!isSettings) {
    if (selected === "lock") {
      await channel.permissionOverwrites.edit(everyone, { Connect: false });
      return interaction.reply({ content: "🔒 **Room waa la xidday!** Dadka cusub ma geli karaan.", ephemeral: true });
    }
    if (selected === "unlock") {
      await channel.permissionOverwrites.edit(everyone, { Connect: true });
      return interaction.reply({ content: "🔓 **Room waa la furay!** Dadku waxay geli karaan.", ephemeral: true });
    }
    if (selected === "hide") {
      await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
      return interaction.reply({ content: "👁️ **Room waa la qariyay!** Kuma muuqdo dadka server-ka.", ephemeral: true });
    }
    if (selected === "show") {
      await channel.permissionOverwrites.edit(everyone, { ViewChannel: true });
      return interaction.reply({ content: "👁️ **Room waa la muujiyay!** Dadka server-ka ayaa arki kara.", ephemeral: true });
    }
    if (selected === "invite") {
      const m = new ModalBuilder().setCustomId("pr_modal_invite").setTitle("➕ User Invite");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_invite_val").setLabel("User ID-ga")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true)
      ));
      return interaction.showModal(m);
    }
    if (selected === "remove") {
      const m = new ModalBuilder().setCustomId("pr_modal_remove").setTitle("➖ User Ka Saar");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_remove_val").setLabel("User ID-ga")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true)
      ));
      return interaction.showModal(m);
    }
    if (selected === "transfer") {
      const m = new ModalBuilder().setCustomId("pr_modal_transfer").setTitle("👑 Ownership Transfer");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_transfer_val").setLabel("Cusub owner User ID")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true)
      ));
      return interaction.showModal(m);
    }
    if (selected === "kick") {
      const m = new ModalBuilder().setCustomId("pr_modal_kick").setTitle("👢 Kick User");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_kick_val").setLabel("Kick User ID")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true)
      ));
      return interaction.showModal(m);
    }
  }

  return interaction.reply({ content: "❌ Option lama helin.", ephemeral: true });
}

// ── Button handler ─────────────────────────────────────────────────────────────
async function handleRoomButton(interaction, client) {
  const id      = interaction.customId;
  const userId  = interaction.user.id;
  const room    = privateRooms.get(userId);
  const guild   = interaction.guild || (room && client.guilds.cache.get(room.guildId));
  const channel = room && guild ? guild.channels.cache.get(room.channelId) : null;
  const everyone = guild ? guild.roles.everyone : null;

  if (!room || !channel || !guild) {
    return interaction.reply({
      content: "❌ Room-kaaga lama helin.\n**Talooyin:** Ku biir **➕ Create Your Voice** channel-ka marka hore.",
      ephemeral: true,
    });
  }

  switch (id) {
    case "pr_lock":
      await channel.permissionOverwrites.edit(everyone, { Connect: false });
      return interaction.reply({ content: "🔒 **Room waa la xidday!**", ephemeral: true });

    case "pr_unlock":
      await channel.permissionOverwrites.edit(everyone, { Connect: true });
      return interaction.reply({ content: "🔓 **Room waa la furay!**", ephemeral: true });

    case "pr_hide":
      await channel.permissionOverwrites.edit(everyone, { ViewChannel: false });
      return interaction.reply({ content: "👁️ **Room waa la qariyay!**", ephemeral: true });

    case "pr_unhide":
      await channel.permissionOverwrites.edit(everyone, { ViewChannel: true });
      return interaction.reply({ content: "👁️ **Room waa la muujiyay!**", ephemeral: true });

    case "pr_rename": {
      const m = new ModalBuilder().setCustomId("pr_modal_rename").setTitle("✏️ Room Magac Bedel");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_rename_val").setLabel("Magaca cusub")
          .setStyle(TextInputStyle.Short).setPlaceholder("Tusaale: My Room 🏠").setMaxLength(100).setRequired(true),
      ));
      return interaction.showModal(m);
    }

    case "pr_limit": {
      const m = new ModalBuilder().setCustomId("pr_modal_limit").setTitle("👥 User Limit");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_limit_val").setLabel("Max users (0 = unlimited)")
          .setStyle(TextInputStyle.Short).setPlaceholder("Tusaale: 5").setMaxLength(2).setRequired(true),
      ));
      return interaction.showModal(m);
    }

    case "pr_invite": {
      const m = new ModalBuilder().setCustomId("pr_modal_invite").setTitle("➕ User Invite");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_invite_val").setLabel("User ID-ga")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true),
      ));
      return interaction.showModal(m);
    }

    case "pr_remove": {
      const m = new ModalBuilder().setCustomId("pr_modal_remove").setTitle("➖ User Ka Saar");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_remove_val").setLabel("User ID-ga")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true),
      ));
      return interaction.showModal(m);
    }

    case "pr_transfer": {
      const m = new ModalBuilder().setCustomId("pr_modal_transfer").setTitle("👑 Ownership Transfer");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_transfer_val").setLabel("Cusub owner User ID")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true),
      ));
      return interaction.showModal(m);
    }

    case "pr_muteall": {
      let n = 0;
      for (const [, m] of channel.members) {
        if (!m.user.bot && m.id !== userId) { try { await m.voice.setMute(true); n++; } catch (_) {} }
      }
      return interaction.reply({ content: "🔇 **" + n + "** qof ayaa la mute galay!", ephemeral: true });
    }

    case "pr_unmuteall": {
      let n = 0;
      for (const [, m] of channel.members) {
        if (!m.user.bot) { try { await m.voice.setMute(false); n++; } catch (_) {} }
      }
      return interaction.reply({ content: "🔊 **" + n + "** qof ayaa la unmute galay!", ephemeral: true });
    }

    case "pr_kick": {
      const m = new ModalBuilder().setCustomId("pr_modal_kick").setTitle("👢 Kick User");
      m.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("pr_kick_val").setLabel("Kick garayneyso User ID")
          .setStyle(TextInputStyle.Short).setPlaceholder("123456789012345678").setRequired(true),
      ));
      return interaction.showModal(m);
    }

    case "pr_delete": {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("pr_delete_yes").setLabel("✅ Haa, Tirtir").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("pr_delete_no").setLabel("❌ Jooji").setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({ content: "⚠️ **Room-ka permanently tirtiraysaa?**", components: [row], ephemeral: true });
    }

    case "pr_delete_yes":
      try {
        await channel.delete();
        privateRooms.delete(userId);
        return interaction.update({ content: "🗑️ **Room waa la tirtiray!**", components: [] });
      } catch (e) {
        return interaction.update({ content: "❌ Tirtiri kari waayay: " + e.message, components: [] });
      }

    case "pr_delete_no":
      return interaction.update({ content: "✅ La joojiyay — room weli jiraa.", components: [] });

    case "pr_info": {
      const perms  = channel.permissionOverwrites.cache.get(everyone.id);
      const locked = perms ? perms.deny.has(PermissionsBitField.Flags.Connect) : false;
      const hidden = perms ? perms.deny.has(PermissionsBitField.Flags.ViewChannel) : false;
      return interaction.reply({
        embeds: [
          new EmbedBuilder().setColor(0x5865f2).setTitle("ℹ️ Room Info")
            .addFields(
              { name: "📝 Magaca",   value: channel.name,                                               inline: true },
              { name: "👥 Members",  value: String(channel.members.size),                               inline: true },
              { name: "👥 Limit",    value: channel.userLimit ? String(channel.userLimit) : "No limit", inline: true },
              { name: "🔒 Locked",   value: locked ? "Haa 🔒" : "Maya 🔓",                             inline: true },
              { name: "👁️ Hidden",  value: hidden ? "Haa 👁️" : "Maya 👁️",                            inline: true },
            ).setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  }
}

// ── Modal handler ──────────────────────────────────────────────────────────────
async function handleRoomModal(interaction, client) {
  const id      = interaction.customId;
  const userId  = interaction.user.id;
  const room    = privateRooms.get(userId);
  const guild   = interaction.guild || (room && client.guilds.cache.get(room.guildId));
  const channel = room && guild ? guild.channels.cache.get(room.channelId) : null;

  if (!room || !channel || !guild) {
    return interaction.reply({ content: "❌ Room-kaaga lama helin.", ephemeral: true });
  }

  if (id === "pr_modal_rename") {
    const name = interaction.fields.getTextInputValue("pr_rename_val");
    await channel.setName(name);
    return interaction.reply({ content: "✏️ **Magaca cusub:** `" + name + "`", ephemeral: true });
  }

  if (id === "pr_modal_limit") {
    const lim = parseInt(interaction.fields.getTextInputValue("pr_limit_val"), 10);
    if (isNaN(lim) || lim < 0 || lim > 99) return interaction.reply({ content: "❌ Tiro sax ah gali (0–99)", ephemeral: true });
    await channel.setUserLimit(lim);
    return interaction.reply({ content: "👥 **Limit:** " + (lim === 0 ? "No limit" : lim), ephemeral: true });
  }

  if (id === "pr_modal_invite") {
    const raw = interaction.fields.getTextInputValue("pr_invite_val").replace(/[<@!>]/g, "").trim();
    try {
      const member = await guild.members.fetch(raw);
      await channel.permissionOverwrites.edit(member, { Connect: true, ViewChannel: true });
      return interaction.reply({ content: "➕ **" + member.user.username + "** waa la invite galay!", ephemeral: true });
    } catch (_) { return interaction.reply({ content: "❌ User lama helin. ID-ga saxda ah gali.", ephemeral: true }); }
  }

  if (id === "pr_modal_remove") {
    const raw = interaction.fields.getTextInputValue("pr_remove_val").replace(/[<@!>]/g, "").trim();
    try {
      const member = await guild.members.fetch(raw);
      await channel.permissionOverwrites.edit(member, { Connect: false, ViewChannel: false });
      return interaction.reply({ content: "➖ **" + member.user.username + "** access waa la qaatay!", ephemeral: true });
    } catch (_) { return interaction.reply({ content: "❌ User lama helin.", ephemeral: true }); }
  }

  if (id === "pr_modal_transfer") {
    const raw = interaction.fields.getTextInputValue("pr_transfer_val").replace(/[<@!>]/g, "").trim();
    try {
      const member = await guild.members.fetch(raw);
      privateRooms.delete(userId);
      privateRooms.set(member.id, { channelId: room.channelId, guildId: room.guildId });
      await channel.permissionOverwrites.edit(member, { Connect: true, ViewChannel: true, MoveMembers: true });
      return interaction.reply({ content: "👑 **Ownership waa la wareejiyay** → **" + member.user.username + "**!", ephemeral: true });
    } catch (_) { return interaction.reply({ content: "❌ User lama helin.", ephemeral: true }); }
  }

  if (id === "pr_modal_kick") {
    const raw = interaction.fields.getTextInputValue("pr_kick_val").replace(/[<@!>]/g, "").trim();
    try {
      const member = await guild.members.fetch(raw);
      if (member.voice.channelId === room.channelId) {
        await member.voice.disconnect();
        return interaction.reply({ content: "👢 **" + member.user.username + "** room-ka laga saaray!", ephemeral: true });
      }
      return interaction.reply({ content: "❌ **" + member.user.username + "** room-kaaga kuma jiro.", ephemeral: true });
    } catch (_) { return interaction.reply({ content: "❌ User lama helin.", ephemeral: true }); }
  }
}

module.exports = { handleSetup, handleVoiceStateUpdate, handleRoomButton, handleRoomModal, handleRoomSelect };
