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
    const prisma = require('../prismaClient');
    const existing = await prisma.appConfig.findFirst();
    let cfg;
    if (existing) {
      cfg = await prisma.appConfig.update({
        where: { id: existing.id },
        data: { sessionsInvalidatedAt: new Date() },
      });
    } else {
      cfg = await prisma.appConfig.create({
        data: { sessionsInvalidatedAt: new Date() },
      });
    }
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
