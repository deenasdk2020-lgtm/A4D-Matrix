(function () {
  const DEFAULTS = {
    autoplayDelay: 2500,
    idleDelay: 5000,
    wheelDelay: 300,
    swipeThreshold: 60
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const wrapIndex = (index, length) => ((index % length) + length) % length;

  const shortestOffset = (currentIndex, index, length) => {
    const raw = index - currentIndex;
    return raw - Math.round(raw / length) * length;
  };

  const createElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const renderShell = (root, members) => {
    root.textContent = "";

    const title = createElement("h2", "team-coverflow-title", "OUR TEAM");
    const stack = createElement("div", "team-coverflow-stack");
    const caption = createElement("div", "team-carousel-caption");
    const name = createElement("strong", "team-member-name");
    const role = createElement("span", "team-member-role");

    stack.tabIndex = 0;
    stack.setAttribute("role", "region");
    stack.setAttribute("aria-label", "Team member carousel. Use the left and right arrow keys to change members.");
    caption.setAttribute("aria-live", "polite");

    const cards = members.map((member, index) => {
      const card = createElement("article", "member-hotspot");

      card.dataset.index = String(index);
      card.setAttribute("aria-label", `${member.name}, ${member.role}`);

      if (member.image) {
        const image = createElement("img");
        image.src = member.image;
        image.alt = `${member.name}, ${member.role}`;
        card.append(image);
      }

      stack.append(card);
      return card;
    });

    caption.append(name, role);
    root.append(title, stack, caption);

    return { stack, cards, caption, name, role };
  };

  const createCoverflow = (root, options) => {
    const members = options.members || [];
    const settings = { ...DEFAULTS, ...options };

    if (!root || !members.length) return null;

    const elements = renderShell(root, members);
    let currentIndex = 0;
    let isPaused = false;
    let dragIntent = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let isDragging = false;
    let suppressClickUntil = 0;
    let lastWheelAt = 0;
    let autoplayTimer = null;
    let idleTimer = null;

    const render = () => {
      elements.cards.forEach((card, index) => {
        const offset = shortestOffset(currentIndex, index, members.length);
        const clampedOffset = Math.max(-2, Math.min(2, offset));
        const isVisible = Math.abs(offset) <= 2;

        card.style.setProperty("--team-offset", String(clampedOffset));
        card.style.zIndex = String(30 - Math.abs(clampedOffset));
        card.classList.toggle("is-visible", isVisible);
        card.classList.toggle("is-front", offset === 0);
        card.classList.toggle("is-adjacent", Math.abs(offset) === 1);
        card.classList.toggle("is-outer", Math.abs(offset) === 2);
        card.hidden = !isVisible;
        card.setAttribute("aria-hidden", offset === 0 ? "false" : "true");
      });

      elements.name.textContent = members[currentIndex].name;
      elements.role.textContent = members[currentIndex].role;
      const nameHalfWidth = elements.name.getBoundingClientRect().width / 2;
      const lineOuterOffset = 150;
      const nameGap = 12;
      const lineWidth = Math.max(20, lineOuterOffset - nameHalfWidth - nameGap);
      elements.caption.style.setProperty("--team-line-width", `${lineWidth}px`);
    };

    const goTo = (index, manual = false) => {
      currentIndex = wrapIndex(index, members.length);
      render();
      if (manual) pauseForManualInput();
    };

    const goBy = (direction, manual = false) => {
      goTo(currentIndex + direction, manual);
    };

    const stopAutoplay = () => {
      if (autoplayTimer) window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    };

    const startAutoplay = () => {
      stopAutoplay();
      isPaused = false;
      if (prefersReducedMotion) return;
      autoplayTimer = window.setInterval(() => {
        if (!isPaused) goBy(1);
      }, settings.autoplayDelay);
    };

    function pauseForManualInput() {
      isPaused = true;
      stopAutoplay();
      if (idleTimer) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(startAutoplay, settings.idleDelay);
    }

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      isDragging = true;
      dragIntent = null;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      try {
        elements.stack.setPointerCapture?.(event.pointerId);
      } catch (error) {
        /* Pointer capture can fail if the browser cancels the pointer first. */
      }
    };

    const onPointerMove = (event) => {
      if (!isDragging) return;

      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;
      if (!dragIntent && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 8) {
        dragIntent = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      }

      if (dragIntent === "horizontal") event.preventDefault();
    };

    const onPointerUp = (event) => {
      if (!isDragging) return;

      const deltaX = event.clientX - dragStartX;
      try {
        elements.stack.releasePointerCapture?.(event.pointerId);
      } catch (error) {
        /* Pointer capture may already be released by the browser. */
      }
      isDragging = false;

      if (dragIntent === "horizontal" && Math.abs(deltaX) >= settings.swipeThreshold) {
        goBy(deltaX < 0 ? 1 : -1, true);
        suppressClickUntil = performance.now() + 350;
      }
      dragIntent = null;
    };

    elements.stack.addEventListener("pointerdown", onPointerDown, { passive: true });
    elements.stack.addEventListener("pointermove", onPointerMove, { passive: false });
    elements.stack.addEventListener("pointerup", onPointerUp, { passive: true });
    elements.stack.addEventListener("pointercancel", onPointerUp, { passive: true });
    elements.stack.addEventListener("lostpointercapture", onPointerUp, { passive: true });
    window.addEventListener("resize", render);
    elements.stack.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      event.preventDefault();
      goBy(event.key === "ArrowLeft" ? -1 : 1, true);
    });
    elements.stack.addEventListener("wheel", (event) => {
      const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;
      if (!delta) return;

      event.preventDefault();
      const now = performance.now();
      if (now - lastWheelAt < settings.wheelDelay) return;
      lastWheelAt = now;
      goBy(Math.sign(delta), true);
    }, { passive: false });

    elements.cards.forEach((card, index) => {
      card.addEventListener("click", () => {
        if (performance.now() < suppressClickUntil) return;
        if (index !== currentIndex) goTo(index, true);
      });
    });

    render();
    startAutoplay();

    return {
      goTo: (index) => goTo(index, true),
      destroy: () => {
        stopAutoplay();
        if (idleTimer) window.clearTimeout(idleTimer);
      }
    };
  };

  window.TeamCoverflow = {
    mount(selector, options) {
      const root = typeof selector === "string" ? document.querySelector(selector) : selector;
      return createCoverflow(root, options || {});
    }
  };
})();
