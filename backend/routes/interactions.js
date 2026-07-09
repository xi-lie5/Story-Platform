const express = require('express');
const { body, validationResult, param } = require('express-validator');
const authGuard = require('../middleware/auth');
const Story = require('../models/Story');
const UserStoryFavorite = require('../models/UserStoryFavorite');
const UserStoryRating = require('../models/UserStoryRating');
const StoryComment = require('../models/StoryComment');
const { errorFormat } = require('../utils/errorFormat');
const { isValidIntegerId } = require('../utils/idValidator');

const router = express.Router();

const validationErrors = (req) => validationResult(req).array().map((err) => ({
  field: err.path || err.param,
  message: err.msg
}));

const validateStoryId = param('storyId').custom((value) => {
  if (!isValidIntegerId(value) && !String(value).startsWith('local_')) {
    throw new Error('Invalid story ID');
  }
  return true;
});

const isTemporaryStory = (storyId) => String(storyId).startsWith('local_');
const toStoryId = (storyId) => parseInt(storyId, 10);

async function ensureStory(storyId, next) {
  const story = await Story.findById(storyId);
  if (!story) {
    next(errorFormat(404, 'Story not found', [], 10010));
    return null;
  }
  return story;
}

async function recalculateRating(storyId) {
  const stats = await UserStoryRating.getStoryRatingStats(storyId);
  await Story.findByIdAndUpdate(storyId, {
    rating: stats.average,
    ratingCount: stats.count
  });
  return stats;
}

router.post('/stories/:storyId/favorite', authGuard, [validateStoryId], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, 'Invalid request parameters', validationErrors(req), 10001));
  }

  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    if (isTemporaryStory(storyId)) {
      return res.status(200).json({
        success: true,
        message: 'Temporary stories do not support favorites',
        isFavorite: false,
        isTemporary: true
      });
    }

    const story = await ensureStory(toStoryId(storyId), next);
    if (!story) return null;

    const existingFavorite = await UserStoryFavorite.findOne({ userId, storyId: toStoryId(storyId) });
    if (existingFavorite) {
      await UserStoryFavorite.findByIdAndDelete(existingFavorite.id);
      return res.status(200).json({
        success: true,
        message: 'Favorite removed',
        isFavorite: false,
        isTemporary: false
      });
    }

    await UserStoryFavorite.create({ userId, storyId: toStoryId(storyId) });
    return res.status(200).json({
      success: true,
      message: 'Favorite added',
      isFavorite: true,
      isTemporary: false
    });
  } catch (error) {
    if (error.code === 11000 || /favorite/i.test(error.message)) {
      return next(errorFormat(400, 'Favorite operation conflict', [], 10003));
    }
    return next(error);
  }
});

router.get('/stories/:storyId/favorite/status', authGuard, [validateStoryId], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, 'Invalid request parameters', validationErrors(req), 10001));
  }

  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    if (isTemporaryStory(storyId)) {
      return res.status(200).json({
        success: true,
        data: { isFavorited: false, favoriteCount: 0, isTemporary: true }
      });
    }

    const story = await ensureStory(toStoryId(storyId), next);
    if (!story) return null;

    const favorite = await UserStoryFavorite.findOne({ userId, storyId: toStoryId(storyId) });
    return res.status(200).json({
      success: true,
      data: {
        isFavorited: Boolean(favorite),
        favoriteCount: story.favorite_count || story.favoriteCount || 0,
        isTemporary: false
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/user/favorites', authGuard, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const favorites = await UserStoryFavorite.find({ userId, limit, skip });
    const total = await UserStoryFavorite.countByUser(userId);
    const formattedFavorites = await Promise.all(favorites.map(async (favorite) => ({
      story: await Story.findById(favorite.storyId),
      collectedAt: favorite.created_at
    })));

    return res.status(200).json({
      success: true,
      data: {
        favorites: formattedFavorites.filter((item) => item.story),
        pagination: { total, page, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/stories/:storyId/rate', authGuard, [
  validateStoryId,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer from 1 to 5'),
  body('comment').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, 'Invalid rating data', validationErrors(req), 10001));
  }

  try {
    const { storyId } = req.params;
    const rating = parseInt(req.body.rating, 10);
    const comment = req.body.comment ? String(req.body.comment).trim() : null;
    const userId = req.user.id;

    if (isTemporaryStory(storyId)) {
      return res.status(200).json({
        success: true,
        message: 'Temporary stories do not support ratings',
        data: { rating, comment, updatedAt: new Date(), isTemporary: true }
      });
    }

    const numericStoryId = toStoryId(storyId);
    const story = await ensureStory(numericStoryId, next);
    if (!story) return null;

    const ratingRecord = await UserStoryRating.findOneAndUpdate(
      { userId, storyId: numericStoryId },
      { rating, comment },
      { upsert: true }
    );
    const stats = await recalculateRating(numericStoryId);

    let commentEntry = null;
    if (comment) {
      commentEntry = await StoryComment.create({
        storyId: numericStoryId,
        userId,
        content: comment
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rating saved successfully',
      data: {
        rating: ratingRecord.rating,
        comment: ratingRecord.comment,
        commentEntry,
        averageRating: stats.average,
        ratingCount: stats.count,
        updatedAt: ratingRecord.updatedAt || ratingRecord.updated_at,
        isTemporary: false
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/stories/:storyId/rating', [validateStoryId], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, 'Invalid request parameters', validationErrors(req), 10001));
  }

  try {
    const { storyId } = req.params;

    if (isTemporaryStory(storyId)) {
      return res.status(200).json({
        success: true,
        data: {
          averageRating: 0,
          ratingCount: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          userRating: null,
          recentRatings: [],
          isTemporary: true
        }
      });
    }

    const numericStoryId = toStoryId(storyId);
    const story = await ensureStory(numericStoryId, next);
    if (!story) return null;

    const ratings = await UserStoryRating.find({ storyId: numericStoryId, limit: 50 });
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((item) => {
      ratingDistribution[item.rating] = (ratingDistribution[item.rating] || 0) + 1;
    });

    const userRating = req.user?.id
      ? await UserStoryRating.findOne({ userId: req.user.id, storyId: numericStoryId })
      : null;

    return res.status(200).json({
      success: true,
      data: {
        averageRating: Number(story.rating || 0),
        ratingCount: story.rating_count || story.ratingCount || 0,
        ratingDistribution,
        userRating: userRating ? {
          rating: userRating.rating,
          comment: userRating.comment,
          updatedAt: userRating.updatedAt || userRating.updated_at
        } : null,
        recentRatings: ratings.map((item) => ({
          rating: item.rating,
          comment: item.comment,
          updatedAt: item.updatedAt || item.updated_at
        })),
        isTemporary: false
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/stories/:storyId/rate', authGuard, [validateStoryId], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errorFormat(400, 'Invalid request parameters', validationErrors(req), 10001));
  }

  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    if (isTemporaryStory(storyId)) {
      return res.status(200).json({
        success: true,
        message: 'Temporary stories do not support ratings',
        data: { isTemporary: true }
      });
    }

    const numericStoryId = toStoryId(storyId);
    const story = await ensureStory(numericStoryId, next);
    if (!story) return null;

    const deletedRating = await UserStoryRating.findOneAndDelete({ userId, storyId: numericStoryId });
    if (!deletedRating) {
      return next(errorFormat(404, 'Rating not found', [], 10020));
    }

    const stats = await recalculateRating(numericStoryId);
    return res.status(200).json({
      success: true,
      message: 'Rating deleted successfully',
      data: {
        averageRating: stats.average,
        ratingCount: stats.count,
        isTemporary: false
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
