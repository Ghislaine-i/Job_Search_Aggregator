const express = require('express');
const axios = require('axios');
const router = express.Router();

// Additional job search endpoints
router.get('/search-filters', async (req, res) => {
    try {
        const { query, location, employment_type, date_posted, remote } = req.query;

        const params = {
            query: query || '',
            page: req.query.page || '1',
            num_pages: req.query.num_pages || '1'
        };

        if (location) params.location = location;
        if (employment_type) params.employment_type = employment_type;
        if (date_posted) params.date_posted = date_posted;
        if (remote) params.remote = remote;

        const options = {
            method: 'GET',
            url: 'https://jsearch.p.rapidapi.com/search',
            params: params,
            headers: {
                'X-RapidAPI-Key': process.env.JSEARCH_API_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error('JSearch API Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch jobs with filters',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router;