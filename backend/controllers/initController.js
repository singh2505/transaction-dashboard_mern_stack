const axios = require('axios');
const ProductTransaction = require('../models/ProductTransaction');

const initDatabase = async (req, res) => {
    try {
        const { data } = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        await ProductTransaction.deleteMany({});
        await ProductTransaction.insertMany(data);
        res.status(200).json({ message: 'Database initialized successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to initialize database', error });
    }
};

const getStatistics = async (req, res) => {
    try {
        const { month } = req.query;
        const start = new Date(`${month} 1, 2023`);
        const end = new Date(`${month} 31, 2023`);

        const totalSoldItems = await ProductTransaction.countDocuments({
            dateOfSale: { $gte: start, $lt: end },
            sold: true,
        });
        const totalNotSoldItems = await ProductTransaction.countDocuments({
            dateOfSale: { $gte: start, $lt: end },
            sold: false,
        });
        const totalSaleAmount = await ProductTransaction.aggregate([
            { $match: { dateOfSale: { $gte: start, $lt: end }, sold: true } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]);

        res.status(200).json({
            totalSoldItems,
            totalNotSoldItems,
            totalSaleAmount: totalSaleAmount[0]?.total || 0,
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch statistics', error });
    }
};

// Export all the functions together
module.exports = {
    initDatabase,
    getStatistics,
};
