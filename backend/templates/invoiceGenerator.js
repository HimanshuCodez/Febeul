import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const buildInvoicePDF = (order, res) => {
    // Standard A4 size
    const doc = new PDFDocument({ size: 'A4', margin: 30 });
    const filename = `Invoice_${order._id}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.on('error', (err) => {
        console.error('PDF stream error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'PDF stream error' });
        }
        doc.end();
    });

    try {
        // Color Palette
        const primaryColor = '#333333';
        const secondaryColor = '#666666';
        const borderColor = '#CCCCCC';
        const tableHeaderBg = '#F5F5F5';

        // ===================================
        // TOP HEADER: LOGO & TITLE
        // ===================================
        
        // Logo
        try {
            const logoPath = path.resolve(__dirname, '../../frontend/public/removebgLogo.png');
            doc.image(logoPath, 30, 30, { width: 80 });
        } catch (imgError) {
            doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold').text('FEBEUL', 30, 35);
        }

        doc.fillColor(primaryColor)
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('Tax Invoice/Bill of Supply/Cash Memo', 150, 35, { align: 'right' });
        
        doc.fontSize(8)
           .font('Helvetica')
           .text('(Original for Recipient)', 150, 55, { align: 'right' });

        doc.moveDown(2);
        const headerBottom = doc.y;

        // ===================================
        // COMPANY & INVOICE DETAILS
        // ===================================
        
        const colWidth = (doc.page.width - 60) / 2;

        // Left: Sold By
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('Sold By:', 30, headerBottom);
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
        doc.text('FEBEUL', 30, doc.y + 2);
        doc.text('H. no 89, Blk-D1 Bhalswa Resettlement Colony,', 30, doc.y + 1);
        doc.text('New Swaroop Nagar, Near Govt. Dispensary, Delhi - 110042', 30, doc.y + 1);
        doc.text('GSTIN: 07BGQPY8326L1ZC', 30, doc.y + 1);
        doc.text('PAN: BGQPY8326L', 30, doc.y + 1);

        // Right: Invoice Details
        const rightColX = 30 + colWidth;
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('Invoice Details:', rightColX, headerBottom);
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
        
        const invoiceDate = new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const sequentialInvoice = order.invoiceNumber ? order.invoiceNumber.toString().padStart(4, '0') : order._id.toString().slice(-8).toUpperCase();

        const drawInfoRow = (label, value, y) => {
            doc.font('Helvetica-Bold').fillColor(primaryColor).text(label, rightColX, y);
            doc.font('Helvetica').fillColor(secondaryColor).text(value, rightColX + 80, y);
        };

        drawInfoRow('Invoice No:', `#INV-${sequentialInvoice}`, headerBottom + 12);
        drawInfoRow('Invoice Date:', invoiceDate, doc.y + 1);
        drawInfoRow('Order ID:', `#${order._id.toString().toUpperCase()}`, doc.y + 1);
        drawInfoRow('Order Date:', invoiceDate, doc.y + 1);
        drawInfoRow('Payment Method:', order.paymentMethod, doc.y + 1);

        doc.moveDown(2);
        const addressY = doc.y;

        // ===================================
        // BILLING & SHIPPING ADDRESSES
        // ===================================
        
        doc.strokeColor(borderColor).lineWidth(0.5).moveTo(30, addressY).lineTo(doc.page.width - 30, addressY).stroke();
        doc.moveDown(0.5);

        const currentAddressY = doc.y;
        
        // Billing
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('Billing Address:', 30, currentAddressY);
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
        doc.text(order.address.name, 30, doc.y + 2);

        // Luxe Member Tag
        if (order.isLuxeMemberAtTimeOfOrder || order.userId?.isLuxeMember) {
            const tagX = 30;
            const tagY = doc.y + 2;
            doc.save();
            doc.fillColor('#FFF8E1').rect(tagX, tagY, 70, 12).fill();
            doc.fillColor('#FF8F00').fontSize(7).font('Helvetica-Bold').text('LUXE MEMBER', tagX + 6, tagY + 3);
            doc.restore();
            doc.moveDown(1.5);
        }

        doc.text(`${order.address.address}`, 30, doc.y + 1, { width: colWidth - 20 });
        if (order.address.nearby) doc.text(`Nearby: ${order.address.nearby}`, 30, doc.y + 1);
        doc.text(`${order.address.city}, ${order.address.state} - ${order.address.zip}`, 30, doc.y + 1);
        doc.text(`Phone: ${order.address.phone}`, 30, doc.y + 1);

        // Shipping
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text('Shipping Address:', rightColX, currentAddressY);
        doc.font('Helvetica').fontSize(8).fillColor(secondaryColor);
        doc.text(order.address.name, rightColX, doc.y + 2);
        doc.text(`${order.address.address}`, rightColX, doc.y + 1, { width: colWidth - 20 });
        if (order.address.nearby) doc.text(`Nearby: ${order.address.nearby}`, rightColX, doc.y + 1);
        doc.text(`${order.address.city}, ${order.address.state} - ${order.address.zip}`, rightColX, doc.y + 1);
        doc.text(`Phone: ${order.address.phone}`, rightColX, doc.y + 1);

        doc.moveDown(2);

        // ===================================
        // ITEMS TABLE
        // ===================================
        
        const tableTop = doc.y;
        const itemCol = 30;
        const qtyCol = 330;
        const priceCol = 380;
        const taxCol = 450;
        const totalCol = 510;

        // Header
        doc.fillColor(tableHeaderBg).rect(30, tableTop, doc.page.width - 60, 20).fill();
        doc.fillColor(primaryColor).fontSize(8).font('Helvetica-Bold');
        doc.text('Description', itemCol + 5, tableTop + 6);
        doc.text('Qty', qtyCol, tableTop + 6, { width: 40, align: 'center' });
        doc.text('Unit Price', priceCol, tableTop + 6, { width: 60, align: 'right' });
        doc.text('Taxable', taxCol, tableTop + 6, { width: 50, align: 'right' });
        doc.text('Total', totalCol, tableTop + 6, { width: 55, align: 'right' });

        let currentY = tableTop + 20;

        // Rows
        order.items.forEach((item, index) => {
            const itemHeight = doc.heightOfString(item.name, { width: qtyCol - itemCol - 10 }) + 15;
            
            // Draw border
            doc.strokeColor(borderColor).lineWidth(0.5)
               .moveTo(30, currentY).lineTo(doc.page.width - 30, currentY).stroke();

            doc.font('Helvetica').fontSize(8).fillColor(primaryColor);
            
            // Description with wrap handling
            doc.text(item.name, itemCol + 5, currentY + 5, { width: qtyCol - itemCol - 10 });
            if (item.sku) {
                doc.fontSize(7).fillColor(secondaryColor).text(`SKU: ${item.sku}`, itemCol + 5, doc.y + 1);
            }

            const unitPrice = item.price || 0;
            const total = unitPrice * item.quantity;
            const taxable = total / 1.05; // Assuming 5% GST for calculation if not provided

            doc.fontSize(8).fillColor(primaryColor);
            doc.text(item.quantity.toString(), qtyCol, currentY + 5, { width: 40, align: 'center' });
            doc.text(`INR ${unitPrice.toFixed(2)}`, priceCol, currentY + 5, { width: 60, align: 'right' });
            doc.text(`INR ${taxable.toFixed(2)}`, taxCol, currentY + 5, { width: 50, align: 'right' });
            doc.text(`INR ${total.toFixed(2)}`, totalCol, currentY + 5, { width: 55, align: 'right' });

            currentY += Math.max(itemHeight, 25);
        });

        // Table Bottom Border
        doc.strokeColor(borderColor).lineWidth(0.5).moveTo(30, currentY).lineTo(doc.page.width - 30, currentY).stroke();

        // ===================================
        // TOTALS SECTION
        // ===================================
        
        const totalsY = currentY + 10;
        const totalsLabelX = 380;
        const totalsValX = 500;

        const addTotalRow = (label, value, isBold = false) => {
            doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(primaryColor);
            doc.text(label, totalsLabelX, doc.y, { width: 110, align: 'right' });
            doc.text(value, totalsValX, doc.y - 9, { width: 65, align: 'right' });
            doc.moveDown(0.5);
        };

        doc.y = totalsY;
        const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        addTotalRow('Subtotal:', `INR ${subtotal.toFixed(2)}`);
        if (order.couponDiscount > 0) addTotalRow('Discount:', `- INR ${order.couponDiscount.toFixed(2)}`);
        
        addTotalRow('Shipping Charges:', order.shippingCharge > 0 ? `INR ${order.shippingCharge.toFixed(2)}` : 'FREE');
        if (order.codCharge > 0) addTotalRow('COD Charges:', `INR ${order.codCharge.toFixed(2)}`);
        if (order.giftWrap?.price > 0) addTotalRow('Gift Wrap:', `INR ${order.giftWrap.price.toFixed(2)}`);
        
        // Tax breakdown
        const discountedSubtotal = subtotal - (order.couponDiscount || 0);
        const calculatedTaxable = discountedSubtotal / 1.05;
        const finalTaxableValue = order.taxableValue || calculatedTaxable;
        const totalTax = discountedSubtotal - finalTaxableValue;
        
        addTotalRow('Total Tax (GST):', `INR ${totalTax.toFixed(2)}`);

        doc.moveDown(0.5);
        doc.strokeColor(primaryColor).lineWidth(1).moveTo(totalsLabelX + 20, doc.y).lineTo(doc.page.width - 30, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('Grand Total:', totalsLabelX, doc.y, { width: 110, align: 'right' });
        doc.text(`INR ${order.orderTotal.toFixed(2)}`, totalsValX, doc.y - 11, { width: 65, align: 'right' });

        // ===================================
        // TERMS & FOOTER
        // ===================================
        
        const footerY = doc.page.height - 100;
        
        doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor).text('Terms & Conditions:', 30, footerY);
        doc.fontSize(7).font('Helvetica').fillColor(secondaryColor);
        doc.text('1. This is a computer-generated invoice and does not require a signature.', 30, doc.y + 2);
        doc.text('2. All disputes are subject to Delhi jurisdiction.', 30, doc.y + 1);
        doc.text('3. Goods once sold cannot be returned or exchanged without valid reason.', 30, doc.y + 1);

        doc.strokeColor(borderColor).lineWidth(0.5).moveTo(30, footerY + 45).lineTo(doc.page.width - 30, footerY + 45).stroke();
        
        doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor)
           .text('Thank you for shopping with FEBEUL!', 30, footerY + 55, { align: 'center', width: doc.page.width - 60 });
        doc.fontSize(8).font('Helvetica').fillColor(secondaryColor)
           .text('support@febeul.com | www.febeul.com', 30, doc.y + 2, { align: 'center', width: doc.page.width - 60 });

    } catch (pdfGenError) {
        console.error("Error during PDF generation:", pdfGenError);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'PDF generation failed' });
        }
    } finally {
        doc.end();
    }
};

export { buildInvoicePDF };
