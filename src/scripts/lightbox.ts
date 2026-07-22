/* Shared lightbox for photo/video grids. Triggers are read in DOM order
   so the lightbox can carousel through them — click, arrow buttons, or
   ArrowLeft/ArrowRight — regardless of which one was opened first. Each
   trigger carries data-full/data-alt (images) or data-video (video,
   autoplays on open). */
function initLightbox() {
  const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
  const img = document.getElementById('lightbox-img') as HTMLImageElement | null;
  const video = document.getElementById('lightbox-video') as HTMLVideoElement | null;
  const caption = document.getElementById('lightbox-caption');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  if (!dialog || !img || !video) return;

  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-lightbox-trigger]'));
  if (triggers.length === 0) return;

  let current = 0;

  const polaroid = document.getElementById('lightbox-polaroid');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Warm the browser cache for the photos one step either side of the
  // current one, so the swipe-in animation never shows a half-decoded
  // image. Videos are skipped — preloading those is too heavy.
  function preloadNeighbors() {
    [current - 1, current + 1].forEach((i) => {
      const t = triggers[((i % triggers.length) + triggers.length) % triggers.length];
      if (t.dataset.full) new Image().src = t.dataset.full;
    });
  }

  // Touch-phone position indicator (hidden elsewhere via CSS) — one
  // tappable dot button per trigger, active one highlighted in renderAt.
  const dotsContainer = document.getElementById('lightbox-dots');
  const dots: HTMLElement[] = [];
  if (dotsContainer && triggers.length > 1) {
    triggers.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'lightbox-dot';
      dot.setAttribute('aria-label', `photo ${i + 1} of ${triggers.length}`);
      dot.addEventListener('click', () => renderAt(i));
      dotsContainer.appendChild(dot);
      dots.push(dot);
    });
  }

  function renderAt(index: number) {
    // Hiding the previously-visible <video> (or <img>) while it holds focus
    // forces the browser to hand focus to the dialog's first focusable
    // child — Close — which is what made Close pick up a stray focus ring
    // after arrow-key/next navigation. Capture and restore it explicitly.
    const previouslyFocused = document.activeElement;

    current = ((index % triggers.length) + triggers.length) % triggers.length;
    const trigger = triggers[current];
    if (caption) {
      const text = trigger.dataset.caption ?? '';
      caption.textContent = text;
      // Emoji-only captions get the jumbomoji treatment — see the
      // .lightbox-caption--emoji comment in Lightbox.astro. \u200d and
      // \ufe0f are the ZWJ and variation selector in compound emoji.
      const emojiOnly =
        text.trim().length > 0 &&
        /^[\p{Extended_Pictographic}\p{Emoji_Component}\u200d\ufe0f\s]+$/u.test(text);
      caption.classList.toggle('lightbox-caption--emoji', emojiOnly);
    }
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));

    // Announce the swap to assistive tech — focus stays parked on the
    // card, so without this, arrow/swipe navigation is silent.
    const status = document.getElementById('lightbox-status');
    if (status) {
      const name = trigger.dataset.caption || trigger.dataset.alt || '';
      status.textContent = `photo ${current + 1} of ${triggers.length}${name ? ` — ${name}` : ''}`;
    }

    if (trigger.dataset.video) {
      if (img) img.hidden = true;
      video!.hidden = false;
      video!.src = trigger.dataset.video;
      // Sound when allowed: browsers only permit unmuted play() inside a
      // user gesture, and the swipe toss swaps media after its animation
      // finishes — outside the gesture window — so that path rejects.
      // Fall back to muted autoplay; the controls offer unmute.
      video!.muted = false;
      video!.play().catch(() => {
        video!.muted = true;
        video!.play().catch(() => {});
      });
    } else {
      video!.hidden = true;
      video!.pause();
      video!.removeAttribute('src');
      if (img) {
        img.hidden = false;
        img.src = trigger.dataset.full ?? '';
        img.alt = trigger.dataset.alt ?? '';
      }
    }

    if (previouslyFocused instanceof HTMLElement && document.activeElement !== previouslyFocused) {
      previouslyFocused.focus({ preventScroll: true });
    }

    preloadNeighbors();
  }

  /* Button/arrow-key navigation gets a quick slide-and-settle on the
     incoming photo (crossfade-adjacent, ~75% the weight of the touch
     swipe's enter) so desktop isn't a hard cut either. `dir` is +1 for
     next (enters from the right), -1 for prev. */
  function navigate(dir: number) {
    renderAt(current + dir);
    if (reducedMotion.matches || !polaroid) return;
    polaroid.animate(
      [
        { opacity: 0.25, transform: `translateX(${dir * 18}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    );
  }

  triggers.forEach((trigger, i) => {
    trigger.addEventListener('click', () => {
      renderAt(i);
      dialog.showModal();
      // showModal() focuses the dialog's first focusable child — Close —
      // so the first ArrowLeft/ArrowRight would paint a focus ring on it
      // (keyboard input makes the pre-existing focus :focus-visible).
      // Park focus on the non-interactive card instead; Tab still reaches
      // Close normally.
      document.getElementById('lightbox-polaroid')?.focus();
    });
  });

  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigate(1);
    }
  });

  dialog.addEventListener('close', () => {
    video!.pause();
    video!.removeAttribute('src');
  });

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  // Touch swipe — the only way mobile visitors carousel through photos,
  // since the nav buttons are hidden there in favor of the dots.
  //
  // Instagram-carousel feel, tuned to the polaroid conceit: while the
  // finger is down the card tracks it with a little resistance and a
  // faint tilt (a photo being slid across a table, not a DOM node).
  // Releasing past the distance threshold — or flicking fast enough to
  // beat the velocity gate — tosses the card off-screen and glides the
  // next one in from the opposite side; anything less settles back.
  const SWIPE_THRESHOLD = 40;
  const FLICK_VELOCITY = 0.5; // px/ms — a quick flick commits below the distance threshold
  const DRAG_RESISTANCE = 0.55;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let dragging = false;
  let dragDx = 0;
  let swipeAnimating = false;

  function dragTransform(dx: number) {
    // The tilt is capped so a full-width drag can't wind the card up.
    const tilt = Math.max(-3, Math.min(3, dx * 0.02));
    return `translateX(${dx * DRAG_RESISTANCE}px) rotate(${tilt}deg)`;
  }

  function clearDrag() {
    dragging = false;
    dragDx = 0;
    if (polaroid) polaroid.style.transform = '';
  }

  // Commit: toss the card out (fast, accelerating — a throw), swap, then
  // ease the next one in from the opposite edge (slower, decelerating).
  function animateSwipe(dir: number) {
    if (!polaroid || reducedMotion.matches) {
      clearDrag();
      renderAt(current + dir);
      return;
    }
    swipeAnimating = true;
    const exitX = -dir * (window.innerWidth / 2 + polaroid.offsetWidth / 2);
    const exit = polaroid.animate(
      [
        { transform: dragTransform(dragDx), opacity: 1 },
        { transform: `translateX(${exitX}px) rotate(${-dir * 3}deg)`, opacity: 0.4 },
      ],
      { duration: 170, easing: 'cubic-bezier(0.4, 0, 1, 1)' },
    );
    // .finished settles even when the animation is cancelled (it rejects),
    // so the swap and the swipeAnimating unlock can never be stranded —
    // onfinish alone would leave the carousel stuck if e.g. the dialog
    // closes mid-toss.
    const swap = () => {
      clearDrag();
      renderAt(current + dir);
      const enter = polaroid.animate(
        [
          { transform: `translateX(${dir * 0.12 * polaroid.offsetWidth}px)`, opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      const unlock = () => (swipeAnimating = false);
      enter.finished.then(unlock, unlock);
    };
    exit.finished.then(swap, swap);
  }

  // Released below the threshold: glide back to rest.
  function settleBack() {
    if (!polaroid || !dragging) {
      clearDrag();
      return;
    }
    const from = dragTransform(dragDx);
    clearDrag();
    if (reducedMotion.matches) return;
    polaroid.animate([{ transform: from }, { transform: 'none' }], {
      duration: 260,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
  }

  dialog.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = e.timeStamp;
    },
    { passive: true },
  );

  dialog.addEventListener(
    'touchmove',
    (e) => {
      if (swipeAnimating || reducedMotion.matches || triggers.length < 2) return;
      // Touches that start on the video belong to its native controls
      // (scrubbing is horizontal); don't fight them with the drag.
      if (e.target === video) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      // Only claim clearly-horizontal gestures, so vertical scroll/dismiss
      // intent never smears the card sideways.
      if (!dragging && (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy))) return;
      dragging = true;
      dragDx = dx;
      if (polaroid) polaroid.style.transform = dragTransform(dx);
    },
    { passive: true },
  );

  dialog.addEventListener(
    'touchend',
    (e) => {
      if (swipeAnimating) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      const velocity = Math.abs(dx) / Math.max(1, e.timeStamp - touchStartTime);
      const horizontal = Math.abs(dx) > Math.abs(dy);
      const commit =
        horizontal &&
        (Math.abs(dx) >= SWIPE_THRESHOLD || (Math.abs(dx) >= 20 && velocity >= FLICK_VELOCITY));
      if (commit) {
        animateSwipe(dx < 0 ? 1 : -1);
      } else {
        settleBack();
      }
    },
    { passive: true },
  );

  dialog.addEventListener('touchcancel', settleBack, { passive: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLightbox);
} else {
  initLightbox();
}
