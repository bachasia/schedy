import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { listUserMedia, deleteFromR2 } from "@/lib/storage/r2";

/**
 * GET /api/media
 * List all media files for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const media = await listUserMedia(userId);

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Error listing media:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media
 * Delete a media file
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // Verify the key belongs to the user
    const userId = session.user.id;
    if (!key.startsWith(`uploads/${userId}/`)) {
      return NextResponse.json({ error: "Unauthorized to delete this file" }, { status: 403 });
    }

    await deleteFromR2(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

