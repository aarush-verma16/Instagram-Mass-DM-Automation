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

<|human|>
Write an initial DM for @{username}.
</|human|>

<|assistant|>
"""
        else:
            prompt = f"""<|system|>
You're helping create personalized Instagram direct messages for an email marketing agency following up with potential coaching clients.
Write a friendly, professional follow-up message to Instagram user @{username} who didn't respond to the initial outreach.
The message should:
1. Greet them with their username including the @ symbol
2. Mention this is a follow-up to your previous message
3. Remind them about your email marketing services
4. Offer the one-week free trial again
Keep it brief, friendly and not pushy. Maximum 2-3 sentences.
{context_str}
</|system|>

<|human|>
Write a follow-up DM for @{username}.
</|human|>

<|assistant|>
"""
        
        return prompt
    
    def _extract_message(self, full_response: str) -> str:
        """Extract the actual message from the model response."""
        # Find where the assistant response starts
        if "<|assistant|>" in full_response:
            message = full_response.split("<|assistant|>")[1].strip()
        else:
            # Fall back to returning everything after the prompt
            message = full_response.split("</|human|>")[-1].strip()
        
        # Clean up any trailing tokens
        if "<|" in message:
            message = message.split("<|")[0].strip()
        
        return message

    def _fallback_initial_message(self, username: str) -> str:
        """Generate a fallback initial message if model generation fails."""
        greetings = [f"Hi @{username}", f"Hey @{username}", f"Hello @{username}"]
        questions = ["how are you doing?", "hope you're doing well!", "how's everything going?"]
        focus = ["I noticed your coaching content and was curious", 
                 "Your coaching page caught my attention"]
        offer = ["if you're using email marketing to promote it.",
                 "whether email marketing is part of your strategy."]
        pitch = ["I run an email marketing agency and could send you some info about our services.",
                 "My agency focuses on email campaigns, and I'd like to share how we can help."]
        trial = ["How about a 1-week free trial to see the value we bring?",
                 "Would you be interested in a 1-week free trial?"]
        
        message = (f"{random.choice(greetings)} {random.choice(questions)} "
                   f"{random.choice(focus)} {random.choice(offer)} "
                   f"{random.choice(pitch)} {random.choice(trial)}")
        return message

    def _fallback_followup_message(self, username: str) -> str:
        """Generate a fallback follow-up message if model generation fails."""
        followups = [f"Hey @{username}, just following up!", 
                    f"Hi @{username}, checking in again!"]
        reminders = ["I reached out earlier about my email marketing services.",
                    "I messaged you before about supporting your coaching with email."]
        nudges = ["Would you be up for a 1-week free trial?",
                  "How about trying our services free for a week?"]
        
        message = (f"{random.choice(followups)} {random.choice(reminders)} "
                   f"{random.choice(nudges)}")
        return message
