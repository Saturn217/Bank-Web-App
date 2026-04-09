
const BankUserModel = require('../models/bankUser.model');
const TransactionModel = require('../models/transaction.model');
const NotificationModel = require('../models/notification.model');


const getUnreadCount = async (req, res) => {
    try {
        const count = await NotificationModel.countDocuments({
            user: req.user._id,
            isRead: false,
        });
        return res.status(200).json({ unreadCount: count });
    } catch (error) {
        console.error('Get unread count error:', error);
        return res.status(500).json({ message: 'Failed to get unread count' });
    }
};



const getNotifications = async (req, res) => {
    try {
      
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

    
        const filter = { user: req.user._id };

       
        if (req.query.type) {
            const types = req.query.type.split(',').map(t => t.trim());
            filter.type = { $in: types };  
        }

        if (req.query.unread === 'true') {
            filter.isRead = false;
        }

      
        const notifications = await NotificationModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await NotificationModel.countDocuments(filter);
       

        return res.status(200).json({
            status: 'success',
            data: {
                notifications,
                metadata: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                
                }
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};


const markAllAsRead = async (req, res) => {
    try {
        await NotificationModel.updateMany(
            { user: req.user._id, isRead: false },
            { isRead: true }
        );
        return res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        return res.status(500).json({ message: 'Failed to mark notifications as read' });
    }
};


const markAsRead = async (req, res) => {
    try {
        const notification = await NotificationModel.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found or not yours' });
        }

        return res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        return res.status(500).json({ message: 'Failed to mark notification as read' });
    }
};

module.exports = {
    getUnreadCount,
    getNotifications,
    markAllAsRead,
    markAsRead,
};