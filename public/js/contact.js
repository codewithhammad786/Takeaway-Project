async function loadReviews() {
  const container = document.getElementById('reviews-list');
  try {
    const reviews = await apiRequest('/reviews');

    if (!reviews.length) {
      container.innerHTML = '<p class="empty-state">No reviews yet — be the first to leave one below!</p>';
      return;
    }

    container.innerHTML = reviews
      .map(
        (review) => `
      <div class="review-card">
        <div class="review-card-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
        <p class="review-card-comment">"${escapeHtml(review.comment)}"</p>
        <p class="review-card-name">— ${escapeHtml(review.name)}</p>
      </div>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = '<p class="empty-state">Couldn\'t load reviews right now.</p>';
  }
}

function initStarPicker() {
  const picker = document.getElementById('star-picker');
  const ratingInput = document.getElementById('review-rating');
  const stars = Array.from(picker.querySelectorAll('button'));

  function paint(rating) {
    stars.forEach((star) => {
      star.classList.toggle('star-filled', Number(star.getAttribute('data-star')) <= rating);
    });
  }

  stars.forEach((star) => {
    star.addEventListener('click', () => {
      const rating = Number(star.getAttribute('data-star'));
      ratingInput.value = rating;
      paint(rating);
    });
    star.addEventListener('mouseenter', () => paint(Number(star.getAttribute('data-star'))));
  });
  picker.addEventListener('mouseleave', () => paint(Number(ratingInput.value)));
}

document.addEventListener('DOMContentLoaded', () => {
  loadReviews();
  initStarPicker();

  const form = document.getElementById('review-form');
  const feedback = document.getElementById('review-feedback');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.hidden = true;

    const name = document.getElementById('review-name').value;
    const rating = Number(document.getElementById('review-rating').value);
    const comment = document.getElementById('review-comment').value;

    if (!rating) {
      feedback.textContent = 'Please choose a star rating.';
      feedback.className = 'feedback error';
      feedback.hidden = false;
      return;
    }

    try {
      const result = await apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({ name, rating, comment }),
      });

      feedback.textContent = result.message;
      feedback.className = 'feedback success';
      feedback.hidden = false;
      form.reset();
      document.getElementById('review-rating').value = 0;
      document.querySelectorAll('#star-picker button').forEach((s) => s.classList.remove('star-filled'));
      showToast('Thanks for your feedback!', '⭐');
    } catch (err) {
      feedback.textContent = err.message;
      feedback.className = 'feedback error';
      feedback.hidden = false;
    }
  });
});
