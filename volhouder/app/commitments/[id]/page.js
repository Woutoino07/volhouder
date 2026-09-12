import Link from "next/link";
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
import DeleteCommitmentButton from "./DeleteCommitmentButton";
import { ArrowLeft, Pencil, Flame, Users, Clock, CheckCircle2 } from "lucide-react";

const STATUS_LABEL = {
  pending: "nog te doen",
  submitted: "ingediend, wacht op beoordeling",
  approved: "gelukt",
  rejected: "afgekeurd",
  missed: "gemist",
  disputed: "betwist",
};

const FREQ_LABEL = {
  daily: "dagelijks",
  weekly: "wekelijks",
  once: "eenmalig",
};

function formatDay(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).getDate();
}

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
          <div style={{ paddingTop: 20 }}>
            <div className="error-box">Deze commitment bestaat niet (meer), of je hebt er geen toegang toe.</div>
            <Link href="/" className="btn secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <ArrowLeft size={16} strokeWidth={1.75} /> Terug naar home
            </Link>
          </div>
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
    .limit(120);

  const stats = computeStats(history || []);

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
        <div className="detail-header">
          <Link href="/" className="back-btn">
            <ArrowLeft size={16} strokeWidth={1.75} />
          </Link>
          <h1>{commitment.title}</h1>
        </div>

        {!commitment.active && (
          <div className="warn-box">
            Gepauzeerd{commitment.deactivated_at ? ` sinds ${new Date(commitment.deactivated_at).toLocaleDateString("nl-BE")}` : ""}. Er worden geen nieuwe check-ins aangemaakt.
          </div>
        )}

        {stats.total > 0 && (
          <>
            <div className="stats-row">
              <div className="stat-chip">
                <div className="value" style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
                  {stats.streak > 0 && <Flame size={16} strokeWidth={1.75} style={{ color: "var(--warning)" }} />}
                  {stats.streak}
                </div>
                <div className="label">Op rij</div>
              </div>
              <div className="stat-chip">
                <div className="value">{stats.rate}%</div>
                <div className="label">Slaagrate</div>
              </div>
              {stats.longestStreak > 0 && (
                <div className="stat-chip">
                  <div className="value">{stats.longestStreak}</div>
                  <div className="label">Beste streak</div>
                </div>
              )}
              <div className="stat-chip">
                <div className="value">{stats.successCount}/{stats.total}</div>
                <div className="label">Geslaagd</div>
              </div>
              <div className="stat-chip">
                <div className="value">€{Number(commitment.money_stake).toFixed(0)}</div>
                <div className="label">Inzet</div>
              </div>
            </div>
            <p className="motivation-text">
              {stats.streak === 0
                ? "Vandaag is dag 1 — de start van iets groots."
                : stats.streak < 7
                ? "Je bent op weg. Hou vol!"
                : stats.streak < 30
                ? "Een week+ op rij — je bouwt echt een gewoonte."
                : "Indrukwekkend. Dit is wie je bent geworden."}
            </p>
          </>
        )}

        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: commitment.description ? 10 : 0 }}>
            <span className="badge freq">{FREQ_LABEL[commitment.frequency]}</span>
            <span className="badge freq" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Clock size={12} strokeWidth={1.75} /> {commitment.deadline_time?.slice(0, 5)}
            </span>
            {partners.length > 0 && (
              <span className="badge freq" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                <Users size={12} strokeWidth={1.75} /> {partners.map((p) => p.profile?.display_name || p.profile?.email).join(", ")}
              </span>
            )}
            {!isOwner && commitment.owner && (
              <span className="badge freq">
                Eigenaar: {commitment.owner.display_name || commitment.owner.email}
              </span>
            )}
          </div>
          {commitment.description && (
            <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>{commitment.description}</p>
          )}
        </div>

        {todayCheckin ? (
          <>
            {isOwner && todayCheckin.status === "pending" && (
              <CheckinForm
                commitmentId={commitment.id}
                checkin={todayCheckin}
                proofType={commitment.proof_type}
                deadlineTime={commitment.deadline_time?.slice(0, 5)}
              />
            )}

            {isOwner && (todayCheckin.status === "missed" || todayCheckin.status === "rejected") && (
              <div className="card">
                <h2>Vandaag</h2>
                <span className={`badge ${todayCheckin.status}`}>{STATUS_LABEL[todayCheckin.status]}</span>
                <p style={{ margin: "8px 0 12px", fontSize: 13, color: "var(--muted)" }}>
                  Niet erg — morgen is een nieuwe kans.
                </p>
                <DisputeButton checkinId={todayCheckin.id} commitmentId={commitment.id} />
              </div>
            )}

            {isOwner && todayCheckin.status === "approved" && (
              <div className="card">
                <h2>Vandaag</h2>
                <span className={`badge approved`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle2 size={13} strokeWidth={1.75} /> Gelukt vandaag!
                </span>
              </div>
            )}

            {isOwner && (todayCheckin.status === "disputed") && (
              <div className="card">
                <h2>Vandaag</h2>
                <span className={`badge ${todayCheckin.status}`}>{STATUS_LABEL[todayCheckin.status]}</span>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>Wacht op een partner om dit te beslechten.</p>
              </div>
            )}

            {isOwner && todayCheckin.status === "submitted" && (
              <div className="card">
                <h2>Vandaag</h2>
                <span className={`badge submitted`}>{STATUS_LABEL["submitted"]}</span>
                <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={13} strokeWidth={1.75} /> Wacht op beoordeling — wordt automatisch goedgekeurd na 24u
                </p>
              </div>
            )}

            {isPartner && todayCheckin.status === "submitted" && (
              <div className="card">
                <h2>Te beoordelen</h2>
                {todayCheckin.proof_note && (
                  <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 10px" }}>
                    {todayCheckin.proof_note}
                  </p>
                )}
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
                  Wordt automatisch goedgekeurd na 24u als niemand afkeurt.
                </p>
                <RejectButton checkinId={todayCheckin.id} commitmentId={commitment.id} />
              </div>
            )}

            {isPartner && todayCheckin.status === "disputed" && (
              <div className="card">
                <h2>Betwisting</h2>
                <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 12px" }}>
                  Reden: {todayCheckin.dispute_reason}
                </p>
                <ResolveDisputeButtons checkinId={todayCheckin.id} commitmentId={commitment.id} />
              </div>
            )}
          </>
        ) : (
          <div className="card">
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Vandaag niet aan de beurt.</p>
          </div>
        )}

        {isOwner && (
          <div className="card-section">
            <div className="card-section-header">
              <h2>Partners</h2>
            </div>
            <div style={{ padding: "0 16px" }}>
              {partners.length === 0 && (
                <div style={{ padding: "12px 0" }}>
                  <p style={{ margin: "0 0 4px", fontSize: 14, color: "var(--black)", fontWeight: 600 }}>
                    Voeg een accountability-partner toe.
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                    Mensen met een partner halen hun doelen 65% vaker.
                  </p>
                </div>
              )}
              {partners.map((p) => (
                <div key={p.profile_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 14 }}>{p.profile?.display_name || p.profile?.email}</span>
                  <RemovePartnerButton commitmentId={commitment.id} profileId={p.profile_id} />
                </div>
              ))}
              <div style={{ padding: "12px 0" }}>
                <AddPartnerForm commitmentId={commitment.id} />
              </div>
            </div>
            <div style={{ padding: "0 16px 14px" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <PauseButton commitmentId={commitment.id} active={commitment.active} />
                <Link href={`/commitments/${commitment.id}/edit`} className="btn secondary" style={{ flex: 1, justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Pencil size={14} strokeWidth={1.75} /> Bewerken
                </Link>
              </div>
              <DeleteCommitmentButton commitmentId={commitment.id} />
            </div>
          </div>
        )}


        <div className="card-section">
          <div className="card-section-header">
            <h2>Geschiedenis</h2>
          </div>
          <div style={{ padding: 16 }}>
            {(withPhotoUrls || []).length === 0 && (
              <div className="empty">Je geschiedenis verschijnt hier. Maak vandaag je eerste check-in.</div>
            )}

            {withPhotoUrls.length > 0 && (
              <>
                <div className="legend" style={{ marginBottom: 8 }}>
                  <span><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#16A34A",marginRight:4}}/>gelukt</span>
                  <span><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#DC2626",marginRight:4}}/>gemist</span>
                  <span><span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#D97706",marginRight:4}}/>pending</span>
                </div>
                <div className="history-dots" style={{ marginBottom: 16 }}>
                {withPhotoUrls.slice(0, 28).map((h) => (
                  <div
                    key={h.id}
                    className={`history-dot ${h.status}`}
                    title={`${h.due_date}: ${STATUS_LABEL[h.status]}`}
                  >
                    {formatDay(h.due_date)}
                  </div>
                ))}
                </div>
              </>
            )}

            {(withPhotoUrls || []).map((h) => (
              <div key={h.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{h.due_date}</span>
                  <span className={`badge ${h.status}`}>{STATUS_LABEL[h.status]}</span>
                </div>
                {h.proof_note && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{h.proof_note}</div>}
                {h.judgment_reason && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Reden afkeuring: {h.judgment_reason}</div>}
                {h.dispute_reason && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Betwisting: {h.dispute_reason}</div>}
                {h.photo_url && <img className="proof-photo" src={h.photo_url} alt="Bewijsfoto" />}
                {!h.photo_url && h.photo_deleted_at && (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Foto automatisch verwijderd na 1 week</div>
                )}
                {isOwner && (h.status === "missed" || h.status === "rejected") && (
                  <div style={{ marginTop: 8 }}>
                    <DisputeButton checkinId={h.id} commitmentId={commitment.id} />
                  </div>
                )}
                {isPartner && h.status === "disputed" && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 8px" }}>Betwisting: {h.dispute_reason}</p>
                    <ResolveDisputeButtons checkinId={h.id} commitmentId={commitment.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
