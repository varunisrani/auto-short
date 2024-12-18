from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import replicate
import os
import requests
import logging
from pathlib import Path
from dotenv import load_dotenv
import math
import subprocess
import uuid
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
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
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

class ImageRequest(BaseModel):
    prompt: str

class TextToSpeechRequest(BaseModel):
    text: str

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
        
        # Generate image using Replicate
        output = replicate.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": request.prompt,
                "go_fast": True,
                "megapixels": "1",
                "num_outputs": 1,
                "aspect_ratio": "1:1",
                "output_format": "webp",
                "output_quality": 80,
                "num_inference_steps": 4
            }
        )
        
        output_list = list(output)
        if not output_list:
            raise HTTPException(status_code=500, detail="No image generated")
            
        image_url = output_list[0]
        
        # Download and save the image
        try:
            response = requests.get(image_url)
            response.raise_for_status()
            
            with open(filepath, "wb") as f:
                f.write(response.content)
                
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
            logger.error(f"Error downloading image: {str(e)}")
            raise HTTPException(status_code=500, detail="Error downloading image")

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

@app.post("/generate-video")
async def generate_video(request: Request):
    import shutil
    
    try:
        data = await request.json()
        scenes = data['scenes']
        
        # Create directories
        videos_dir = Path("static/videos")
        temp_dir = videos_dir / "temp"
        videos_dir.mkdir(exist_ok=True)
        temp_dir.mkdir(exist_ok=True)

        try:
            # Create a unique identifier for this video
            video_id = uuid.uuid4()
            timestamp = int(time.time())
            video_filename = f"video_{timestamp}_{video_id}.mp4"
            video_path = videos_dir / video_filename
            
            scene_videos = []  # Keep track of scene video files
            
            # Process each scene using frontend paths directly
            for i, scene in enumerate(scenes, 1):
                try:
                    # Get paths directly from frontend scene data
                    image_url = scene.get('imageUrl', '')
                    audio_url = scene.get('audioUrl', '')
                    
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
                    
                    # Create video from image
                    scene_video = temp_dir / f"scene_{i}.mp4"
                    time_parts = scene['time'].split('-')
                    start = int(''.join(filter(str.isdigit, time_parts[0])))
                    end = int(''.join(filter(str.isdigit, time_parts[1])))
                    duration = end - start
                    
                    # Generate video from image
                    img_cmd = [
                        'ffmpeg', '-y',
                        '-loop', '1',
                        '-i', str(local_image_path),
                        '-c:v', 'libx264',
                        '-t', str(duration),
                        '-pix_fmt', 'yuv420p',
                        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(oh-ih)/2:(ow-iw)/2',
                        str(scene_video)
                    ]
                    
                    subprocess.run(img_cmd, check=True, capture_output=True)
                    logger.info(f"Created video for scene {i}")
                    
                    # Add audio to video
                    scene_with_audio = temp_dir / f"scene_{i}_with_audio.mp4"
                    audio_cmd = [
                        'ffmpeg', '-y',
                        '-i', str(scene_video),
                        '-i', str(local_audio_path),
                        '-c:v', 'copy',
                        '-c:a', 'aac',
                        str(scene_with_audio)
                    ]
                    
                    subprocess.run(audio_cmd, check=True, capture_output=True)
                    logger.info(f"Added audio to scene {i}")
                    
                    scene_videos.append(scene_with_audio)

                except Exception as e:
                    logger.error(f"Error processing scene {i}: {str(e)}")
                    raise

            # Create concat file with absolute paths
            concat_file = temp_dir / "concat.txt"
            with open(concat_file, 'w') as f:
                for video in scene_videos:
                    f.write(f"file '{video.absolute()}'\n")
            
            # Final concatenation
            concat_cmd = [
                'ffmpeg', '-y',
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_file),
                '-c', 'copy',
                str(video_path)
            ]
            
            try:
                subprocess.run(concat_cmd, check=True, capture_output=True)
                logger.info(f"Successfully generated video: {video_filename}")
            except subprocess.CalledProcessError as e:
                logger.error(f"FFmpeg error: {e.stderr.decode()}")
                raise Exception("Failed to concatenate videos")

        except Exception as e:
            logger.error(f"Error processing scenes: {str(e)}")
            raise
        finally:
            # Clean up temp directory
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
        
        # Save video info to a log file
        video_log_file = videos_dir / "video_log.txt"
        with open(video_log_file, "a") as f:
            f.write(f"Video: {video_filename}\n")
            f.write(f"Created: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))}\n")
            f.write(f"Scenes: {len(scenes)}\n")
            f.write("-" * 50 + "\n")
        
        return JSONResponse({
            "videoUrl": f"http://localhost:8000/static/videos/{video_filename}",
            "message": "Video generated successfully"
        })
        
    except Exception as e:
        logger.error(f"Error generating video: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Check for API token
    if not os.getenv('REPLICATE_API_TOKEN'):
        logger.warning("REPLICATE_API_TOKEN not set in environment!")
    else:
        logger.info("REPLICATE_API_TOKEN found in environment")
    
    logger.info("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")