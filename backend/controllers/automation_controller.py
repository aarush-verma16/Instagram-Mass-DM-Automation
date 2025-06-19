import os
import time
import logging
import threading
from pathlib import Path
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

from ..services.instagram_service import InstagramAutomationService
from ..utils.csv_parser import CSVParser
from ..models.tinyllama import TinyLlamaGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("automation.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AutomationController:
    """Controller to manage Instagram DM automation campaigns"""
    
    def __init__(self):
        """Initialize the automation controller"""
        load_dotenv()
        
        self.csv_file_path = os.getenv("CSV_FILE_PATH", "usernames.csv")
        self.max_dms_per_day = int(os.getenv("MAX_DMS_PER_DAY", "20"))
        self.delay_between_dms = int(os.getenv("DELAY_BETWEEN_DMS", "120"))
        self.status = "idle"
        self.campaign_active = False
        self.current_username = ""
        self.processed_count = 0
        self.total_count = 0
        self.error_count = 0
        self.start_time = None
        
        self.instagram_service = None
        self.csv_parser = None
        self.message_generator = TinyLlamaGenerator()
        
        self.campaign_thread = None
        self.campaign_lock = threading.Lock()
        
    def initialize(self) -> bool:
        """Initialize the automation components"""
        try:
            logger.info("Initializing automation controller")
            
            # Initialize CSV parser
            self.csv_parser = CSVParser(self.csv_file_path)
            usernames = self.csv_parser.get_usernames()
            self.total_count = len(usernames)
            
            if self.total_count == 0:
                logger.error("No usernames found in CSV file")
                return False
            
            logger.info(f"Loaded {self.total_count} usernames from CSV")
            
            # Initialize Instagram automation service
            self.instagram_service = InstagramAutomationService()
            self.instagram_service.setup_driver()
            
            return True
        except Exception as e:
            logger.error(f"Error initializing automation controller: {str(e)}")
            return False
    
    def start_campaign(self) -> bool:
        """Start the DM automation campaign in a separate thread"""
        with self.campaign_lock:
            if self.campaign_active:
                logger.warning("Campaign already running")
                return False
            
            if not self.instagram_service:
                logger.error("Instagram service not initialized")
                return False
            
            self.campaign_active = True
            self.status = "starting"
            self.start_time = time.time()
            
            # Start the campaign in a separate thread
            self.campaign_thread = threading.Thread(target=self._run_campaign)
            self.campaign_thread.daemon = True
            self.campaign_thread.start()
            
            logger.info("DM automation campaign started")
            return True
    
    def stop_campaign(self) -> bool:
        """Stop the active DM campaign"""
        with self.campaign_lock:
            if not self.campaign_active:
                logger.warning("No active campaign to stop")
                return False
            
            self.campaign_active = False
            self.status = "stopping"
            logger.info("Stopping DM automation campaign")
            
            # If thread is active, wait for it to finish
            if self.campaign_thread and self.campaign_thread.is_alive():
                self.campaign_thread.join(timeout=30)
            
            self.status = "idle"
            return True
    
    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the campaign"""
        duration = 0
        if self.start_time:
            duration = int(time.time() - self.start_time)
            
        return {
            "status": self.status,
            "active": self.campaign_active,
            "processed": self.processed_count,
            "total": self.total_count,
            "errors": self.error_count,
            "current_username": self.current_username or "None",
            "duration_seconds": duration,
            "max_dms_per_day": self.max_dms_per_day
        }
    
    def _run_campaign(self) -> None:
        """Run the DM automation campaign (internal method run in thread)"""
        try:
            # Login to Instagram
            self.status = "logging_in"
            if not self._ensure_logged_in():
                self.status = "login_failed"
                self.campaign_active = False
                return
            
            # Get usernames from CSV
            usernames = self.csv_parser.get_usernames()
            already_messaged = set(self.instagram_service.processed_users)
            logger.info(f"Starting campaign with {len(usernames)} usernames")
            
            # Set status to running
            self.status = "running"
            self.processed_count = len(already_messaged)
            
            # Process each username
            for username in usernames:
                if not self.campaign_active:
                    logger.info("Campaign stopped by user")
                    break
                    
                # Check if we've already messaged this user
                if username in already_messaged:
                    logger.debug(f"Username {username} already messaged, skipping")
                    continue
                
                # Check if we've reached the daily DM limit
                if self.processed_count >= self.max_dms_per_day:
                    logger.info(f"Reached maximum DMs per day limit: {self.max_dms_per_day}")
                    self.status = "daily_limit_reached"
                    self.campaign_active = False
                    break
                
                # Update current username
                self.current_username = username
                
                # Generate message using TinyLlama
                try:
                    message = self.message_generator.generate_initial_message(username)
                except Exception as e:
                    logger.error(f"Error generating message: {str(e)}")
                    message = self._get_fallback_message(username)
                
                # Send DM
                success = self._send_dm_with_recovery(username, message)
                
                if success:
                    self.processed_count += 1
                    already_messaged.add(username)
                    
                    # Record this user as processed
                    self.instagram_service._save_processed_user(username)
                    
                    # Wait between messages
                    if self.campaign_active and self.processed_count < len(usernames):
                        logger.info(f"Waiting {self.delay_between_dms} seconds before next message")
                        time.sleep(self.delay_between_dms)
                else:
                    self.error_count += 1
            
            # Campaign completed
            if self.campaign_active:
                self.status = "completed"
            self.campaign_active = False
            logger.info(f"Campaign finished. Processed: {self.processed_count}, Errors: {self.error_count}")
            
        except Exception as e:
            logger.error(f"Campaign error: {str(e)}")
            self.status = "error"
            self.campaign_active = False
    
    def _ensure_logged_in(self) -> bool:
        """Ensure we're logged into Instagram"""
        try:
            # Try to load cookies first
            if self.instagram_service.load_cookies():
                logger.info("Logged in with cookies")
                return True
                
            # If cookies fail, try regular login
            logger.info("Logging in with credentials")
            if self.instagram_service.login():
                return True
                
            logger.error("Failed to log in")
            return False
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return False
    
    def _send_dm_with_recovery(self, username: str, message: str) -> bool:
        """Send DM with automatic session recovery on failure"""
        try:
            # Try to send the DM
            result = self.instagram_service.send_dm(username, message)
            
            # If it worked, great
            if result:
                return True
                
            # If failed, try once with session recovery
            logger.warning(f"Failed to send DM to {username}, attempting session recovery")
            
            if self.instagram_service.recover_session():
                # Try again after recovery
                logger.info("Session recovered, retrying DM")
                return self.instagram_service.send_dm(username, message)
            else:
                logger.error("Could not recover session")
                return False
                
        except Exception as e:
            logger.error(f"Error sending DM with recovery: {str(e)}")
            return False
    
    def _get_fallback_message(self, username: str) -> str:
        """Generate a fallback message if TinyLlama fails"""
        return f"Hi @{username}! I noticed your profile and thought I'd reach out. Looking forward to connecting!"
