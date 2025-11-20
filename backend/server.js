const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the frontend for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// SINGLE /api/jobs endpoint with multi-API fallback
app.get('/api/jobs', async (req, res) => {
    try {
        const { query, page = '1', location } = req.query;

        console.log('🔍 Multi-API search request:', { query, page, location });

        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        let jobsData = null;
        let lastError = null;

        // Try Adzuna first (if configured)
        if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
            try {
                console.log('🔄 Trying Adzuna API...');
                jobsData = await fetchFromAdzuna(query, page, location);
                console.log('✅ Adzuna API successful');
                return res.json(jobsData);
            } catch (adzunaError) {
                console.log('❌ Adzuna failed:', adzunaError.message);
                lastError = adzunaError;
            }
        }

        // Try USA Jobs second (if configured)
        if (process.env.USA_JOBS_API_KEY) {
            try {
                console.log('🔄 Trying USA Jobs API...');
                jobsData = await fetchFromUSAJobs(query, page, location);
                console.log('✅ USA Jobs API successful');
                return res.json(jobsData);
            } catch (usaJobsError) {
                console.log('❌ USA Jobs failed:', usaJobsError.message);
                lastError = usaJobsError;
            }
        }

        // Try GitHub Jobs as last resort
        try {
            console.log('🔄 Trying GitHub Jobs API...');
            jobsData = await fetchFromGitHubJobs(query, location);
            console.log('✅ GitHub Jobs API successful');
            return res.json(jobsData);
        } catch (githubError) {
            console.log('❌ GitHub Jobs failed:', githubError.message);
            lastError = githubError;
        }

        // If we get here, all APIs failed
        console.log('❌ All APIs failed');
        throw new Error(`All job APIs are currently unavailable. Last error: ${lastError?.message}`);

    } catch (error) {
        console.error('❌ Multi-API search error:', error.message);
        res.status(500).json({
            error: 'Failed to fetch jobs data from all sources',
            details: error.message,
            configuredAPIs: {
                adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
                usaJobs: !!process.env.USA_JOBS_API_KEY,
                github: true
            }
        });
    }
});

// Adzuna API implementation
async function fetchFromAdzuna(query, page, location) {
    const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
    const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY;

    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
        throw new Error('Adzuna credentials not configured');
    }

    const country = 'us';
    const resultsPerPage = 10;

    let apiUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=${resultsPerPage}&what=${encodeURIComponent(query)}`;

    if (location) {
        apiUrl += `&where=${encodeURIComponent(location)}`;
    }

    const response = await axios.get(apiUrl);
    return transformAdzunaData(response.data);
}

// USA Jobs API implementation
async function fetchFromUSAJobs(query, page, location) {
    const USA_JOBS_API_KEY = process.env.USA_JOBS_API_KEY;

    if (!USA_JOBS_API_KEY) {
        throw new Error('USA Jobs credentials not configured');
    }

    const resultsPerPage = 10;

    let apiUrl = `https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(query)}&ResultsPerPage=${resultsPerPage}&Page=${page}`;

    if (location) {
        apiUrl += `&LocationName=${encodeURIComponent(location)}`;
    }

    const response = await axios.get(apiUrl, {
        headers: {
            'Authorization-Key': USA_JOBS_API_KEY,
            'User-Agent': 'JobFinder-App/1.0'
        }
    });

    return transformUSAJobsData(response.data);
}

// GitHub Jobs API implementation
async function fetchFromGitHubJobs(query, location) {
    let apiUrl = `https://jobs.github.com/positions.json?description=${encodeURIComponent(query)}&page=1`;

    if (location) {
        apiUrl += `&location=${encodeURIComponent(location)}`;
    }

    const response = await axios.get(apiUrl);
    return transformGitHubJobsData(response.data);
}

