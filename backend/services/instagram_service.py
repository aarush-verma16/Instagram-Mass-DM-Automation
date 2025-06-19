import os
import time
import random
import logging
import pickle
import re
from pathlib import Path
from typing import List, Set, Optional, Dict, Any, Tuple, Union, Callable
from dotenv import load_dotenv

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import (
    TimeoutException, 
    NoSuchElementException, 
    WebDriverException, 
    NoSuchWindowException,
    StaleElementReferenceException,
    ElementClickInterceptedException
)
from twocaptcha import TwoCaptcha

from ..utils.proxy_manager import ProxyManager
from ..models.tinyllama import TinyLlamaGenerator

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("instagram_service.log"),
        logging.StreamHandler()
    ]
)

class InstagramAutomationService:
    """Service for automating Instagram direct messaging"""
    
    def __init__(self):
        """Initialize the Instagram automation service"""
        # Load environment variables
        load_dotenv()
        
        # Instagram credentials
        self.username = os.getenv("INSTAGRAM_USERNAME")
        self.password = os.getenv("INSTAGRAM_PASSWORD")
        
        # API keys
        self.twocaptcha_api_key = os.getenv("TWOCAPTCHA_API_KEY")
        
        # File paths
        self.cookie_file = os.getenv("COOKIE_FILE", "cookies.pkl")
        self.sent_dm_log = os.getenv("SENT_DM_LOG", "sent_dm_log.txt")
        self.error_log = os.getenv("ERROR_LOG", "error_log.txt")
        
        # Settings
        self.max_dms_per_day = int(os.getenv("MAX_DMS_PER_DAY", "20"))
        self.use_proxies = os.getenv("USE_PROXIES", "false").lower() == "true"
        
        # Initialize components
        self.proxy_manager = ProxyManager(
            rotation_interval=int(os.getenv("PROXY_ROTATION_INTERVAL", "1800"))
        )
        self.message_generator = TinyLlamaGenerator()
        
        # Runtime variables
        self.driver = None
        self.is_running = False
        self.dm_count = 0
        self.start_time = None
        self.processed_users = set()
        self.current_proxy = None
        self.proxy_last_rotation = None
        self._load_processed_users()
        
    def setup_driver(self) -> bool:
        """Setup undetected_chromedriver with proper options"""
        try:
            logger.info("Setting up undetected Chrome driver")
            options = uc.ChromeOptions()
            
            # Set Chrome options for better automation
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-popup-blocking")
            options.add_argument("--disable-notifications")
            options.add_argument("--disable-gpu")
            options.add_argument("--disable-infobars")
            options.add_argument("--disable-extensions")
            options.add_argument("--mute-audio")
            options.add_argument("--lang=en-US")
            
            # Use proxies if enabled
            if self.use_proxies and self.proxy_manager:
                proxy = self.proxy_manager.get_proxy()
                if proxy:
                    logger.info(f"Using proxy: {proxy}")
                    options.add_argument(f'--proxy-server={proxy}')
                    self.current_proxy = proxy
                    self.proxy_last_rotation = time.time()
                
            # Initialize undetected Chrome driver
            self.driver = uc.Chrome(options=options)
            self.driver.set_window_size(1280, 800)
            
            logger.info("Chrome driver set up successfully")
            return True
        except Exception as e:
            logger.error(f"Error setting up Chrome driver: {str(e)}")
            return False
            
    def _rotate_proxy_if_needed(self) -> bool:
        """Rotate proxy if rotation interval has passed"""
        try:
            if not self.use_proxies or not self.proxy_manager:
                return False
                
            current_time = time.time()
            time_since_rotation = current_time - self.proxy_last_rotation
            
            # Check if rotation interval has passed
            if time_since_rotation >= self.proxy_rotation_interval:
                logger.info(f"Rotating proxy after {time_since_rotation:.1f} seconds")
                
                # Get new proxy
                new_proxy = self.proxy_manager.get_proxy(exclude=self.current_proxy)
                if not new_proxy:
                    logger.warning("No new proxy available for rotation")
                    return False
                
                # Close current driver
                if self.driver:
                    try:
                        self.driver.quit()
                    except Exception:
                        pass
                    
                # Setup new driver with new proxy
                options = uc.ChromeOptions()
                options.add_argument("--no-sandbox")
                options.add_argument("--disable-popup-blocking")
                options.add_argument("--disable-notifications")
                options.add_argument("--disable-gpu")
                options.add_argument("--disable-infobars")
                options.add_argument("--disable-extensions")
                options.add_argument("--mute-audio")
                options.add_argument("--lang=en-US")
                options.add_argument(f'--proxy-server={new_proxy}')
                
                # Initialize new driver
                self.driver = uc.Chrome(options=options)
                self.driver.set_window_size(1280, 800)
                
                # Update proxy information
                self.current_proxy = new_proxy
                self.proxy_last_rotation = current_time
                
                logger.info(f"Proxy rotated to: {new_proxy}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error rotating proxy: {str(e)}")
            return False

    def _load_processed_users(self) -> None:
        """Load the list of users who have already been sent DMs"""
        try:
            if os.path.exists(self.sent_dm_log):
                with open(self.sent_dm_log, 'r') as f:
                    self.processed_users = set(line.strip() for line in f if line.strip())
                logger.info(f"Loaded {len(self.processed_users)} previously processed users")
            else:
                logger.info("No sent DM log found, starting fresh")
        except Exception as e:
            logger.error(f"Error loading processed users: {str(e)}")
    
    def _save_processed_user(self, username: str) -> None:
        """Save a username to the processed users log"""
        try:
            with open(self.sent_dm_log, 'a') as f:
                f.write(f"{username}\n")
            self.processed_users.add(username)
            logger.info(f"Saved {username} to processed users log")
        except Exception as e:
            logger.error(f"Error saving processed user: {str(e)}")
    
    def _log_error(self, username: str, error: str) -> None:
        """Log an error to the error log file"""
        try:
            with open(self.error_log, 'a') as f:
                f.write(f"{time.ctime()}: {username} - {error}\n")
            logger.error(f"{username}: {error}")
        except Exception as e:
            logger.error(f"Error writing to error log: {str(e)}")
    
    def load_cookies(self) -> bool:
        """Load cookies from file to avoid login"""
        try:
            if os.path.exists(self.cookie_file):
                self.driver.get("https://www.instagram.com/")
                cookies = pickle.load(open(self.cookie_file, "rb"))
                for cookie in cookies:
                    self.driver.add_cookie(cookie)
                self.driver.refresh()
                time.sleep(3)
                
                if "accounts/login" not in self.driver.current_url:
                    logger.info("Cookies loaded successfully")
                    return True
                else:
                    logger.warning("Cookies expired or invalid")
            else:
                logger.info("No cookies file found")
            return False
        except Exception as e:
            logger.error(f"Error loading cookies: {str(e)}")
            return False
    
    def save_cookies(self) -> None:
        """Save cookies to file for future use"""
        try:
            pickle.dump(self.driver.get_cookies(), open(self.cookie_file, "wb"))
            logger.info("Cookies saved successfully")
        except Exception as e:
            logger.error(f"Error saving cookies: {str(e)}")
    
    def handle_popup(self, max_attempts: int = 5) -> bool:
        """Handle various Instagram popups"""
        popup_texts = ["Not Now", "No", "Cancel", "Close", "Dismiss", "Turn Off", "Later", "Decline", "Accept"]
        
        for attempt in range(max_attempts):
            for text in popup_texts:
                try:
                    popup_xpath = f"//button[contains(text(), '{text}') or .//div[contains(text(), '{text}')]] | //div[@role='button' and contains(., '{text}')]"
                    
                    popup_btn = WebDriverWait(self.driver, 3).until(
                        EC.presence_of_element_located((By.XPATH, popup_xpath))
                    )
                    popup_btn = WebDriverWait(self.driver, 3).until(
                        EC.element_to_be_clickable((By.XPATH, popup_xpath))
                    )
                    
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", popup_btn)
                    time.sleep(0.5)
                    
                    # Try multiple approaches to click
                    try:
                        popup_btn.click()
                    except Exception:
                        try:
                            self.driver.execute_script("arguments[0].click();", popup_btn)
                        except Exception:
                            ActionChains(self.driver).move_to_element(popup_btn).click().perform()
                    
                    logger.debug(f"Clicked '{text}' popup on attempt {attempt + 1}")
                    time.sleep(random.uniform(1, 2))
                    return True
                except (TimeoutException, NoSuchElementException):
                    logger.debug(f"No '{text}' popup found on attempt {attempt + 1}")
                except Exception as e:
                    logger.debug(f"Error handling popup: {str(e)}")
            time.sleep(1)
        
        logger.warning("No popup found after all attempts—proceeding")
        return False
    
    def solve_captcha(self) -> bool:
        """Solve reCAPTCHA challenges using 2Captcha"""
        try:
            # Check if reCAPTCHA iframe is present
            captcha_iframe = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//iframe[contains(@title, 'reCAPTCHA') or contains(@src, 'recaptcha')]"))
            )
            logger.info("reCAPTCHA detected, attempting to solve")
            
            # Get the sitekey
            sitekey = self.driver.find_element(By.CLASS_NAME, 'g-recaptcha').get_attribute('data-sitekey')
            page_url = self.driver.current_url
            logger.debug(f"Solving reCAPTCHA with sitekey: {sitekey}, URL: {page_url}")
            
            # Solve using 2Captcha
            solver = TwoCaptcha(self.twocaptcha_api_key)
            result = solver.recaptcha(sitekey=sitekey, url=page_url, invisible=True)
            code = result['code']
            
            # Apply the solution
            self.driver.execute_script(f'document.getElementById("g-recaptcha-response").innerHTML="{code}";')
            time.sleep(1)
            
            # Find and click the submit button
            submit_btn = WebDriverWait(self.driver, 5).until(
                EC.element_to_be_clickable((By.XPATH, "//button[@type='submit'] | //input[@type='submit']"))
            )
            submit_btn.click()
            
            # Wait for captcha to be processed
            time.sleep(random.uniform(5, 7))
            logger.info("reCAPTCHA solved successfully")
            return True
        except TimeoutException:
            logger.debug("No reCAPTCHA found, checking for security checkpoint...")
            
            # Check for security checkpoint
            try:
                checkpoint = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, "//h2[contains(text(), 'Help us confirm')] | //button[contains(text(), 'Send Code')]"))
                )
                logger.warning("Security checkpoint detected—requires manual intervention")
                
                # Wait for manual intervention
                for i in range(12):  # Wait up to 2 minutes (12 * 10 seconds)
                    logger.info(f"Waiting for manual checkpoint completion: {(i+1)*10}s of 120s")
                    time.sleep(10)
                    
                    if "accounts/login" not in self.driver.current_url and "checkpoint" not in self.driver.current_url:
                        logger.info("Security checkpoint appears to be resolved")
                        return True
                
                logger.error("Security checkpoint not resolved within timeout period")
                return False
                
            except TimeoutException:
                logger.debug("No security checkpoint found")
                return False
        except Exception as e:
            logger.error(f"Error solving captcha: {str(e)}")
            return False
    
    def login(self) -> bool:
        """Log in to Instagram using credentials"""
        try:
            logger.info("Attempting to log in to Instagram")
            
            # Navigate to login page
            self.driver.get('https://www.instagram.com/accounts/login/')
            time.sleep(random.uniform(2, 3))
            
            # Enter username
            username_field = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//input[@aria-label='Phone number, username, or email']")),
                "Username field not found"
            )
            self._type_humanly(username_field, self.username)
            
            # Enter password
            password_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//input[@aria-label='Password']")),
                "Password field not found"
            )
            self._type_humanly(password_field, self.password)
            
            # Click login button
            login_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[@type='submit']//div[contains(text(), 'Log')]")),
                "Login button not found"
            )
            login_button.click()
            
            # Wait for login process
            time.sleep(random.uniform(3, 5))
            
            # Check for captchas and security checkpoints
            self.solve_captcha()
            
            # Handle post-login popups
            self.handle_popup()
            
            # Verify login success
            try:
                WebDriverWait(self.driver, 15).until(
                    lambda d: "instagram.com/" in d.current_url and "accounts/login" not in d.current_url,
                    "Login verification failed"
                )
                logger.info("Successfully logged in to Instagram")
                
                # Save cookies for future sessions
                self.save_cookies()
                return True
            except TimeoutException:
                logger.error("Login verification failed")
                return False
                
        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            return False
    
    def _type_like_human(self, element, text, speed_multiplier=1.0, add_thinking_pauses=False):
        """Type text into an element with human-like delays and optional thinking pauses
        
        Args:
            element: Web element to type into
            text: Text to type
            speed_multiplier: Multiply typing speed by this factor (>1 = slower, <1 = faster)
            add_thinking_pauses: If True, add occasional longer pauses as if thinking
        """
        # Get typing speed from environment variables or use defaults
        min_delay = float(os.getenv("TYPING_SPEED_MIN", "0.05")) * speed_multiplier
        max_delay = float(os.getenv("TYPING_SPEED_MAX", "0.15")) * speed_multiplier
        
        # Keep track of words for potential thinking pauses
        current_word = ""
        word_count = 0
        
        for char in text:
            # Type the character
            element.send_keys(char)
            
            # Calculate delay between keystrokes
            if char in ['.', '!', '?', ',', ';', ':', '(', ')']:
                # Longer pauses after punctuation
                delay = random.uniform(max_delay * 1.5, max_delay * 3.0)
            else:
                # Normal typing delays
                delay = random.uniform(min_delay, max_delay)
                
            # Add to current word or reset on space/newline
            if char.isspace():
                word_count += 1
                current_word = ""
                
                # Add occasional thinking pauses between words
                if add_thinking_pauses and word_count > 0 and word_count % 8 == 0:
                    thinking_pause = random.uniform(1.0, 3.5)  # Longer pause every ~8 words
                    time.sleep(thinking_pause)
            else:
                current_word += char
                
            # Add occasional human errors and corrections (backspace) for longer messages
            if len(text) > 30 and len(current_word) > 3 and random.random() < 0.02:
                # Make a typo, then correct it
                element.send_keys(Keys.BACKSPACE)
                time.sleep(random.uniform(0.2, 0.5))
                element.send_keys(char)  # Type the correct character
                time.sleep(random.uniform(0.2, 0.4))  # Pause after correction
            
            # Apply the calculated delay
            time.sleep(delay)
    
    def recover_session(self) -> bool:
        """Recover the session if it was lost"""
        try:
            # Check if the driver is still active
            self.driver.current_url
            return True
        except (NoSuchWindowException, WebDriverException) as e:
            logger.warning(f"Browser session lost ({str(e)})—restarting")
            
            # Clean up old driver
            try:
                self.driver.quit()
            except Exception:
                pass
                
            # Start a new session
            self.setup_driver()
            
            # Try to restore session with cookies
            if self.load_cookies():
                self.driver.get('https://www.instagram.com/')
                time.sleep(3)
                self.handle_popup()
                logger.info("Session recovered with cookies")
                return True
                
            # If cookie restoration fails, try logging in
            elif self.login():
                self.driver.get('https://www.instagram.com/')
                time.sleep(3)
                self.handle_popup()
                logger.info("Session recovered with fresh login")
                return True
                
            else:
                logger.error("Could not recover session")
                return False
                
    def send_dm(self, target_username: str, message: str) -> bool:
        """Send a direct message to a specific Instagram user
        
        The message will be split into multiple parts with natural typing delays:
        1. Greeting with question
        2. Focus and offer
        3. Pitch and trial
        
        Args:
            target_username: Username to send message to
            message: Complete message text to be split into parts
            
        Returns:
            True if message was successfully sent, False otherwise
        """
        try:
            # Check if we need to rotate proxy before sending message
            self._rotate_proxy_if_needed()
            
            # Navigate to DM inbox
            inbox_url = 'https://www.instagram.com/direct/inbox/'
            logger.info(f"Navigating to DM inbox: {inbox_url}")
            self.driver.get(inbox_url)
            time.sleep(5)  # Wait for inbox to load
            self.handle_popup()
            
            # Verify inbox loaded
            try:
                inbox_title = WebDriverWait(self.driver, 20).until(
                    EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Messages')] | //div[contains(text(), 'Messages')]"))
                )
                logger.info("DM inbox loaded successfully")
            except TimeoutException:
                logger.error("Could not verify DM inbox—title element not found")
                return False
            
            # Click New Message button
            try:
                new_message_xpath = "//div[@role='button']//span[contains(text(), 'New message')] | //div[contains(text(), 'New Message')] | //button[contains(text(), 'New Message')]"
                new_message_btn = WebDriverWait(self.driver, 20).until(
                    EC.element_to_be_clickable((By.XPATH, new_message_xpath))
                )
                self.driver.execute_script("arguments[0].scrollIntoView(true);", new_message_btn)
                time.sleep(1)
                
                # Try multiple approaches to click the button
                try:
                    new_message_btn.click()
                except Exception:
                    try:
                        self.driver.execute_script("arguments[0].click();", new_message_btn)
                    except Exception:
                        ActionChains(self.driver).move_to_element(new_message_btn).click().perform()
                        
                logger.info("Clicked 'New Message' button")
                time.sleep(5)  # Wait for dialog to load
                self.handle_popup()
            except TimeoutException:
                logger.error("New Message button not found")
                return False
            
            # Search for user with @ symbol
            try:
                to_field = WebDriverWait(self.driver, 20).until(
                    EC.element_to_be_clickable((By.XPATH, "//input[@placeholder='Search...' or @aria-label='To' or @type='text']"))
                )
                to_field.click()
                self._type_like_human(to_field, f"@{target_username}")
                logger.info(f"Entered username @{target_username} in 'To:' field")
                time.sleep(5)  # Wait for search results
            except TimeoutException:
                logger.error("To: field not found")
                return False
            
            # Select the correct user from search results
            try:
                # Wait for search results
                user_results = WebDriverWait(self.driver, 20).until(
                    EC.presence_of_all_elements_located((By.XPATH, "//span[contains(@class, 'x1lliihq')] | //div[contains(@class, 'username')]" ))
                )
                
                # Find and click on the matching username
                target_found = False
                for user_result in user_results:
                    username_text = user_result.text.strip().lower()
                    if username_text == target_username.lower() or username_text == f"@{target_username.lower()}":
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", user_result)
                        time.sleep(1)
                        
                        # Try multiple approaches to click
                        try:
                            user_result.click()
                        except Exception:
                            try:
                                self.driver.execute_script("arguments[0].click();", user_result)
                            except Exception:
                                ActionChains(self.driver).move_to_element(user_result).click().perform()
                                
                        logger.info(f"Selected user @{target_username} from search results")
                        target_found = True
                        break
                
                if not target_found:
                    logger.error(f"User @{target_username} not found in search results")
                    return False
                    
            except TimeoutException:
                logger.error(f"No search results found for @{target_username}")
                return False
            
            # Click the Chat button to start conversation
            try:
                chat_btn = WebDriverWait(self.driver, 20).until(
                    EC.element_to_be_clickable((By.XPATH, "//div[@role='button' and contains(text(), 'Chat')] | //button[contains(text(), 'Chat')]"))
                )
                chat_btn.click()
                logger.info("Clicked 'Chat' button to start conversation")
                time.sleep(5)
                self.handle_popup()
            except TimeoutException:
                logger.error("Chat button not found")
                return False
            
            # Verify chat opened for correct user
            try:
                message_header = WebDriverWait(self.driver, 20).until(
                    EC.presence_of_element_located((By.XPATH, "//div[@role='button']//span[contains(@class, 'x1lliihq')]" ))
                )
                if message_header.text.strip().lower() != target_username.lower() and message_header.text.strip().lower() != f"@{target_username.lower()}":
                    logger.error(f"Wrong user in message window: {message_header.text}")
                    return False
                logger.info(f"Chat opened for user: {target_username}")
            except TimeoutException:
                logger.error("Message header not found—could not verify user")
                return False
            
            # Split the message into 3 parts for more natural conversation
            # This is a simplistic split - in a real implementation you might want to split on sentence boundaries
            words = message.split()
            third = len(words) // 3
            
            if third > 0:
                greeting = ' '.join(words[:third])
                focus_offer = ' '.join(words[third:third*2])
                pitch_trial = ' '.join(words[third*2:])
            else:
                # Message is too short to split meaningfully
                greeting = message
                focus_offer = ""
                pitch_trial = ""
            
            message_parts = {
                'greeting': greeting,
                'focus_offer': focus_offer,
                'pitch_trial': pitch_trial
            }
            
            # Find the message box once for all messages
            try:
                message_box = WebDriverWait(self.driver, 20).until(
                    EC.presence_of_element_located((By.XPATH, "//textarea[@placeholder='Message...']" ))
                )
            except TimeoutException:
                logger.error("Message box not found—could not send message")
                return False
            
            # PART 1: Send greeting with question
            if message_parts['greeting']:
                try:
                    # Simulate focusing on the message box
                    message_box.click()
                    time.sleep(random.uniform(1.0, 2.0))
                    
                    # Typing greeting with natural delay
                    self._type_like_human(message_box, message_parts['greeting'])
                    time.sleep(random.uniform(0.5, 1.5))
                    
                    # Send the first message
                    message_box.send_keys(Keys.RETURN)
                    time.sleep(random.uniform(3.0, 6.0))  # Slightly longer delay between message parts
                    
                    logger.info(f"Sent greeting to {target_username}")
                except Exception as e:
                    logger.error(f"Error sending greeting to {target_username}: {str(e)}")
                    return False
            
            # PART 2: Send focus and offer
            if message_parts['focus_offer']:
                try:
                    # Refocus on the message box
                    message_box.click()
                    time.sleep(random.uniform(1.0, 2.5))
                    
                    # Simulate looking at keyboard while typing (longer delay)
                    self._type_like_human(message_box, message_parts['focus_offer'], 
                                        speed_multiplier=random.uniform(0.9, 1.3))
                    time.sleep(random.uniform(0.8, 2.0))
                    
                    # Send the second message
                    message_box.send_keys(Keys.RETURN)
                    time.sleep(random.uniform(4.0, 8.0))  # Longer delay before final part
                    
                    logger.info(f"Sent focus/offer to {target_username}")
                except Exception as e:
                    logger.error(f"Error sending focus/offer to {target_username}: {str(e)}")
                    return False
            
            # PART 3: Send pitch and trial
            if message_parts['pitch_trial']:
                try:
                    # Refocus and appear to be thinking about final message
                    message_box.click()
                    time.sleep(random.uniform(2.0, 4.0))
                    
                    # Typing final part with natural thinking pauses
                    self._type_like_human(message_box, message_parts['pitch_trial'], 
                                        speed_multiplier=random.uniform(0.8, 1.2),
                                        add_thinking_pauses=True)
                    time.sleep(random.uniform(1.0, 2.0))
                    
                    # Send the final message
                    message_box.send_keys(Keys.RETURN)
                    time.sleep(random.uniform(1.5, 3.0))
                    
                    logger.info(f"Sent pitch/trial to {target_username}")
                except Exception as e:
                    logger.error(f"Error sending pitch/trial to {target_username}: {str(e)}")
                    return False
            
            # Save the username to processed list
            self._save_processed_user(target_username)
            
            logger.info(f"Successfully sent complete DM sequence to {target_username}")
            return True
                
        except Exception as e:
            logger.error(f"Unexpected error sending DM to {target_username}: {str(e)}")
            return False
