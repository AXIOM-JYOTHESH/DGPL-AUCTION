const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });
const prisma = require('../prismaClient');

async function clearPlayersAndReset() {
  try {
    console.log('🧹 [Cleanup] Starting fresh cleanup of auction player data...');

    // 1. Delete all bids
    const deletedBids = await prisma.bid.deleteMany({});
    console.log(`✅ Deleted ${deletedBids.count} bids.`);

    // 2. Unlink team captains and reset team budgets
    await prisma.team.updateMany({
      data: {
        captainId: null,
        budget: 100.0,
      },
    });
    console.log('✅ Unlinked team captains & reset team budgets to 100.0 Pts.');

    // 3. Unlink user player profiles
    await prisma.user.updateMany({
      data: {
        playerProfileId: null,
      },
    });
    console.log('✅ Unlinked user player profile references.');

    // 4. Delete all players (test players, seeded players, pending, sold, unsold)
    const deletedPlayers = await prisma.player.deleteMany({});
    console.log(`✅ Deleted ${deletedPlayers.count} players from database.`);

    // 5. Reset AppConfig (live auction status & privacy mode)
    await prisma.appConfig.updateMany({
      data: {
        privacyMode: false,
        auctionCompleted: false,
        sessionsInvalidatedAt: new Date(),
      },
    });
    console.log('✅ Reset auction completion & privacy mode flags.');

    console.log('\n🎉 DATABASE IS CLEAN & READY FOR FRESH GOOGLE FORM REGISTRATIONS!');
    console.log('Franchise teams and Admin login accounts are preserved.');
  } catch (err) {
    console.error('❌ Error clearing player data:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

clearPlayersAndReset();
