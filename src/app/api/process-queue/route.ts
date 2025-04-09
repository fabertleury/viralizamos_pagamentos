import { NextResponse } from 'next/server';
import { processQueue } from '@/lib/process-queue';

// Make endpoint dynamic to prevent caching
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Optional: Add authorization check here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.API_SECRET_KEY) {
    //   return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    // }

    // Process the queue
    const result = await processQueue();

    // Return response with results
    return NextResponse.json({
      success: true,
      message: 'Queue processing completed',
      processed: result.processed,
      success_count: result.success,
      failed_count: result.failed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing queue:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to process queue',
      error: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : String(error)) 
        : 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 