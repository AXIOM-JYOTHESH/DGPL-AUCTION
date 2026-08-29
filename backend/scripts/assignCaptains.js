const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Team = require('../models/teamModel');
const Player = require('../models/playerModel');

dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const Database = process.env.DATABASE?.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const mappings = [
  { team: 'Delhi Capitals', playerName: 'Shashi Nayak' },
  { team: 'Chennai Super Kings', playerName: 'NARAYANA RAJU' },
  { team: 'Mumbai Indians', playerName: 'Rithwik Reddy' },
  { team: 'Royal Challengers Bangalore', playerName: 'Narendar' },
];

async function run() {
  if (!Database) {
    console.error('DATABASE env not configured.');
    process.exit(1);
  }
  await mongoose.connect(Database, { serverSelectionTimeoutMS: 20000 });

  try {
    const results = [];
    for (const { team: teamName, playerName } of mappings) {
      const team = await Team.findOne({ name: teamName });
      if (!team) {
        results.push({
          team: teamName,
          player: playerName,
          ok: false,
          reason: 'Team not found',
        });
        continue;
      }

      const player = await Player.findOne({ name: playerName });
      if (!player) {
        results.push({
          team: teamName,
          player: playerName,
          ok: false,
          reason: 'Player not found',
        });
        continue;
      }

      // Mark player as captain
      if (!player.isCaptain) player.isCaptain = true;
      await player.save();

      // Assign as team captain and ensure in players list
      team.captain = player._id;
      if (!team.players) team.players = [];
      if (!team.players.some((id) => id.toString() === player._id.toString())) {
        team.players.push(player._id);
      }
      await team.save();

      results.push({
        team: teamName,
        player: playerName,
        ok: true,
        playerId: player._id,
      });
    }

    console.table(results);
  } catch (err) {
    console.error('Error assigning captains:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
