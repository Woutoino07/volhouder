import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import EditCommitmentForm from "./EditCommitmentForm";

export default async function EditCommitmentPage({ params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: commitment } = await supabase
    .from("commitments")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();

  if (!commitment) redirect("/");

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="page-header">
          <a href={`/commitments/${params.id}`} className="back-link">← Terug</a>
          <h1>Commitment bewerken</h1>
        </div>
        <EditCommitmentForm commitment={commitment} />
      </div>
    </>
  );
}
