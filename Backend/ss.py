from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import os
import requests
import logging
from pathlib import Path
from dotenv import load_dotenv
import math
import subprocess
import uuid
import time
import openai
import shlex
from PIL import Image as PILImage
from collections import defaultdict
import datetime

# Update logging configuration at the top
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('video_generation.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create directories
IMAGES_DIR = Path("static/images")
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

AUDIO_DIR = Path("static/audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

VIDEOS_DIR = Path("static/videos")
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

FONTS_DIR = Path("static/fonts")
FONTS_DIR.mkdir(parents=True, exist_ok=True)

# Video settings
VIDEO_ORIENTATIONS = {
    "horizontal": {
        "width": 1920,
        "height": 1080,
    },
    "vertical": {
        "width": 1080,
        "height": 1920,
    }
}

VIDEO_QUALITY = "high"  # Options: low, medium, high

# Font settings for captions
FONT_FILE = "OpenSans-Bold.ttf"
FONT_PATH = str(FONTS_DIR / FONT_FILE)

# Caption settings for different orientations
CAPTION_SETTINGS = {
    "horizontal": {
        "font_size": 48,
        "y_position": "(h-text_h-100)",  # 100 pixels from bottom
        "max_width": "w*0.9",     # 90% of video width
        "line_spacing": 20,
        "box_opacity": 0.8,
        "box_padding": 15,
        "font_color": "white",
        "border_width": 3,
        "border_color": "black@0.9"
    },
    "vertical": {
        "font_size": 52,          # Larger font for vertical videos
        "y_position": "(h-text_h-150)",  # 150 pixels from bottom
        "max_width": "w*0.95",    # 95% of video width for vertical
        "line_spacing": 22,
        "box_opacity": 0.85,
        "box_padding": 20,
        "font_color": "white",
        "border_width": 3,
        "border_color": "black@0.9"
    }
}

# Track video generations per IP
video_generations = defaultdict(list)
MAX_GENERATIONS_PER_IP = 2

def escape_text_for_ffmpeg(text):
    """Properly escape text for FFmpeg drawtext filter"""
    # Replace problematic characters
    escaped = text.replace("'", "'\\\\\\''")  # Escape single quotes
    escaped = escaped.replace(":", "\\:")      # Escape colons
    escaped = escaped.replace(",", "\\,")      # Escape commas
    escaped = escaped.replace("[", "\\[")      # Escape square brackets
    escaped = escaped.replace("]", "\\]")
    return escaped

def format_caption_text(text, max_chars=50):
    """Format caption text into lines with proper breaks"""
    words = text.split()
    lines = []
    current_line = []
    current_length = 0
    
    for word in words:
        if current_length + len(word) + 1 <= max_chars:
            current_line.append(word)
            current_length += len(word) + 1
        else:
            if current_line:  # Only add non-empty lines
                lines.append(" ".join(current_line))
            current_line = [word]
            current_length = len(word)
    
    if current_line:
        lines.append(" ".join(current_line))
    
    # Escape each line and join with literal \n for FFmpeg
    return "\\n".join(escape_text_for_ffmpeg(line) for line in lines)

# Check for FFmpeg installation
try:
    subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
    logger.info("FFmpeg found and working")
except (subprocess.CalledProcessError, FileNotFoundError):
    logger.error("FFmpeg not found. Please install FFmpeg first.")
    raise RuntimeError("FFmpeg not found. Please install FFmpeg first.")

# Deepgram API Key
DEEPGRAM_API_KEY = "1195c1dd285413e0471756a171b9b8571df8908a"

app = FastAPI(title="Image Generation API")

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageRequest(BaseModel):
    prompt: str

class TextToSpeechRequest(BaseModel):
    text: str

def get_image_dimensions(image_path):
    """Get the dimensions of an image file"""
    with PILImage.open(image_path) as img:
        return img.size

def download_image(url: str, filename: str) -> str:
    """Download image and return local path"""
    filepath = IMAGES_DIR / filename
    response = requests.get(url)
    response.raise_for_status()
    
    with open(filepath, "wb") as f:
        f.write(response.content)
    
    return f"/static/images/{filename}"

def save_scene_info(scene_number: str, image_path: str, audio_path: str):
    """Save scene information to a report file"""
    report_file = Path("static/scene_report.txt")
    
    # Convert paths to proper format
    if image_path and not image_path.startswith('/'):
        image_path = f"/static/images/{image_path}"
    if audio_path and not audio_path.startswith('/'):
        audio_path = f"/static/audio/{audio_path}"
    
    # Read existing content
    content = ""
    if report_file.exists():
        with open(report_file, "r") as f:
            content = f.read()
    
    # Split into sections and filter out empty sections
    sections = [s.strip() for s in content.split("-" * 50) if s.strip()]
    
    # Create a dictionary of existing scenes
    scene_dict = {}
    for section in sections:
        lines = section.strip().split("\n")
        if lines and lines[0].startswith("Scene"):
            curr_scene = lines[0].split()[1].strip(":")
            scene_dict[curr_scene] = {
                "image": lines[1].replace("Image: ", ""),
                "audio": lines[2].replace("Audio: ", "")
            }
    
    # Update or add new scene
    if scene_number in scene_dict:
        if image_path:
            scene_dict[scene_number]["image"] = image_path
        if audio_path:
            scene_dict[scene_number]["audio"] = audio_path
    else:
        scene_dict[scene_number] = {
            "image": image_path,
            "audio": audio_path
        }
    
    # Sort scenes by number and create new content
    sorted_scenes = sorted(scene_dict.keys(), key=lambda x: int(x))
    new_content = []
    
    for scene in sorted_scenes:
        new_content.extend([
            f"Scene {scene}:",
            f"Image: {scene_dict[scene]['image']}",
            f"Audio: {scene_dict[scene]['audio']}"
        ])
        new_content.append("-" * 50)
    
    # Write back to file
    with open(report_file, "w") as f:
        f.write("\n".join(new_content) + "\n")

    logger.info(f"Scene report updated for scene {scene_number}")

def get_scene_paths(scene_number: str) -> tuple:
    """Get image and audio paths for a scene from the report"""
    report_file = Path("static/scene_report.txt")
    
    if not report_file.exists():
        raise Exception("Scene report file not found")
        
    with open(report_file, "r") as f:
        content = f.read()
        
    # Find the section for this scene
    scene_marker = f"Scene {scene_number}:"
    sections = content.split("-" * 50)
    
    for section in sections:
        if scene_marker in section:
            lines = section.strip().split("\n")
            image_path = lines[1].replace("Image: ", "")
            audio_path = lines[2].replace("Audio: ", "")
            return image_path, audio_path
            
    raise Exception(f"Scene {scene_number} not found in report")

@app.post("/generate-image")
async def generate_image(request: ImageRequest):
    try:
        logger.info(f"Received prompt: {request.prompt}")
        
        # Extract scene number
        scene_number = '1'
        if 'Scene' in request.prompt:
            try:
                scene_text = request.prompt.split('Scene')[1].strip()
                scene_number = scene_text.split()[0]
            except:
                pass

        # Generate random filename
        filename = f"image_{uuid.uuid4()}.webp"
        filepath = IMAGES_DIR / filename
        
        # Generate image using OpenAI DALL-E
        try:
            response = requests.post(
                "https://api.openai.com/v1/images/generations",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "dall-e-2",
                    "prompt": request.prompt,
                    "n": 1,
                    "size": "1024x1024",
                    "response_format": "url"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"DALL-E API error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to generate image with DALL-E")
                
            result = response.json()
            image_url = result['data'][0]['url']
            
            # Download and save the image
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            
            with open(filepath, "wb") as f:
                f.write(image_response.content)
                
            logger.info(f"Image saved locally at: {filepath}")
            
            local_url = f"/static/images/{filename}"
            try:
                save_scene_info(scene_number, filename, "")
                logger.info(f"Scene {scene_number} info saved to report")
            except Exception as e:
                logger.error(f"Error saving scene info: {str(e)}")

            return JSONResponse({
                "imageUrl": f"http://localhost:8000/static/images/{filename}",
                "imagePath": f"/static/images/{filename}"
            })

        except Exception as e:
            logger.error(f"Error with DALL-E API: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-voice")
async def generate_voice(request: TextToSpeechRequest):
    try:
        # Extract scene number
        scene_number = '1'
        if 'Scene' in request.text:
            try:
                scene_text = request.text.split('Scene')[1].strip()
                scene_number = scene_text.split()[0]
            except:
                pass

        # Generate filename for this scene's audio
        filename = f"audio_scene{scene_number}_{uuid.uuid4()}.mp3"
        filepath = AUDIO_DIR / filename

        # Extract the voiceover text
        voiceover_text = request.text
        if 'Voiceover\n' in voiceover_text:
            voiceover_text = voiceover_text.split('Voiceover\n')[1].strip()
        else:
            voiceover_text = request.text

        # Setup Deepgram request
        DEEPGRAM_URL = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
        headers = {
            "Authorization": f"Token {DEEPGRAM_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Generate and save audio
        with open(filepath, 'wb') as file_stream:
            response = requests.post(
                DEEPGRAM_URL, 
                headers=headers, 
                json={"text": voiceover_text}, 
                stream=True
            )
            
            if not response.ok:
                logger.error(f"Deepgram API error: {response.text}")
                raise HTTPException(status_code=500, detail="Failed to generate audio")

            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    file_stream.write(chunk)

        logger.info(f"Audio saved for scene {scene_number} as {filename}")

        # Update scene information with audio path
        try:
            # Get existing scene info
            image_path, _ = get_scene_paths(scene_number)
            # Update audio path
            save_scene_info(
                scene_number=scene_number,
                image_path=image_path.split('/')[-1] if image_path else "",
                audio_path=filename
            )
            logger.info(f"Scene {scene_number} updated with audio: {filename}")
        except Exception as e:
            logger.error(f"Could not update scene report: {str(e)}")
            raise

        return JSONResponse({
            "audioUrl": f"http://localhost:8000/static/audio/{filename}",
            "audioPath": f"/static/audio/{filename}",
            "sceneNumber": scene_number
        })

    except Exception as e:
        logger.error(f"Error generating voice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Add this function for detailed error logging
def log_ffmpeg_error(error: subprocess.CalledProcessError, stage: str):
    """Log detailed FFmpeg error information"""
    logger.error(f"FFmpeg error during {stage}:")
    logger.error(f"Command that failed: {' '.join(error.cmd)}")
    logger.error(f"Error output: {error.stderr.decode() if error.stderr else 'No error output'}")
    logger.error(f"Standard output: {error.stdout.decode() if error.stdout else 'No standard output'}")
    logger.error(f"Return code: {error.returncode}")

# Add this helper function at the top level, after the other utility functions
def extract_seconds(time_str):
    """Extract seconds from a time string that might include 'seconds' or other text"""
    # Remove "seconds" and any other non-digit characters
    return int(''.join(filter(str.isdigit, time_str)))

def can_generate_video(ip_address: str) -> bool:
    """Check if an IP can generate more videos"""
    today = datetime.datetime.now().date()
    # Clean up old entries
    video_generations[ip_address] = [
        timestamp for timestamp in video_generations[ip_address]
        if timestamp.date() == today
    ]
    return len(video_generations[ip_address]) < MAX_GENERATIONS_PER_IP

@app.post("/generate-video")
async def generate_video(request: Request):
    try:
        client_ip = request.client.host
        data = await request.json()
        is_recreate = data.get("isRecreate", False)
        
        if not is_recreate and not can_generate_video(client_ip):
            raise HTTPException(
                status_code=429,
                detail="Daily video generation limit reached. You can still recreate existing videos."
            )
            
        scenes = data.get("scenes", [])
        orientation = data.get("orientation", "horizontal")
        
        if not scenes:
            raise HTTPException(status_code=400, detail="No scenes provided")
            
        logger.info(f"Starting video generation with {len(scenes)} scenes")
        logger.info(f"Video orientation: {orientation}")
        
        # Get video dimensions based on orientation
        video_config = VIDEO_ORIENTATIONS[orientation]
        width = video_config["width"]
        height = video_config["height"]
        
        # Process scenes and generate final video
        output_video = process_scenes(scenes, orientation)
        
        if not os.path.exists(output_video):
            raise HTTPException(status_code=500, detail="Failed to generate video")
            
        # Calculate total duration safely
        total_duration = 0
        for scene in scenes:
            try:
                if isinstance(scene, dict) and 'time' in scene:
                    time_parts = scene['time'].split('-')
                    if len(time_parts) == 2:
                        start = extract_seconds(time_parts[0])
                        end = extract_seconds(time_parts[1])
                        total_duration += (end - start)
                    else:
                        total_duration += 5  # Default duration if time format is invalid
                else:
                    total_duration += 5  # Default duration if time is missing
            except (ValueError, IndexError):
                total_duration += 5  # Default duration if parsing fails
        
        # Prepare response with video details
        video_details = {
            "resolution": f"{width}x{height}",
            "quality": "High",
            "scenes": len(scenes),
            "hasCaptions": any(scene.get("voiceover") for scene in scenes),
            "duration": total_duration,
            "orientation": orientation
        }
        
        logger.info("Video generation completed successfully")
        logger.info(f"Video details: {video_details}")
        
        # Track generation if not a recreation
        if not is_recreate:
            video_generations[client_ip].append(datetime.datetime.now())
        
        # Fix the video URL to include the full server URL
        video_filename = os.path.basename(output_video)
        return {
            "videoUrl": f"http://localhost:8000/static/videos/{video_filename}",
            "details": video_details,
            "remainingGenerations": MAX_GENERATIONS_PER_IP - len(video_generations[client_ip])
        }
        
    except Exception as e:
        logger.error(f"Error generating video: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def process_scenes(scenes, orientation):
    """Process scenes and generate final video"""
    import shutil
    
    try:
        # Create directories
        videos_dir = Path("static/videos")
        temp_dir = videos_dir / "temp"
        videos_dir.mkdir(exist_ok=True)
        temp_dir.mkdir(exist_ok=True)
        
        logger.info("Created temporary directories for video processing")
        
        # Generate unique video filename
        video_id = uuid.uuid4()
        timestamp = int(time.time())
        video_filename = f"video_{timestamp}_{video_id}_{orientation}.mp4"
        video_path = videos_dir / video_filename
        
        # Get video dimensions
        video_config = VIDEO_ORIENTATIONS[orientation]
        VIDEO_WIDTH = video_config["width"]
        VIDEO_HEIGHT = video_config["height"]
        
        scene_videos = []
        
        # Process each scene
        for i, scene in enumerate(scenes, 1):
            logger.info(f"Processing scene {i}/{len(scenes)}")
            try:
                # Validate required scene properties
                if not isinstance(scene, dict):
                    raise ValueError(f"Scene {i} is not a valid dictionary")
                
                if 'time' not in scene:
                    logger.warning(f"Scene {i} missing time property, using default duration")
                    scene['time'] = "0-5"  # Default 5 second duration
                
                # Get paths from scene data
                image_url = scene.get('imageUrl', '')
                audio_url = scene.get('audioUrl', '')
                voiceover = scene.get('voiceover', '')
                
                if not image_url or not audio_url:
                    raise ValueError(f"Scene {i} missing required image or audio URL")
                
                # Convert URLs to local paths
                image_path = image_url.replace('http://localhost:8000', '')
                audio_path = audio_url.replace('http://localhost:8000', '')
                
                # Convert to Path objects
                local_image_path = Path(image_path.lstrip('/'))
                local_audio_path = Path(audio_path.lstrip('/'))
                
                if not local_image_path.exists():
                    raise Exception(f"Image file not found: {image_path}")
                if not local_audio_path.exists():
                    raise Exception(f"Audio file not found: {audio_path}")
                
                # Parse time safely
                try:
                    time_parts = scene['time'].split('-')
                    start = extract_seconds(time_parts[0])
                    end = extract_seconds(time_parts[1])
                    duration = end - start
                    if duration <= 0:
                        logger.warning(f"Scene {i} has invalid duration, using default")
                        duration = 5
                except (IndexError, ValueError) as e:
                    logger.warning(f"Scene {i} has invalid time format, using default duration: {e}")
                    duration = 5
                
                # Get image dimensions
                img_width, img_height = get_image_dimensions(local_image_path)
                
                # Calculate scaling and padding with improved logic
                target_ratio = VIDEO_WIDTH / VIDEO_HEIGHT
                img_ratio = img_width / img_height
                
                if orientation == "horizontal":
                    # For horizontal videos (16:9)
                    if img_ratio > target_ratio:
                        # Image is wider than target ratio
                        scale_width = VIDEO_WIDTH
                        scale_height = int(VIDEO_WIDTH / img_ratio)
                        pad_x = 0
                        pad_y = (VIDEO_HEIGHT - scale_height) // 2
                    else:
                        # Image is taller than target ratio
                        scale_height = VIDEO_HEIGHT
                        scale_width = int(VIDEO_HEIGHT * img_ratio)
                        pad_x = (VIDEO_WIDTH - scale_width) // 2
                        pad_y = 0
                else:
                    # For vertical videos (9:16)
                    target_height = VIDEO_HEIGHT
                    target_width = VIDEO_WIDTH
                    
                    # Calculate dimensions to fit within target while maintaining aspect ratio
                    if img_ratio > (target_width / target_height):
                        # Image is relatively wider
                        scale_width = target_width
                        scale_height = int(target_width / img_ratio)
                        pad_x = 0
                        pad_y = (target_height - scale_height) // 2
                    else:
                        # Image is relatively taller
                        scale_height = target_height
                        scale_width = int(target_height * img_ratio)
                        pad_x = (target_width - scale_width) // 2
                        pad_y = 0
                
                # Create video from image
                scene_video = temp_dir / f"scene_{i}.mp4"
                
                # Update the FFmpeg command for better quality
                img_cmd = [
                    'ffmpeg', '-y',
                    '-loop', '1',
                    '-i', str(local_image_path),
                    '-c:v', 'libx264',
                    '-t', str(duration),
                    '-pix_fmt', 'yuv420p',
                    '-vf', (
                        f'scale={scale_width}:{scale_height}:force_original_aspect_ratio=decrease,'
                        f'pad={VIDEO_WIDTH}:{VIDEO_HEIGHT}:{pad_x}:{pad_y}:color=black,'
                        'format=yuv420p'
                    ),
                    '-preset', 'slow',
                    '-crf', '18',  # Lower CRF for better quality (range 0-51, lower is better)
                    str(scene_video)
                ]
                
                logger.info(f"Scene {i}: Creating base video from image")
                try:
                    subprocess.run(img_cmd, check=True, capture_output=True)
                    logger.info(f"Scene {i}: Base video created successfully")
                except subprocess.CalledProcessError as e:
                    log_ffmpeg_error(e, f"scene {i} image to video conversion")
                    raise
                
                # Add audio to video
                scene_with_audio = temp_dir / f"scene_{i}_with_audio.mp4"
                audio_cmd = [
                    'ffmpeg', '-y',
                    '-i', str(scene_video),
                    '-i', str(local_audio_path),
                    '-c:v', 'copy',
                    '-c:a', 'aac',
                    '-b:a', '192k',
                    str(scene_with_audio)
                ]
                
                logger.info(f"Scene {i}: Adding audio")
                try:
                    subprocess.run(audio_cmd, check=True, capture_output=True)
                    logger.info(f"Scene {i}: Audio added successfully")
                except subprocess.CalledProcessError as e:
                    log_ffmpeg_error(e, f"scene {i} audio addition")
                    raise
                
                # Add captions if voiceover exists
                if voiceover:
                    logger.info(f"Scene {i}: Adding captions")
                    caption_video = temp_dir / f"scene_{i}_with_caption.mp4"
                    
                    # Format and escape caption text
                    formatted_caption = format_caption_text(voiceover)
                    
                    # Get caption settings for current orientation
                    caption_config = CAPTION_SETTINGS[orientation]
                    
                    # Create improved drawtext filter with better positioning and styling
                    caption_filter = (
                        f"drawtext=fontfile={FONT_PATH}:"
                        f"text='{formatted_caption}':"
                        f"fontcolor={caption_config['font_color']}:"
                        f"fontsize={caption_config['font_size']}:"
                        f"line_spacing={caption_config['line_spacing']}:"
                        f"x=(w-text_w)/2:"  # Center horizontally
                        f"y={caption_config['y_position']}:"  # Position from bottom
                        f"box=1:"
                        f"boxcolor=black@{caption_config['box_opacity']}:"
                        f"boxborderw={caption_config['box_padding']}:"
                        f"bordercolor={caption_config['border_color']}:"
                        f"borderw={caption_config['border_width']}:"
                        f"fix_bounds=true:"
                        f"shadowcolor=black@0.7:"  # Add shadow for better readability
                        f"shadowx=2:"
                        f"shadowy=2:"
                        f"expansion=normal"
                    )
                    
                    try:
                        drawtext_cmd = [
                            'ffmpeg', '-y',
                            '-i', str(scene_with_audio),
                            '-vf', caption_filter,
                            '-codec:a', 'copy',
                            str(caption_video)
                        ]
                        
                        subprocess.run(drawtext_cmd, check=True, capture_output=True)
                        logger.info(f"Scene {i}: Captions added successfully")
                        scene_videos.append(caption_video)
                    except subprocess.CalledProcessError as e:
                        log_ffmpeg_error(e, f"scene {i} caption addition")
                        logger.warning(f"Scene {i}: Falling back to video without captions")
                        scene_videos.append(scene_with_audio)
                else:
                    logger.info(f"Scene {i}: No captions to add")
                    scene_videos.append(scene_with_audio)
                
            except Exception as e:
                logger.error(f"Error processing scene {i}: {str(e)}", exc_info=True)
                raise
        
        logger.info("All scenes processed, creating final video")
        
        # Create concat file
        concat_file = temp_dir / "concat.txt"
        with open(concat_file, 'w') as f:
            for video in scene_videos:
                f.write(f"file '{video.absolute()}'\n")
        
        # Final concatenation command
        concat_cmd = [
            'ffmpeg', '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', str(concat_file),
            '-c:v', 'libx264',
            '-preset', 'slow',
            '-crf', '18',
            '-c:a', 'aac',
            '-b:a', '192k',
            str(video_path)
        ]
        
        try:
            subprocess.run(concat_cmd, check=True, capture_output=True)
            logger.info(f"Successfully generated final video: {video_filename}")
        except subprocess.CalledProcessError as e:
            log_ffmpeg_error(e, "final video concatenation")
            raise Exception("Failed to concatenate videos")
        
        return video_path
        
    except Exception as e:
        logger.error(f"Error in process_scenes: {str(e)}", exc_info=True)
        raise
    finally:
        # Clean up temporary files
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            logger.info("Cleaned up temporary files")

if __name__ == "__main__":
    import uvicorn
    
    # Check for API token
    if not os.getenv('OPENAI_API_KEY'):
        logger.warning("OPENAI_API_KEY not set in environment!")
    else:
        logger.info("OPENAI_API_KEY found in environment")
    
    logger.info("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")