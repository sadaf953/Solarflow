// Restricted roles must never fall back to the company-wide metrics endpoint.
export async function loadDashboardMetrics(client, { restricted, partner = null, dealer = null }) {
    let result = await client.rpc(restricted ? 'get_cpo_dashboard_metrics' : 'get_dashboard_metrics_scoped', {
        ...(!restricted ? { p_channel_partner: partner } : {}),
        p_dealer: dealer,
    });
    if (result.error && !restricted) {
        result = await client.rpc('get_dashboard_metrics', { p_channel_partner: partner });
    }
    return result;
}
