const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const { getRecipes, upsertRecipe, updateRecipe, deleteRecipe } = require('../controllers/serviceRecipeController');

router.get('/', requireAuth, getRecipes);
router.post('/', requireAuth, upsertRecipe);
router.patch('/:id', requireAuth, updateRecipe);
router.delete('/:id', requireAuth, deleteRecipe);

module.exports = router;
