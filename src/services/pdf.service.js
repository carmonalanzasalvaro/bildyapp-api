import PDFDocument from 'pdfkit';

const formatDate = (value) => {
  if (!value) {
    return 'N/D';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: undefined
  }).format(new Date(value));
};

const formatAddress = (address) => {
  if (!address) {
    return 'N/D';
  }

  if (typeof address === 'string') {
    return address;
  }

  return [
    [address.street, address.number].filter(Boolean).join(' '),
    [address.postal, address.city].filter(Boolean).join(' '),
    address.province
  ].filter(Boolean).join(', ');
};

const writeLine = (doc, label, value) => {
  doc.font('Helvetica-Bold').text(`${label}: `, { continued: true });
  doc.font('Helvetica').text(value || 'N/D');
};

const writeWorkers = (doc, workers = []) => {
  if (workers.length === 0) {
    return;
  }

  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Trabajadores');

  for (const worker of workers) {
    doc.font('Helvetica').text(`- ${worker.name}: ${worker.hours} h`);
  }
};

export const pdfService = {
  async generateDeliveryNotePdfBuffer({ deliveryNote, signatureBuffer }) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text('Albarán', { align: 'center' });
      doc.moveDown();

      writeLine(doc, 'Empresa', deliveryNote.company?.name);
      writeLine(doc, 'CIF empresa', deliveryNote.company?.cif);
      writeLine(doc, 'Dirección empresa', formatAddress(deliveryNote.company?.address));
      doc.moveDown();

      writeLine(doc, 'Cliente', deliveryNote.client?.name);
      writeLine(doc, 'CIF cliente', deliveryNote.client?.cif);
      writeLine(doc, 'Dirección cliente', formatAddress(deliveryNote.client?.address));
      doc.moveDown();

      writeLine(doc, 'Proyecto', deliveryNote.project?.name);
      writeLine(doc, 'Código proyecto', deliveryNote.project?.projectCode);
      writeLine(doc, 'Dirección proyecto', formatAddress(deliveryNote.project?.address));
      doc.moveDown();

      writeLine(doc, 'Operario', deliveryNote.user?.fullName || deliveryNote.user?.email);
      writeLine(doc, 'Formato', deliveryNote.format);
      writeLine(doc, 'Fecha de trabajo', formatDate(deliveryNote.workDate));
      writeLine(doc, 'Descripción', deliveryNote.description);

      if (deliveryNote.format === 'material') {
        writeLine(doc, 'Material', deliveryNote.material);
        writeLine(doc, 'Cantidad', deliveryNote.quantity?.toString());
        writeLine(doc, 'Unidad', deliveryNote.unit);
      }

      if (deliveryNote.format === 'hours') {
        writeLine(doc, 'Horas', deliveryNote.hours?.toString());
        writeWorkers(doc, deliveryNote.workers);
      }

      doc.moveDown();
      writeLine(doc, 'Firmado', deliveryNote.signed ? 'Sí' : 'No');

      if (deliveryNote.signedAt) {
        writeLine(doc, 'Fecha de firma', formatDate(deliveryNote.signedAt));
      }

      if (signatureBuffer) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Firma');
        doc.moveDown(0.5);
        doc.image(signatureBuffer, {
          fit: [220, 120],
          align: 'left'
        });
      }

      doc.end();
    });
  }
};

export default pdfService;
