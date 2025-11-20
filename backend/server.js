const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// JSearch API configuration
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY;
const JSEARCH_BASE_URL = 'https://jsearch.p.rapidapi.com';

// Routes
app.get('/api/jobs', async (req, res) => {
    try {
        const { query, page = '1', num_pages = '1' } = req.query;

        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const options = {
            method: 'GET',
            url: `${JSEARCH_BASE_URL}/search`,
            params: {
                query: query,
                page: page,
                num_pages: num_pages
            },
            headers: {
                'X-RapidAPI-Key': JSEARCH_API_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error('JSearch API Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch jobs data',
            details: error.response?.data || error.message
        });
    }
});

app.get('/api/job-details', async (req, res) => {
    try {
        const { job_id } = req.query;

        if (!job_id) {
            return res.status(400).json({ error: 'Job ID is required' });
        }

        const options = {
            method: 'GET',
            url: `${JSEARCH_BASE_URL}/job-details`,
            params: {
                job_id: job_id
            },
            headers: {
                'X-RapidAPI-Key': JSEARCH_API_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        res.json(response.data);
    } catch (error) {
        console.error('JSearch API Error:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to fetch job details',
            details: error.response?.data || error.message
        });
    }
});

// Health check endpoint for load balancer
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        server: process.env.SERVER_NAME || 'unknown',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Job Finder API server running on port ${PORT}`);
    console.log(`Server: ${process.env.SERVER_NAME || 'Development'}`);
});