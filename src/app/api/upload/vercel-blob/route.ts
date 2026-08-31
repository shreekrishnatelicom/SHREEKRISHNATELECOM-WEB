import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Allow public uploads but restrict extensions/content-types
        return {
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/bmp",
            "image/tiff",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          ],
          // Optional payload if you need to pass additional info to onUploadCompleted
          tokenPayload: JSON.stringify({
            uploadedAt: new Date().toISOString()
          })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // The file is fully uploaded to Vercel Blob.
        // We will store it in the database in the subsequent client request to POST /api/upload
        console.log("Vercel Blob upload completed successfully:", blob.url);
      }
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Vercel Blob secure token generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate upload token" },
      { status: 400 }
    );
  }
}
