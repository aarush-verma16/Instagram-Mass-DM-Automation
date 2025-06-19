import time
import logging
import random
import requests
import threading
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class ProxyManager:
    """Manages proxy rotation for the Instagram automation"""
    
    def __init__(self, proxy_list: List[str] = None, rotation_interval: int = 1800):
        """
        Initialize the proxy manager.
        
        Args:
            proxy_list: List of proxies in format "ip:port:username:password" or "ip:port"
            rotation_interval: Time in seconds before rotating to a new proxy (default: 30 minutes)
        """
        self.proxy_list = proxy_list or []
        self.rotation_interval = rotation_interval
        self.current_proxy = None
        self.last_rotation = 0
        self.rotation_lock = threading.Lock()
        self.proxy_index = 0
        
        if self.proxy_list:
            self.current_proxy = self.proxy_list[0]
            self.last_rotation = time.time()
            
    def add_proxies(self, proxies: List[str]) -> None:
        """Add proxies to the proxy list."""
        with self.rotation_lock:
            self.proxy_list.extend(proxies)
            if not self.current_proxy and self.proxy_list:
                self.current_proxy = self.proxy_list[0]
                self.last_rotation = time.time()
    
    def clear_proxies(self) -> None:
        """Clear all proxies from the proxy list."""
        with self.rotation_lock:
            self.proxy_list = []
            self.current_proxy = None
    
    def get_proxy(self) -> Optional[Dict[str, str]]:
        """
        Get the current proxy in a format suitable for Selenium.
        
        Returns:
            Dict containing proxy settings or None if no proxy is configured
        """
        # Check if it's time to rotate
        self._check_rotation()
        
        if not self.current_proxy:
            return None
            
        parts = self.current_proxy.split(':')
        if len(parts) == 2:  # ip:port format
            proxy_dict = {
                'http': f'http://{parts[0]}:{parts[1]}',
                'https': f'http://{parts[0]}:{parts[1]}'
            }
        elif len(parts) >= 4:  # ip:port:username:password format
            proxy_dict = {
                'http': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}',
                'https': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}'
            }
        else:
            logger.warning(f"Invalid proxy format: {self.current_proxy}")
            return None
            
        return proxy_dict
        
    def get_selenium_proxy(self) -> str:
        """
        Get the current proxy in a format suitable for Selenium.
        
        Returns:
            String representation of proxy or empty string if no proxy
        """
        # Check if it's time to rotate
        self._check_rotation()
        
        if not self.current_proxy:
            return ""
            
        return self.current_proxy
        
    def rotate_proxy(self, force: bool = False) -> None:
        """
        Rotate to a new proxy from the list.
        
        Args:
            force: If True, rotate even if rotation interval hasn't elapsed
        """
        with self.rotation_lock:
            current_time = time.time()
            
            if not force and current_time - self.last_rotation < self.rotation_interval:
                return
                
            if not self.proxy_list:
                logger.warning("No proxies available for rotation")
                self.current_proxy = None
                return
                
            # Choose the next proxy in the list
            self.proxy_index = (self.proxy_index + 1) % len(self.proxy_list)
            self.current_proxy = self.proxy_list[self.proxy_index]
            self.last_rotation = current_time
            
            logger.info(f"Rotated to new proxy: {self.current_proxy.split(':')[0]}")
    
    def _check_rotation(self) -> None:
        """Check if it's time to rotate the proxy and do so if needed."""
        current_time = time.time()
        if current_time - self.last_rotation >= self.rotation_interval:
            self.rotate_proxy()
            
    def test_proxy(self, proxy: str) -> bool:
        """
        Test if a proxy is working by making a request to a test URL.
        
        Args:
            proxy: Proxy string in format "ip:port:username:password" or "ip:port"
            
        Returns:
            True if proxy is working, False otherwise
        """
        parts = proxy.split(':')
        try:
            if len(parts) == 2:  # ip:port format
                proxy_dict = {
                    'http': f'http://{parts[0]}:{parts[1]}',
                    'https': f'http://{parts[0]}:{parts[1]}'
                }
            elif len(parts) >= 4:  # ip:port:username:password format
                proxy_dict = {
                    'http': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}',
                    'https': f'http://{parts[2]}:{parts[3]}@{parts[0]}:{parts[1]}'
                }
            else:
                logger.warning(f"Invalid proxy format: {proxy}")
                return False
                
            # Try to connect to a test URL with a short timeout
            response = requests.get('https://www.google.com', 
                                   proxies=proxy_dict, 
                                   timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Proxy test failed for {proxy}: {str(e)}")
            return False
