import pandas as pd
import re
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(levelname)s - %(message)s',
                   filename='instagram_bot.log')

class CSVParser:
    def __init__(self, file_path):
        """Initialize the CSV parser with the file path."""
        self.file_path = Path(file_path)
        self.logger = logging.getLogger(__name__)
        
    def get_usernames(self):
        """Extract and clean usernames from the CSV file."""
        try:
            if not self.file_path.exists():
                self.logger.error(f"CSV file not found: {self.file_path}")
                return []
                
            # Try to read the CSV file
            data = pd.read_csv(self.file_path)
            
            # Check for different possible column names for usernames
            username_columns = ['username', 'Username', 'user', 'User', 'instagram_username', 'Instagram']
            found_column = None
            
            for col in username_columns:
                if col in data.columns:
                    found_column = col
                    break
                    
            if not found_column:
                self.logger.error(f"No username column found in CSV. Available columns: {data.columns.tolist()}")
                return []
                
            # Extract and clean usernames
            def clean_username(username):
                if pd.isna(username):
                    return None
                
                # Remove '@' prefix if present
                username = str(username).strip()
                if username.startswith('@'):
                    username = username[1:]
                
                # Remove 'Instagram · ' prefix and trim whitespace
                cleaned = re.sub(r'Instagram\s*·\s*', '', username).strip()
                
                # Remove any URLs, only keep the username part
                cleaned = re.sub(r'https?://(?:www\.)?instagram\.com/([\w._]+)/?.*', r'\1', cleaned)
                
                return cleaned if cleaned else None
                
            usernames = data[found_column].apply(clean_username).dropna().tolist()
            self.logger.info(f"Extracted {len(usernames)} usernames from CSV at {self.file_path}")
            return usernames
            
        except Exception as e:
            self.logger.error(f"Error parsing CSV file: {str(e)}")
            return []
    
    def add_usernames(self, usernames):
        """Add new usernames to the CSV file or create it if it doesn't exist."""
        try:
            if self.file_path.exists():
                # Read existing data
                data = pd.read_csv(self.file_path)
                
                # Find username column
                username_columns = ['username', 'Username', 'user', 'User', 'instagram_username', 'Instagram']
                found_column = None
                
                for col in username_columns:
                    if col in data.columns:
                        found_column = col
                        break
                
                if not found_column:
                    found_column = 'username'
                    data[found_column] = []
                
                # Add new usernames
                existing = set(data[found_column].dropna().astype(str).tolist())
                new_data = pd.DataFrame({found_column: [u for u in usernames if u not in existing]})
                data = pd.concat([data, new_data], ignore_index=True)
            else:
                # Create new CSV
                data = pd.DataFrame({'username': usernames})
            
            # Save data
            data.to_csv(self.file_path, index=False)
            self.logger.info(f"Added {len(usernames)} usernames to CSV at {self.file_path}")
            return True
        except Exception as e:
            self.logger.error(f"Error adding usernames to CSV: {str(e)}")
            return False
