const VALID_TRANSITIONS = {
  active: ['assigned', 'cancelled'],
  assigned: ['en_route', 'cancelled'],
  en_route: ['arrived', 'cancelled'],
  arrived: ['resolved', 'cancelled'],
  resolved: [],
  cancelled: []
};

function isValidTransition(currentStatus, nextStatus) {
  if (!currentStatus || !nextStatus) return false;
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

function computeTimings(currentTimings = {}, nextStatus, triggerTimestamp = new Date().toISOString()) {
  const timings = { ...currentTimings };
  const now = new Date(triggerTimestamp).getTime();

  if (nextStatus === 'assigned' && timings.triggered_at) {
    const start = new Date(timings.triggered_at).getTime();
    timings.dispatch_delay_seconds = Math.max(0, Math.round((now - start) / 1000));
    timings.assigned_at = triggerTimestamp;
  } else if (nextStatus === 'arrived' && timings.assigned_at) {
    const start = new Date(timings.assigned_at).getTime();
    timings.response_time_seconds = Math.max(0, Math.round((now - start) / 1000));
    timings.arrived_at = triggerTimestamp;
  } else if (nextStatus === 'resolved' && timings.triggered_at) {
    const start = new Date(timings.triggered_at).getTime();
    timings.total_resolution_seconds = Math.max(0, Math.round((now - start) / 1000));
    timings.resolved_at = triggerTimestamp;
  } else if (nextStatus === 'cancelled') {
    timings.cancelled_at = triggerTimestamp;
  }

  return timings;
}

module.exports = {
  VALID_TRANSITIONS,
  isValidTransition,
  computeTimings
};