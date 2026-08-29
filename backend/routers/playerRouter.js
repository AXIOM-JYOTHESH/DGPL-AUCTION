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
