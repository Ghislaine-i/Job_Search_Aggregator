class JobFinder {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.currentQuery = '';
        this.currentFilters = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkServerHealth();
    }

    bindEvents() {
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchJobs();
        });

        document.getElementById('employmentType').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('datePosted').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('remote').addEventListener('change', () => {
            this.applyFilters();
        });

        document.querySelector('.close-btn').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('jobModal').addEventListener('click', (e) => {
            if (e.target.id === 'jobModal') {
                this.closeModal();
            }
        });
    }

    async checkServerHealth() {
        try {
            const response = await fetch('/health');
            const data = await response.json();
            console.log(`Server health: ${data.status} - ${data.server}`);
        } catch (error) {
            console.error('Server health check failed:', error);
        }
    }

    async searchJobs(page = 1) {
        this.currentPage = page;
        const query = document.getElementById('jobQuery').value.trim();
        const location = document.getElementById('jobLocation').value.trim();

        if (!query) {
            this.showError('Please enter a job title or keywords to search');
            return;
        }

        this.currentQuery = query;
        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            const searchQuery = location ? `${query} in ${location}` : query;
            const params = new URLSearchParams({
                query: searchQuery,
                page: page.toString(),
                num_pages: '1'
            });

            // Add filters if present
            Object.keys(this.currentFilters).forEach(key => {
                if (this.currentFilters[key]) {
                    params.append(key, this.currentFilters[key]);
                }
            });

            console.log('🔍 Making API request to:', `/api/jobs?${params}`);

            const response = await fetch(`/api/jobs?${params}`);

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📊 API response data:', data);

            this.displayResults(data);
        } catch (error) {
            console.error('❌ Search error:', error);
            this.showError(`Failed to search for jobs: ${error.message}`);
        } finally {
            this.hideLoading();
        }
    }

    applyFilters() {
        this.currentFilters = {
            employment_type: document.getElementById('employmentType').value,
            date_posted: document.getElementById('datePosted').value,
            contract_type: document.getElementById('employmentType').value,
            remote: document.getElementById('remote').value
        };

        if (this.currentQuery) {
            this.searchJobs(1);
        }
    }

    displayResults(data) {
        const jobsList = document.getElementById('jobsList');
        const resultsInfo = document.getElementById('resultsInfo');
        const resultsCount = document.getElementById('resultsCount');
        const pagination = document.getElementById('pagination');

        if (!data.data || data.data.length === 0) {
            this.showError('No jobs found matching your criteria. Try different keywords or filters.');
            return;
        }

        // Display results info
        const jobs = data.data;
        resultsCount.textContent = `Found ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`;
        resultsInfo.classList.remove('hidden');

        // Display jobs
        jobsList.innerHTML = jobs.map(job => this.createJobCard(job)).join('');
        jobsList.classList.remove('hidden');

        // Display pagination
        this.updatePagination();
        pagination.classList.remove('hidden');
    }

    createJobCard(job) {
        const salary = job.job_salary ?
            `$${this.formatSalary(job.job_salary)}` : 'Salary not specified';

        const postedDate = job.job_posted_at_datetime_utc ?
            new Date(job.job_posted_at_datetime_utc).toLocaleDateString() : 'Recently';

        // Escape the job_id for the onclick attribute
        const escapedJobId = this.escapeHtml(job.job_id);

        return `
            <div class="job-card">
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${this.escapeHtml(job.job_title)}</h3>
                        <p class="job-company">${this.escapeHtml(job.employer_name)}</p>
                        <p class="job-location">
                            <i class="fas fa-map-marker-alt"></i> 
                            ${this.escapeHtml(job.job_city || '')} ${this.escapeHtml(job.job_country || 'Location not specified')}
                        </p>
                    </div>
                    <span class="job-salary">${salary}</span>
                </div>
                
                <div class="job-details">
                    <span class="job-type">
                        <i class="fas fa-briefcase"></i> 
                        ${this.escapeHtml(job.job_employment_type || 'Not specified')}
                    </span>
                    <span class="job-posted">
                        <i class="fas fa-calendar"></i> Posted ${postedDate}
                    </span>
                </div>
                
                <p class="job-description">
                    ${this.escapeHtml(job.job_description || 'No description available.')}
                </p>
                
                <div class="job-actions">
                    <button class="view-details-btn" onclick="jobFinder.viewJobDetails('${escapedJobId}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${job.job_apply_link ? `
                        <a href="${job.job_apply_link}" target="_blank" class="view-details-btn" style="margin-left: 10px;">
                            <i class="fas fa-external-link-alt"></i> Apply Now
                        </a>
                    ` : ''}
                </div>
            </div>
            <span class="job-source">Source: ${job.source}</span>
        `;
    }

    async viewJobDetails(jobId) {
        try {
            console.log('🔍 Fetching job details for:', jobId);
            const response = await fetch(`/api/job-details?job_id=${jobId}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('📊 Job details response:', data);

            if (data.data && data.data.length > 0) {
                this.showJobModal(data.data[0]);
            } else {
                throw new Error('Job details not found');
            }
        } catch (error) {
            console.error('❌ Error fetching job details:', error);
            this.showError('Failed to load job details. Please try again.');
        }
    }

    showJobModal(job) {
        const modal = document.getElementById('jobModal');
        const modalContent = document.getElementById('modalContent');

        const salary = job.job_salary ?
            `$${this.formatSalary(job.job_salary)}` : 'Salary not specified';

        const postedDate = job.job_posted_at_datetime_utc ?
            new Date(job.job_posted_at_datetime_utc).toLocaleDateString() : 'Recently';

        modalContent.innerHTML = `
            <h2>${this.escapeHtml(job.job_title)}</h2>
            <div class="job-meta">
                <p><strong>Company:</strong> ${this.escapeHtml(job.employer_name)}</p>
                <p><strong>Location:</strong> ${this.escapeHtml(job.job_city || '')} ${this.escapeHtml(job.job_country || 'Not specified')}</p>
                <p><strong>Salary:</strong> ${salary}</p>
                <p><strong>Employment Type:</strong> ${this.escapeHtml(job.job_employment_type || 'Not specified')}</p>
                <p><strong>Posted:</strong> ${postedDate}</p>
            </div>
            
            <div class="job-full-description">
                <h3>Job Description</h3>
                <p>${this.escapeHtml(job.job_description || 'No description available.')}</p>
            </div>
            
            ${job.job_highlights ? `
                <div class="job-highlights">
                    <h3>Job Highlights</h3>
                    ${job.job_highlights.Qualifications ? `
                        <h4>Qualifications</h4>
                        <ul>
                            ${job.job_highlights.Qualifications.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${job.job_highlights.Responsibilities ? `
                        <h4>Responsibilities</h4>
                        <ul>
                            ${job.job_highlights.Responsibilities.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${job.job_highlights.Benefits ? `
                        <h4>Benefits</h4>
                        <ul>
                            ${job.job_highlights.Benefits.map(item => `<li>${this.escapeHtml(item)}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            ` : ''}
            
            <div class="modal-actions">
                ${job.job_apply_link ? `
                    <a href="${job.job_apply_link}" target="_blank" class="view-details-btn" style="font-size: 1.1rem; padding: 0.75rem 1.5rem;">
                        <i class="fas fa-external-link-alt"></i> Apply Now
                    </a>
                ` : ''}
                <button onclick="jobFinder.closeModal()" class="view-details-btn" style="background: #95a5a6; margin-left: 10px;">
                    Close
                </button>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('jobModal').classList.add('hidden');
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';

        if (this.currentPage > 1) {
            pagination.innerHTML += `
                <button class="page-btn" onclick="jobFinder.searchJobs(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i> Previous
                </button>
            `;
        }

        pagination.innerHTML += `
            <button class="page-btn active">Page ${this.currentPage}</button>
        `;

        pagination.innerHTML += `
            <button class="page-btn" onclick="jobFinder.searchJobs(${this.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }

    formatSalary(salary) {
        if (!salary) return 'Not specified';

        // Handle different salary formats
        if (typeof salary === 'string') {
            // Extract numbers from salary string
            const numbers = salary.match(/\d+/g);
            if (numbers && numbers.length > 0) {
                // Take the largest number found (usually the max salary)
                const maxSalary = Math.max(...numbers.map(Number));
                return maxSalary.toLocaleString();
            }
        }

        return 'Not specified';
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        const div = document.createElement('div');
        div.textContent = unsafe;
        return div.innerHTML;
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }

    hideResults() {
        document.getElementById('jobsList').classList.add('hidden');
        document.getElementById('pagination').classList.add('hidden');
        document.getElementById('resultsInfo').classList.add('hidden');
    }
}

// Initialize the application
const jobFinder = new JobFinder();