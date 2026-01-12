import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { uploadToR2, generateR2Key } from "@/lib/storage/r2";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

const uploadSchema = z.object({
  type: z.enum(["image", "video"]),
});

// Configure route segment for large uploads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for large uploads

// Increase body size limit for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse form data with streaming to handle large files
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("FormData parse error:", parseError);
      return NextResponse.json(
        {
          error:
            "Failed to parse form data. File might be too large or corrupt.",
        },
        { status: 400 },
      );
    }

    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate type parameter
    const parsed = uploadSchema.safeParse({ type });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid type parameter" },
        { status: 400 },
      );
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: jpg, png, gif, webp, mp4, mov" },
        { status: 400 },
      );
    }

    // Validate file size
    if (isImage && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image file too large. Max 10MB." },
        { status: 400 },
      );
    }

    if (isVideo && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: "Video file too large. Max 100MB." },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudflare R2
    const filename = file.name;
    const key = generateR2Key(userId, filename);
    const url = await uploadToR2(buffer, key, file.type);

    return NextResponse.json({
      success: true,
      url,
      filename: key.split("/").pop() || filename,
      size: file.size,
      type: isImage ? "image" : "video",
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
