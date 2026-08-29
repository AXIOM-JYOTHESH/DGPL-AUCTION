const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Player = require('./models/playerModel');
const Team = require('./models/teamModel');
const User = require('./models/userModel');
require('dotenv').config({ path: './config.env' });

const Database = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// Read JSON data files
const dataDir = path.join(__dirname, 'data');
const players = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'players.json'), 'utf-8')
);
const teams = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'teams.json'), 'utf-8')
);
const users = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'users.json'), 'utf-8')
);

async function importData() {
  try {
    console.log('Importing teams...');
    const createdTeams = await Team.create(teams);
    console.log('Importing players...');
    const createdPlayers = await Player.create(players);

    // Build quick lookup maps
    const playersById = new Map(
      createdPlayers.filter((p) => p._id).map((p) => [String(p._id), p])
    );
    const teamsById = new Map(createdTeams.map((t) => [String(t._id), t]));

    // Ensure captain is in players[] and set Player.team backrefs
    console.log('Linking team players and captains...');
    for (const team of createdTeams) {
      const playerIds = new Set((team.players || []).map((id) => String(id)));
      if (team.captain) {
        const cId = String(team.captain);
        if (!playerIds.has(cId)) {
          playerIds.add(cId);
        }
      }
      // Persist updated players array if changed
      const updatedPlayersArr = Array.from(playerIds);
      await Team.findByIdAndUpdate(team._id, { players: updatedPlayersArr });

      // Backfill Player.team reference for each listed player
      for (const pid of updatedPlayersArr) {
        if (playersById.has(pid)) {
          await Player.findByIdAndUpdate(pid, { team: team._id });
        }
      }
    }
    console.log('Importing users (with password hashing)...');
    await User.create(users); // ensures pre-save hashing runs
    console.log('Data successfully imported!');
  } catch (err) {
    console.error('Error importing data:', err);
    throw err;
  }
}

async function deleteData() {
  try {
    console.log('Starting data deletion...');
    await Player.deleteMany();
    await Team.deleteMany();
    await User.deleteMany();
    console.log('All Player, Team, and User documents deleted.');
  } catch (err) {
    console.error('Error deleting data:', err);
    throw err;
  }
}

if (require.main === module) {
  (async () => {
    try {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(Database, {
        serverSelectionTimeoutMS: 20000, // be a bit patient when looking for the server
      });
      console.log('DB connection successful!');

      if (process.argv.includes('--delete')) {
        await deleteData();
      } else if (process.argv.includes('--import')) {
        await importData();
      } else {
        console.log('No valid flag provided. Use --import or --delete');
      }
    } catch (err) {
      // already logged in helpers; ensure non-zero code
      process.exitCode = 1;
    } finally {
      try {
        await mongoose.connection.close();
        console.log('DB connection closed.');
      } catch (_) {}
      // Let Node exit naturally with the set exitCode
    }
  })();
}

module.exports = { importData, deleteData };

