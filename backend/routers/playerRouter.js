const express = require('express');
const playerController = require('../controllers/playerController');
const authController = require('./../controllers/authController');

const router = express.Router();

router
  .route('/')
  // Publicly expose player list for summary UI; secure if needed later
  .get(playerController.getAllPlayers)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.createPlayer
  );

// Google Forms / Apps Script Webhook Endpoints (publicly accessible by Google Cloud Apps Script)
router
  .route('/webhook/register')
  .get(playerController.getWebhookStatus)
  .post(playerController.registerPlayerWebhook);

router
  .route('/register-webhook')
  .post(playerController.registerPlayerWebhook);

// Image Proxy endpoint to avoid browser CORS / Referer blocking on Google Drive photos
router
  .route('/image-proxy')
  .get(playerController.proxyPlayerImage);

// Pending Registrations & Admin Approval Workflow
router
  .route('/pending-registrations')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.getPendingRegistrations
  );

router
  .route('/:id/approve')
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.approvePlayer
  );

router
  .route('/:id/reject')
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.rejectPlayer
  );

router
  .route('/:id/reset-pending')
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.resetPendingPlayer
  );

router
  .route('/:id')
  .get(playerController.getPlayer)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.updatePlayer
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    playerController.deletePlayer
  );

module.exports = router;
