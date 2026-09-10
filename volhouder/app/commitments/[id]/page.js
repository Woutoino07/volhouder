import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { cleanupOldPhotos } from "@/lib/cleanupOldPhotos";
import { computeStats } from "@/lib/stats";
import CheckinForm from "./CheckinForm";
import RejectButton from "./RejectButton";
import DisputeButton from "./DisputeButton";
import ResolveDisputeButtons from "./ResolveDisputeButtons";
import PauseButton from "./PauseButton";
import AddPartnerForm from "./AddPartnerForm";
import RemovePartnerButton from "./RemovePartnerButton";

const STATUS_LABEL = {
  pending: "nog te doen",
  submitted: "ingediend, wacht op beoordeling",
  approved: "gelukt",
  rejected: "afgekeurd",
  missed: "gemist",
  disputed: "betwist",
};

export default async function CommitmentDetailPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.rpc("reconcile_my_checkins");
  await cleanupOldPhotos(supabase, user.id);

  const { data: commitment, error } = await supabase
    .from("commitments")
    .select("*, owner:owner_id(display_name,email)")
    .eq("id", params.id)
    .single();

  if (error || !commitment) {
    return (
      <>
        <Nav />
        <div className="shell">
          <div className="error-box">Deze commitment bestaat niet (meer), of je hebt er geen toegang toe.</div>
        </div>
      </>
    );
  }

  const isOwner = commitment.owner_id === user.id;

  const { data: partnerRows } = await supabase
    .from("commitment_partners")
    .select("profile_id, profile:profile_id(display_name,email)")
    .eq("commitment_id", commitment.id);

  const partners = partnerRows || [];
  const isPartner = partners.some((p) => p.profile_id === user.id);

  const { data: todayCheckin } = await supabase.rpc("ensure_checkin_today", {
    p_commitment_id: commitment.id,
  });

  const { data: history } = await supabase
    .from("check_ins")
    .select("*")
    .eq("commitment_id", commitment.id)
    .order("due_date", { ascending: false })
    .limit(60);

  const stats = computeStats(history || []);

  // Signed URLs voor foto's genereren (bucket is privé)
  const withPhotoUrls = await Promise.all(
    (history || []).slice(0, 30).map(async (h) => {
      if (!h.photo_path) return h;
      const { data } = await supabase.storage
        .from("proofs")
        .createSignedUrl(h.photo_path, 60 * 60);
      return { ...h, photo_url: data?.signedUrl };
    })
  );

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>{commitment.title}</h1>
        <p className="subtitle">
          {commitment.description}
          {commitment.description && <br />}
          Deadline: {commitment.deadline_time?.slice(0, 5)} · Inzet: €{" "}
          {Number(commitment.money_stake).toFixed(2)}
          {partners.length > 0 &&
            ` · Partner${partners.length > 1 ? "s" : ""}: ${partners
              .map((p) => p.profile?.display_name || p.profile?.email)
              .join(", ")}`}
          {!isOwner && commitment.owner && ` · Eigenaar: ${commitment.owner.display_name || commitment.owner.email}`}
        </p>

        {!commitment.active && (
          <div className="notice-box">
            Gepauzeerd{commitment.deactivated_at ? ` sinds ${new Date(commitment.deactivated_at).toLocaleDateString("nl-BE")}` : ""}.
            Er worden geen nieuwe check-ins aangemaakt zolang dit zo blijft.
          </div>
        )}

        {stats.total > 0 && (
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span><strong>{stats.streak}</strong> op rij gelukt</span>
              <span><strong>{stats.rate}%</strong> slaagpercentage ({stats.successCount}/{stats.total})</span>
            </div>
          </div>
        )}

        {isOwner && (
          <div className="card">
            <h2>Partners</h2>
            {partners.length === 0 && (
              <div className="empty">Nog geen accountability-partner uitgenodigd.</div>
            )}
            {partners.map((p) => (
              <div key={p.profile_id} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                <span>{p.profile?.display_name || p.profile?.email}</span>
                <RemovePartnerButton commitmentId={commitment.id} profileId={p.profile_id} />
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <AddPartnerForm commitmentId={commitment.id} />
            </div>
            <div style={{ marginTop: 16 }}>
              <PauseButton commitmentId={commitment.id} active={commitment.active} />
            </div>
          </div>
        )}

        {todayCheckin ? (
          <>
            {isOwner && todayCheckin.status === "pending" && (
              <CheckinForm
                commitmentId={commitment.id}
                checkin={todayCheckin}
                proofType={commitment.proof_type}
              />
            )}

            {isOwner && (todayCheckin.status === "missed" || todayCheckin.status === "rejected") && (
              <div className="card">
                <h2>Vandaag</h2>
                <span className={`badge ${todayCheckin.status}`}>{STATUS_LABEL[todayCheckin.status]}</span>
                <div style={{ marginTop: 12 }}>
                  <DisputeButton checkinId={todayCheckin.id} commitmentId={commitment.id} />
                </div>
              </div>
            )}

            {isOwner && (todayCheckin.status === "approved" || todayCheckin.status === "disputed") && (
              <div className="card">
                <h2>Vandaag</h2>
                <span className={`badge ${todayCheckin.status}`}>{STATUS_LABEL[todayCheckin.status]}</span>
                {todayCheckin.status === "disputed" && (
                  <p className="hint">Wacht op een partner om dit te beslechten.</p>
                )}
              </div>
            )}

            {isPartner && todayCheckin.status === "submitted" && (
              <div className="card">
                <h2>Te beoordelen</h2>
                {todayCheckin.proof_note && <p>Notitie: {todayCheckin.proof_note}</p>}
                <p className="hint">Wordt automatisch goedgekeurd na 24u als niemand afkeurt.</p>
                <RejectButton checkinId={todayCheckin.id} commitmentId={commitment.id} />
              </div>
            )}

            {isPartner && todayCheckin.status === "disputed" && (
              <div className="card">
                <h2>Betwisting</h2>
                <p>Reden van de eigenaar: {todayCheckin.dispute_reason}</p>
                <ResolveDisputeButtons checkinId={todayCheckin.id} commitmentId={commitment.id} />
              </div>
            )}
          </>
        ) : (
          <div className="empty">Vandaag niet aan de beurt.</div>
        )}

        <div className="card">
          <h2>Geschiedenis</h2>
          {(withPhotoUrls || []).length === 0 && <div className="empty">Nog geen geschiedenis.</div>}
          {(withPhotoUrls || []).map((h) => (
            <div key={h.id} style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span>{h.due_date}</span>
                <span className={`badge ${h.status}`}>{STATUS_LABEL[h.status]}</span>
              </div>
              {h.proof_note && <div className="meta">{h.proof_note}</div>}
              {h.judgment_reason && <div className="meta">Reden afkeuring: {h.judgment_reason}</div>}
              {h.dispute_reason && <div className="meta">Betwisting: {h.dispute_reason}</div>}
              {h.photo_url && <img className="proof-photo" src={h.photo_url} alt="Bewijsfoto" />}
              {!h.photo_url && h.photo_deleted_at && (
                <div className="meta">Foto automatisch verwijderd na 1 week</div>
              )}
              {isOwner && (h.status === "missed" || h.status === "rejected") && (
                <div style={{ marginTop: 8 }}>
                  <DisputeButton checkinId={h.id} commitmentId={commitment.id} />
                </div>
              )}
              {isPartner && h.status === "disputed" && (
                <div style={{ marginTop: 8 }}>
                  <p className="meta">Betwisting: {h.dispute_reason}</p>
                  <ResolveDisputeButtons checkinId={h.id} commitmentId={commitment.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
