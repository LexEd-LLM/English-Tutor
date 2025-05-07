import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/calculate-phoneme-score`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorText = await response.text()
            return NextResponse.json(
                { error: errorText },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in phoneme score calculation route:', error)
        return NextResponse.json(
            { error: 'Failed to calculate phoneme score' },
            { status: 500 }
        )
    }
} 