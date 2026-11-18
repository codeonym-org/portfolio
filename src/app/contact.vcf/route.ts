import { vcard } from "@/components/interview/vcard";
import { owner } from "@/config/owner.config";

/** his business card as a contact file, for links that live outside the page (the transcript's last page) */
export const dynamic = "force-static";

export function GET() {
  const site = (process.env.SITE_URL ?? "https://portfolio.codeonym.work").replace(/\/$/, "");
  const card = vcard({
    name: owner.name,
    firstName: owner.firstName,
    title: owner.title,
    brand: owner.handle,
    location: owner.location,
    email: owner.links.email,
    phone: owner.links.phone,
    site,
    github: owner.links.github,
    linkedin: owner.links.linkedin,
  });
  return new Response(card, {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${owner.handle}.vcf"`,
    },
  });
}
