// Album settings for the real site. supabaseUrl and supabaseAnonKey come from the Supabase project.
// Each person signs in with their own email (any address, it is only a username) and password,
// so favourites and personal albums stay private.
window.CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://psqfybfbwmrpkehizlnp.supabase.co",
  supabaseAnonKey: "sb_publishable_RX_6jeOvBASlD1lQjUBGKQ_-akalsZi",
  met: 1976,
  married: 1986,
  people: [
    { id: "mamma", name: "Mamma", email: "mamma@album.invalid", partner: "papa", desc: "Racconta i tuoi ricordi" },
    { id: "papa", name: "Papà", email: "papa@album.invalid", partner: "mamma", desc: "Racconta i tuoi ricordi" },
    { id: "giorgio", name: "Giorgio", email: "giorgio@album.invalid", desc: "Il figlio" },
  ],
};
