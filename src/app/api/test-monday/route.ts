import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Simulate Monday.com item creation
    // In production, this would use the real Monday.com API
    const simulatedItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: title,
      description: description || '',
      created_at: new Date().toISOString(),
      status: 'Working on it',
      board_id: 'sample-board',
      url: `https://monday.com/boards/123456789/items/${Math.random().toString(36).substr(2, 9)}`
    };

    console.log('Monday.com Item Created (Simulation):', simulatedItem);

    return NextResponse.json({
      success: true,
      message: 'Monday.com item created successfully (simulation mode)',
      item: simulatedItem
    });

  } catch (error) {
    console.error('Error creating Monday.com item:', error);
    return NextResponse.json(
      { error: 'Failed to create Monday.com item' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Monday.com API Test Endpoint',
    status: 'Ready',
    mode: 'Simulation',
    endpoints: {
      POST: 'Create Monday.com item (simulation)'
    }
  });
}
