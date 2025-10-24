const express = require('express');

class CallRoutes {
  constructor(callController) {
    this.callController = callController;
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/calls/history/:userId', this.getCallHistory);
    this.router.get('/calls/active/:userId', this.getActiveCall);
  }

  // Get call history for a user
  getCallHistory = (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = this.callController.getCallHistory(userId, parseInt(limit));
      
      if (result.success) {
        res.json({
          success: true,
          calls: result.calls
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in getCallHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get active call for a user
  getActiveCall = (req, res) => {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const result = this.callController.getActiveCall(userId);
      
      if (result.success) {
        res.json({
          success: true,
          callData: result.callData
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in getActiveCall:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get router
  getRouter() {
    return this.router;
  }
}

module.exports = CallRoutes;
