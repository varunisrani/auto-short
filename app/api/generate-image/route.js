import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { prompt } = await request.json();

        const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
                "Prefer": "wait"
            },
            body: JSON.stringify({
                input: {
                    prompt: prompt,
                    go_fast: true,
                    megapixels: "1",
                    num_outputs: 1,
                    aspect_ratio: "1:1",
                    output_format: "webp",
                    output_quality: 80,
                    num_inference_steps: 4
                }
            })
        });

        const result = await response.json();
        return NextResponse.json({ imageUrl: result.output[0] });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
} 