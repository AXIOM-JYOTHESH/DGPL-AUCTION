const express = require('express');
const authController = require('../controllers/authController');
const auctionController = require('../controllers/auctionController');

const router = express.Router();

router.post(
  '/start',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.startAuction
);

router.get('/current', auctionController.getCurrentAuctionPlayer);

router.post(
  '/sell',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.sellPlayer
);

router.post(
  '/unsold',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.markPlayerUnsold
);

module.exports = router;
