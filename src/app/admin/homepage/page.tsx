import { redirect } from "next/navigation";

/** Previous homepage editor URL remains a safe entry point to the unified workspace. */
export default function HomepageEditorRedirect() {
  redirect("/admin/builder?page=home&view=advanced");
}
