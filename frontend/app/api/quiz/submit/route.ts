import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/quiz/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            throw new Error('Failed to submit quiz')
        }

        const data = await response.json()
        return NextResponse.json(data)
    } catch (error) {
        console.error('Error in quiz submit route:', error)
        return NextResponse.json(
            { error: 'Failed to submit quiz' },
            { status: 500 }
        )
    }
} 