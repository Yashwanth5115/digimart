(function () {
  "use strict";

  var header = document.getElementById("siteHeader");

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 6);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  var photo = document.querySelector(".hero-photo");

  function showPhotoFallback() {
    if (!photo) return;
    photo.style.display = "none";
    var card = photo.closest(".photo-card");
    if (card) card.classList.add("photo-missing");
  }

  if (photo) {
    photo.addEventListener("error", showPhotoFallback, { once: true });
    if (photo.complete && photo.naturalWidth === 0) showPhotoFallback();
  }

  var salesElement = document.getElementById("liveSales");

  if (salesElement) {
    var controller = new AbortController();
    var timeout = window.setTimeout(function () {
      controller.abort();
    }, 3000);

    var hostname = window.location.hostname || "127.0.0.1";
    var protocol = window.location.protocol === "https:" ? "https:" : "http:";
    var endpoint = protocol + "//" + hostname + ":5005/api/sv/summary";

    fetch(endpoint, { signal: controller.signal })
      .then(function (response) {
        if (!response.ok) throw new Error("Summary request failed");
        return response.json();
      })
      .then(function (payload) {
        var value = payload && payload.data && payload.data.today && payload.data.today.sales;
        if (typeof value !== "number" || !isFinite(value)) return;
        salesElement.textContent = new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0
        }).format(value);
        salesElement.setAttribute("aria-label", "Today's sales: " + value + " rupees");
      })
      .catch(function () {})
      .finally(function () {
        window.clearTimeout(timeout);
      });
  }
})();
