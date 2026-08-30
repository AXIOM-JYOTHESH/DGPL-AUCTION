const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });
const prisma = require('../prismaClient');

const mappings = [
  { team: 'Delhi Capitals', playerName: 'Shashi Nayak' },
  { team: 'Chennai Super Kings', playerName: 'NARAYANA RAJU' },
  { team: 'Mumbai Indians', playerName: 'Rithwik Reddy' },
  { team: 'Royal Challengers Bangalore', playerName: 'Narendar' },
];

async function run() {
  try {
    const results = [];
    for (const { team: teamName, playerName } of mappings) {
      const team = await prisma.team.findFirst({ where: { name: teamName } });
      if (!team) {
        results.push({
          team: teamName,
          player: playerName,
          ok: false,
          reason: 'Team not found',
        });
        continue;
      }

      const player = await prisma.player.findFirst({ where: { name: playerName } });
      if (!player) {
        results.push({
          team: teamName,
          player: playerName,
          ok: false,
          reason: 'Player not found',
        });
        continue;
      }

      // Update player as captain & assign team
      await prisma.player.update({
        where: { id: player.id },
        data: { isCaptain: true, teamId: team.id },
      });

      // Update team captain
      await prisma.team.update({
        where: { id: team.id },
        data: { captainId: player.id },
      });

      results.push({
        team: teamName,
        player: playerName,
        ok: true,
        playerId: player.id,
      });
    }

    console.table(results);
  } catch (err) {
    console.error('Error assigning captains:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
