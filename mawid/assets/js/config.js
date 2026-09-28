/* AICore Mawʿid — backend configuration (Supabase).
 * These two values are PUBLIC by design: the "anon" / "publishable" key only allows what the
 * Row Level Security rules in backend/schema.sql allow (create a booking, read your own booking
 * with its secret token, list taken slots). NEVER put the service_role / secret key here.
 * Leave both empty to run in offline demo mode (bookings stay on the patient's phone). */
window.MAWID_CONFIG = {
  supabaseUrl: 'https://qdevddftobdzqmibqmbg.supabase.co',
  supabaseKey: 'sb_publishable_I3ujtYV7YMaPT4tA-GkOGw_xvT_D34K',
  pollPatientMs: 15000,   // "Mes rendez-vous" refresh interval
  pollStaffMs: 8000       // dashboard refresh interval
};
