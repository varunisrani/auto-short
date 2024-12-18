"use client"

import Image from "next/image";
import { useState, useEffect } from "react";

const TOPICS = [
  "Life hacks for organizing your desk in under 60 seconds",
  "Mind-blowing science experiments you can do at home", 
  "3 secret iPhone features you never knew existed",
  "Quick workout routine you can do during work breaks",
  "Easy 3-ingredient recipes for busy people",
  "Psychology tricks that will make people like you",
  "Morning routine hacks that successful people use",
  "Hidden features in everyday objects you didn't know about",
  "Money-saving tips that actually work",
  "Time management secrets nobody tells you",
  "Plant care tips for people who kill every plant",
  "Social media tricks to boost your engagement",
  "Travel packing hacks that will change your life",
  "DIY home decoration ideas under $10",
  "Productivity apps that will transform your workflow"
];

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scriptOutput, setScriptOutput] = useState(null);
  const [videoTopic, setVideoTopic] = useState("");
  const [duration, setDuration] = useState("30");
  const [generatedImages, setGeneratedImages] = useState({});
  const [apiStatus, setApiStatus] = useState('unchecked');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [imagePrompt, setImagePrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [voiceText, setVoiceText] = useState("");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [currentGeneratingScene, setCurrentGeneratingScene] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [allScenesReady, setAllScenesReady] = useState(false);

  useEffect(() => {
    // Load saved images from localStorage
    const savedImages = localStorage.getItem('generatedImages');
    if (savedImages) {
      setGeneratedImages(JSON.parse(savedImages));
    }

    // Check if the FastAPI server is running
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }
    } catch (err) {
      console.error('API server appears to be offline:', err);
      setApiStatus('offline');
    }
  };

  const handleGenerateImage = async (visualDescription) => {
    if (apiStatus !== 'online') {
      setError('API server is not available. Please make sure the Python server is running.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({
          prompt: visualDescription
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }

      // Save to state and localStorage
      const newGeneratedImages = {
        ...generatedImages,
        [visualDescription]: data.imageUrl
      };
      setGeneratedImages(newGeneratedImages);
      localStorage.setItem('generatedImages', JSON.stringify(newGeneratedImages));

      // Move to next scene after successful generation
      setCurrentSceneIndex(prev => prev + 1);

    } catch (err) {
      console.error('Error generating image:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateScript = async () => {
    setLoading(true);
    setError(null);
    try {
      // First generate the script
      const scriptResponse = await fetch('/api/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: videoTopic,
          duration: duration
        })
      });

      if (!scriptResponse.ok) {
        throw new Error('Failed to generate script');
      }

      const scriptData = await scriptResponse.json();
      if (scriptData.error) {
        throw new Error(scriptData.error);
      }

      setScriptOutput(scriptData.content);

      // Then process the script with Groq
      const processResponse = await fetch('/api/process-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: scriptData.content
        })
      });

      if (!processResponse.ok) {
        throw new Error('Failed to process script');
      }

      const processData = await processResponse.json();
      setScenes(processData.scenes);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRandomVideoIdea = () => {
    const randomIndex = Math.floor(Math.random() * TOPICS.length);
    setVideoTopic(TOPICS[randomIndex]);
  };

  const getVisualDescriptions = (script) => {
    if (!script) return [];
    const scenes = script.split('\n\n');
    return scenes.map(scene => scene.trim());
  };

  const handleGenerateNextImage = () => {
    const scenes = getVisualDescriptions(scriptOutput);
    if (currentSceneIndex < scenes.length) {
      handleGenerateImage(scenes[currentSceneIndex]);
    }
  };

  const handleCustomImageGeneration = async (e) => {
    e.preventDefault();
    if (!imagePrompt) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'omit',
        body: JSON.stringify({
          prompt: imagePrompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (!data.imageUrl) {
        throw new Error('No image URL received from server');
      }

      // Save to state and localStorage
      const newGeneratedImages = {
        ...generatedImages,
        [imagePrompt]: data.imageUrl
      };
      setGeneratedImages(newGeneratedImages);
      localStorage.setItem('generatedImages', JSON.stringify(newGeneratedImages));
      setImagePrompt("");

    } catch (err) {
      console.error('Error generating image:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (url, prompt) => {
    setSelectedImage({ url, prompt });
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleVoiceGeneration = async (e) => {
    e.preventDefault();
    if (!voiceText) return;

    setVoiceLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: voiceText.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate voice');
      }

      const data = await response.json();
      
      // Clean up previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      // Set the new audio URL
      setAudioUrl(data.audioUrl);

    } catch (error) {
      console.error('Error generating voice:', error);
      setError(error.message);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleSceneImageGeneration = async (scene) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create a properly formatted prompt with scene number
      const visualPrompt = `Scene ${scene.id}\nVisual\n${scene.visual}`;
      
      const response = await fetch('http://localhost:8000/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: visualPrompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate image');
      }

      const data = await response.json();
      
      // Update the scene with the new image URL
      const updatedScenes = scenes.map(s => {
        if (s.id === scene.id) {
          return {
            ...s,
            imageUrl: data.imageUrl
          };
        }
        return s;
      });
      
      setScenes(updatedScenes);

    } catch (error) {
      console.error('Error generating image:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSceneVoiceGeneration = async (scene) => {
    setVoiceLoading(true);
    setError(null);
    
    try {
      // Create properly formatted text with scene number
      const voiceoverText = `Scene ${scene.id}\nVoiceover\n${scene.voiceover}`;
      
      const response = await fetch('http://localhost:8000/generate-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: voiceoverText
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate voice');
      }

      const data = await response.json();
      
      // Update the scene with the new audio URL
      const updatedScenes = scenes.map(s => {
        if (s.id === scene.id) {
          return {
            ...s,
            audioUrl: data.audioUrl
          };
        }
        return s;
      });
      
      setScenes(updatedScenes);

    } catch (error) {
      console.error('Error generating voice:', error);
      setError(error.message);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleGenerateAllScenes = async () => {
    setBatchGenerating(true);
    setError(null);

    try {
      for (const scene of scenes) {
        setCurrentGeneratingScene(scene.id);
        
        // Generate image
        if (!scene.imageUrl) {
          const visualPrompt = `Scene ${scene.id}\nVisual\n${scene.visual}`;
          const imageResponse = await fetch('http://localhost:8000/generate-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: visualPrompt
            })
          });

          if (!imageResponse.ok) {
            const errorData = await imageResponse.json();
            throw new Error(errorData.detail || 'Failed to generate image');
          }

          const imageData = await imageResponse.json();
          scene.imageUrl = imageData.imageUrl;
        }

        // Generate voice
        if (!scene.audioUrl) {
          const voiceResponse = await fetch('http://localhost:8000/generate-voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: scene.voiceover
            })
          });

          if (!voiceResponse.ok) {
            const errorData = await voiceResponse.json();
            throw new Error(errorData.detail || 'Failed to generate voice');
          }

          const voiceData = await voiceResponse.json();
          scene.audioUrl = voiceData.audioUrl;
        }
      }

      // Update scenes state
      setScenes([...scenes]);

    } catch (error) {
      console.error(`Error generating content for scene ${currentGeneratingScene}:`, error);
      setError(error.message);
    } finally {
      setBatchGenerating(false);
      setCurrentGeneratingScene(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!scenes.length) return;
    
    setVideoGenerating(true);
    setError(null);
    
    try {
      // Send scenes with URLs directly from frontend state
      const response = await fetch('http://localhost:8000/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenes: scenes.map(scene => ({
            imageUrl: scene.imageUrl,
            audioUrl: scene.audioUrl,
            time: scene.time
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate video');
      }

      const data = await response.json();
      setVideoUrl(data.videoUrl);

    } catch (error) {
      console.error('Error generating video:', error);
      setError(error.message);
    } finally {
      setVideoGenerating(false);
    }
  };

  // Check if all scenes have both image and audio
  const checkAllScenesComplete = (currentScenes) => {
    return currentScenes.every(scene => 
      scene.imagePath && 
      scene.audioPath && 
      scene.time // Make sure time is also set
    )
  }

  const handleCreateVideo = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenes })
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const data = await response.json()
      setVideoUrl(data.videoUrl)
    } catch (error) {
      console.error('Error creating video:', error)
    }
    setLoading(false)
  }

  const handleGenerateAllAudio = async () => {
    if (!scenes.length) return;
    
    setBatchGenerating(true);
    setError(null);

    try {
      // Generate audio for each scene sequentially
      for (let scene of scenes) {
        if (!scene.audioUrl) {  // Only generate if audio doesn't exist
          setCurrentGeneratingScene(scene.id);
          
          // Create properly formatted text with scene number
          const voiceoverText = `Scene ${scene.id}\nVoiceover\n${scene.voiceover}`;
          
          const response = await fetch('http://localhost:8000/generate-voice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: voiceoverText
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to generate voice');
          }

          const data = await response.json();
          
          // Update the scene with the new audio URL
          setScenes(prevScenes => 
            prevScenes.map(s => {
              if (s.id === scene.id) {
                return {
                  ...s,
                  audioUrl: data.audioUrl,
                  audioPath: data.audioPath
                };
              }
              return s;
            })
          );
        }
      }
      
      setCurrentGeneratingScene(null);
      
    } catch (error) {
      console.error('Error generating audio:', error);
      setError(error.message);
    } finally {
      setBatchGenerating(false);
    }
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-6xl">
        {apiStatus === 'offline' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Warning!</strong>
            <span className="block sm:inline"> API server is offline. Please start the Python server.</span>
          </div>
        )}
        
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />

        {/* Custom Image Generation Section */}
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Generate Custom Image</h2>
          <form onSubmit={handleCustomImageGeneration} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
              <button
                type="submit"
                disabled={loading || !imagePrompt}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </div>

        {/* Generated Images Grid */}
        {Object.entries(generatedImages).length > 0 && (
          <div className="w-full">
            <h3 className="text-xl font-bold mb-4">Generated Images</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(generatedImages).map(([prompt, url], index) => (
                <div 
                  key={index}
                  className="relative group cursor-pointer"
                  onClick={() => handleImageClick(url, prompt)}
                >
                  <img 
                    src={url} 
                    alt={prompt}
                    className="w-full h-48 object-cover rounded-lg transition-transform group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black bg-opacity-50 text-white text-sm rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    {prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simple Modal for Image Preview */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75" onClick={handleCloseModal}>
            <div className="relative bg-white dark:bg-gray-800 p-4 rounded-lg max-w-4xl w-full" onClick={e => e.stopPropagation()}>
              <button
                onClick={handleCloseModal}
                className="absolute top-2 right-2 p-2 rounded-full bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="mt-4">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.prompt}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  {selectedImage.prompt}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Script Generation Section */}
        <div className="flex flex-col items-center gap-4 w-full max-w-2xl">
          <div className="w-full space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={videoTopic}
                onChange={(e) => setVideoTopic(e.target.value)}
                placeholder="Enter your video topic"
                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              />
              <button
                onClick={getRandomVideoIdea}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
                type="button"
              >
                🎲 Random
              </button>
            </div>
            
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="30">30 Seconds</option>
              <option value="45">45 Seconds</option>
              <option value="60">60 Seconds</option>
            </select>

            <button 
              onClick={generateScript}
              disabled={loading || !videoTopic}
              className="w-full rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            >
              {loading ? 'Generating Script...' : 'Generate Video Script'}
            </button>
          </div>

          {error && (
            <div className="text-red-500 w-full bg-red-100 p-4 rounded-md">
              Error: {error}
            </div>
          )}

          {scriptOutput && (
            <div className="mt-4 w-full space-y-4">
              {getVisualDescriptions(scriptOutput).map((scene, index) => (
                <div 
                  key={index} 
                  className={`p-4 ${index === currentSceneIndex ? 'bg-blue-50' : 'bg-gray-50'} dark:bg-gray-800 rounded-lg`}
                >
                  <p className="whitespace-pre-wrap mb-2">{scene}</p>
                  <div className="flex justify-between items-center mt-2">
                    {index === currentSceneIndex && !generatedImages[scene] && (
                      <button
                        onClick={handleGenerateNextImage}
                        disabled={loading}
                        className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm h-8 px-3"
                      >
                        {loading ? 'Generating...' : 'Generate Scene Image'}
                      </button>
                    )}
                    {generatedImages[scene] && (
                      <img 
                        src={generatedImages[scene]} 
                        alt={`Generated scene ${index + 1}`}
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voice Generation Section */}
        <div className="w-full bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Generate Voice</h2>
          <form onSubmit={handleVoiceGeneration} className="space-y-4">
            <div className="flex flex-col gap-4">
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 min-h-[100px]"
              />
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={voiceLoading || !voiceText}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 whitespace-nowrap"
                >
                  {voiceLoading ? 'Generating...' : 'Generate Voice'}
                </button>
                {audioUrl && (
                  <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-md p-2">
                    <audio
                      controls
                      src={audioUrl}
                      className="w-full"
                      preload="auto"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>

        {scriptOutput && (
          <div className="mt-4 w-full">
            {/* Scene Generation Controls */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold mb-4">Generate Scene Assets</h3>
                <div className="flex gap-4">
                  <button
                    onClick={handleGenerateAllScenes}
                    disabled={batchGenerating || !scenes.length}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {batchGenerating 
                      ? `Generating Scene ${currentGeneratingScene}...` 
                      : 'Generate All Images'}
                  </button>
                  
                  <button
                    onClick={handleGenerateAllAudio}
                    disabled={batchGenerating || !scenes.length}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {batchGenerating 
                      ? `Generating Audio ${currentGeneratingScene}...` 
                      : 'Generate All Audio'}
                  </button>
                </div>
              </div>
            </div>

            {/* Video Creation Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
              <h3 className="text-xl font-bold mb-4">Create Final Video</h3>
              <div className="space-y-4">
                {/* Scene Status Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {scenes.map((scene) => (
                    <div key={scene.id} 
                      className={`p-4 rounded-lg border ${
                        scene.imageUrl && scene.audioUrl 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Scene {scene.id}</span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            scene.imageUrl ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {scene.imageUrl ? '✓ Image' : '⚠ No Image'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            scene.audioUrl ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {scene.audioUrl ? '✓ Audio' : '⚠ No Audio'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Video Generation Button */}
                <button
                  onClick={handleGenerateVideo}
                  disabled={videoGenerating || !scenes.every(scene => scene.imageUrl && scene.audioUrl)}
                  className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                >
                  {videoGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Video...
                    </span>
                  ) : 'Create Final Video'}
                </button>
              </div>
            </div>

            {/* Scene Details */}
            <div className="space-y-6">
              {scenes.map((scene) => (
                <div key={scene.id} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Scene {scene.id}</h3>
                    <span className="text-gray-500">{scene.time}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Visual</h4>
                        {!scene.imageUrl && !batchGenerating && (
                          <button
                            onClick={() => handleSceneImageGeneration(scene)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            {loading ? 'Generating...' : 'Generate Image'}
                          </button>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">{scene.visual}</p>
                      {scene.imageUrl && (
                        <div className="mt-2">
                          <img 
                            src={scene.imageUrl} 
                            alt={`Scene ${scene.id}`}
                            className="w-full max-w-md rounded-lg mb-2"
                          />
                          <p className="text-sm text-gray-500 break-all bg-gray-50 dark:bg-gray-700 p-2 rounded">
                            Path: {scene.imageUrl}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">Voiceover</h4>
                        {!scene.audioUrl && !batchGenerating && (
                          <button
                            onClick={() => handleSceneVoiceGeneration(scene)}
                            disabled={voiceLoading}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                          >
                            {voiceLoading ? 'Generating...' : 'Generate Voice'}
                          </button>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">{scene.voiceover}</p>
                      {scene.audioUrl && (
                        <div className="mt-2">
                          <audio controls className="w-full mb-2" src={scene.audioUrl}>
                            Your browser does not support the audio element.
                          </audio>
                          <p className="text-sm text-gray-500 break-all bg-gray-50 dark:bg-gray-700 p-2 rounded">
                            Path: {scene.audioUrl}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Video Player */}
            {videoUrl && (
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold mb-4">Generated Video</h3>
                <video controls className="w-full rounded-lg mb-4">
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="flex justify-center">
                  <a 
                    href={videoUrl} 
                    download 
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download Video
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Video button - only show when all scenes are ready */}
        {allScenesReady && (
          <div className="mt-8">
            <button
              onClick={handleCreateVideo}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Creating Video...' : 'Create Final Video'}
            </button>
          </div>
        )}

        {/* Display video if available */}
        {videoUrl && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Generated Video:</h2>
            <video controls className="w-full max-w-2xl">
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <a 
              href={videoUrl} 
              download 
              className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Download Video
            </a>
          </div>
        )}
      </main>
      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
