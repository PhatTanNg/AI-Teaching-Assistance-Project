const clampBox = (value) => Math.max(1, Math.min(5, value));

const addDays = (baseDate, days) => {
  const next = new Date(baseDate);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

export const computeSrsUpdate = ({ currentBox, rating, now = new Date() }) => {
  const safeCurrentBox = clampBox(currentBox || 1);

  if (rating === 1) {
    return {
      srsBox: 1,
      nextReview: addDays(now, 1),
    };
  }

  if (rating === 2) {
    return {
      srsBox: safeCurrentBox,
      nextReview: addDays(now, 3),
    };
  }

  if (rating === 3) {
    const srsBox = clampBox(safeCurrentBox + 1);
    const days = srsBox === 5 ? 30 : srsBox * 2;
    return {
      srsBox,
      nextReview: addDays(now, days),
    };
  }

  if (rating === 4) {
    const srsBox = clampBox(safeCurrentBox + 2);
    const days = srsBox === 5 ? 30 : srsBox * 4;
    return {
      srsBox,
      nextReview: addDays(now, days),
    };
  }

  throw new Error('Invalid rating for SRS update');
};
