import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

export async function POST(request) {
    try {
        const { topic, duration } = await request.json();
        
        const groq = new Groq({
            apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
        });

        const prompt = `Create a ${duration}-second video script for social media shorts about: ${topic}.
        Follow this EXACT structure for EACH scene:

        Scene [NUMBER]:
        Time: [START]-[END] seconds
        Visual: Describe the scene, objects, and setting without including any people. Focus on the key items, props, and environment that will be shown.
        Voiceover: [SCRIPT TEXT]

        Make sure each scene follows this identical format and structure. The visuals should focus on objects, props, settings and environments - do not include any people in the visual descriptions. Divide the ${duration} seconds into 3-4 evenly timed scenes.`;

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt,
                }
            ],
            model: "llama3-8b-8192",
            temperature: 0.5, // Reduced for more consistent outputs
            max_tokens: 1000,
            top_p: 1,
            stream: false
        });

        return NextResponse.json({ 
            content: completion.choices[0]?.message?.content || "No script generated" 
        });
    } catch (error) {
        console.error('Groq API Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate script. Please try again.' }, 
            { status: 500 }
        );
    }
}