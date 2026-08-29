const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.route('/login').post(authController.signin);

// Admin endpoint to force re-login for everyone (call after reseed)
router.post(
  '/invalidate-sessions',
  authController.protect,
  authController.restrictTo('admin'),
  async (req, res, next) => {
    const AppConfig = require('../models/appConfigModel');
    const cfg = await AppConfig.findOneAndUpdate(
      {},
      { sessionsInvalidatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.status(200).json({ status: 'success', data: cfg });
  }
);
router
  .route('/')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    userController.getAllUsers
  )
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    userController.createUser
  );

router
  .route('/:id')
  .get(
    authController.protect,
    authController.restrictTo('admin'),
    userController.getUser
  )
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    userController.updateUser
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    userController.deleteUser
  );

module.exports = router;
