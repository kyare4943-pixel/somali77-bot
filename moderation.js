"use strict";
/**
 * moderation.js — Clear (sanad ka hor ilaa) + Verify
 */
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

async function handleClear(message, args) {
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages))
    return message.reply({ content:"❌ **Manage Messages** permission ma haysatid!", ephemeral:true });

  const amount = Math.min(Math.max(parseInt(args[0])||10, 1), 100);
  const oneYearAgo  = Date.now() - 365*24*60*60*1000;
  const fourteenDays = Date.now() - 14*24*60*60*1000;

  let fetched;
  try { fetched = await message.channel.messages.fetch({ limit: amount+1 }); }
  catch(e) { return message.reply("❌ Fariimaha la soo qaadan kari waayay: "+e.message); }

  const all  = [...fetched.values()];
  const bulk = all.filter(m => m.createdTimestamp > fourteenDays);
  const old  = all.filter(m => m.createdTimestamp <= fourteenDays && m.createdTimestamp >= oneYearAgo);
  const humanCount = all.filter(m => !m.author.bot).length;

  let deleted = 0;

  if (bulk.length) {
    try { await message.channel.bulkDelete(bulk, true); deleted += bulk.length; } catch(_) {}
  }

  if (old.length) {
    const prog = await message.channel.send(`⏳ Fariimaha da' ah tirtiraya... (${old.length} fariin — hal/second)`).catch(()=>null);
    for (const msg of old) {
      try { await msg.delete(); deleted++; } catch(_) {}
      await new Promise(r => setTimeout(r, 1100));
    }
    prog?.delete().catch(()=>{});
  }

  const confirm = await message.channel.send({
    embeds:[new EmbedBuilder().setColor(0xe74c3c).setTitle("🗑️ Channel Nadiifiyay")
      .setDescription(`**${humanCount}** fariin oo aadanaha ah waa la tirtiray.\n*(bot fariimaheedii count ka meel ma galin)*`)
      .addFields({ name:"📦 Wadarta",value:`${deleted}`,inline:true },{ name:"👤 Aadane",value:`${humanCount}`,inline:true })
      .setFooter({ text:"La tirtiray: "+message.author.username }).setTimestamp()],
  });
  setTimeout(()=>confirm.delete().catch(()=>{}), 6000);
}

const VERIFY_ROLE = "Verified";

async function handleVerify(message) {
  try { await message.delete(); } catch(_) {}
  const role = message.guild.roles.cache.find(r => r.name.toLowerCase()===VERIFY_ROLE.toLowerCase());
  if (!role) {
    const e = await message.channel.send(`❌ **"${VERIFY_ROLE}"** role server-ka kuma jirto.\nAdmin-ku role "${VERIFY_ROLE}" ha abuurto.`);
    setTimeout(()=>e.delete().catch(()=>{}),8000); return;
  }
  if (message.member.roles.cache.has(role.id)) {
    const e = await message.channel.send({ content:`<@${message.author.id}>`, embeds:[new EmbedBuilder().setColor(0x95a5a6).setDescription("✅ Horay u verified baad tahay!").setTimestamp()] });
    setTimeout(()=>e.delete().catch(()=>{}),5000); return;
  }
  try { await message.member.roles.add(role); }
  catch(e) {
    const m = await message.channel.send("❌ Role siinayaasha khalad: "+e.message+"\nBot-ku wuxuu u baahan yahay **Manage Roles** permission.");
    setTimeout(()=>m.delete().catch(()=>{}),8000); return;
  }
  await message.channel.send({ content:`<@${message.author.id}>`, embeds:[new EmbedBuilder().setColor(0x2ecc71).setTitle("✅ Verified!")
    .setDescription(`**${message.author.username}** waa si guul leh loo verified galay! 🎉\nRole-ka \`${VERIFY_ROLE}\` ayaa lagugu daray.`)
    .setThumbnail(message.author.displayAvatarURL()).setTimestamp()] });
}

module.exports = { handleClear, handleVerify };
