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
            // Pink background for logo
            doc.fillColor('#f9aeaf').rect(45, 35, 110, 45).fill();
            doc.image(logoPath, 50, 40, { width: 100 });
        } catch (imgError) {
            console.error("Error loading logo image in invoice generator:", imgError);
        }
        
        doc.fontSize(20).font('Helvetica-Bold').text('Tax Invoice', 0, 60, { align: 'right' });
        doc.fontSize(10).font('Helvetica').text('FEBEUL', 0, 85, { align: 'right' });
        doc.text('Your Slogan Here', 0, 100, { align: 'right' }); // Placeholder for slogan
        doc.moveDown(4);

        // Seller and Invoice Details
        const sellerY = doc.y;
        doc.fontSize(11).font('Helvetica-Bold').text('Sold By:', 50, sellerY);
        doc.font('Helvetica').fontSize(10);
        doc.text('FEBEUL', 50, sellerY + 15);
        doc.text('H. no 89, blk-D1 bhalswa resettlement colony, new swaroop nagar near government dispensary and 101 riksha stand 110042', 50, sellerY + 30);
        doc.text('GSTIN: 07BGQPY8326L1ZC', 50, sellerY + 45);
        doc.text('PAN: BGQPY8326L', 50, sellerY + 60);

        doc.fontSize(11).font('Helvetica-Bold').text('Invoice Details:', 300, sellerY);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Invoice #: ${order._id.toString()}`, 300, sellerY + 15);
        const orderDate = new Date(order.date).toLocaleDateString();
        doc.text(`Invoice Date: ${orderDate}`, 300, sellerY + 30);
        doc.text(`Order Date: ${orderDate}`, 300, sellerY + 45);
        doc.text(`Payment Method: ${order.paymentMethod}`, 300, sellerY + 60);
        doc.y = sellerY + 80;


        // Billing and Shipping Addresses
        const addressY = doc.y;
        doc.fontSize(11).font('Helvetica-Bold').text('Billing Address:', 50, addressY);
        doc.text('Shipping Address:', 300, addressY);
        doc.font('Helvetica').fontSize(10);
        let billY = addressY + 15;
        doc.text(`${order.address.name}`, 50, billY);
        doc.text(`${order.address.address}`, 50, billY += 15);
        doc.text(`${order.address.city}, ${order.address.zip}`, 50, billY += 15);
        doc.text(`${order.address.country}`, 50, billY += 15);
        doc.text(`Phone: ${order.address.phone}`, 50, billY += 15);
        
        let shipY = addressY + 15;
        doc.text(`${order.address.name}`, 300, shipY);
        doc.text(`${order.address.address}`, 300, shipY += 15);
        doc.text(`${order.address.city}, ${order.address.zip}`, 300, shipY += 15);
        doc.text(`${order.address.country}`, 300, shipY += 15);
        doc.text(`Phone: ${order.address.phone}`, 300, shipY += 15);

        if (order.userId && order.userId.email) {
            const emailY = Math.max(billY, shipY) + 15;
            doc.text(`Email: ${order.userId.email}`, 50, emailY);
        }
        doc.y = Math.max(billY, shipY) + 30;


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

        // Totals Calculation
        const invoiceItemSubtotal = order.items.reduce((sum, item) => sum + ((item.productId ? item.productId.price : 0) * item.quantity), 0);
        const taxableValue = invoiceItemSubtotal / 1.18;
        const gst = invoiceItemSubtotal - taxableValue;
        const cgst = gst / 2;
        const sgst = gst / 2;
        const invoiceShippingCost = order.paymentMethod === 'COD' ? 50 : 0; 
        const invoiceGiftWrapPrice = order.giftWrap ? order.giftWrap.price : 0;

        const totalsLabelX = 350; // Start x for labels
        const totalsValueX = 480; // Start x for values
        
        const addTotalRow = (label, value) => {
            doc.text(label, totalsLabelX, doc.y, { width: 120, align: 'right' });
            doc.text(value, totalsValueX, doc.y - doc.heightOfString(label), { width: 50, align: 'right' });
            doc.moveDown(0.7);
        };
        
        doc.font('Helvetica').fontSize(10);
        addTotalRow('Taxable Value:', `₹${taxableValue.toFixed(2)}`);
        addTotalRow('CGST (9%):', `₹${cgst.toFixed(2)}`);
        addTotalRow('SGST (9%):', `₹${sgst.toFixed(2)}`);
        
        if (invoiceShippingCost > 0) {
            addTotalRow('Shipping:', `₹${invoiceShippingCost.toFixed(2)}`);
        } else {
            addTotalRow('Shipping:', 'FREE');
        }

        if (invoiceGiftWrapPrice > 0) {
            addTotalRow('Gift Wrap:', `₹${invoiceGiftWrapPrice.toFixed(2)}`);
        }

        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').fontSize(12);
        addTotalRow('Total:', `₹${order.amount.toFixed(2)}`);
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
