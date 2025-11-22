# Job Finder Pro - Job Search Aggregator

A full-stack web application that aggregates job listings from multiple APIs, deployed with load balancing across multiple servers for high availability and scalability.

## 🌐 Live Demo

- **Production URL**: http://ghislaine.tech
- **Note**: The application is deployed with load balancing across multiple web servers for high availability

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technologies Used](#technologies-used)
- [APIs Used](#apis-used)
- [Local Development Setup](#local-development-setup)
- [Deployment Guide](#deployment-guide)
- [Testing the Load Balancer](#testing-the-load-balancer)
- [Challenges & Solutions](#challenges--solutions)
- [Credits](#credits)
- [License](#license)

## ✨ Features

- **Multi-API Job Search**: Aggregates job listings from Adzuna, USA Jobs, and GitHub Jobs APIs
- **Smart Fallback System**: Automatically switches between APIs if one fails
- **Real-time Search**: Search jobs by keyword and location
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Load Balanced**: Distributed across multiple servers for high availability
- **Health Monitoring**: Built-in health check endpoints for monitoring
- **Filtering Options**: Filter by employment type, work type, and time posted

## 🏗️ Architecture

### System Architecture

```
                    Internet
                       ↓
              [Load Balancer - Lb01]
               (Nginx Round-Robin)
                 lb-01
                   ↙         ↘
         [web-01 IP ]   [web-02 IP]
          web-01 IP adress      web-02 IP adress
         Node.js + Nginx  Node.js + Nginx
              ↓                  ↓
         [PM2 Process]    [PM2 Process]
              ↓                  ↓
        [Express API]      [Express API]
              ↓                  ↓
         Multiple Job APIs
    (Adzuna, USA Jobs, GitHub)
```

### Load Balancing Strategy

- **Method**: Round-robin distribution
- **Health Checks**: Automatic server health monitoring
- **Failover**: Automatic traffic rerouting if a server fails
- **Session Persistence**: Stateless design for seamless server switching

## 🛠️ Technologies Used

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Responsive Design

### Backend
- Node.js (v18+)
- Express.js (v4.18+)
- Axios for HTTP requests
- dotenv for environment variables

### Deployment & DevOps
- **web Servers**: Nginx (reverse proxy)
- **Load Balancer**: Nginx (upstream configuration)
- **Process Manager**: PM2
- **OS**: Ubuntu 20.04 LTS
- **Cloud Provider**: AWS EC2

## 📡 APIs Used

### 1. Adzuna API
- **Description**: Job search engine aggregating listings from thousands of web-02 IP adresssites
- **Documentation**: https://developer.adzuna.com/
- **Tier**: Free tier (up to 1,000 requests/month)
- **Data Provided**: Job title, company, location, salary, description, posting date

### 2. USA Jobs API
- **Description**: Official United States government job search API
- **Documentation**: https://developer.usajobs.gov/
- **Tier**: Free with API key
- **Data Provided**: Federal government job listings with detailed qualifications

### 3. GitHub Jobs API
- **Description**: Tech job listings (archived but still functional)
- **Documentation**: https://jobs.github.com/api
- **Tier**: Free, no API key required
- **Data Provided**: Technology-focused job postings

### API Priority Order
The application tries APIs in this order:
1. **Adzuna** (Primary - most comprehensive)
2. **USA Jobs** (Secondary - government jobs)
3. **GitHub Jobs** (Fallback - tech jobs)

## 💻 Local Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Git
- API Keys (see below)

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/Job_Search_Aggregator.git
cd Job_Search_Aggregator
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
nano .env
```

Add your API credentials:

```env
# Adzuna API Credentials
ADZUNA_APP_ID=your_adzuna_app_id_here
ADZUNA_APP_KEY=your_adzuna_app_key_here

# USA Jobs API Key
USA_JOBS_API_KEY=your_usajobs_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
SERVER_NAME=Local
```

### Step 4: Start the Development Server

```bash
# Start the backend server
npm start

# Or use nodemon for auto-restart during development
npm run dev
```

The application will be accessible at: http://localhost:3000

### Step 5: Verify Everything Works

```bash
# Test the health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"OK","server":"Local","timestamp":"...","configuredAPIs":{...}}

# Test job search
curl "http://localhost:3000/api/jobs?query=software+engineer&location=usa"
```

## 🚀 Deployment Guide

### Server Requirements

- 3 Ubuntu 20.04 LTS servers (web-02 IP adress01, web-02 IP adress02, Lb01)
- SSH access with sudo privileges
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Part 1: Deploy to Web Servers (web-01 & web-02)

#### Step 1: Initial Server Setup

```bash
# SSH into the server
ssh ubuntu@server-ip-address

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Verify installations
node --version
npm --version
nginx -v
pm2 --version
```

#### Step 2: Clone and Setup Application

```bash
# Navigate to web directory
cd /var/www/

# Clone repository
sudo git clone https://github.com/yourusername/Job_Search_Aggregator.git
cd Job_Search_Aggregator

# Set proper ownership
sudo chown -R ubuntu:ubuntu /var/www/Job_Search_Aggregator

# Install dependencies
npm install

# Create .env file
nano .env
```

**For web-01**, add:
```env
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
USA_JOBS_API_KEY=your_usajobs_api_key
PORT=3000
NODE_ENV=production
SERVER_NAME=web-01
```

**For web-02**, use the same but change:
```env
SERVER_NAME=web-02
```

#### Step 3: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/job-search-aggregator
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/Job_Search_Aggregator/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/job-search-aggregator /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 4: Start Application with PM2

```bash
cd /var/www/Job_Search_Aggregator

# Start application
pm2 start backend/server.js --name job-search-aggregator

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Verify it's running
pm2 status
pm2 logs job-search-aggregator
```

#### Step 5: Configure Firewall

```bash
# Install UFW if not present
sudo apt install ufw -y

# Configure firewall rules
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verify
sudo ufw status
```

#### Step 6: Test the web Server

```bash
# Test locally
curl http://localhost/health

# Test from another server
curl http://web-02 IP adress-SERVER-IP/health
```

**Repeat Steps 1-6 for both web-02 IP adress01 and web-02 IP adress02**

### Part 2: Configure Load Balancer (Lb01)

#### Step 1: Install Nginx on Load Balancer

```bash
# SSH into Lb01
ssh ubuntu@lb01-ip-address

# Update and install
sudo apt update && sudo apt upgrade -y
sudo apt install nginx nano -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### Step 2: Configure Load Balancer

```bash
# Create load balancer configuration
sudo nano /etc/nginx/sites-available/job-search-aggregator-lb
```

Add this configuration (replace IPs with your actual server IPs):

```nginx
upstream job_finder_backend {
    server web-01 IP adress:80 max_fails=3 fail_timeout=30s;
    server web-02 IP adress:80 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name ghislaine.tech www.ghislaine.tech;

    access_log /var/log/nginx/job-search-aggregator-access.log;
    error_log /var/log/nginx/job-search-aggregator-error.log;

    location / {
        proxy_pass http://job_finder_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://job_finder_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
}
```

```bash
# Enable configuration
sudo ln -sf /etc/nginx/sites-available/job-search-aggregator-lb /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Step 3: Configure DNS (Optional but Recommended)

Point your domain to the load balancer IP:

1. Go to your DNS provider
2. Add an A record:
    - Type: A
    - Name: @ (or blank)
    - Value: YOUR_LB_IP
    - TTL: 3600

## 🧪 Testing the Load Balancer

### Test Load Distribution

```bash
# SSH into Lb01
ssh ubuntu@lb-ip-address

# Run multiple requests
for i in {1..10}; do
    echo "Request $i:"
    curl http://localhost/health
    echo ""
    sleep 1
done
```

You should see responses alternating between web-02 IP adress01 and web-02 IP adress02.

### Test Failover

```bash
# On web-01, stop the application
ssh ubuntu@web01-ip
pm2 stop job-search-aggregator

# From Lb01, send requests
curl http://localhost/health
# All traffic should now go to web-02

# Restart web-02 IP adress01
ssh ubuntu@web-02 IP adress01-ip
pm2 start job-search-aggregator

# Traffic should resume to both servers
```

### Test from Browser

Open your browser and navigate to:
- http://your-load-balancer-ip
- http://ghislaine.tech (if DNS configured)

Try searching for jobs multiple times. Each request might be handled by a different server!

### Monitor Load Balancer Logs

```bash
# On Lb01, watch access logs
sudo tail -f /var/log/nginx/job-search-aggregator-access.log

# Watch error logs
sudo tail -f /var/log/nginx/job-search-aggregator-error.log
```

## 🐛 Challenges & Solutions

### Challenge 1: API Rate Limiting
**Problem**: The free tier of Adzuna API has limited requests (1,000/month).

**Solution**:
- Implemented a multi-API fallback system
- If Adzuna fails or hits rate limits, the app automatically tries USA Jobs, then GitHub Jobs
- Added proper error handling and logging to track which API is being used

### Challenge 2: Environment Variable Security
**Problem**: Risk of exposing API keys in Git repository.

**Solution**:
- Created a comprehensive `.gitignore` file
- Used `dotenv` for environment variable management
- Added `.env.example` as a template without actual keys
- Documented the need for API keys in README

### Challenge 3: Port Conflicts on web-02 IP adress Servers
**Problem**: Multiple PM2 instances trying to use port 3000.

**Solution**:
- Used `pm2 delete all` to clean up orphaned processes
- Implemented proper PM2 naming convention: `--name job-search-aggregator`
- Added health checks to verify each instance before proceeding

### Challenge 4: Nginx Configuration Conflicts
**Problem**: Multiple Nginx configurations causing 404 and 502 errors.

**Solution**:
- Standardized configuration file naming
- Removed conflicting default sites
- Used symbolic links for enabling sites: `ln -sf`
- Always tested configuration before restarting: `nginx -t`

### Challenge 5: Load Balancer Not Distributing Traffic Evenly
**Problem**: All requests going to one server.

**Solution**:
- Configured proper upstream block in Nginx
- Set appropriate health check parameters: `max_fails=3 fail_timeout=30s`
- Verified both backend servers were accessible from load balancer
- Used round-robin algorithm (Nginx default)

### Challenge 6: Cross-Server Communication
**Problem**: Load balancer couldn't reach web-02 IP adress servers.

**Solution**:
- Configured firewall rules (UFW) to allow HTTP traffic on port 80
- Ensured security groups/network ACLs allowed traffic between servers
- Tested connectivity with `curl` before configuring load balancer

## 📚 Credits

### APIs
- **Adzuna**: https://www.adzuna.com/ - Job aggregation service
- **USA Jobs**: https://www.usajobs.gov/ - Official US government job portal
- **GitHub Jobs**: https://jobs.github.com/ - Technology job listings

### Technologies & Libraries
- **Node.js**: https://nodejs.org/ - JavaScript runtime
- **Express.js**: https://expressjs.com/ - web-02 IP adress framework
- **Axios**: https://axios-http.com/ - HTTP client
- **PM2**: https://pm2.keymetrics.io/ - Process manager
- **Nginx**: https://nginx.org/ - web-02 IP adress server and load balancer
- **dotenv**: https://github.com/motdotla/dotenv - Environment variable management

### Resources
- Nginx Load Balancing Documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/
- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- Express.js Best Practices: https://expressjs.com/en/advanced/best-practice-security.html

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**INEZA MARIE GHISLAINE**
- GitHub: [@ghislaine-i](https://github.com/ghislaine-i)
- Email: g.ineza@alustudent.com

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/Job_Search_Aggregator/issues).

## 📞 Support

For support, email g.ineza@alustudent.com or create an issue in the GitHub repository.

---

**Note**: Remember to never commit your `.env` file or expose your API keys publicly!