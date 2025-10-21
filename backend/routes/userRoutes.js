const express = require('express');
const auth = require('../middleware/auth');

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

    // Login route - sets httpOnly cookie
    this.router.post('/users/login', (req, res) => {
      try {
        const result = this.userController.login(req.body);
        if (result.success && result.token) {
          res.cookie('authToken', result.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            path: '/'
          });
        }
        res.status(result.success ? 200 : (result.conflict ? 409 : 401)).json({
          success: result.success,
          conflict: result.conflict || false,
          user: result.user || null,
          userId: result.userId || null,
          message: result.message || result.error || null
        });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // Force login route (override existing session)
    this.router.post('/users/force-login', (req, res) => {
      try {
        const result = this.userController.forceLogin(req.body);
        if (result.success && result.token) {
          res.cookie('authToken', result.token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            path: '/'
          });
        }
        res.status(result.success ? 200 : 401).json({
          success: result.success,
          forced: result.forced || false,
          user: result.user || null,
          userId: result.userId || null,
          message: result.message || result.error || null
        });
      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

  // Current user route (protected)
  this.router.get('/users/me', auth, (req, res) => {
      try {
        if (!req.user || !req.user.id) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const user = this.userController.getUserById(req.user.id);
        if (!user) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }
        res.json({ success: true, user: { id: user.id, name: user.name, phoneNumber: user.phoneNumber, isOnline: user.isOnline, lastSeen: user.lastSeen } });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // Logout route - clear cookie
    this.router.post('/users/logout', (req, res) => {
      try {
        res.clearCookie('authToken', { path: '/' });
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, error: 'Server error' });
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