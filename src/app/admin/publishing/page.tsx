import { redirect } from "next/navigation";

export default function LegacyPublishingPage() {
  redirect("/admin/history");
}