// Data transformation functions
function transformAdzunaData(adzunaData) {
    if (!adzunaData.results) return { data: [], source: 'adzuna' };

    const jobs = adzunaData.results.map(job => ({
        job_id: `adzuna_${job.id}`,
        job_title: job.title,
        employer_name: job.company?.display_name || 'Unknown Company',
        job_country: job.location?.area?.[3] || 'Unknown',
        job_city: job.location?.area?.[1] || 'Unknown',
        job_description: job.description,
        job_employment_type: job.contract_type || 'Full-time',
        job_salary: job.salary_min || job.salary_max ?
            `${job.salary_min ? `$${job.salary_min.toLocaleString()}` : ''}${job.salary_max ? ` - $${job.salary_max.toLocaleString()}` : ''}`.trim() : null,
        job_apply_link: job.redirect_url,
        job_posted_at_datetime_utc: job.created,
        job_highlights: {
            Qualifications: job.description ? [job.description.substring(0, 200) + '...'] : [],
            Responsibilities: job.description ? [job.description.substring(0, 200) + '...'] : []
        },
        source: 'Adzuna'
    }));

    return { data: jobs, source: 'adzuna', total: adzunaData.count };
}

function transformUSAJobsData(usaJobsData) {
    if (!usaJobsData.SearchResult?.SearchResultItems) return { data: [], source: 'usajobs' };

    const jobs = usaJobsData.SearchResult.SearchResultItems.map(item => {
        const job = item.MatchedObjectDescriptor;
        return {
            job_id: `usajobs_${job.PositionID}`,
            job_title: job.PositionTitle,
            employer_name: job.OrganizationName,
            job_country: 'USA',
            job_city: job.PositionLocation[0]?.LocationName || 'Various Locations',
            job_description: job.UserArea?.Details?.JobSummary || 'No description available',
            job_employment_type: job.PositionSchedule[0]?.Name || 'Full-time',
            job_salary: job.PositionRemuneration[0]?.MinimumRange || job.PositionRemuneration[0]?.MaximumRange ?
                `$${job.PositionRemuneration[0]?.MinimumRange || 'N/A'} - $${job.PositionRemuneration[0]?.MaximumRange || 'N/A'}` : null,
            job_apply_link: job.ApplyURI[0] || `https://www.usajobs.gov/job/${job.PositionID}`,
            job_posted_at_datetime_utc: job.PositionStartDate,
            job_highlights: {
                Qualifications: job.QualificationSummary ? [job.QualificationSummary] : [],
                Responsibilities: job.UserArea?.Details?.MajorDuties ? [job.UserArea.Details.MajorDuties] : []
            },
            source: 'USAJobs'
        };
    });

    return { data: jobs, source: 'usajobs', total: usaJobsData.SearchResult.SearchResultCount };
}

function transformGitHubJobsData(githubData) {
    if (!githubData || githubData.length === 0) return { data: [], source: 'github' };

    const jobs = githubData.map(job => ({
        job_id: `github_${job.id}`,
        job_title: job.title,
        employer_name: job.company,
        job_country: 'Various',
        job_city: job.location,
        job_description: job.description,
        job_employment_type: 'Full-time',
        job_salary: null,
        job_apply_link: job.url,
        job_posted_at_datetime_utc: job.created_at,
        job_highlights: {
            Qualifications: job.description ? [job.description.substring(0, 200) + '...'] : [],
            HowToApply: job.how_to_apply ? [job.how_to_apply] : []
        },
        source: 'GitHub Jobs'
    }));

    return { data: jobs, source: 'github', total: githubData.length };
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        server: process.env.SERVER_NAME || 'development',
        timestamp: new Date().toISOString(),
        configuredAPIs: {
            adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
            usaJobs: !!process.env.USA_JOBS_API_KEY,
            github: true
        }
    });
});

app.listen(PORT, () => {
    console.log(`Job Finder API server running on port ${PORT}`);
    console.log(`Frontend accessible at: http://localhost:${PORT}`);
    console.log(`Server: ${process.env.SERVER_NAME || 'development'}`);
    console.log('\n📡 Configured APIs:');
    console.log(`   Adzuna: ${!!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) ? '✅' : '❌'}`);
    console.log(`   USA Jobs: ${!!process.env.USA_JOBS_API_KEY ? '✅' : '❌'}`);
    console.log(`   GitHub Jobs: ✅ (No API key required)`);
});