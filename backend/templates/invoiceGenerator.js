import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildInvoicePDF = (order, res) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `Invoice_${order._id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.on('error', (err) => {
        console.error('PDF stream error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'PDF stream error' });
        }
        doc.end(); // Ensure doc is ended if an error occurs
    });

    try {
        // Company Header with Logo
        try {
            const logoPath = path.resolve(__dirname, '../../frontend/public/removebgLogo.png');
            doc.image(logoPath, 50, 40, { width: 100 });
        } catch (imgError) {
            console.error("Error loading logo image in invoice generator:", imgError);
            // Continue without image or handle more gracefully
        }
        
        doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 0, 60, { align: 'right' });
        doc.fontSize(10).font('Helvetica').text('FEBEUL', 0, 85, { align: 'right' });
        doc.text('Your Slogan Here', 0, 100, { align: 'right' }); // Placeholder for slogan
        doc.moveDown(4); // Move down enough to clear header content

        // Order Details and Billing Information
        doc.fontSize(12).font('Helvetica-Bold').text('Invoice Details:', 50, doc.y);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Invoice #: ${order._id.toString()}`, 50, doc.y + 15);
        doc.text(`Order Date: ${new Date(order.date).toLocaleDateString()}`, 50, doc.y + 30);
        doc.text(`Payment Method: ${order.paymentMethod}`, 50, doc.y + 45);
        doc.moveDown(4);

        doc.fontSize(12).font('Helvetica-Bold').text('Billed To:', 50, doc.y);
        doc.font('Helvetica').fontSize(10);
        doc.text(`${order.address.name}`, 50, doc.y + 15);
        doc.text(`${order.address.address}`, 50, doc.y + 30);
        doc.text(`${order.address.city}, ${order.address.zip}`, 50, doc.y + 45);
        doc.text(`${order.address.country}`, 50, doc.y + 60);
        doc.text(`Phone: ${order.address.phone}`, 50, doc.y + 75);
        if (order.userId && order.userId.email) {
            doc.text(`Email: ${order.userId.email}`, 50, doc.y + 90);
        }
        doc.moveDown(2);


        // Items Table Headers
        const tableTop = doc.y;
        const itemColX = 50;
        const qtyColX = 320;
        const priceColX = 390;
        const totalColX = 480;

        doc.font('Helvetica-Bold')
           .fontSize(10)
           .text('Item', itemColX, tableTop, { width: qtyColX - itemColX - 10 })
           .text('Qty', qtyColX, tableTop, { width: priceColX - qtyColX - 10, align: 'right' })
           .text('Price', priceColX, tableTop, { width: totalColX - priceColX - 10, align: 'right' })
           .text('Total', totalColX, tableTop, { width: 50, align: 'right' });
        
        doc.font('Helvetica').fontSize(10); // Reset font and size
        doc.moveDown(0.5);
        doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(itemColX, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown();

        // Items Table Rows
        order.items.forEach((item, index) => {
            try {
                const itemPrice = item.productId ? item.productId.price : 0; // Use price from populated productId
                const itemTotal = itemPrice * item.quantity;
                
                doc.text(`${item.name}`, itemColX, doc.y, { width: qtyColX - itemColX - 10, continued: true })
                   .text(`${item.quantity}`, qtyColX, doc.y, { width: priceColX - qtyColX - 10, align: 'right', continued: true })
                   .text(`₹${itemPrice.toFixed(2)}`, priceColX, doc.y, { width: totalColX - priceColX - 10, align: 'right', continued: true })
                   .text(`₹${itemTotal.toFixed(2)}`, totalColX, doc.y, { width: 50, align: 'right' });
                doc.moveDown();
            } catch (itemError) {
                console.error(`Error processing item ${index} (${item.name || item.productId || 'unknown'}):`, itemError);
                // Continue to next item or add placeholder text
            }
        });
        doc.moveDown();
        doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(itemColX, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown();

        // Totals Calculation (replicated from frontend logic in Checkout.jsx)
        const invoiceItemSubtotal = order.items.reduce((sum, item) => sum + ((item.productId ? item.productId.price : 0) * item.quantity), 0);
        const invoiceShippingCost = order.paymentMethod === 'COD' ? 50 : 0; 
        const invoiceGiftWrapPrice = order.giftWrap ? order.giftWrap.price : 0;

        const totalsLabelX = 350; // Start x for labels
        const totalsValueX = 480; // Start x for values
        const totalsWidth = 100; // Width for values
        
        doc.font('Helvetica').fontSize(10);
        doc.text(`Subtotal:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
        doc.text(`₹${invoiceItemSubtotal.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Subtotal:'), { width: 50, align: 'right' });
        doc.moveDown();
        
        if (invoiceShippingCost > 0) {
            doc.text(`Shipping:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
            doc.text(`₹${invoiceShippingCost.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Shipping:'), { width: 50, align: 'right' });
            doc.moveDown();
        } else {
            doc.text(`Shipping:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
            doc.text(`FREE`, totalsValueX, doc.y - doc.heightOfString('Shipping:'), { width: 50, align: 'right' });
            doc.moveDown();
        }

        if (invoiceGiftWrapPrice > 0) {
            doc.text(`Gift Wrap:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
            doc.text(`₹${invoiceGiftWrapPrice.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Gift Wrap:'), { width: 50, align: 'right' });
            doc.moveDown();
        }

        doc.font('Helvetica-Bold').fontSize(12).text(`Total:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
        doc.text(`₹${order.amount.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Total:'), { width: 50, align: 'right' });
        doc.moveDown();

        // Thank You message
        doc.fontSize(10).font('Helvetica').text('Thank you for your purchase!', 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });
        doc.text('We appreciate your business.', 50, doc.page.height - 35, { align: 'center', width: doc.page.width - 100 });

    } catch (pdfGenError) {
        console.error("Error during PDF content generation:", pdfGenError);
        // If an error occurs here, the doc.on('error') will catch it via doc.pipe(res) or doc.end()
        // Or if res.headersSent is false, we can still send a JSON error.
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'PDF content generation failed' });
        }
    } finally {
        doc.end(); // Ensure doc.end() is always called to finalize the stream
    }
};

export { buildInvoicePDF };
