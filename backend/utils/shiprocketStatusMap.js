// Single source of truth for mapping Shiprocket's status vocabulary to our
// internal orderStatus / shiprocketStatus enums. Used by the webhook handler
// and by any on-demand live tracking refresh, so status logic never drifts
// between the two.

const STATUS_MAP = {
    'NEW': { orderStatus: 'Processing', shiprocketStatus: 'NEW' },
    'PICKUP SCHEDULED': { orderStatus: 'Processing', shiprocketStatus: 'PICKUP SCHEDULED' },
    'PICKUP GENERATED': { orderStatus: 'Processing', shiprocketStatus: 'PICKUP SCHEDULED' },
    'PICKUP RESCHEDULED': { orderStatus: 'Processing', shiprocketStatus: 'PICKUP SCHEDULED' },
    'PICKED UP': { orderStatus: 'Shipped', shiprocketStatus: 'PICKED UP' },
    'SHIPPED': { orderStatus: 'Shipped', shiprocketStatus: 'SHIPPED' },
    'IN TRANSIT': { orderStatus: 'Shipped', shiprocketStatus: 'IN_TRANSIT' },
    'REACHED AT DESTINATION HUB': { orderStatus: 'Shipped', shiprocketStatus: 'IN_TRANSIT' },
    'OUT FOR DELIVERY': { orderStatus: 'Out for delivery', shiprocketStatus: 'OUT_FOR_DELIVERY' },
    'DELIVERED': { orderStatus: 'Delivered', shiprocketStatus: 'DELIVERED' },
    'CANCELLED': { orderStatus: 'Cancelled', shiprocketStatus: 'CANCELLED' },
    'CANCELED': { orderStatus: 'Cancelled', shiprocketStatus: 'CANCELLED' },
    'RTO INITIATED': { orderStatus: 'Returned', shiprocketStatus: 'RTO_INITIATED' },
    'RTO ACKNOWLEDGED': { orderStatus: 'Returned', shiprocketStatus: 'RTO_INITIATED' },
    'RTO IN TRANSIT': { orderStatus: 'Returned', shiprocketStatus: 'RTO_INITIATED' },
    'RTO DELIVERED': { orderStatus: 'Returned', shiprocketStatus: 'RTO_DELIVERED' },
    'UNDELIVERED': { orderStatus: 'Failed', shiprocketStatus: 'UNDELIVERED' },
    'LOST': { orderStatus: 'Failed', shiprocketStatus: 'LOST' },
};

// Normalizes any raw Shiprocket status string (webhook `current_status`, or
// tracking API `shipment_track[0].current_status` / `current_status_body`)
// into our canonical { orderStatus, shiprocketStatus } pair.
// Returns null when the status is unrecognized, so callers can decide whether
// to leave the existing status untouched.
export const mapShiprocketStatus = (rawStatus) => {
    if (!rawStatus) return null;
    const normalized = rawStatus.toString().trim().toUpperCase();
    if (STATUS_MAP[normalized]) return STATUS_MAP[normalized];

    // Fallback substring matching for statuses Shiprocket phrases slightly
    // differently across the webhook vs. the tracking API.
    if (normalized.includes('OUT FOR DELIVERY') || normalized.includes('OUT_FOR_DELIVERY')) {
        return STATUS_MAP['OUT FOR DELIVERY'];
    }
    if (normalized.includes('RTO')) {
        return normalized.includes('DELIVERED') ? STATUS_MAP['RTO DELIVERED'] : STATUS_MAP['RTO INITIATED'];
    }
    if (normalized.includes('DELIVERED')) return STATUS_MAP['DELIVERED'];
    if (normalized.includes('UNDELIVERED') || normalized.includes('FAILED DELIVERY')) return STATUS_MAP['UNDELIVERED'];
    if (normalized.includes('CANCEL')) return STATUS_MAP['CANCELLED'];
    if (normalized.includes('TRANSIT')) return STATUS_MAP['IN TRANSIT'];
    if (normalized.includes('PICKED UP') || normalized.includes('SHIPPED')) return STATUS_MAP['SHIPPED'];
    if (normalized.includes('PICKUP')) return STATUS_MAP['PICKUP SCHEDULED'];
    if (normalized.includes('NEW')) return STATUS_MAP['NEW'];

    return null;
};

// Parses Shiprocket's various timestamp formats ('DD MM YYYY HH:MM:SS' from
// webhooks, or ISO-ish strings from the tracking API) into a valid Date,
// falling back to now if parsing fails.
export const parseShiprocketTimestamp = (rawTimestamp) => {
    if (rawTimestamp) {
        const parts = rawTimestamp.toString().match(/(\d{2}) (\d{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
            const parsed = new Date(`${parts[3]}-${parts[2]}-${parts[1]} ${parts[4]}:${parts[5]}:${parts[6]}`);
            if (!isNaN(parsed.getTime())) return parsed;
        }
        const direct = new Date(rawTimestamp);
        if (!isNaN(direct.getTime())) return direct;
    }
    return new Date();
};

// Builds a deduped, chronologically-sorted tracking history array by merging
// newly-seen activity entries into an existing history list. Entries are
// deduped on (status + date) so repeated webhook deliveries / live polls
// don't create duplicate timeline rows.
export const mergeTrackingHistory = (existingHistory = [], newEntries = []) => {
    const seen = new Set(existingHistory.map(e => `${e.status}|${new Date(e.date).getTime()}`));
    const merged = [...existingHistory];

    for (const entry of newEntries) {
        if (!entry || !entry.date) continue;
        const key = `${entry.status}|${new Date(entry.date).getTime()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(entry);
    }

    merged.sort((a, b) => new Date(a.date) - new Date(b.date));
    return merged;
};

export default { mapShiprocketStatus, parseShiprocketTimestamp, mergeTrackingHistory };
