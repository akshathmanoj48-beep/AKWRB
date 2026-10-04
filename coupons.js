(() => {
  const storageKey = "akairCouponSchedule";
  const legacyStorageKey = "akairActiveCoupon";
  let memoryState = null;

  function randomInteger(minimum, maximum) {
    return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
  }

  function createCouponCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let index = 0; index < 6; index++) {
      code += characters[Math.floor(Math.random() * characters.length)];
    }
    return code;
  }

  function createCoupon(now = Date.now()) {
    return {
      code: createCouponCode(),
      discount: randomInteger(10, 30),
      createdAt: now,
      expiresAt: now + randomInteger(20, 90) * 60 * 1000,
    };
  }

  function createNextOffer(now = Date.now()) {
    return {
      discount: randomInteger(10, 30),
      availableAt: now + randomInteger(25, 120) * 60 * 1000,
    };
  }

  function isCouponRecord(coupon) {
    return (
      coupon &&
      /^[A-Z0-9]{6}$/.test(coupon.code) &&
      Number.isInteger(coupon.discount) &&
      coupon.discount >= 10 &&
      coupon.discount <= 30 &&
      Number.isFinite(coupon.createdAt) &&
      Number.isFinite(coupon.expiresAt)
    );
  }

  function isNextOffer(offer) {
    return (
      offer &&
      Number.isInteger(offer.discount) &&
      offer.discount >= 10 &&
      offer.discount <= 30 &&
      Number.isFinite(offer.availableAt)
    );
  }

  function readLegacyCoupon(now) {
    try {
      const coupon = JSON.parse(
        window.localStorage.getItem(legacyStorageKey) || "null",
      );
      if (isCouponRecord(coupon) && coupon.expiresAt > now) {
        return coupon;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function createInitialState(now) {
    const activeCoupon = readLegacyCoupon(now) || createCoupon(now);
    return {
      version: 2,
      activeCoupon,
      nextOffer: createNextOffer(now),
      recentCoupons: [activeCoupon],
      updatedAt: now,
    };
  }

  function saveState(state) {
    memoryState = state;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      // Keep the schedule available for this tab if browser storage is blocked.
    }
    try {
      window.localStorage.setItem(
        legacyStorageKey,
        JSON.stringify(state.activeCoupon),
      );
    } catch (error) {
      // Ignore legacy serialization failures.
    }
  }

  function getSchedule() {
    const now = Date.now();
    let state = memoryState;
    let changed = false;

    try {
      const storedState = JSON.parse(
        window.localStorage.getItem(storageKey) || "null",
      );
      if (
        storedState &&
        storedState.version === 2 &&
        isCouponRecord(storedState.activeCoupon) &&
        isNextOffer(storedState.nextOffer)
      ) {
        state = storedState;
      }
    } catch (error) {
      state = memoryState;
    }

    if (
      !state ||
      !isCouponRecord(state.activeCoupon) ||
      !isNextOffer(state.nextOffer)
    ) {
      state = createInitialState(now);
      changed = true;
    }

    if (state.activeCoupon.expiresAt <= now) {
      const replacement = createCoupon(now);
      state.activeCoupon = replacement;
      state.recentCoupons = [
        replacement,
        ...(Array.isArray(state.recentCoupons)
          ? state.recentCoupons
          : []
        ).filter((coupon) => isCouponRecord(coupon) && coupon.expiresAt > now),
      ].slice(0, 5);
      changed = true;
    }

    const validRecentCoupons = (
      Array.isArray(state.recentCoupons) ? state.recentCoupons : []
    )
      .filter((coupon) => isCouponRecord(coupon) && coupon.expiresAt > now)
      .filter((coupon) => coupon.code !== state.activeCoupon.code);

    state.recentCoupons = [state.activeCoupon, ...validRecentCoupons].slice(
      0,
      5,
    );

    if (state.nextOffer.availableAt <= now) {
      const replacement = createCoupon(now);
      state.activeCoupon = replacement;
      state.nextOffer = createNextOffer(now);
      state.recentCoupons = [
        replacement,
        ...(Array.isArray(state.recentCoupons)
          ? state.recentCoupons
          : []
        ).filter((coupon) => isCouponRecord(coupon) && coupon.expiresAt > now),
      ].slice(0, 5);
      changed = true;
    }

    if (state.version !== 2) {
      state.version = 2;
      changed = true;
    }

    state.updatedAt = now;
    memoryState = state;
    if (changed) saveState(state);
    return state;
  }

  function getActiveCoupon() {
    return getSchedule().activeCoupon;
  }

  function findCoupon(code) {
    const normalizedCode = String(code || "")
      .trim()
      .toUpperCase();
    if (!normalizedCode) return null;
    return (
      getSchedule().recentCoupons.find(
        (coupon) => coupon.code === normalizedCode,
      ) || null
    );
  }

  function formatCountdown(milliseconds) {
    const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const unit = (value, name) => `${value} ${name}${value === 1 ? "" : "s"}`;
    return `${unit(days, "Day")}, ${unit(hours, "Hour")}, ${unit(minutes, "Minute")}, ${unit(seconds, "Second")}`;
  }

  function renderCoupon() {
    const schedule = getSchedule();
    const coupon = schedule.activeCoupon;
    const offerLabel = "All flights + passenger fare";

    document.querySelectorAll("[data-coupon-code]").forEach((element) => {
      element.textContent = coupon.code;
    });
    document.querySelectorAll("[data-coupon-percent]").forEach((element) => {
      element.textContent = coupon.discount;
    });
    document.querySelectorAll("[data-coupon-product]").forEach((element) => {
      element.textContent = offerLabel;
    });
    document.querySelectorAll("[data-coupon-timer]").forEach((element) => {
      element.textContent = formatCountdown(coupon.expiresAt - Date.now());
    });
    document.querySelectorAll("[data-next-product]").forEach((element) => {
      element.textContent = offerLabel;
    });
    document.querySelectorAll("[data-next-percent]").forEach((element) => {
      element.textContent = schedule.nextOffer.discount;
    });
    document.querySelectorAll("[data-next-timer]").forEach((element) => {
      element.textContent = formatCountdown(
        schedule.nextOffer.availableAt - Date.now(),
      );
    });
  }

  async function copyCouponCode(button) {
    const code = getActiveCoupon().code;
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(code);
        } catch (error) {
          copyWithFallback(code);
        }
      } else {
        copyWithFallback(code);
      }
      button.textContent = "Copied!";
    } catch (error) {
      button.textContent = "Copy failed";
    }

    window.setTimeout(() => {
      button.textContent = "Copy code";
    }, 1800);
  }

  function copyWithFallback(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Clipboard copy failed");
  }

  function scheduleGradientSweep() {
    const banners = document.querySelectorAll(".coupon-banner, .coupon-offer");
    if (
      !banners.length ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    function scheduleNextSweep() {
      const delay = 18000 + Math.random() * 30000;
      window.setTimeout(() => {
        banners.forEach((banner) => banner.classList.add("is-gradient-moving"));
        window.setTimeout(() => {
          banners.forEach((banner) =>
            banner.classList.remove("is-gradient-moving"),
          );
          scheduleNextSweep();
        }, 2200);
      }, delay);
    }

    scheduleNextSweep();
  }

  window.AKAIRCoupon = Object.freeze({ getActiveCoupon, findCoupon });
  document.querySelectorAll("[data-copy-coupon]").forEach((button) => {
    button.addEventListener("click", () => copyCouponCode(button));
  });
  renderCoupon();
  scheduleGradientSweep();
  window.setInterval(renderCoupon, 1000);
  window.addEventListener("storage", (event) => {
    if (
      event.key === storageKey ||
      event.key === legacyStorageKey ||
      event.key === null
    ) {
      renderCoupon();
    }
  });
})();