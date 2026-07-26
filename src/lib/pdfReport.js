import { jsPDF } from 'jspdf';

// Best-effort: fetch an image URL and convert it to a data URI so jsPDF can
// embed it. If the fetch fails (CORS, deleted file, offline), we skip the
// image rather than fail the whole report.
async function toDataUri(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const SEVERITY_LABEL = {
  ok: 'OK',
  pre_existing_damage: 'Pre-existing damage',
  needs_attention: 'Needs attention',
  damage_occurred: 'Damage occurred',
};

function formatMinutes(mins) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Builds a branded job report PDF and returns a Blob.
 * @param {object} params
 * @param {object} params.job
 * @param {object} params.property
 * @param {object} params.customer
 * @param {object} params.company
 * @param {object[]} params.rooms
 * @param {object[]} params.clockEvents
 */
export async function buildJobReportPdf({ job, property, customer, company, rooms, clockEvents }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  const brandColor = company?.brand_primary_color || '#111827';

  doc.setFontSize(18);
  doc.setTextColor(brandColor);
  doc.text(company?.name || 'Job Report', margin, y);
  y += 22;

  doc.setFontSize(11);
  doc.setTextColor('#111827');
  doc.text(`Job report — ${(job.job_type || '').replace(/_/g, ' ')}`, margin, y);
  y += 20;

  doc.setDrawColor('#e5e7eb');
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  const clockIn = clockEvents.find((c) => c.event_type === 'clock_in');
  const clockOut = clockEvents.find((c) => c.event_type === 'clock_out');
  const durationMins = clockIn && clockOut
    ? (new Date(clockOut.timestamp) - new Date(clockIn.timestamp)) / 60000
    : null;

  const addRow = (label, value) => {
    doc.setFontSize(10);
    doc.setTextColor('#6b7280');
    doc.text(label, margin, y);
    doc.setTextColor('#111827');
    doc.text(String(value ?? '—'), margin + 130, y);
    y += 16;
  };

  addRow('Customer', customer?.name);
  addRow('Property', [property?.address_line1, property?.city, property?.postcode].filter(Boolean).join(', '));
  addRow('Scheduled', job.scheduled_start ? new Date(job.scheduled_start).toLocaleString() : '—');
  addRow('Clock in', clockIn ? new Date(clockIn.timestamp).toLocaleTimeString() : '—');
  addRow('Clock out', clockOut ? new Date(clockOut.timestamp).toLocaleTimeString() : '—');
  addRow('Time on site', formatMinutes(durationMins));
  if (clockIn?.flagged || clockOut?.flagged) {
    doc.setTextColor('#b45309');
    doc.text('⚠ GPS location flagged for admin review on this job', margin, y);
    doc.setTextColor('#111827');
    y += 16;
  }
  y += 8;

  for (const room of rooms) {
    if (y > 680) { doc.addPage(); y = margin; }

    doc.setFontSize(13);
    doc.setTextColor(brandColor);
    doc.text(room.name, margin, y);
    doc.setFontSize(9);
    doc.setTextColor('#6b7280');
    doc.text(SEVERITY_LABEL[room.severity_flag] || 'OK', pageWidth - margin - 100, y);
    y += 16;

    if (room.initial_notes) {
      doc.setFontSize(9.5);
      doc.setTextColor('#374151');
      const lines = doc.splitTextToSize(`Before: ${room.initial_notes}`, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 4;
    }

    const photoRow = async (urls, caption) => {
      if (!urls?.length) return;
      doc.setFontSize(8.5);
      doc.setTextColor('#9ca3af');
      doc.text(caption, margin, y);
      y += 10;
      const thumbSize = 70;
      let x = margin;
      for (const url of urls.slice(0, 6)) {
        const dataUri = await toDataUri(url);
        if (dataUri) {
          try {
            doc.addImage(dataUri, x, y, thumbSize, thumbSize, undefined, 'FAST');
          } catch {
            // Skip malformed/unsupported image rather than fail the report
          }
        }
        x += thumbSize + 8;
        if (x + thumbSize > pageWidth - margin) { x = margin; y += thumbSize + 8; }
      }
      y += thumbSize + 12;
    };

    await photoRow(room.before_photos, 'Before');
    if (y > 680) { doc.addPage(); y = margin; }
    await photoRow(room.after_photos, 'After');

    if (room.completion_notes) {
      if (y > 700) { doc.addPage(); y = margin; }
      doc.setFontSize(9.5);
      doc.setTextColor('#374151');
      const lines = doc.splitTextToSize(`Completion: ${room.completion_notes}`, pageWidth - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 4;
    }

    doc.setDrawColor('#f3f4f6');
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;
  }

  if (job.special_instructions) {
    if (y > 650) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setTextColor(brandColor);
    doc.text('Notes & flagged issues', margin, y);
    y += 16;
    doc.setFontSize(9.5);
    doc.setTextColor('#374151');
    const lines = doc.splitTextToSize(job.special_instructions, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 10;
  }

  if (y > 700) { doc.addPage(); y = margin; }
  doc.setDrawColor('#e5e7eb');
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;
  doc.setFontSize(9);
  doc.setTextColor('#6b7280');
  doc.text(`Report generated ${new Date().toLocaleString()} — staff sign-off confirmed on clock-out.`, margin, y);

  return doc.output('blob');
}
