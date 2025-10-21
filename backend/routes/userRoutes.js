const express = require('express');

class UserRoutes {
  constructor(userController) {
    this.userController = userController;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes = () => {
    // Register route
    this.router.post('/users', (req, res) => {
      try {
        const result = this.userController.register(req.body);
        res.status(result.success ? 200 : 400).json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Login route
    this.router.post('/users/login', (req, res) => {
      try {
        const result = this.userController.login(req.body);
        res.status(result.success ? 200 : 401).json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Force login route (override existing session)
    this.router.post('/users/force-login', (req, res) => {
      try {
        const result = this.userController.forceLogin(req.body);
        res.status(result.success ? 200 : 401).json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Get all users route
    this.router.get('/users', (req, res) => {
      try {
        const result = this.userController.getAllUsers();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Get user by ID route
    this.router.get('/users/:id', (req, res) => {
      try {
        const user = this.userController.getUserById(req.params.id);
        if (user) {
          res.status(200).json({ success: true, user });
        } else {
          res.status(404).json({ success: false, message: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Update user status route
    this.router.put('/users/:id/status', (req, res) => {
      try {
        const { isOnline, socketId } = req.body;
        const user = this.userController.updateUserStatus(req.params.id, isOnline, socketId);
        if (user) {
          res.status(200).json({ success: true, user });
        } else {
          res.status(404).json({ success: false, message: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });
  };

  getRouter = () => {
    return this.router;
  };
}

module.exports = UserRoutes;