import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/upload-audio`, {
            method: 'POST',
            body: formData,
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
        console.error('Error in audio upload route:', error)
        return NextResponse.json(
            { error: 'Failed to upload and analyze audio' },
            { status: 500 }
        )
    }
} 