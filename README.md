# Instagram DM Automation

A sophisticated Instagram direct messaging automation tool with a React frontend and FastAPI backend. This application uses human-like typing simulation, dynamic message generation with TinyLLama, proxy rotation, and automatic captcha solving to safely manage Instagram DM campaigns at scale.

## Features

### Frontend Features
- **React-based UI** with Material UI design system
- **Real-time Dashboard** for monitoring campaign status and progress
- **Campaign Management** with start/stop controls and test DM functionality
- **User Management** for target Instagram username list handling and CSV uploads
- **Log Viewer** with filtering and search functionality
- **Settings Configuration** with human-like typing speed adjustments
- **Responsive Design** for desktop and mobile access

### Backend Features
- **Human-Like Typing Simulation** with:
  - Variable typing speeds
  - Natural thinking pauses
  - Longer pauses after punctuation
  - Occasional realistic typos and corrections
- **Multi-Part Message Sending** for more natural conversations
- **Dynamic Message Generation** using TinyLLama model
- **Proxy Rotation** every 20-30 minutes (configurable)
- **Automated Captcha Handling** with 2Captcha API
- **CSV Username Parsing and Cleaning**
- **Session Management** with cookies for persistence
- **Extensive Logging** and error recovery
- **Rate Limiting and Throttling** to avoid Instagram restrictions

## Project Structure

```
Instagram Automation/
├── backend/
│   ├── api/             # FastAPI routes and endpoints
│   ├── models/          # Data models and TinyLLama integration
│   ├── services/        # Core automation services
│   │   └── instagram_service.py  # Instagram automation logic
│   ├── utils/           # Helper functions and utilities
│   └── main.py          # FastAPI application entry point
├── frontend/
│   ├── public/          # Static assets
│   └── src/
│       ├── contexts/    # React contexts including authentication
│       ├── layouts/     # Page layouts and navigation
│       ├── pages/       # React page components
│       ├── services/    # API service layer
│       ├── App.tsx      # Main application component
│       └── index.tsx    # React entry point
├── data/                # Data storage directory
│   ├── cookies/         # Browser session cookies
│   ├── logs/            # Application logs
│   └── users/           # User lists and processed users
├── .env                 # Environment variables
├── requirements.txt     # Python dependencies
└── README.md           # Project documentation
```

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 16+
- Chrome browser
- 2Captcha API key (for captcha solving)
- Proxies (recommended for production use)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/instagram-automation.git
   cd instagram-automation
   ```

2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the root directory with the following variables:
   ```env
   # Instagram Credentials
   INSTAGRAM_USERNAME=your_instagram_username
   INSTAGRAM_PASSWORD=your_instagram_password
   
   # API Keys
   TWOCAPTCHA_API_KEY=your_2captcha_api_key
   
   # Proxy Settings
   USE_PROXIES=true
   PROXY_LIST_PATH=./data/proxies.txt
   PROXY_ROTATION_INTERVAL=1800  # 30 minutes in seconds
   
   # Typing Speed (seconds)
   TYPING_SPEED_MIN=0.05
   TYPING_SPEED_MAX=0.15
   THINKING_PAUSE_MIN=0.5
   THINKING_PAUSE_MAX=2.0
   
   # Automation Settings
   MAX_DMS_PER_DAY=40
   DELAY_BETWEEN_DMS=30  # seconds
   USER_LIST_PATH=./data/users/target_users.csv
   PROCESSED_USERS_PATH=./data/users/processed_users.txt
   COOKIES_PATH=./data/cookies/
   LOG_PATH=./data/logs/automation.log
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory:
   ```env
   REACT_APP_API_URL=http://localhost:8000/api
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload --port 8000
   ```

2. In a separate terminal, start the frontend development server:
   ```bash
   cd frontend
   npm start
   ```

3. Access the web interface at `http://localhost:3000`

## Usage Guide

### Initial Setup

1. Log in to the application using your admin credentials (default setup uses any username/password for demo purposes)

2. Navigate to the **Settings** page to configure:
   - Your Instagram account credentials
   - Maximum DMs per day (recommended: 30-40)
   - Proxy settings (if applicable)
   - Message sending delays
   - Human-like typing speeds

### Managing Target Users

1. Go to the **Users** page to:
   - Upload a CSV file containing Instagram usernames
   - Add individual usernames manually
   - Track processed vs pending users

### Creating DM Campaigns

1. Visit the **Campaigns** page to:
   - Select and customize message templates
   - Send test DMs to verify functionality
   - Start/stop the main campaign

### Monitoring

1. Use the **Dashboard** to:
   - View real-time campaign status
   - Track user processing progress
   - Monitor proxy rotations
   - Check for any errors or issues

2. Check the **Logs** page for detailed activity logs, including:
   - Successful DMs sent
   - Error messages
   - System events

## Human-Like Typing Simulation

This project features a sophisticated human-like typing mechanism that simulates realistic typing behavior to reduce detection risk:

1. **Variable Speed**: Each keystroke has a random delay within configurable min/max bounds

2. **Thinking Pauses**: Natural pauses occur approximately every 8 words to simulate human thought

3. **Punctuation Pauses**: Longer pauses after periods, commas, and question marks

4. **Typo Simulation**: Occasional typos with immediate corrections (configurable frequency)

5. **Multi-Part Messages**: Instagram DMs are sent in natural segments with appropriate pauses

## Proxy Management

To avoid IP bans and account restrictions, the system supports proxy rotation:

1. **Automatic Rotation**: Proxies change every 20-30 minutes (configurable)

2. **Format**: Proxy list should be in the format `ip:port:username:password` or `ip:port`

3. **Testing**: Proxies are tested before use to ensure functionality

## Security Considerations

- Store your `.env` file securely and never commit it to version control
- Use dedicated Instagram accounts for automation, not personal accounts
- Start with low daily message limits and gradually increase
- Implement proper error handling and monitoring
- Use high-quality proxies to avoid detection

## Troubleshooting

### Common Issues

1. **Login Failures**: Check your Instagram credentials and ensure 2FA is disabled or properly handled

2. **Captcha Problems**: Verify your 2Captcha API key and balance

3. **Proxy Errors**: Ensure proxies are properly formatted and working

4. **Rate Limiting**: If you encounter restrictions, reduce the daily message limit

### Logs

Check the log files in the `data/logs` directory for detailed error information.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is for educational purposes only. Use responsibly and in accordance with Instagram's terms of service. Excessive automation may result in account restrictions or bans.
