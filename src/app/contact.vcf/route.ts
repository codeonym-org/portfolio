import { vcard } from "@/components/interview/vcard";
import { player } from "@/config/player.config";

/** his business card as a contact file, for links that live outside the page (the transcript's last page) */
export const dynamic = "force-static";

export function GET() {
  const site = (process.env.SITE_URL ?? "https://portfolio.codeonym.work").replace(/\/$/, "");
  const card = vcard({
    name: player.name,
    firstName: player.firstName,
    title: player.title,
    brand: player.handle,
    location: player.location,
    email: player.links.email,
    phone: player.links.phone,
    site,
    github: player.links.github,
    linkedin: player.links.linkedin,
  });
  return new Response(card, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${player.handle}.vcf"`,
    },
  });
}
