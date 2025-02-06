"use client"

import Image from "next/image";
import Link from "next/link";
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

export default function Create() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scriptOutput, setScriptOutput] = useState(null);
  const [videoTopic, setVideoTopic] = useState("");
  const [duration, setDuration] = useState("30");
  const [orientation, setOrientation] = useState("horizontal");
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
  const [videoDetails, setVideoDetails] = useState(null);
  const [generationLogs, setGenerationLogs] = useState([]);
  const [remainingGenerations, setRemainingGenerations] = useState(2);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

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
    setGenerationLogs([]);
    
    try {
      const response = await fetch('http://localhost:8000/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenes: scenes.map(scene => ({
            imageUrl: scene.imageUrl,
            audioUrl: scene.audioUrl,
            voiceover: scene.voiceover,
            time: scene.time
          })),
          orientation: orientation,
          isRecreate: false
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate video');
      }

      setVideoUrl(data.videoUrl);
      setVideoDetails(data.details);
      setRemainingGenerations(data.remainingGenerations);

    } catch (error) {
      console.error('Error generating video:', error);
      setError(error.message);
    } finally {
      setVideoGenerating(false);
    }
  };

  const handleRecreateVideo = async () => {
    if (!scenes.length) return;
    
    setVideoGenerating(true);
    setError(null);
    setVideoUrl(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenes: scenes.map(scene => ({
            imageUrl: scene.imageUrl,
            audioUrl: scene.audioUrl,
            voiceover: scene.voiceover,
            time: scene.time
          })),
          orientation: orientation,
          isRecreate: true
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate video');
      }

      setVideoUrl(data.videoUrl);
      setVideoDetails(data.details);

    } catch (error) {
      console.error('Error regenerating video:', error);
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

  const formatCaptionPreview = (text) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = [];
    let currentLength = 0;
    const maxChars = 50;

    for (const word of words) {
      if (currentLength + word.length + 1 <= maxChars) {
        currentLine.push(word);
        currentLength += word.length + 1;
      } else {
        lines.push(currentLine.join(' '));
        currentLine = [word];
        currentLength = word.length;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }
    return lines;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-xl z-50 border-b border-purple-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/landing" className="flex-shrink-0">
              <span className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-purple-700 to-purple-900 bg-clip-text text-transparent">
                AutoShorts
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* API Status Warning */}
          {apiStatus === 'offline' && (
            <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
              <strong className="font-bold">Warning!</strong>
              <span className="block sm:inline"> API server is offline. Please start the Python server.</span>
            </div>
          )}

          {/* Main Content Area */}
          <div className="space-y-12">
            {/* Video Configuration Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Your Short</h2>
              <div className="space-y-6 max-w-3xl">
                {/* Video Orientation Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Video Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setOrientation('horizontal')}
                      className={`p-6 text-center rounded-lg border transition-all ${
                        orientation === 'horizontal'
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg shadow-purple-100/50'
                          : 'border-gray-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="w-20 h-12 mx-auto mb-3 rounded bg-gray-100 border-2 border-current flex items-center justify-center">
                        <span className="text-xs">16:9</span>
                      </div>
                      <span className="font-medium">Horizontal</span>
                      <p className="text-sm text-gray-500 mt-1">Best for YouTube, Desktop</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('vertical')}
                      className={`p-6 text-center rounded-lg border transition-all ${
                        orientation === 'vertical'
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-lg shadow-purple-100/50'
                          : 'border-gray-200 hover:border-purple-200'
                      }`}
                    >
                      <div className="w-12 h-20 mx-auto mb-3 rounded bg-gray-100 border-2 border-current flex items-center justify-center">
                        <span className="text-xs">9:16</span>
                      </div>
                      <span className="font-medium">Vertical</span>
                      <p className="text-sm text-gray-500 mt-1">Best for Mobile, Stories</p>
                    </button>
                  </div>
                </div>

                {/* Topic Input */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={videoTopic}
                      onChange={(e) => setVideoTopic(e.target.value)}
                      placeholder="Enter your video topic"
                      className="flex-1 p-3 border border-purple-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <button
                      onClick={getRandomVideoIdea}
                      className="px-6 py-3 bg-white border border-purple-100 text-gray-700 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      🎲 Random
                    </button>
                  </div>
                  
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-3 border border-purple-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="30">30 Seconds</option>
                    <option value="45">45 Seconds</option>
                    <option value="60">60 Seconds</option>
                  </select>

                  <button 
                    onClick={generateScript}
                    disabled={loading || !videoTopic}
                    className="w-full bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-6 py-4 rounded-lg hover:shadow-lg hover:shadow-purple-200/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ring-1 ring-purple-200"
                  >
                    {loading ? 'Generating Script...' : 'Generate Video Script'}
                  </button>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    Error: {error}
                  </div>
                )}
              </div>
            </section>

            {/* Generated Script Display */}
            {scriptOutput && (
              <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Generated Script</h2>
                <div className="space-y-6">
                  {getVisualDescriptions(scriptOutput).map((scene, index) => (
                    <div 
                      key={index} 
                      className={`p-6 ${
                        index === currentSceneIndex 
                          ? 'bg-purple-50 border border-purple-200' 
                          : 'bg-gray-50 border border-gray-200'
                      } rounded-lg`}
                    >
                      <p className="text-gray-700 whitespace-pre-wrap mb-4">{scene}</p>
                      <div className="flex justify-between items-center">
                        {index === currentSceneIndex && !generatedImages[scene] && (
                          <button
                            onClick={handleGenerateNextImage}
                            disabled={loading}
                            className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:shadow-lg hover:shadow-purple-200/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ring-1 ring-purple-200"
                          >
                            {loading ? 'Generating...' : 'Generate Scene Image'}
                          </button>
                        )}
                        {generatedImages[scene] && (
                          <img 
                            src={generatedImages[scene]} 
                            alt={`Scene ${index + 1}`}
                            className="w-32 h-32 object-cover rounded-lg shadow-sm"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Scene Generation Controls */}
            {scriptOutput && (
              <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate Assets</h2>
                <div className="flex gap-4">
                  <button
                    onClick={handleGenerateAllScenes}
                    disabled={batchGenerating || !scenes.length}
                    className="flex-1 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-6 py-4 rounded-lg hover:shadow-lg hover:shadow-purple-200/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ring-1 ring-purple-200"
                  >
                    {batchGenerating 
                      ? `Generating Scene ${currentGeneratingScene}...` 
                      : 'Generate All Images'}
                  </button>
                  
                  <button
                    onClick={handleGenerateAllAudio}
                    disabled={batchGenerating || !scenes.length}
                    className="flex-1 bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-6 py-4 rounded-lg hover:shadow-lg hover:shadow-purple-200/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ring-1 ring-purple-200"
                  >
                    {batchGenerating 
                      ? `Generating Audio ${currentGeneratingScene}...` 
                      : 'Generate All Audio'}
                  </button>
                </div>
              </section>
            )}

            {/* Scene Details */}
            {scenes.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Scenes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {scenes.map((scene) => (
                    <div key={scene.id} className="bg-white rounded-lg border border-purple-100 p-6 hover:shadow-lg hover:shadow-purple-100/50 transition-all">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">Scene {scene.id}</h3>
                        <span className="text-gray-500">{scene.time}</span>
                      </div>
                      
                      {/* Visual Section */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-gray-900">Visual</h4>
                          {!scene.imageUrl && !batchGenerating && (
                            <button
                              onClick={() => handleSceneImageGeneration(scene)}
                              disabled={loading}
                              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                              {loading ? 'Generating...' : 'Generate Image'}
                            </button>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{scene.visual}</p>
                        {scene.imageUrl && (
                          <div className="relative group">
                            <img 
                              src={scene.imageUrl} 
                              alt={`Scene ${scene.id}`}
                              className={`w-full rounded-lg shadow-sm ${
                                orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'
                              } object-cover`}
                            />
                            {/* Caption Preview Overlay */}
                            {scene.voiceover && (
                              <div className={`absolute bottom-0 left-0 right-0 p-4 ${
                                orientation === 'vertical' ? 'pb-[120px]' : 'pb-[80px]'
                              }`}>
                                <div className="relative">
                                  {formatCaptionPreview(scene.voiceover).map((line, index) => (
                                    <div 
                                      key={index}
                                      className="text-center text-white text-shadow-lg font-semibold px-4 py-1 bg-black/70 rounded-lg mb-1"
                                      style={{
                                        fontSize: orientation === 'vertical' ? '14px' : '16px',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                                      }}
                                    >
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Voiceover Section */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium text-gray-900">Voiceover</h4>
                          {!scene.audioUrl && !batchGenerating && (
                            <button
                              onClick={() => handleSceneVoiceGeneration(scene)}
                              disabled={voiceLoading}
                              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                            >
                              {voiceLoading ? 'Generating...' : 'Generate Voice'}
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-gray-600">{scene.voiceover}</p>
                          {scene.audioUrl && (
                            <audio controls className="w-full mt-2" src={scene.audioUrl}>
                              Your browser does not support the audio element.
                            </audio>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Video Generation */}
            {scenes.length > 0 && scenes.every(scene => scene.imageUrl && scene.audioUrl) && (
              <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Video</h2>
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                    <p className="text-purple-700">
                      <span className="font-medium">Selected Format:</span> {orientation === 'horizontal' ? 'Horizontal (16:9)' : 'Vertical (9:16)'}
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateVideo}
                    disabled={videoGenerating}
                    className="w-full bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-6 py-4 rounded-lg hover:shadow-lg hover:shadow-purple-200/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ring-1 ring-purple-200"
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
              </section>
            )}

            {/* Final Video Display */}
            {videoUrl && (
              <section className="bg-white rounded-2xl shadow-sm border border-purple-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Generated Video</h2>
                
                {/* Video Details */}
                {videoDetails && (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <h3 className="font-semibold text-purple-900 mb-2">Video Details</h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Resolution:</dt>
                          <dd className="font-medium text-gray-900">{videoDetails.resolution}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Quality:</dt>
                          <dd className="font-medium text-gray-900">{videoDetails.quality}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Scenes:</dt>
                          <dd className="font-medium text-gray-900">{videoDetails.scenes}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Captions:</dt>
                          <dd className="font-medium text-gray-900">{videoDetails.hasCaptions ? 'Yes' : 'No'}</dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                      <h3 className="font-semibold text-purple-900 mb-2">Format</h3>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Orientation:</dt>
                          <dd className="font-medium text-gray-900">
                            {orientation === 'horizontal' ? 'Horizontal (16:9)' : 'Vertical (9:16)'}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Duration:</dt>
                          <dd className="font-medium text-gray-900">
                            {scenes.reduce((total, scene) => {
                              const [start, end] = scene.time.split('-').map(t => parseInt(t));
                              return total + (end - start);
                            }, 0)} seconds
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}

                {/* Video Player */}
                <div className={`relative mb-6 ${
                  orientation === 'vertical' ? 'max-w-sm mx-auto' : 'w-full'
                }`}>
                  <div className={`relative rounded-lg overflow-hidden ${
                    orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video'
                  }`}>
                    <video 
                      controls 
                      className="w-full h-full object-cover"
                      key={videoUrl}
                    >
                      <source src={videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleRecreateVideo}
                    disabled={videoGenerating}
                    className="bg-purple-100 text-purple-700 px-8 py-4 rounded-lg hover:bg-purple-200 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {videoGenerating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Recreating Video...
                      </span>
                    ) : 'Recreate Video'}
                  </button>
                  
                  <a 
                    href={videoUrl} 
                    download 
                    className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white px-8 py-4 rounded-lg hover:shadow-lg hover:shadow-purple-200/50 transition-all font-medium ring-1 ring-purple-200"
                  >
                    Download Video
                  </a>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      {/* Beta Notice */}
      <div className="fixed bottom-4 right-4 max-w-md">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
          <p className="text-yellow-800 text-sm">
            <span className="font-semibold">Beta Notice:</span> We're currently fixing some bugs. 
            You have {remainingGenerations} video generation{remainingGenerations !== 1 ? 's' : ''} remaining today. 
            Recreating videos doesn't count towards this limit.
          </p>
          <button
            onClick={() => setShowFeedbackForm(true)}
            className="mt-2 text-yellow-600 hover:text-yellow-700 text-sm font-medium"
          >
            Report an issue
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Send Feedback</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Feedback
                </label>
                <select
                  value={feedback.type}
                  onChange={(e) => setFeedback(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg"
                >
                  <option value="">Select type...</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={feedback.message}
                  onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-lg h-32"
                  placeholder="Describe your issue or suggestion..."
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowFeedbackForm(false)}
                  className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Here you would typically send the feedback to your backend
                    alert('Thank you for your feedback!');
                    setShowFeedbackForm(false);
                    setFeedback({ type: '', message: '' });
                  }}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Send Feedback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
