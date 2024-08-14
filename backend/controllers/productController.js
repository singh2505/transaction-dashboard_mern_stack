const Transaction = require('../models/ProductTransaction'); // Ensure path is correct

const getTransactions = async (req, res) => {
    try {
        const { month, search = '', page = 1, perPage = 10 } = req.query;
        const start = new Date(`${month} 1, 2023`);
        const end = new Date(`${month} 31, 2023`);

        // Build the search query
        const searchQuery = {
            dateOfSale: { $gte: start, $lt: end },
            $or: [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { price: { $regex: search, $options: 'i' } },
            ]
        };

        // Fetch transactions with pagination
        const transactions = await Transaction.find(searchQuery)
            .skip((page - 1) * perPage)
            .limit(parseInt(perPage))
            .exec();

        // Count total matching records
        const total = await Transaction.countDocuments(searchQuery);

        res.status(200).json({
            transactions,
            total,
            page: parseInt(page),
            perPage: parseInt(perPage),
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch transactions', error });
    }
};

const getStatistics = async () => {
    try {
        const statistics = await Transaction.aggregate([
            { $group: { _id: null, totalSales: { $sum: "$price" }, totalTransactions: { $sum: 1 } } }
        ]);

        if (statistics.length === 0) {
            return [{ _id: null, totalSales: 0, totalTransactions: 0 }];
        }

        return statistics;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        throw new Error('Failed to fetch statistics');
    }
};

const getBarChart = async (req) => {
    try {
        const { month } = req.query;
        if (!month) {
            throw new Error('Month query parameter is required');
        }

        const formattedMonth = month.padStart(2, '0');
        const start = new Date(`2023-${formattedMonth}-01T00:00:00Z`);
        const end = new Date(`2023-${formattedMonth}-31T23:59:59Z`);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new Error('Invalid Date');
        }

        const priceRanges = [
            { range: '0-100', min: 0, max: 100 },
            { range: '101-200', min: 101, max: 200 },
            { range: '201-300', min: 201, max: 300 },
            { range: '301-400', min: 301, max: 400 },
            { range: '401-500', min: 401, max: 500 },
            { range: '501-600', min: 501, max: 600 },
            { range: '601-700', min: 601, max: 700 },
            { range: '701-800', min: 701, max: 800 },
            { range: '801-900', min: 801, max: 900 },
            { range: '901-above', min: 901, max: Infinity },
        ];

        const barChartData = await Promise.all(
            priceRanges.map(async (range) => {
                const count = await Transaction.countDocuments({
                    dateOfSale: { $gte: start, $lt: end },
                    price: { $gte: range.min, $lt: range.max },
                });
                return { range: range.range, count };
            })
        );

        return barChartData;
    } catch (error) {
        console.error('Error fetching bar chart data:', error.message);
        throw new Error('Failed to fetch bar chart data');
    }
};

const getPieChart = async (req) => {
    try {
        const { month } = req.query;
        const start = new Date(`2023-${month}-01`);
        const end = new Date(`2023-${month}-31T23:59:59`);

        const pieChartData = await Transaction.aggregate([
            { $match: { dateOfSale: { $gte: start, $lt: end } } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $project: { category: '$_id', count: 1, _id: 0 } },
        ]);

        return pieChartData;
    } catch (error) {
        console.error('Error fetching pie chart data:', error);
        throw new Error('Failed to fetch pie chart data');
    }
};

const getCombinedData = async (req, res) => {
    try {
        const statistics = await getStatistics();
        const barChart = await getBarChart(req);
        const pieChart = await getPieChart(req);

        const statisticsData = statistics.length > 0 ? statistics[0] : { _id: null, totalSales: 0, totalTransactions: 0 };

        res.status(200).json({
            statistics: [statisticsData],
            barChart,
            pieChart,
        });
    } catch (error) {
        console.error('Error fetching combined data:', error);
        res.status(500).json({ message: 'Failed to fetch combined data', error: error.message });
    }
};

module.exports = {
    getTransactions,
    getStatistics,
    getBarChart,
    getPieChart,
    getCombinedData
};
