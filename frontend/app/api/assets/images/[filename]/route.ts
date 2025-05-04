import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const filePath = path.join(process.cwd(), 'assets', 'images', params.filename);

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).slice(1);
    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': `image/${ext}`,
      },
    });
  } else {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
