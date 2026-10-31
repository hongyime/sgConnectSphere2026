// Shared E10-S01/E10-S02 labels keep both review panels consistent.
export function arrangementReasons(item: { reasons: readonly string[]; governingHeadcount?: number | null; capacity?: number }) {
  return item.reasons.map(reason => {
    switch (reason) {
      case 'time': return 'date or time changed';
      case 'layout': return 'room layout changed';
      case 'accessibility': return 'accessibility requirements changed';
      case 'capacity': return item.governingHeadcount != null && item.capacity != null
        ? `${item.governingHeadcount} people for ${item.capacity} places` : 'attendance above capacity';
      default: return reason;
    }
  }).join('; ');
}
