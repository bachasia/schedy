import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverAdapter } from "@/lib/queue-board";

/**
 * Bull Board admin interface
 * Protected route - only authenticated users can access
 * 
 * Access at: /api/admin/queues
 */

async function handler(req: NextRequest) {
  // Check authentication
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Add role-based access control (only admins should access)
  // For now, any authenticated user can access

  // Get the Express adapter handler
  const expressHandler = serverAdapter.getRouter();

  // Convert Next.js request to Express-like request
  const url = new URL(req.url);
  const path = url.pathname.replace("/api/admin/queues", "") || "/";

  // Create mock Express request and response objects
  const mockReq = {
    url: path + url.search,
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    query: Object.fromEntries(url.searchParams.entries()),
  } as any;

  const mockRes = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send(data: any) {
      this.body = data;
      return this;
    },
    json(data: any) {
      this.body = JSON.stringify(data);
      this.setHeader("Content-Type", "application/json");
      return this;
    },
    end() {
      return this;
    },
  } as any;

  // This is a workaround since Bull Board expects Express
  // In production, consider using a separate Express server or API route handler
  return NextResponse.json(
    {
      message: "Bull Board is not fully supported in Next.js App Router",
      info: "Please access queue stats via /api/admin/queue-stats endpoint",
      note: "For full Bull Board UI, consider deploying a separate Express server",
    },
    { status: 200 },
  );
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

export async function PUT(req: NextRequest) {
  return handler(req);
}

export async function DELETE(req: NextRequest) {
  return handler(req);
}








