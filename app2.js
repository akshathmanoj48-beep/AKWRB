const SUPABASE_URL = "https://uragaemotozdqatepatc.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Go83QxSuhFSibQ0ojyoNKw_8x1NmdJf";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const chpcontainer = document.querySelector(".Chps");

async function loadDashboard() {
  let { data: chapters, error } = await db
    .from("chapters")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching data:", error);
    return;
  }

  console.log("Cloud Data Received:", chapters);
  chpcontainer.innerHTML = "";

  chapters.forEach((chapter) => {
    let chpCard = document.createElement("a");
    chpCard.classList.add("links");

    // 💡 REMINDER CHECK
    if (chapter.reminder && chapter.reminder.trim() !== "") {
      chpCard.textContent = `🔔 ${chapter.title} [Reminder: ${chapter.reminder}]`;
    } else {
      chpCard.textContent = chapter.title;
    }

    // Set initial link styles based on cloud data
    if (chapter.url?.trim()) {
      chpCard.href = chapter.url;
      chpCard.target = "_blank";
    } else {
      chpCard.href = "#";
      chpCard.classList.remove("links");
      chpCard.classList.add("links-non");
      if (!chapter.reminder) {
        chpCard.textContent = `${chapter.title} (No URL Link)`;
      }
    }

    // 🛠️ SMART BOARD TOUCH ACCESS: Standard Click handles everything!
    chpCard.addEventListener("click", async (e) => {
      // Find out which radio button is currently checked in the HTML
      const currentMode = document.querySelector(
        'input[name="editMode"]:checked',
      ).value;

      // ---------------------------------------------------------
      // MODE 0: VIEW NOTES (Default)
      // ---------------------------------------------------------
      if (currentMode === "view") {
        if (!chapter.url?.trim()) {
          e.preventDefault(); // Stop page from jumping to the top
          alert("No notes uploaded for this chapter yet!");
        }
        return; // Let the browser open the green links normally!
      }

      // ---------------------------------------------------------
      // EDIT MODES: Block normal link behavior while editing
      // ---------------------------------------------------------
      e.preventDefault();

      // ---------------------------------------------------------
      // MODE 1: UPDATE LINK
      // ---------------------------------------------------------
      if (currentMode === "link") {
        let newUrl = prompt(
          `[Link Mode] Enter resource link for "${chapter.title}":`,
          chapter.url || "",
        );

        if (newUrl !== null) {
          console.log(`Updating link for ID ${chapter.id}...`);
          const { error: updateError } = await db
            .from("chapters")
            .update({ url: newUrl.trim() })
            .eq("id", chapter.id);

          if (!updateError) loadDashboard();
          else alert("Error saving link: " + updateError.message);
        }
      }

      // ---------------------------------------------------------
      // MODE 2: SEND REMINDER MAIL
      // ---------------------------------------------------------
      else if (currentMode === "reminder") {
        let newReminder = prompt(
          `[Reminder Mode] Enter note to email for "${chapter.title}":`,
          chapter.reminder || "",
        );

        if (newReminder !== null) {
          console.log(`Saving reminder for ID ${chapter.id}...`);
          const { error: updateError } = await db
            .from("chapters")
            .update({ reminder: newReminder.trim() })
            .eq("id", chapter.id);

          if (!updateError) {
            console.log("Reminder saved! Dispatching email...");

            // Send the email via EmailJS (Keeping your working configuration!)
            emailjs
              .send("service_n1nt9un", "template_0qgcysk", {
                chapter_title: chapter.title,
                reminder_note: newReminder.trim() || "None",
              })
              .then(
                function (response) {
                  console.log("Email sent!", response.status);
                },
                function (error) {
                  console.error("Email failed...", error);
                },
              );

            loadDashboard();
          } else {
            alert("Error saving reminder: " + updateError.message);
          }
        }
      }
    });

    chpcontainer.appendChild(chpCard);
  });
}

loadDashboard();
