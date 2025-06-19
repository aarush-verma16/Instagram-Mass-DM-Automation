import os
import logging
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from typing import List, Optional
import random

logger = logging.getLogger(__name__)

class TinyLlamaGenerator:
    """Message generator using TinyLLama model."""
    
    def __init__(self, model_name: str = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"):
        """
        Initialize the TinyLlama message generator.
        
        Args:
            model_name: The name or path of the TinyLlama model to use
        """
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
    def load_model(self):
        """Load the TinyLlama model and tokenizer."""
        try:
            logger.info(f"Loading TinyLlama model: {self.model_name}")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            
            # Load in 8-bit mode if on CPU to reduce memory usage
            if self.device == "cpu":
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name, 
                    torch_dtype=torch.float16,
                    low_cpu_mem_usage=True
                )
            else:
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name,
                    torch_dtype=torch.float16,
                    device_map="auto"
                )
                
            logger.info(f"Model loaded successfully on {self.device}")
            return True
        except Exception as e:
            logger.error(f"Error loading TinyLlama model: {str(e)}")
            return False
    
    def generate_initial_message(self, username: str, context: Optional[dict] = None) -> str:
        """
        Generate an initial DM message for a username.
        
        Args:
            username: The Instagram username to send the message to
            context: Optional dictionary with additional context about the user
            
        Returns:
            Generated message string
        """
        if not self.model or not self.tokenizer:
            if not self.load_model():
                return self._fallback_initial_message(username)
        
        try:
            # Create a prompt for the model
            prompt = self._create_prompt(
                username=username,
                is_initial=True,
                context=context
            )
            
            # Generate the message
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=150,
                temperature=0.7,
                top_p=0.9,
                do_sample=True
            )
            
            message = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Extract just the message part from the response
            message = self._extract_message(message)
            
            return message
        except Exception as e:
            logger.error(f"Error generating message: {str(e)}")
            return self._fallback_initial_message(username)
    
    def generate_followup_message(self, username: str, context: Optional[dict] = None) -> str:
        """
        Generate a follow-up DM message for a username.
        
        Args:
            username: The Instagram username to send the message to
            context: Optional dictionary with additional context about the user
            
        Returns:
            Generated message string
        """
        if not self.model or not self.tokenizer:
            if not self.load_model():
                return self._fallback_followup_message(username)
        
        try:
            # Create a prompt for the model
            prompt = self._create_prompt(
                username=username,
                is_initial=False,
                context=context
            )
            
            # Generate the message
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=100,
                temperature=0.7,
                top_p=0.9,
                do_sample=True
            )
            
            message = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Extract just the message part from the response
            message = self._extract_message(message)
            
            return message
        except Exception as e:
            logger.error(f"Error generating follow-up message: {str(e)}")
            return self._fallback_followup_message(username)
    
    def _create_prompt(self, username: str, is_initial: bool = True, context: Optional[dict] = None) -> str:
        """Create a prompt for the model based on the username and context."""
        context_str = ""
        if context:
            context_str = f"Additional context about {username}: "
            context_str += ", ".join([f"{k}: {v}" for k, v in context.items()])
            context_str += "\n\n"
        
        if is_initial:
            prompt = f"""<|system|>
You're helping create personalized Instagram direct messages for an email marketing agency reaching out to potential coaching clients.
Write a friendly, professional initial message to Instagram user @{username}.
The message should:
1. Greet them with their username including the @ symbol
2. Ask how they're doing
3. Mention you noticed their coaching content
4. Ask if they use email marketing
5. Briefly mention you run an email marketing agency
6. Offer a one-week free trial
Keep the message conversational, not sales-y. Maximum 3-4 sentences.
{context_str}
</|system|>
