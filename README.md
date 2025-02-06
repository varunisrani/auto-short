# AutoShorts

AutoShorts is an AI-powered video creation application that generates short-form videos by combining AI-generated images, voiceovers, and automatic caption overlays. The project consists of two parts:
- A Next.js frontend
- A FastAPI backend

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Prerequisites

Make sure you have the following installed:
- Node.js (v12 or above; the latest LTS version is recommended)
- Python 3.8 or greater
- FFmpeg (installed and available in your system PATH)
- Git

## Installation

### Frontend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/autoshorts.git
   cd autoshorts
   ```

2. Install Next.js dependencies:
   ```bash
   npm install
   ```

### Backend Setup

1. Create a Python virtual environment:
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

1. Create a `.env.local` file in the project root with your API keys and configuration variables. For example:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   IMAGEIO_FFMPEG_EXE=/usr/local/bin/ffmpeg
   ```

2. Ensure that the following directories exist (this project uses them for storing generated images, audio, videos, and fonts):
   ```bash
   mkdir -p static/images static/audio static/videos static/fonts
   ```

3. Place your font file (e.g., `OpenSans-Bold.ttf`) in the `static/fonts` directory. This font is used for adding captions to videos.

## Running the Application

### 1. Start the Backend (FastAPI)

Run the FastAPI API server (assuming your backend file is located in `Backend/ss.py`):