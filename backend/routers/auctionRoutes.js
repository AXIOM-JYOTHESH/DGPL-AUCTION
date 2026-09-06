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
router.get('/config', auctionController.getAuctionConfig);

router.post(
  '/random',
  authController.protect,
  authController.restrictTo('admin'),
  auctionController.startRandomPlayer
);

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
