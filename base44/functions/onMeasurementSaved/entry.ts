/**
 * Auto-update Tortoise.last_weighed_date, weight_grams, shell_length_cm
 * saat MeasurementHistory baru disimpan.
 * Trigger: entity automation pada create/update MeasurementHistory
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const measurement = body.data;
    if (!measurement || !measurement.tortoise_id) {
      return Response.json({ ok: true, skip: "no tortoise_id" });
    }

    const updateData = {
      last_weighed_date: measurement.date || new Date().toISOString().split("T")[0],
    };
    if (measurement.weight_grams) updateData.weight_grams = measurement.weight_grams;
    if (measurement.shell_length_cm) updateData.shell_length_cm = measurement.shell_length_cm;

    await base44.asServiceRole.entities.Tortoise.update(measurement.tortoise_id, updateData);

    return Response.json({ ok: true, updated: updateData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});