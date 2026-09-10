import { redirect } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/invite/${params.token}`);
  }

  const { data: commitmentId, error } = await supabase.rpc("accept_invite", {
    invite_token: params.token,
  });

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Uitnodiging</h1>
        {error ? (
          <div className="error-box">{error.message}</div>
        ) : (
          <div className="notice-box">
            Je bent nu accountability-partner voor deze commitment.
          </div>
        )}
        {commitmentId && (
          <Link className="btn" href={`/commitments/${commitmentId}`}>
            Bekijk de commitment
          </Link>
        )}
        {!commitmentId && (
          <Link className="btn secondary" href="/">
            Naar mijn commitments
          </Link>
        )}
      </div>
    </>
  );
}
