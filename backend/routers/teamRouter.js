const express = require('express');
const teamController = require('../controllers/teamController');
const playerRouter = require('./playerRouter');
const authController = require('../controllers/authController');
const router = express.Router();

router
  .route('/:id/players/')
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    teamController.addPlayerToTeam
  );
router
  .route('/')
  .get(teamController.getAllTeams)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    teamController.createTeam
  );

router
  .route('/:id')
  .get(teamController.getTeam)
  .patch(
    authController.protect,
    authController.restrictTo('admin'),
    teamController.updateTeam
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin'),
    teamController.deleteTeam
  );

module.exports = router;
