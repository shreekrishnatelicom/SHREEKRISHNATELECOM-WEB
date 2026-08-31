import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_CONTENT_TYPES = [
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
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate content type passed by the client
        const contentType = clientPayload || "";
        if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
          throw new Error(`File type "${contentType}" is not allowed.`);
        }

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: 80 * 1024 * 1024, // 80 MB
          tokenPayload: JSON.stringify({ contentType }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Optional: log or process after upload completes
        console.log("[Blob] Upload completed:", blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate upload token" },
      { status: 400 }
    );
  }
}
