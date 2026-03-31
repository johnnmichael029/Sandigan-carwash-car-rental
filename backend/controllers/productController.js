const Product = require('../models/productModel');
const ServiceRecipe = require('../models/serviceRecipeModel');

// GET all products (with stock calculation)
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().sort({ name: 1 }).lean();

        // Calculate stock for each product based on its recipe
        const enrichedProducts = await Promise.all(products.map(async (p) => {
            let stock = 0;
            try {
                // Strategy 1: Find recipe for this product (Most accurate)
                const recipe = await ServiceRecipe.findOne({
                    category: 'Product',
                    $or: [
                        { serviceType: p.category, vehicleType: 'N/A' },
                        { serviceType: p.name, vehicleType: 'N/A' }
                    ]
                }).populate('ingredients.inventoryItem');

                if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
                    const stockOptions = recipe.ingredients.map(ing => {
                        const item = ing.inventoryItem;
                        if (!item) return 0;
                        const avail = Number(item.currentStock) || 0;
                        const needed = Number(ing.quantityUsed) || 1;
                        return Math.floor(avail / needed);
                    });
                    stock = Math.min(...stockOptions);
                    if (stock === Infinity || isNaN(stock)) stock = 0;
                } else {
                    // Strategy 2: Direct lookup in Inventory if no recipe exists
                    const Inventory = require('../models/inventoryModel');

                    // Match by exact name or where inventory category matches product name/category
                    const invItem = await Inventory.findOne({
                        $or: [
                            { name: p.name },
                            { name: p.category },
                            { category: p.name },
                            { category: p.category }
                        ]
                    }).sort({ currentStock: -1 }); // Pick highest if multiple matches

                    if (invItem) {
                        stock = Math.floor(Number(invItem.currentStock) || 0);
                    } else {
                        stock = 0;
                    }
                }
            } catch (err) {
                console.error(`Error calculating stock for ${p.name}:`, err.message);
                stock = 0;
            }
            return { ...p, stock };
        }));

        res.json(enrichedProducts);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST — Create new product
exports.createProduct = async (req, res) => {
    try {
        const existingProduct = await Product.findOne({ name: req.body.name });
        if (existingProduct) {
            return res.status(400).json({ error: 'A product with this name already exists.' });
        }
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'A product with this name already exists.' });
        res.status(500).json({ error: err.message });
    }
};

// PATCH — Update product
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
        if (!product) return res.status(404).json({ error: 'Product not found.' });
        res.json(product);
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: 'A product with this name already exists.' });
        res.status(500).json({ error: err.message });
    }
};

// DELETE — Remove product
exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
