const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getRecipes, upsertRecipe, updateRecipe, deleteRecipe } = require('../controllers/serviceRecipeController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRecipe = (req, res, next) => { invalidatePrefixes('recipe', 'inventory'); next(); };

// Service recipes — cached 1 hour (change only when admin updates service requirements)
router.get('/', requireAuth, cache('recipe', 3600), getRecipes);
router.post('/', requireAuth, invalidateRecipe, upsertRecipe);
router.patch('/:id', requireAuth, invalidateRecipe, updateRecipe);
router.delete('/:id', requireAuth, invalidateRecipe, deleteRecipe);

module.exports = router;
