const express = require('express');
const authGuard = require('../middleware/auth');
const StoryComment = require('../models/StoryComment');
const { errorFormat } = require('../utils/errorFormat');
const { isValidIntegerId } = require('../utils/idValidator');

const router = express.Router();

router.delete('/:id', authGuard, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidIntegerId(id)) {
      return next(errorFormat(400, 'Invalid comment ID', [], 10002));
    }

    const comment = await StoryComment.findById(parseInt(id, 10));
    if (!comment) {
      return next(errorFormat(404, 'Comment not found', [], 10012));
    }

    const isOwner = comment.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return next(errorFormat(403, 'No permission to delete this comment', [], 10005));
    }

    await StoryComment.deleteById(comment.id);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    return next(errorFormat(500, 'Failed to delete comment', [{ message: error.message }], 10004));
  }
});

module.exports = router;