import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { logger } from "../lib/logger";

const commands = [
  new SlashCommandBuilder().setName("join").setDescription("Ku biir Hacker Wars ciyaarta"),
  new SlashCommandBuilder().setName("leave").setDescription("Ka bax ciyaarta"),
  new SlashCommandBuilder()
    .setName("start")
    .setDescription("Bilow ciyaarta (host kaliya)")
    .setDefaultMemberPermissions("8"),
  new SlashCommandBuilder()
    .setName("endvote")
    .setDescription("Dhamee codeynta oo saaro qofka ugu codka badnaa")
    .setDefaultMemberPermissions("8"),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Ka saar qof server-ka (admin kaliya)")
    .setDefaultMemberPermissions("2")
    .addUserOption((o) =>
      o.setName("target").setDescription("Member-ka la saari doono").setRequired(true)
    ),
].map((c) => c.toJSON());

export async function registerCommands() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    logger.warn("DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID not set — skipping command registration");
    return;
  }

  const rest = new REST().setToken(token);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.info({ guildId }, "Slash commands registered (guild)");
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info("Slash commands registered (global)");
    }
  } catch (e) {
    logger.error({ err: e }, "Failed to register slash commands");
  }
}
