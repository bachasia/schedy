import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { z } from "zod";

import { auth } from "@/lib/auth";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

const uploadSchema = z.object({
  type: z.enum(["image", "video"]),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse form data
    const formData = await request.formData();
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

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || "bin";
    const filename = `${timestamp}-${random}.${extension}`;

    // Create upload directory path
    // For now, we'll use a temporary postId. In production, this should be the actual post ID
    const tempPostId = "temp";
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      userId,
      tempPostId,
    );

    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Generate public URL
    const url = `/uploads/${userId}/${tempPostId}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename,
      size: file.size,
      type: isImage ? "image" : "video",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


