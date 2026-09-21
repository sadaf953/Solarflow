export async function loadDeliveryBatches(client) {
    const {data, error} = await client.from('delivery_batches').select('*').order('created_at', {ascending: false});
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Delivery batch response was incomplete.');
    return data;
}
