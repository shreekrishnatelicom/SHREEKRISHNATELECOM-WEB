import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RefundPage() {
  const page = await prisma.page.findUnique({
    where: { slug: "refund" }
  });

  const title = page?.title || "Refund Policy";
  const content = page?.content || "Thank you for using Shree Krishna Telecom. If there is an issue with your print request quality, page count, or duplicate charges, please contact us for a refund or reprint. (Admin can edit this content in the admin dashboard under Edit Pages).";

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-12 my-6 sm:my-12">
      <div className="border-4 border-bauhaus-black bg-bauhaus-white p-6 sm:p-10 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold uppercase mb-6 hover:text-bauhaus-red transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black uppercase mb-6 border-b-4 border-bauhaus-black pb-4 text-bauhaus-black">
          {title}
        </h1>
        <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-semibold text-sm sm:text-base">
          {content}
        </div>
      </div>
    </div>
  );
}
