const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
<<<<<<< HEAD
const requirePermission = require('../middleware/requirePermission');
=======
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976
const { getRecipes, upsertRecipe, updateRecipe, deleteRecipe } = require('../controllers/serviceRecipeController');
const cache = require('../middleware/cacheMiddleware');
const { invalidatePrefixes } = require('../utils/cache');

const invalidateRecipe = (req, res, next) => { invalidatePrefixes('recipe', 'inventory'); next(); };

// Service recipes — cached 1 hour (change only when admin updates service requirements)
<<<<<<< HEAD
router.get('/', requireAuth, requirePermission('Inventory', 'read'), cache('recipe', 3600), getRecipes);
router.post('/', requireAuth, requirePermission('Inventory', 'create'), invalidateRecipe, upsertRecipe);
router.patch('/:id', requireAuth, requirePermission('Inventory', 'update'), invalidateRecipe, updateRecipe);
router.delete('/:id', requireAuth, requirePermission('Inventory', 'delete'), invalidateRecipe, deleteRecipe);
=======
router.get('/', requireAuth, cache('recipe', 3600), getRecipes);
router.post('/', requireAuth, invalidateRecipe, upsertRecipe);
router.patch('/:id', requireAuth, invalidateRecipe, updateRecipe);
router.delete('/:id', requireAuth, invalidateRecipe, deleteRecipe);
>>>>>>> b1d1b6bc1ab4fe98040e5c50349f87e080246976

module.exports = router;
