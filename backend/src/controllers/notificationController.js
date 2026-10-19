const { Op } = require('sequelize');
const { Notification } = require('../models');

// Helper to build role-aware where clause
const getNotificationScope = (user) => {
  const userId = user?.id;
  const userRole = user?.role || 'customer';

  if (userRole === 'admin') {
    return {
      [Op.or]: [
        { recipientRole: 'admin' },
        ...(userId ? [{ userId }] : []),
      ],
    };
  }

  // Customer or Driver
  return {
    [Op.or]: [
      ...(userId ? [{ userId }] : []),
      { recipientRole: userRole, userId: null },
      { recipientRole: 'all', userId: null },
    ],
  };
};

// Get all notifications for the authenticated user/admin
const getNotifications = async (req, res) => {
  try {
const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const scope = getNotificationScope(req.user);

    const whereClause = {
      ...scope,
    };

    if (req.query.unread === 'true') {
      whereClause.isRead = false;
    }

    if (req.query.type) {
      whereClause.type = req.query.type;
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit,
    });

    const unreadCount = await Notification.count({
      where: {
        ...scope,
        isRead: false,
      },
    });

    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

// Mark a specific notification as read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = getNotificationScope(req.user);

    const notification = await Notification.findOne({
      where: {
        id,
        ...scope,
      },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Server error marking notification as read' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const scope = getNotificationScope(req.user);

    await Notification.update(
      { isRead: true },
      {
        where: {
          ...scope,
          isRead: false,
        },
      }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a single notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = getNotificationScope(req.user);

    const count = await Notification.destroy({
      where: {
        id,
        ...scope,
      },
    });

    if (!count) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Server error deleting notification' });
  }
};

// Clear all read notifications
const clearReadNotifications = async (req, res) => {
  try {
    const scope = getNotificationScope(req.user);

    await Notification.destroy({
      where: {
        ...scope,
        isRead: true,
      },
    });

    res.status(200).json({ success: true, message: 'Read notifications cleared' });
  } catch (error) {
    console.error('Error clearing read notifications:', error);
    res.status(500).json({ success: false, message: 'Server error clearing notifications' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};
