import { getAnnouncement } from "@/lib/announcement";

const COLOR_MAP: Record<string, string> = {
  "bauhaus-red": "bg-bauhaus-red text-bauhaus-white",
  "bauhaus-blue": "bg-bauhaus-blue text-bauhaus-white",
  "bauhaus-yellow": "bg-bauhaus-yellow text-bauhaus-black",
  "bauhaus-black": "bg-bauhaus-black text-bauhaus-white",
};

export default async function AnnouncementBar() {
  const announcement = await getAnnouncement();
  if (!announcement) return null;

  const colorClass = COLOR_MAP[announcement.color] || "bg-bauhaus-red text-bauhaus-white";

  return (
    <div className={`w-full py-2 px-4 text-center font-bold text-sm uppercase tracking-wider border-b-4 border-bauhaus-black ${colorClass}`}>
      {announcement.message}
    </div>
  );
}
