/* ============================================================
   Bluegrass Bedding — Events & Gallery Data
   ------------------------------------------------------------
   THIS IS THE ONLY FILE YOU NEED TO EDIT to add an event or a
   photo/social post to the Events page (events.html).

   Everything below is plain text between quotes. Keep the
   commas and the curly braces exactly where they are.
   ============================================================ */


/* ------------------------------------------------------------
   1) EVENTS WE SPONSOR
   ------------------------------------------------------------
   Copy the template below, paste it inside the [ ] brackets,
   and fill it in. Upcoming vs. past is worked out automatically
   from the date — you never have to move an event by hand.

   {
     name:        "Kentucky Spring Horse Show",     // required
     date:        "2026-05-06",                     // required — YYYY-MM-DD (first day)
     endDate:     "2026-05-10",                     // optional — last day, for multi-day events
     location:    "Kentucky Horse Park — Lexington, KY",
     role:        "Official Bedding Sponsor",       // the gold badge on the card
     description: "A sentence or two about the event and what we're doing there.",
     image:       "assets/events/ky-spring.jpg",    // optional — put the file in assets/events/
     link:        "https://kentuckyhorsepark.com/",  // optional — adds an "Event Details" button
     linkLabel:   "Event Details"                   // optional — defaults to "Event Details"
   },

   ------------------------------------------------------------ */

const BB_EVENTS = [

  // ── Add events here. Delete this comment once you have one. ──

];


/* ------------------------------------------------------------
   2) GALLERY — PRODUCT IN USE & SOCIAL POSTS
   ------------------------------------------------------------
   Three kinds of entries. Newest first is nice but not required
   (entries with a date are sorted newest-first automatically).

   --- A PHOTO YOU OWN ---------------------------------------
   Drop the image file into assets/gallery/ first.

   {
     type:    "photo",
     src:     "assets/gallery/keeneland-stall.jpg",  // required
     caption: "Fresh micro flake in the stakes barn at Keeneland.",
     credit:  "Photo: Sunrise Stables",              // optional
     event:   "Kentucky Spring Horse Show",          // optional — shows as a small tag
     date:    "2026-05-08"                           // optional — YYYY-MM-DD
   },

   --- AN INSTAGRAM POST -------------------------------------
   Open the post on instagram.com, click the "..." menu →
   "Embed" → or just copy the post's URL from the address bar.
   Paste that URL below. It must be a public post.

   {
     type:    "instagram",
     url:     "https://www.instagram.com/p/XXXXXXXXXXX/",   // required
     caption: "Optional line of your own text under the post.",
     event:   "Kentucky Spring Horse Show",                 // optional
     date:    "2026-05-08"                                  // optional
   },

   --- A FACEBOOK POST ---------------------------------------
   On the post, click the "..." menu → "Copy link", and paste
   it below. The post must be set to Public to embed.

   {
     type:    "facebook",
     url:     "https://www.facebook.com/somebarn/posts/1234567890",  // required
     caption: "Optional line of your own text under the post.",
     height:  600,                                  // optional — taller for long posts/videos
     event:   "Kentucky Spring Horse Show",         // optional
     date:    "2026-05-08"                          // optional
   },

   ------------------------------------------------------------ */

const BB_GALLERY = [

  {
    type:    "instagram",
    url:     "https://www.instagram.com/p/DbO3zg1EZUv/",
    caption: "Built has been bedded on Bluegrass since April — and he keeps finding the winner's circle."
    // Add   date: "YYYY-MM-DD"   here (the day the post went up) to control where it sorts.
  }

];


/* ------------------------------------------------------------
   3) PAGE SETTINGS
   ------------------------------------------------------------
   Social handles for the "tag us" call-to-action at the bottom
   of the page. Leave a value as an empty string ("") to hide
   that button.
   ------------------------------------------------------------ */

const BB_SOCIAL = {
  instagram: "https://www.instagram.com/bluegrass.bedding/",
  facebook:  "",   // paste your Page's full URL from the browser address bar
  email:     "info@bluegrassbedding.com"
};
