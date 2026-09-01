const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const requirePermission = require('../middleware/requirePermission');
const { getRecipes, upsertRecipe, updateRecipe, deleteRecipe } = require('../controllers/serviceRecipeController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRecipe = (req, res, next) => { invalidatePrefixes('recipe', 'inventory'); next(); };

// Service recipes — cached 1 hour (change only when admin updates service requirements)
router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('recipe', 3600), getRecipes);
router.post('/', requireAuth, requirePermission('Inventory', 'create'), invalidateRecipe, upsertRecipe);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), invalidateRecipe, updateRecipe);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), invalidateRecipe, deleteRecipe);

module.exports = router;
