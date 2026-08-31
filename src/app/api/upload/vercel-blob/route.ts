import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();
    console.log("LOG: vercel-blob request body:", JSON.stringify(body));

    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        return {
          // Allow all content types here to avoid browser MIME-type mismatch CORS blocks.
          // File extension validation is securely performed in the subsequent POST /api/upload handler.
          tokenPayload: JSON.stringify({
            uploadedAt: new Date().toISOString()
          })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
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
