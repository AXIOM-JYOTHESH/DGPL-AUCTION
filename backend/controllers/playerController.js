const prisma = require('../prismaClient');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { formatPlayer } = require('../utils/formatPlayer');
const {
  extractDriveId,
  normalizeImageUrl,
  parseAcademicYear,
  parseCategory,
  parseBasePrice,
} = require('../utils/googleDriveHelper');

// CREATE A NEW PLAYER
exports.createPlayer = catchAsync(async (req, res, next) => {
  const { name, isCaptain, year, image, category, basePrice, status, teamId } = req.body;

  if (!name || !category) {
    return next(new AppError('Player name and category are required', 400));
  }

  const player = await prisma.player.create({
    data: {
      name: name.trim(),
      isCaptain: Boolean(isCaptain),
      year: year ? parseInt(year, 10) : null,
      image,
      category,
      basePrice: basePrice != null ? parseFloat(basePrice) : null,
      status: status || 'unsold',
      teamId: teamId || null,
    },
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  res.status(201).json({
    status: 'success',
    data: { data: formatPlayer(player) },
  });
});

// GET ALL PLAYERS
exports.getAllPlayers = catchAsync(async (req, res, next) => {
  const includeCaptains = String(req.query.includeCaptains || 'false') === 'true';

  const where = {};
  if (!includeCaptains) {
    where.isCaptain = false;
  }
  if (req.query.year) {
    where.year = parseInt(req.query.year, 10);
  }
  if (req.query.category) {
    where.category = req.query.category;
  }
  if (req.query.status) {
    if (req.query.status !== 'all') {
      where.status = req.query.status;
    }
  } else {
    // By default, exclude pending registrations and rejected players from general/public queries
    where.status = { notIn: ['pending', 'rejected'] };
  }

  const players = await prisma.player.findMany({
    where,
    include: {
      team: true,
      bids: {
        include: { team: true },
        orderBy: { timestamp: 'asc' },
      },
    },
    orderBy: [{ year: 'asc' }, { name: 'asc' }],
  });

  const formatted = players.map(formatPlayer);

  res.status(200).json({
    status: 'success',
    results: formatted.length,
    data: { players: formatted },
  });
});

// GET A SINGLE PLAYER BY ID
exports.getPlayer = catchAsync(async (req, res, next) => {
  const player = await prisma.player.findUnique({
    where: { id: req.params.id },
    include: {
      team: true,
      bids: {
        include: { team: true },
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!player) {
    return next(new AppError('No player found with that ID', 404));
  }

  const formatted = formatPlayer(player);

  res.status(200).json({
    status: 'success',
    data: {
      doc: formatted,
      player: formatted,
    },
  });
});

// UPDATE A PLAYER (EDIT ACCEPTED OR PENDING PLAYER)
exports.updatePlayer = catchAsync(async (req, res, next) => {
  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData._id;

  if (updateData.year != null) updateData.year = parseInt(updateData.year, 10);
  if (updateData.basePrice != null) updateData.basePrice = parseFloat(updateData.basePrice);
  if (updateData.finalBidPrice != null) updateData.finalBidPrice = parseFloat(updateData.finalBidPrice);

  // If captain assignment changed
  if (updateData.isCaptain && updateData.teamId) {
    await prisma.team.update({
      where: { id: updateData.teamId },
      data: { captainId: req.params.id },
    });
    updateData.status = 'sold'; // Captains are locked into team roster
  } else if (updateData.isCaptain === false) {
    await prisma.team.updateMany({
      where: { captainId: req.params.id },
      data: { captainId: null },
    });
    updateData.teamId = null;
    if (updateData.status === 'sold') {
      updateData.status = 'unsold';
    }
  }

  const player = await prisma.player.update({
    where: { id: req.params.id },
    data: updateData,
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  const formatted = formatPlayer(player);

  if (req.io) {
    req.io.emit('auction:players_updated', {
      playerId: formatted.id,
      isUpdate: true,
    });
    if (formatted.status === 'unsold') {
      req.io.emit('player_registered', formatted);
    }
  }

  res.status(200).json({
    status: 'success',
    data: { doc: formatted, player: formatted },
  });
});

// DELETE A PLAYER
exports.deletePlayer = catchAsync(async (req, res, next) => {
  await prisma.player.delete({
    where: { id: req.params.id },
  });

  if (req.io) {
    req.io.emit('auction:players_updated', {
      playerId: req.params.id,
      isDeletion: true,
    });
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// GET PENDING REGISTRATIONS (FOR ADMIN APPROVAL PORTAL)
exports.getPendingRegistrations = catchAsync(async (req, res, next) => {
  const statusFilter = req.query.status || 'pending';
  const where = {};
  if (statusFilter !== 'all') {
    where.status = statusFilter;
  }
  if (req.query.year) {
    where.year = parseInt(req.query.year, 10);
  }

  const [players, allPending] = await Promise.all([
    prisma.player.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
    }),
    prisma.player.findMany({
      where: { status: 'pending' },
      select: { year: true },
    }),
  ]);

  const countsByYear = { 1: 0, 2: 0, 3: 0, 4: 0, total: allPending.length };
  for (const p of allPending) {
    if (p.year && countsByYear[p.year] !== undefined) {
      countsByYear[p.year]++;
    }
  }

  const formatted = players.map(formatPlayer);

  res.status(200).json({
    status: 'success',
    results: formatted.length,
    data: {
      players: formatted,
      countsByYear,
    },
  });
});

// ADMIN APPROVE PLAYER (ACCEPT & OPTIONALLY OVERRIDE ROLE/YEAR/BASE PRICE)
exports.approvePlayer = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { category, year, basePrice, name, image } = req.body;

  const existing = await prisma.player.findUnique({
    where: { id },
  });

  if (!existing) {
    return next(new AppError('Player not found', 404));
  }

  const updateData = {
    status: 'unsold', // Player is approved and added to active auction pool!
  };

  if (category) updateData.category = parseCategory(category);
  if (year != null) updateData.year = parseAcademicYear(year);
  if (basePrice != null) updateData.basePrice = parseBasePrice(basePrice, existing.basePrice || 0.5);
  if (name && name.trim()) updateData.name = name.trim();
  if (image && image.trim()) updateData.image = normalizeImageUrl(image);

  // If assigning as Captain to a franchise team
  if (req.body.isCaptain && req.body.teamId) {
    updateData.isCaptain = true;
    updateData.teamId = req.body.teamId;
    updateData.status = 'sold'; // Captain is pre-assigned to roster, not auctioned!

    await prisma.team.update({
      where: { id: req.body.teamId },
      data: { captainId: id },
    });
  } else if (req.body.isCaptain === false) {
    updateData.isCaptain = false;
    updateData.teamId = null;
    updateData.status = 'unsold';
  }

  const updatedPlayer = await prisma.player.update({
    where: { id },
    data: updateData,
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  const formatted = formatPlayer(updatedPlayer);

  // Broadcast real-time events to all clients and admins
  if (req.io) {
    console.log(`[Admin] Player approved: '${formatted.name}' as ${formatted.category}`);
    req.io.emit('player_approved', formatted);
    req.io.emit('player_registered', formatted);
    req.io.emit('auction:players_updated', {
      playerId: formatted.id,
      isApproval: true,
    });
  }

  res.status(200).json({
    status: 'success',
    message: `Player '${formatted.name}' approved as ${formatted.category} and added to auction pool!`,
    data: { player: formatted },
  });
});

// ADMIN REJECT PLAYER
exports.rejectPlayer = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const existing = await prisma.player.findUnique({
    where: { id },
  });

  if (!existing) {
    return next(new AppError('Player not found', 404));
  }

  // If captain, unlink from team
  if (existing.isCaptain || existing.teamId) {
    await prisma.team.updateMany({
      where: { captainId: id },
      data: { captainId: null },
    });
  }

  const updatedPlayer = await prisma.player.update({
    where: { id },
    data: {
      status: 'rejected',
      isCaptain: false,
      teamId: null,
    },
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  const formatted = formatPlayer(updatedPlayer);

  if (req.io) {
    console.log(`[Admin] Player rejected: '${formatted.name}'`);
    req.io.emit('player_rejected', { id: formatted.id, name: formatted.name });
    req.io.emit('auction:players_updated', {
      playerId: formatted.id,
      isRejection: true,
    });
  }

  res.status(200).json({
    status: 'success',
    message: `Player '${formatted.name}' rejected.`,
    data: { player: formatted },
  });
});

// ADMIN MOVE PLAYER BACK TO PENDING QUEUE
exports.resetPendingPlayer = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const existing = await prisma.player.findUnique({
    where: { id },
  });

  if (!existing) {
    return next(new AppError('Player not found', 404));
  }

  if (existing.status === 'in_auction') {
    req.app.get('resetAuctionTimer')?.();
  }

  if (existing.isCaptain || existing.teamId) {
    await prisma.team.updateMany({
      where: { captainId: id },
      data: { captainId: null },
    });
  }

  if (existing.status === 'sold' && existing.teamId && existing.finalBidPrice) {
    await prisma.team.update({
      where: { id: existing.teamId },
      data: { budget: { increment: existing.finalBidPrice } },
    });
  }

  const updatedPlayer = await prisma.player.update({
    where: { id },
    data: {
      status: 'pending',
      isCaptain: false,
      teamId: null,
      finalBidPrice: null,
    },
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  const formatted = formatPlayer(updatedPlayer);

  if (req.io) {
    req.io.emit('player_pending_registration', formatted);
    req.io.emit('auction:players_updated', {
      playerId: formatted.id,
      status: 'pending',
    });
  }

  res.status(200).json({
    status: 'success',
    message: `Player '${formatted.name}' moved back to Pending Review queue.`,
    data: { player: formatted },
  });
});

// GET WEBHOOK STATUS / PING
exports.getWebhookStatus = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'DGPL Auction Google Forms Webhook is LIVE and ready to receive player registrations!',
    endpoint: '/api/v1/players/webhook/register',
    fieldsExpected: {
      name: 'Full Name (string, required)',
      year: 'Academic Year (1, 2, 3, 4 or "1st Year", etc.)',
      category: 'Batsman | Bowler | All-Rounder | Wicket-Keeper',
      image: 'Google Drive file URL or File ID (auto-normalized to direct CDN)',
      basePrice: 'Starting price (defaults to 0.5)',
    },
  });
};

// REAL-TIME WEBHOOK: INGEST PLAYER REGISTRATION FROM GOOGLE FORMS / APPS SCRIPT
exports.registerPlayerWebhook = catchAsync(async (req, res, next) => {
  // 1. Optional Secret Verification
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (expectedSecret) {
    const incomingSecret =
      req.headers['x-webhook-secret'] ||
      req.query.secret ||
      req.body.secret;
    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return next(new AppError('Unauthorized: Invalid or missing webhook secret', 401));
    }
  }

  const body = req.body || {};

  // 2. Extract Name (support both clean keys and raw Google Form question titles)
  const nameRaw =
    body.name ||
    body.fullName ||
    body['Full Name'] ||
    body['Name'] ||
    body['Player Name'] ||
    body['player_name'] ||
    body['Student Name'];

  if (!nameRaw || !String(nameRaw).trim()) {
    return next(new AppError('Player name is required in registration payload', 400));
  }
  const name = String(nameRaw).trim();

  // 3. Extract & Normalize Academic Year
  const yearRaw =
    body.year ||
    body.Year ||
    body['Year'] ||
    body['Academic Year'] ||
    body['Year of Study'] ||
    body['Class'] ||
    body['Batch'];
  const year = parseAcademicYear(yearRaw);

  // 4. Extract & Normalize Category / Role
  const categoryRaw =
    body.category ||
    body.Category ||
    body.role ||
    body.Role ||
    body['Category'] ||
    body['Player Role'] ||
    body['Specialization'] ||
    body['Playing Role'] ||
    body['Role'];
  const category = parseCategory(categoryRaw);

  // 5. Extract & Normalize Image URL (Google Drive / Direct link)
  const imageRaw =
    body.image ||
    body.photo ||
    body.Photo ||
    body['Photo'] ||
    body['Upload Photo'] ||
    body['Upload your photo'] ||
    body['Upload photo (Max 5MB)'] ||
    body['Photo Upload'] ||
    body['DriveLink'] ||
    body.fileUrl ||
    body.fileId ||
    body.driveUrl;
  const image = normalizeImageUrl(imageRaw);

  // 6. Extract Base Price
  const basePriceRaw =
    body.basePrice ||
    body.base_price ||
    body['Base Price'] ||
    body['basePrice'];
  const basePrice = parseBasePrice(basePriceRaw, 0.5);

  // 7. Check if player with identical name already exists (idempotency / update support)
  const existing = await prisma.player.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    include: {
      team: true,
      bids: { include: { team: true } },
    },
  });

  let player;
  let isUpdate = false;

  if (existing) {
    if (existing.status === 'sold') {
      return res.status(200).json({
        status: 'success',
        message: `Player '${name}' is already registered and has been sold in the auction. Profile retained.`,
        data: { player: formatPlayer(existing) },
      });
    }

    // Update existing player with latest details/photo from Google Form
    // If was rejected earlier, re-submission resets them to pending
    const targetStatus = existing.status === 'rejected' ? 'pending' : existing.status;
    player = await prisma.player.update({
      where: { id: existing.id },
      data: {
        year: year ?? existing.year,
        image: image || existing.image,
        category: category || existing.category,
        basePrice: basePrice != null ? basePrice : existing.basePrice,
        status: targetStatus,
      },
      include: {
        team: true,
        bids: { include: { team: true } },
      },
    });
    isUpdate = true;
  } else {
    // Create new player record in PENDING status for Admin review & approval
    player = await prisma.player.create({
      data: {
        name,
        year,
        image,
        category,
        basePrice,
        status: 'pending', // Awaiting Admin Review!
        isCaptain: false,
      },
      include: {
        team: true,
        bids: { include: { team: true } },
      },
    });
  }

  const formatted = formatPlayer(player);

  // 8. Emit Real-time Socket.IO Events
  if (req.io) {
    console.log(`[Webhook] Emitting player_pending_registration for '${formatted.name}' (status: ${formatted.status})`);
    req.io.emit('player_pending_registration', formatted);
    req.io.emit('auction:registrations_updated', {
      playerId: formatted.id,
      isUpdate,
      status: formatted.status,
    });
    // Only update public live pool if already approved/unsold
    if (formatted.status === 'unsold') {
      req.io.emit('player_registered', formatted);
      req.io.emit('auction:players_updated', {
        playerId: formatted.id,
        isUpdate,
      });
    }
  }

  res.status(isUpdate ? 200 : 201).json({
    status: 'success',
    message: isUpdate
      ? `Registration details updated for '${name}' (Status: ${player.status})`
      : `Player '${name}' registered successfully! Awaiting admin review and approval.`,
    data: { player: formatted },
  });
});

// PROXY PLAYER IMAGE (BYPASS BROWSER CORS / REFERER BLOCKING ON GOOGLE DRIVE)
exports.proxyPlayerImage = catchAsync(async (req, res, next) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return next(new AppError('Image URL query parameter is required', 400));
  }

  let targetUrl = imageUrl;
  const driveId = extractDriveId(imageUrl);
  if (driveId) {
    targetUrl = `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    if (!upstreamRes.ok) {
      if (driveId) {
        const fallbackRes = await fetch(`https://drive.google.com/uc?export=view&id=${driveId}`);
        if (fallbackRes.ok) {
          const contentType = fallbackRes.headers.get('content-type') || 'image/jpeg';
          res.set('Content-Type', contentType);
          res.set('Cache-Control', 'public, max-age=604800');
          const buffer = await fallbackRes.arrayBuffer();
          return res.send(Buffer.from(buffer));
        }
      }
      return res.status(upstreamRes.status).send('Unable to load image');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=604800');
    const buffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return next(new AppError('Failed to fetch image', 502));
  }
});

