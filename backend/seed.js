const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('./prismaClient');
require('dotenv').config({ path: path.join(__dirname, 'config.env') });

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
    console.log('[Seed] Clearing existing database records...');
    await prisma.bid.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.appConfig.deleteMany({});

    console.log('[Seed] Importing %d teams...', teams.length);
    for (const t of teams) {
      await prisma.team.create({
        data: {
          id: t._id || undefined,
          name: t.name.trim(),
          image: t.image || null,
          budget: t.budget != null ? parseFloat(t.budget) : 100.0,
        },
      });
    }

    console.log('[Seed] Importing %d players...', players.length);
    for (const p of players) {
      await prisma.player.create({
        data: {
          id: p._id || undefined,
          name: p.name.trim(),
          isCaptain: Boolean(p.isCaptain),
          year: p.year != null ? parseInt(p.year, 10) : null,
          image: p.image || null,
          category: p.category,
          basePrice: p.basePrice != null ? parseFloat(p.basePrice) : null,
          status: p.status || 'unsold',
          teamId: p.team || null,
          finalBidPrice: p.finalBidPrice != null ? parseFloat(p.finalBidPrice) : null,
        },
      });
    }

    console.log('[Seed] Linking captains and team rosters...');
    for (const t of teams) {
      if (t.captain) {
        // Ensure captain exists
        const capExists = await prisma.player.findUnique({ where: { id: t.captain } });
        if (capExists) {
          // Set team captain
          await prisma.team.update({
            where: { id: t._id },
            data: { captainId: t.captain },
          });
          // Set player team backref and mark captain
          await prisma.player.update({
            where: { id: t.captain },
            data: { teamId: t._id, isCaptain: true },
          });
        }
      }

      if (Array.isArray(t.players)) {
        for (const pid of t.players) {
          const pExists = await prisma.player.findUnique({ where: { id: pid } });
          if (pExists) {
            await prisma.player.update({
              where: { id: pid },
              data: { teamId: t._id },
            });
          }
        }
      }
    }

    console.log('[Seed] Importing %d users (with bcrypt hashing)...', users.length);
    for (const u of users) {
      const hashedPassword = await bcrypt.hash(u.password, 12);
      await prisma.user.create({
        data: {
          id: u._id || undefined,
          name: u.name,
          email: u.email.toLowerCase().trim(),
          password: hashedPassword,
          role: u.role || 'captain',
          teamId: u.team || null,
          playerProfileId: u.playerProfile || null,
        },
      });
    }

    console.log('[Seed] Creating initial AppConfig...');
    await prisma.appConfig.create({
      data: {
        sessionsInvalidatedAt: new Date(),
      },
    });

    console.log('✅ [Seed] Data successfully imported into PostgreSQL!');
  } catch (err) {
    console.error('❌ [Seed] Error importing data:', err);
    throw err;
  }
}

async function deleteData() {
  try {
    console.log('[Seed] Deleting all data...');
    await prisma.bid.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.player.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.appConfig.deleteMany({});
    console.log('✅ [Seed] Data successfully deleted!');
  } catch (err) {
    console.error('❌ [Seed] Error deleting data:', err);
    throw err;
  }
}

if (process.argv[2] === '--import') {
  importData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (process.argv[2] === '--delete') {
  deleteData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { importData, deleteData };
