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

  // Mobile position indicator (hidden on desktop via CSS) — one dot per
  // trigger, active one highlighted in renderAt.
  const dotsContainer = document.getElementById('lightbox-dots');
  const dots: HTMLElement[] = [];
  if (dotsContainer && triggers.length > 1) {
    for (const _ of triggers) {
      const dot = document.createElement('span');
      dot.className = 'lightbox-dot';
      dotsContainer.appendChild(dot);
      dots.push(dot);
    }
  }

  function renderAt(index: number) {
    // Hiding the previously-visible <video> (or <img>) while it holds focus
    // forces the browser to hand focus to the dialog's first focusable
    // child — Close — which is what made Close pick up a stray focus ring
    // after arrow-key/next navigation. Capture and restore it explicitly.
    const previouslyFocused = document.activeElement;

    current = ((index % triggers.length) + triggers.length) % triggers.length;
    const trigger = triggers[current];
    if (caption) caption.textContent = trigger.dataset.caption ?? '';
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));

    if (trigger.dataset.video) {
      if (img) img.hidden = true;
      video!.hidden = false;
      video!.src = trigger.dataset.video;
      video!.play().catch(() => {});
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

  prevBtn?.addEventListener('click', () => renderAt(current - 1));
  nextBtn?.addEventListener('click', () => renderAt(current + 1));

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      renderAt(current - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      renderAt(current + 1);
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
  const SWIPE_THRESHOLD = 40;
  let touchStartX = 0;
  let touchStartY = 0;
  dialog.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true },
  );
  dialog.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      // Ignore mostly-vertical drags so scrolling/dismissing isn't hijacked.
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      renderAt(dx < 0 ? current + 1 : current - 1);
    },
    { passive: true },
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLightbox);
} else {
  initLightbox();
}
