const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express");

// ================= CONFIG =================
const token = process.env.TOKEN;
if (!token) {
  console.error("❌ TOKEN env variable not found!");
  process.exit(1);
}

// ================= RAID CHANNEL =================
const raidChannelId = "1465310648450941073";

// ================= CLIENT =================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// ================= FIXED 24H DUNGEON SCHEDULE (PH TIME) =================
const dungeonSchedule = {
  "00:00": "Igris",
  "00:30": "Demon Castle",
  "01:00": "Elves",
  "01:30": "Goblin",
  "02:00": "Subway",
  "02:30": "Infernal",
  "03:00": "Insect",
  "03:30": "Igris",
  "04:00": "Demon Castle",
  "04:30": "Elves",
  "05:00": "Goblin",
  "05:30": "Subway",
  "06:00": "Infernal",
  "06:30": "Insect",
  "07:00": "Igris",
  "07:30": "Demon Castle",
  "08:00": "Goblin",
  "08:30": "Subway",
  "09:00": "Infernal",
  "09:30": "Insect",
  "10:00": "Igris",
  "10:30": "Demon Castle",
  "11:00": "Elves",
  "11:30": "Goblin",
  "12:00": "Subway",
  "12:30": "Infernal",
  "13:00": "Insect",
  "13:30": "Igris",
  "14:00": "Demon Castle",
  "14:30": "Elves",
  "15:00": "Goblin",
  "15:30": "Subway",
  "16:00": "Infernal",
  "16:30": "Insect",
  "17:00": "Igris",
  "17:30": "Demon Castle",
  "18:00": "Elves",
  "18:30": "Goblin",
  "19:00": "Subway",
  "19:30": "Infernal",
  "20:00": "Insect",
  "20:30": "Igris",
  "21:00": "Demon Castle",
  "21:30": "Elves",
  "22:00": "Goblin",
  "22:30": "Subway",
  "23:00": "Infernal",
  "23:30": "Insect",
};

// ================= IMAGES =================
const dungeonImages = {
  Goblin: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695534078529679/image.png",
  Subway: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696594457563291/image.png",
  Infernal: "https://cdn.discordapp.com/attachments/1460638599082021107/1460697434920587489/image.png",
  Insect: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696683498176737/image.png",
  Igris: "https://cdn.discordapp.com/attachments/1460638599082021107/1460696861399842979/image.png",
  Elves: "https://cdn.discordapp.com/attachments/1460638599082021107/1460695678941663377/image.png",
  "Demon Castle": "https://cdn.discordapp.com/attachments/1410965755742130247/1463577590039183431/image.png",
};

// ================= ROLE IDS =================
const raidRoles = {
  Insect: "1465426148488908942",
  "Demon Castle": "1465426100019793961",
  Igris: "1465426048609947932",
  Goblin: "1465426012421492857",
  Elves: "1465425963905974483",
  Subway: "1465425957165732003",
  Infernal: "1465425897988554888",
};

// ================= STATE =================
let reminderMessage = null;
let pingSent = false;
let lastActiveKey = null;
let lastReminderKey = null;

// ================= PH TIME =================
function getPHTime() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );
}

function formatHM(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function getNextSlot(time) {
  const [h, m] = time.split(":").map(Number);
  const d = getPHTime();
  d.setHours(h, m + 30, 0, 0);
  return formatHM(d);
}

// ================= READY =================
client.once("ready", () => {
  console.log(`🟢 ONLINE AS ${client.user.tag}`);
  setInterval(mainLoop, 1000);
});

// ================= REMINDER =================
async function postReminder(channel, dungeon, secondsLeft) {
  pingSent = false;

  const format = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
      Math.floor(s % 60)
    ).padStart(2, "0")}`;

  const update = async () => {
    const red = secondsLeft <= 180;

    const embed = new EmbedBuilder()
      .setColor(red ? 0xff0000 : 0x11162a)
      .setTitle("「 SYSTEM WARNING 」")
      .setDescription(
        [
          "━━━━━━━━━━━━━━━━━━",
          "**🗡️ UPCOMING DUNGEON**",
          `> ${dungeon}`,
          "",
          `⏱️ Starts in: ${format(secondsLeft)}`,
          red ? "🔴 **RED ALERT!**" : "",
          "━━━━━━━━━━━━━━━━━━",
        ].join("\n")
      )
      .setImage(dungeonImages[dungeon])
      .setTimestamp();

    if (!reminderMessage)
      reminderMessage = await channel.send({ embeds: [embed] });
    else await reminderMessage.edit({ embeds: [embed] });
  };

  await update();

  const timer = setInterval(async () => {
    secondsLeft--;
    if (secondsLeft <= 0) return clearInterval(timer);

    if (secondsLeft === 180 && !pingSent && raidRoles[dungeon]) {
      pingSent = true;
      await channel.send(`<@&${raidRoles[dungeon]}>`);
    }

    await update();
  }, 1000);
}

// ================= MAIN LOOP =================
async function mainLoop() {
  const ph = getPHTime();
  const m = ph.getMinutes();
  const s = ph.getSeconds();
  const key = formatHM(ph);

  const channel = await client.channels.fetch(raidChannelId).catch(() => null);
  if (!channel) return;

  if ((m === 0 || m === 30) && s <= 1) {
    if (lastActiveKey === key) return;
    lastActiveKey = key;

    const active = dungeonSchedule[key];
    if (!active) return;

    const next = dungeonSchedule[getNextSlot(key)];

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x05070f)
          .setTitle("「 SYSTEM — DUNGEON STATUS 」")
          .setDescription(
            [
              "━━━━━━━━━━━━━━━━━━",
              "**⚔️ ACTIVE DUNGEON**",
              `> ${active}`,
              "",
              "**➡️ NEXT DUNGEON**",
              `> ${next}`,
              "━━━━━━━━━━━━━━━━━━",
            ].join("\n")
          )
          .setImage(dungeonImages[active])
          .setTimestamp(),
      ],
    });

    reminderMessage = null;
  }

  if ((m === 20 || m === 50) && s <= 1) {
    if (lastReminderKey === key) return;
    lastReminderKey = key;

    const base = getPHTime();
    base.setMinutes(m === 20 ? 30 : 60, 0, 0);

    const upcoming = dungeonSchedule[formatHM(base)];
    if (!upcoming) return;

    await postReminder(channel, upcoming, Math.floor((base - ph) / 1000));
  }
}

// ================= EXPRESS (RENDER KEEP ALIVE) =================
const app = express();
app.get("/", (_, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 10000, () =>
  console.log("🌐 Web server active")
);

// ================= SAFETY NET =================
process.on("unhandledRejection", err => console.error("UNHANDLED:", err));
process.on("uncaughtException", err => console.error("CRASH:", err));

// ================= LOGIN =================
client.login(token);
