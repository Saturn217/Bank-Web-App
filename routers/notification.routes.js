const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getUnreadCount, getNotifications,  markAllAsRead, markAsRead } = require('../controllers/notification.controller');



router.get("/unread-count", protect, getUnreadCount)
router.get("/", protect, getNotifications)

router.post('/:id/read', protect, markAllAsRead)

router.post("/mark-all-read", protect, markAllAsRead)
router.patch('/:id/read', protect, markAsRead)



module.exports = router