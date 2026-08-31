import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Calendar } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";

export default async function Dashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value || cookieStore.get("admin_token")?.value;
  
  if (!token) {
    redirect("/login");
  }

  // Decode token to get user ID
  const decoded = Buffer.from(token, "base64").toString("utf-8");
  const userId = decoded.split(":")[0];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      printRequests: {
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-bauhaus-white">
      <header className="bg-bauhaus-blue p-6 border-b-4 border-bauhaus-black flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase text-bauhaus-white">My Dashboard</h1>
          <p className="text-bauhaus-yellow font-bold uppercase tracking-widest text-sm">Welcome, {user.name}</p>
        </div>
        <LogoutButton />
      </header>

      <main className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black uppercase text-bauhaus-black">Order History</h2>
          <Link href="/print" className="bg-bauhaus-yellow text-bauhaus-black px-6 py-3 font-bold uppercase border-4 border-bauhaus-black shadow-[4px_4px_0px_0px_rgba(230,22,43,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(230,22,43,1)] transition-all">
            New Order →
          </Link>
        </div>

        {user.printRequests.length === 0 ? (
          <div className="bg-gray-100 border-4 border-bauhaus-black p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold uppercase mb-2">No Orders Yet</h3>
            <p className="text-gray-500">You haven't placed any print orders yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {user.printRequests.map((req) => (
              <div key={req.id} className="bg-white border-4 border-bauhaus-black shadow-[8px_8px_0px_0px_rgba(43,76,126,1)] p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-bauhaus-yellow px-2 py-1 font-bold text-xs uppercase border-2 border-bauhaus-black">
                    {req.status}
                  </div>
                  <div className="flex items-center gap-1 text-gray-500 text-sm font-bold">
                    <Calendar className="w-4 h-4" />
                    {req.createdAt.toLocaleDateString()}
                  </div>
                </div>
                <h3 className="font-black text-lg mb-2 truncate" title={
                  req.fileName.startsWith("[") 
                    ? (() => { try { return JSON.parse(req.fileName).join(", "); } catch (e) { return req.fileName; } })()
                    : req.fileName
                }>
                  {req.notes?.includes("[Service Request:") 
                    ? `Service: ${req.notes.match(/\[Service Request:\s*([^\]]+)\]/)?.[1] || "Other Request"}` 
                    : (
                        req.fileName.startsWith("[") 
                          ? (() => { try { return JSON.parse(req.fileName).join(", "); } catch (e) { return req.fileName; } })()
                          : req.fileName
                      )}
                </h3>
                <div className="space-y-2 text-sm font-bold text-gray-600 mb-6">
                  <p>Tracking ID: <span className="text-bauhaus-black">{req.trackingId}</span></p>
                  {req.notes?.includes("[Service Request:") ? (
                    <p>Type: <span className="text-bauhaus-black uppercase">Service Request</span></p>
                  ) : (
                    <>
                      <p>Mode: <span className="text-bauhaus-black uppercase">{req.colorMode}</span></p>
                      <p>Copies: <span className="text-bauhaus-black">{req.copies}</span></p>
                    </>
                  )}
                </div>
                <Link href={`/track?id=${req.trackingId}`} className="block w-full text-center bg-bauhaus-blue text-bauhaus-white py-2 font-bold uppercase border-2 border-bauhaus-black hover:bg-blue-700 transition-colors">
                  Track Order
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Profile Settings Card */}
        <div className="bg-white border-4 border-bauhaus-black shadow-[8px_8px_0px_0px_rgba(230,22,43,1)] p-8 max-w-xl mx-auto mt-12 text-center">
          <h3 className="text-2xl font-black uppercase mb-4">Profile Settings</h3>
          <p className="text-gray-600 font-bold uppercase text-sm mb-6">
            Update your name, phone number, password, or delete your account.
          </p>
          <Link
            href="/profile"
            className="inline-block bg-bauhaus-blue text-white px-8 py-4 font-black uppercase tracking-wider border-4 border-bauhaus-black shadow-[4px_4px_0_0_#1a1a1a] hover:translate-y-1 hover:shadow-[2px_2px_0_0_#1a1a1a] transition-all"
          >
            Manage Profile Settings →
          </Link>
        </div>
      </main>
    </div>
  );
}
