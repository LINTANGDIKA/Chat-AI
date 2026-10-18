import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Set maximum execution duration to 60s for Vercel

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}

async function handleProxy(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let targetUrl = searchParams.get('url') || req.headers.get('x-target-url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Target URL parameter (?url=...) is required' },
        { status: 400, headers: getCorsHeaders() }
      );
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const headersToForward: Record<string, string> = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 HeroAI/2.0',
    };

    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!['host', 'origin', 'referer', 'content-length', 'user-agent', 'x-target-url'].includes(lower)) {
        if (lower === 'authorization') {
          let auth = val.trim();
          if (/^bearer\s+bearer\s+/i.test(auth)) {
            auth = auth.replace(/^bearer\s+/i, '');
          }
          headersToForward['authorization'] = auth;
        } else {
          headersToForward[lower] = val;
        }
      }
    });

    let bodyData: BodyInit | undefined = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const buffer = await req.arrayBuffer();
      if (buffer.byteLength > 0) {
        bodyData = buffer;
      }
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: headersToForward,
      body: bodyData,
    });

    const contentType = upstreamResponse.headers.get('content-type') || 'application/json';
    const isStream = contentType.toLowerCase().includes('text/event-stream');

    const resHeaders: Record<string, string> = {
      ...getCorsHeaders(),
      'Content-Type': contentType,
    };

    if (isStream) {
      resHeaders['Cache-Control'] = 'no-cache, no-transform';
      resHeaders['Connection'] = 'keep-alive';
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[Proxy Error]:', error.message);
    return NextResponse.json(
      {
        error: 'Proxy Error: Gagal menghubungi server target',
        detail: error.message,
      },
      { status: 502, headers: getCorsHeaders() }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}
