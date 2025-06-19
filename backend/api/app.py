import os
import time
import logging
import uvicorn
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path
from dotenv import load_dotenv

from ..controllers.automation_controller import AutomationController

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Instagram DM Automation API",
    description="API for Instagram DM automation with TinyLlama",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the automation controller
controller = None

# Pydantic models for requests and responses
class StatusResponse(BaseModel):
    status: str
    active: bool
    processed: int
    total: int
    errors: int
    current_username: str
    duration_seconds: int
    max_dms_per_day: int

class CampaignResponse(BaseModel):
    success: bool
    message: str

class Settings(BaseModel):
    max_dms_per_day: int
    delay_between_dms: int
    use_proxies: bool
    proxy_rotation_interval: int

@app.on_event("startup")
async def startup_event():
    """Initialize the controller when the API starts"""
    global controller
    try:
        logger.info("Initializing automation controller")
        controller = AutomationController()
    except Exception as e:
        logger.error(f"Failed to initialize controller: {str(e)}")

@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint for API health check"""
    return {"status": "API is running"}

@app.post("/initialize", response_model=CampaignResponse)
async def initialize_automation():
    """Initialize the automation system"""
    global controller
    try:
        if not controller:
            controller = AutomationController()
        
        success = controller.initialize()
        return {
            "success": success,
            "message": "Automation initialized successfully" if success else "Failed to initialize automation"
        }
    except Exception as e:
        logger.error(f"Error initializing automation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/campaign/start", response_model=CampaignResponse)
async def start_campaign():
    """Start the DM automation campaign"""
    global controller
    try:
        if not controller:
            return {
                "success": False,
                "message": "Controller not initialized. Call /initialize first."
            }
            
        success = controller.start_campaign()
        return {
            "success": success,
            "message": "Campaign started successfully" if success else "Failed to start campaign"
        }
    except Exception as e:
        logger.error(f"Error starting campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/campaign/stop", response_model=CampaignResponse)
async def stop_campaign():
    """Stop the active DM campaign"""
    global controller
    try:
        if not controller:
            return {
                "success": False,
                "message": "Controller not initialized. Call /initialize first."
            }
            
        success = controller.stop_campaign()
        return {
            "success": success,
            "message": "Campaign stopped successfully" if success else "No active campaign to stop"
        }
    except Exception as e:
        logger.error(f"Error stopping campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/campaign/status", response_model=StatusResponse)
async def get_campaign_status():
    """Get the current status of the campaign"""
    global controller
    try:
        if not controller:
            raise HTTPException(status_code=400, detail="Controller not initialized. Call /initialize first.")
            
        status = controller.get_status()
        return status
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/upload/csv")
async def upload_csv(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload a CSV file with Instagram usernames"""
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        
        # Save the uploaded file
        file_path = upload_dir / "usernames.csv"
        with open(file_path, "wb") as f:
            contents = await file.read()
            f.write(contents)
        
        # Update environment variable
        os.environ["CSV_FILE_PATH"] = str(file_path)
        
        # If controller exists, update its CSV file path
        global controller
        if controller:
            controller.csv_file_path = str(file_path)
            
        return {
            "success": True,
            "message": "CSV file uploaded successfully",
            "file_name": file.filename,
            "file_path": str(file_path)
        }
    except Exception as e:
        logger.error(f"Error uploading CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/settings", response_model=Settings)
async def get_settings():
    """Get current settings"""
    try:
        return {
            "max_dms_per_day": int(os.getenv("MAX_DMS_PER_DAY", "20")),
            "delay_between_dms": int(os.getenv("DELAY_BETWEEN_DMS", "120")),
            "use_proxies": os.getenv("USE_PROXIES", "false").lower() == "true",
            "proxy_rotation_interval": int(os.getenv("PROXY_ROTATION_INTERVAL", "1800"))
        }
    except Exception as e:
        logger.error(f"Error getting settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.post("/settings", response_model=Settings)
async def update_settings(settings: Settings):
    """Update settings"""
    try:
        # Update environment variables in memory
        os.environ["MAX_DMS_PER_DAY"] = str(settings.max_dms_per_day)
        os.environ["DELAY_BETWEEN_DMS"] = str(settings.delay_between_dms)
        os.environ["USE_PROXIES"] = str(settings.use_proxies).lower()
        os.environ["PROXY_ROTATION_INTERVAL"] = str(settings.proxy_rotation_interval)
        
        # Update controller settings if it exists
        global controller
        if controller:
            controller.max_dms_per_day = settings.max_dms_per_day
            controller.delay_between_dms = settings.delay_between_dms
            if hasattr(controller, 'instagram_service') and controller.instagram_service:
                controller.instagram_service.use_proxies = settings.use_proxies
                if hasattr(controller.instagram_service, 'proxy_manager'):
                    controller.instagram_service.proxy_manager.rotation_interval = settings.proxy_rotation_interval
        
        return settings
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/logs/{log_type}")
async def get_logs(log_type: str, lines: int = 100):
    """Get logs of a specific type (sent_dm, error, or api)"""
    try:
        log_file = None
        
        if log_type == "sent_dm":
            log_file = os.getenv("SENT_DM_LOG", "sent_dm_log.txt")
        elif log_type == "error":
            log_file = os.getenv("ERROR_LOG", "error_log.txt")
        elif log_type == "api":
            log_file = "api.log"
        elif log_type == "automation":
            log_file = "automation.log"
        else:
            raise HTTPException(status_code=400, detail="Invalid log_type. Must be 'sent_dm', 'error', 'api', or 'automation'")
        
        if not os.path.exists(log_file):
            return {"logs": []}
        
        # Read the last N lines from the log file
        with open(log_file, "r") as f:
            all_lines = f.readlines()
            log_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
        
        return {"logs": log_lines}
    except Exception as e:
        logger.error(f"Error getting logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

def start():
    """Start the FastAPI server"""
    uvicorn.run(
        "backend.api.app:app",
        host=os.getenv("SERVER_HOST", "0.0.0.0"),
        port=int(os.getenv("SERVER_PORT", "8000")),
        reload=True
    )

if __name__ == "__main__":
    start()
