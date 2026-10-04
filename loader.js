// Select all nav links
const navLinks = document.querySelectorAll(".navlink");

// Loop through each link
navLinks.forEach((link) => {
  link.addEventListener("click", function (event) {
    event.preventDefault(); // stop normal instant navigation

    const targetPage = this.getAttribute("href"); // get page name
    sessionStorage.setItem("nextPage", targetPage); // store it

    window.location.href = "loading.html"; // go to loader
  });
});
