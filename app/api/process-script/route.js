import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

export async function POST(request) {
  try {
    const { text } = await request.json();

    const prompt = `
      Analyze this video script and break it down into scenes. Create unique and detailed visual descriptions 
      that match each scene's specific financial advice content. The visual descriptions should include:
      
      - The presenter's appearance and professional demeanor
      - Relevant props and visual aids (charts, apps, money-related items)
      - Specific gestures and demonstrations that illustrate the financial concepts
      - Background elements that reinforce the financial message
      - Lighting and camera angles that enhance the presentation
      
      Return a valid JSON array with each scene containing:
      - id (number)
      - time (string, format: "X-Y seconds")
      - visual (string, detailed visual description)
      - voiceover (string, exact voiceover text)

      Example format:
      [
        {
          "id": 1,
          "time": "0-5 seconds",
          "visual": "Financial advisor in business attire stands before dynamic savings growth chart, gesturing confidently while explaining money-saving concepts. Modern office setting features subtle financial planning elements and professional lighting.",
          "voiceover": "Hey there! Are you tired of living paycheck to paycheck?"
        }
      ]

      Each visual must be unique and specifically tailored to the financial advice being given in that scene.
      Focus on how the presenter should demonstrate financial concepts visually.

      Script to analyze:
      ${text}
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 1024,
    });

    let scenes;
    try {
      scenes = JSON.parse(completion.choices[0].message.content.trim());
      
      if (!Array.isArray(scenes)) {
        throw new Error('Response is not an array');
      }

      scenes = scenes.map(scene => {
        const enhancedScene = {
          id: Number(scene.id),
          time: String(scene.time),
          voiceover: String(scene.voiceover),
          visual: scene.visual
        };

        if (scene.visual.toLowerCase().includes('person speaking directly to camera against plain background')) {
          enhancedScene.visual = generateEnhancedVisual(scene.voiceover);
        }

        return enhancedScene;
      });

    } catch (parseError) {
      console.error('Failed to parse scenes:', parseError);
      console.log('Raw response:', completion.choices[0].message.content);
      
      const scriptLines = text.split('\n');
      scenes = [];
      let currentScene = {};
      
      scriptLines.forEach(line => {
        if (line.includes('Scene')) {
          if (Object.keys(currentScene).length > 0) {
            if (currentScene.voiceover) {
              currentScene.visual = generateEnhancedVisual(currentScene.voiceover);
            }
            scenes.push(currentScene);
          }
          currentScene = { id: scenes.length + 1 };
        } else if (line.includes('Time:')) {
          currentScene.time = line.split('Time:')[1].trim();
        } else if (line.includes('Visual:')) {
          currentScene.visual = line.split('Visual:')[1].trim();
        } else if (line.includes('Voiceover:')) {
          currentScene.voiceover = line.split('Voiceover:')[1].trim();
        }
      });
      
      if (Object.keys(currentScene).length > 0) {
        if (currentScene.voiceover) {
          currentScene.visual = generateEnhancedVisual(currentScene.voiceover);
        }
        scenes.push(currentScene);
      }
    }

    return NextResponse.json({ scenes });

  } catch (error) {
    console.error('Error processing script:', error);
    return NextResponse.json(
      { error: 'Failed to process script' },
      { status: 500 }
    );
  }
}

function generateEnhancedVisual(voiceover) {
  // Financial advice patterns
  if (voiceover.toLowerCase().includes('paycheck to paycheck') || voiceover.toLowerCase().includes('saving money')) {
    return "Presenter stands confidently in a modern home office setting, wearing business casual attire. They use animated hand gestures showing money-saving motions, with a digital screen behind them displaying savings growth charts. Their expression is empathetic and encouraging as they discuss financial struggles.";
  } 
  
  if (voiceover.toLowerCase().includes('track your expenses') || voiceover.toLowerCase().includes('transaction')) {
    return "Presenter demonstrates expense tracking on a smartphone budgeting app, holding the device at chest level. Split screen shows a coffee cup and receipt on one side, while the presenter points to a monthly expense chart on the other. Professional lighting highlights the practical demonstration of daily financial choices.";
  }
  
  if (voiceover.toLowerCase().includes('50/30/20') || voiceover.toLowerCase().includes('income')) {
    return "Presenter stands beside a large, colorful pie chart showing the 50/30/20 budget breakdown. They use dynamic hand gestures to point at each section while explaining, wearing professional attire. A clean, modern office background features subtle financial planning visuals and calculator props.";
  }
  
  if (voiceover.toLowerCase().includes('impulse purchases') || voiceover.toLowerCase().includes('buying')) {
    return "Presenter demonstrates thoughtful shopping decisions, holding a shopping cart in one hand and a savings jar in the other. The background shows a subtle retail environment with price tags, while the presenter's expressions convey careful consideration. Clean, professional lighting emphasizes the decision-making moment.";
  }

  // Default enhanced description for financial content
  return "Financial expert presenter in professional attire stands in a modern office setting with subtle money-related infographics in the background. They use confident gestures and maintain strong eye contact while delivering financial advice, with warm lighting creating an approachable and trustworthy atmosphere.";
} 