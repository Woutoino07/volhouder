// Verwijdert bewijsfoto's ouder dan een week uit Storage, maar laat de
// check-in zelf (status, datum, notities) gewoon staan — enkel de foto
// verdwijnt. Wordt opportunistisch aangeroepen telkens de eigenaar de app
// opent (geen aparte cron-job nodig).
//
// RLS zorgt ervoor dat dit alleen foto's raakt van commitments waar de
// ingelogde gebruiker zelf owner van is (zie storage-policy in schema.sql).

const RETENTION_DAYS = 7;

// Throttle: max 1x per dag per userId (in-memory, reset bij server restart)
const lastRun = {};

export async function cleanupOldPhotos(supabase, userId) {
  const today = new Date().toISOString().slice(0, 10);
  if (lastRun[userId] === today) return;
  lastRun[userId] = today;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const { data: stale, error } = await supabase
    .from("check_ins")
    .select("id, photo_path, commitments!inner(owner_id)")
    .eq("commitments.owner_id", userId)
    .not("photo_path", "is", null)
    .lt("due_date", cutoffDate);

  if (error || !stale || stale.length === 0) {
    return;
  }

  const paths = stale.map((row) => row.photo_path).filter(Boolean);
  if (paths.length === 0) {
    return;
  }

  await supabase.storage.from("proofs").remove(paths);

  await supabase
    .from("check_ins")
    .update({ photo_path: null, photo_deleted_at: new Date().toISOString() })
    .in(
      "id",
      stale.map((row) => row.id)
    );
}
