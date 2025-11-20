# JobFinder Pro - Job Search Application

A comprehensive job search application that helps users find their dream jobs using the JSearch API. The application features an intuitive interface, advanced filtering options, and detailed job information.

## Features

- 🔍 **Advanced Job Search**: Search jobs by title, keywords, and location
- 🎯 **Smart Filters**: Filter by employment type, date posted, and remote work options
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- ⚡ **Real-time Results**: Get the latest job postings
- 🔒 **Secure API Integration**: Protected API keys and secure requests
- 🚀 **Load Balanced Deployment**: High availability with multiple servers

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **API**: JSearch API (RapidAPI)
- **Deployment**:
    - Web Servers: Web01, Web02
    - Load Balancer: Lb01
    - Process Manager: PM2
    - Web Server: Nginx

## Prerequisites

- Node.js 18+
- JSearch API Key from RapidAPI
- Three servers (Web01, Web02, Lb01) with domain ghislaine.tech

## Local Development

### 1. Clone the Repository
```bash
git clone <https://github.com/Ghislaine-i/Job_Search_Aggregator.git>
cd job-finder-app