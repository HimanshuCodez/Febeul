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
        doc.end();
    });

    try {
        // Color Palette
        const primaryColor = '#f9aeaf';
        const secondaryColor = '#e88b8d';
        const darkGray = '#2c3e50';
        const mediumGray = '#7f8c8d';
        const lightGray = '#ecf0f1';
        const borderColor = '#e0e0e0';

        // ===================================
        // HEADER SECTION WITH GRADIENT EFFECT
        // ===================================
        
        // Draw gradient background for header (simulated with rectangles)
        doc.fillColor(primaryColor).rect(0, 0, doc.page.width, 150).fill();
        doc.fillColor(secondaryColor).rect(0, 0, doc.page.width, 150).fillOpacity(0.3).fill();
        doc.fillOpacity(1); // Reset opacity

        // Decorative circles
        doc.fillColor('#ffffff').opacity(0.1);
        doc.circle(doc.page.width - 80, 50, 100).fill();
        doc.circle(50, 120, 60).fill();
        doc.opacity(1);

        // Logo
        try {
            const logoPath = path.resolve(__dirname, '../../frontend/public/removebgLogo.png');
            doc.image(logoPath, 50, 45, { width: 90, height: 60, fit: [90, 60] });
        } catch (imgError) {
            console.error("Error loading logo:", imgError);
            doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('FEBEUL', 50, 60);
        }

        // Invoice Title
        doc.fillColor('#ffffff')
           .fontSize(32)
           .font('Helvetica-Bold')
           .text('TAX INVOICE', 200, 55, { align: 'right' });
        
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#ffffff')
           .text('Original for Recipient', 200, 90, { align: 'right' });

        // Reset Y position after header
        doc.y = 170;

        // ===================================
        // COMPANY & INVOICE INFO SECTION
        // ===================================
        
        const infoY = doc.y;
        
        // Left Column - Sold By
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('SOLD BY', 50, infoY);
        
        doc.fillColor(darkGray)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text('FEBEUL', 50, infoY + 18);
        
        doc.fillColor(mediumGray)
           .font('Helvetica')
           .fontSize(9)
           .text('H. no 89, Blk-D1 Bhalswa Resettlement Colony,', 50, infoY + 33, { width: 230 })
           .text('New Swaroop Nagar, Near Govt. Dispensary', 50, infoY + 45, { width: 230 })
           .text('and 101 Riksha Stand, Delhi - 110042', 50, infoY + 57, { width: 230 });
        
        doc.fontSize(9)
           .text('GSTIN: ', 50, infoY + 78, { continued: true })
           .fillColor(darkGray)
           .font('Helvetica-Bold')
           .text('07BGQPY8326L1ZC');
        
        doc.fillColor(mediumGray)
           .font('Helvetica')
           .text('PAN: ', 50, infoY + 92, { continued: true })
           .fillColor(darkGray)
           .font('Helvetica-Bold')
           .text('BGQPY8326L');

        // Right Column - Invoice Details
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('INVOICE DETAILS', 320, infoY);
        
        const orderDate = new Date(order.date).toLocaleDateString('en-IN', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
        
        const addDetailRow = (label, value, y) => {
            doc.fillColor(mediumGray)
               .fontSize(9)
               .font('Helvetica')
               .text(label, 320, y, { width: 100, continued: true });
            doc.fillColor(darkGray)
               .font('Helvetica-Bold')
               .text(value);
        };

        addDetailRow('Invoice No:', `#INV-${order._id.toString().slice(-8).toUpperCase()}`, infoY + 18);
        addDetailRow('Invoice Date:', orderDate, infoY + 33);
        addDetailRow('Order ID:', `#${order._id.toString().slice(-6).toUpperCase()}`, infoY + 48);
        addDetailRow('Order Date:', orderDate, infoY + 63);
        addDetailRow('Payment Method:', order.paymentMethod, infoY + 78);

        // Divider line
        doc.strokeColor(borderColor)
           .lineWidth(1.5)
           .moveTo(50, infoY + 110)
           .lineTo(doc.page.width - 50, infoY + 110)
           .stroke();

        doc.y = infoY + 130;

        // ===================================
        // ADDRESSES SECTION
        // ===================================
        
        const addressY = doc.y;
        
        // Billing Address (Left)
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('BILLING ADDRESS', 50, addressY);
        
        doc.fillColor(darkGray)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(order.address.name, 50, addressY + 18);
        
        doc.fillColor(mediumGray)
           .font('Helvetica')
           .fontSize(9)
           .text(order.address.address, 50, addressY + 33, { width: 230 })
           .text(`${order.address.city}, ${order.address.zip}`, 50, addressY + 48, { width: 230 })
           .text(order.address.country, 50, addressY + 63, { width: 230 })
           .text(`Phone: ${order.address.phone}`, 50, addressY + 78, { width: 230 });

        if (order.userId && order.userId.email) {
            doc.text(`Email: ${order.userId.email}`, 50, addressY + 93, { width: 230 });
        }

        // Shipping Address (Right)
        doc.fillColor(primaryColor)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('SHIPPING ADDRESS', 320, addressY);
        
        doc.fillColor(darkGray)
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(order.address.name, 320, addressY + 18);
        
        doc.fillColor(mediumGray)
           .font('Helvetica')
           .fontSize(9)
           .text(order.address.address, 320, addressY + 33, { width: 230 })
           .text(`${order.address.city}, ${order.address.zip}`, 320, addressY + 48, { width: 230 })
           .text(order.address.country, 320, addressY + 63, { width: 230 })
           .text(`Phone: ${order.address.phone}`, 320, addressY + 78, { width: 230 });

        doc.y = addressY + 115;

        // ===================================
        // ITEMS TABLE
        // ===================================
        
        // Section Title
        doc.fillColor(darkGray)
           .fontSize(14)
           .font('Helvetica-Bold')
           .text('ORDER ITEMS', 50, doc.y);
        
        doc.moveDown(0.8);

        // Divider under title
        doc.fillColor(primaryColor)
           .rect(50, doc.y, 60, 3)
           .fill();
        
        doc.moveDown(1);

        // Table Header
        const tableTop = doc.y;
        const itemColX = 50;
        const qtyColX = 340;
        const priceColX = 410;
        const totalColX = 490;

        // Header background
        doc.fillColor(primaryColor)
           .rect(itemColX, tableTop, doc.page.width - 100, 25)
           .fillOpacity(0.15)
           .fill();
        doc.fillOpacity(1);

        // Header text
        doc.fillColor('#ffffff')
           .fontSize(10)
           .font('Helvetica-Bold');
        
        doc.fillColor(darkGray)
           .text('DESCRIPTION', itemColX + 5, tableTop + 8, { width: qtyColX - itemColX - 15 })
           .text('QTY', qtyColX + 5, tableTop + 8, { width: 50, align: 'center' })
           .text('PRICE', priceColX + 5, tableTop + 8, { width: 70, align: 'right' })
           .text('AMOUNT', totalColX, tableTop + 8, { width: 55, align: 'right' });

        doc.y = tableTop + 35;

        // Table Items
        doc.font('Helvetica').fontSize(9);
        
        order.items.forEach((item, index) => {
            try {
                const itemY = doc.y;
                const itemPrice = item.price || 0;
                const itemTotal = itemPrice * item.quantity;
                
                // Alternating row background
                if (index % 2 === 0) {
                    doc.fillColor(lightGray)
                       .rect(itemColX, itemY - 5, doc.page.width - 100, 22)
                       .fillOpacity(0.3)
                       .fill();
                    doc.fillOpacity(1);
                }

                // Item details
                doc.fillColor(darkGray)
                   .font('Helvetica-Bold')
                   .text(item.name, itemColX + 5, itemY, { width: qtyColX - itemColX - 15 });
                
                doc.fillColor(mediumGray)
                   .font('Helvetica')
                   .text(item.quantity, qtyColX + 5, itemY, { width: 50, align: 'center' })
                   .text(`₹${itemPrice.toFixed(2)}`, priceColX + 5, itemY, { width: 70, align: 'right' });
                
                doc.fillColor(darkGray)
                   .font('Helvetica-Bold')
                   .text(`₹${itemTotal.toFixed(2)}`, totalColX, itemY, { width: 55, align: 'right' });
                
                doc.y = itemY + 18;
            } catch (itemError) {
                console.error(`Error processing item ${index}:`, itemError);
            }
        });

        doc.moveDown(0.5);

        // Table bottom border
        doc.strokeColor(borderColor)
           .lineWidth(1)
           .moveTo(itemColX, doc.y)
           .lineTo(doc.page.width - 50, doc.y)
           .stroke();

        doc.moveDown(1.5);

        // ===================================
        // TOTALS SECTION
        // ===================================
        
        const invoiceItemSubtotal = order.productAmount || order.items.reduce((sum, item) => 
            sum + ((item.price || 0) * item.quantity), 0);
        const taxableValue = invoiceItemSubtotal / 1.18;
        const gst = invoiceItemSubtotal - taxableValue;
        const cgst = gst / 2;
        const sgst = gst / 2;
        const invoiceShippingCost = (order.shippingCharge || 0) + (order.codCharge || 0);
        const invoiceGiftWrapPrice = order.giftWrap ? (order.giftWrap.price || 0) : 0;

        const totalsLabelX = 370;
        const totalsValueX = 490;
        
        const addTotalRow = (label, value, isBold = false, fontSize = 9) => {
            const currentY = doc.y;
            doc.fillColor(mediumGray)
               .fontSize(fontSize)
               .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
               .text(label, totalsLabelX, currentY, { width: 110, align: 'right' });
            
            doc.fillColor(darkGray)
               .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
               .text(value, totalsValueX, currentY, { width: 55, align: 'right' });
            
            doc.moveDown(0.6);
        };
        
        addTotalRow('Subtotal:', `₹${invoiceItemSubtotal.toFixed(2)}`);
        addTotalRow('CGST (9%):', `₹${cgst.toFixed(2)}`);
        addTotalRow('SGST (9%):', `₹${sgst.toFixed(2)}`);
        
        if (invoiceShippingCost > 0) {
            addTotalRow('Shipping Charges:', `₹${invoiceShippingCost.toFixed(2)}`);
        } else {
            addTotalRow('Shipping:', 'FREE');
        }

        if (invoiceGiftWrapPrice > 0) {
            addTotalRow('Gift Wrap:', `₹${invoiceGiftWrapPrice.toFixed(2)}`);
        }

        doc.moveDown(0.3);

        // Grand Total Box
        const grandTotalY = doc.y;
        doc.fillColor(primaryColor)
           .rect(totalsLabelX - 10, grandTotalY - 5, 175, 28)
           .fillOpacity(0.15)
           .fill();
        doc.fillOpacity(1);

        doc.fillColor(darkGray)
           .fontSize(12)
           .font('Helvetica-Bold')
           .text('GRAND TOTAL:', totalsLabelX, grandTotalY + 5, { width: 110, align: 'right' })
           .text(`₹${(order.orderTotal || 0).toFixed(2)}`, totalsValueX, grandTotalY + 5, { width: 55, align: 'right' });

        // ===================================
        // PAYMENT INFO BOX
        // ===================================
        
        doc.y = grandTotalY + 50;
        
        const paymentBoxY = doc.y;
        doc.fillColor(lightGray)
           .rect(50, paymentBoxY, doc.page.width - 100, 50)
           .fillOpacity(0.5)
           .fill();
        doc.fillOpacity(1);

        // Left border accent
        doc.fillColor(primaryColor)
           .rect(50, paymentBoxY, 4, 50)
           .fill();

        doc.fillColor(darkGray)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('PAYMENT INFORMATION', 65, paymentBoxY + 10);
        
        doc.fillColor(mediumGray)
           .fontSize(9)
           .font('Helvetica')
           .text('Payment Method: ', 65, paymentBoxY + 28, { continued: true })
           .fillColor(darkGray)
           .font('Helvetica-Bold')
           .text(order.paymentMethod);

        const paymentStatus = order.paymentStatus || 'Paid';
        const statusColor = paymentStatus === 'Paid' ? '#27ae60' : '#f39c12';
        
        doc.fillColor(mediumGray)
           .font('Helvetica')
           .text('Payment Status: ', 280, paymentBoxY + 28, { continued: true })
           .fillColor(statusColor)
           .font('Helvetica-Bold')
           .text(paymentStatus);

        // ===================================
        // TERMS & FOOTER
        // ===================================
        
        doc.y = paymentBoxY + 70;

        // Terms & Conditions
        doc.fillColor(mediumGray)
           .fontSize(8)
           .font('Helvetica-Bold')
           .text('Terms & Conditions:', 50, doc.y);
        
        doc.font('Helvetica')
           .fillColor(mediumGray)
           .fontSize(7)
           .text('This is a computer-generated invoice and does not require a physical signature. All disputes are subject to Delhi jurisdiction. ' +
                 'Goods once sold cannot be returned or exchanged. Please check the product before accepting delivery.', 
                 50, doc.y + 12, { width: doc.page.width - 100, align: 'justify' });

        // Footer
        const footerY = doc.page.height - 80;
        
        doc.fillColor(primaryColor)
           .rect(0, footerY - 10, doc.page.width, 1)
           .fill();

        doc.fillColor(darkGray)
           .fontSize(11)
           .font('Helvetica-Bold')
           .text('Thank you for shopping with FEBEUL!', 50, footerY, { 
               align: 'center', 
               width: doc.page.width - 100 
           });
        
        doc.fillColor(mediumGray)
           .fontSize(8)
           .font('Helvetica')
           .text('We appreciate your business and look forward to serving you again.', 50, footerY + 18, { 
               align: 'center', 
               width: doc.page.width - 100 
           });

        doc.fontSize(7)
           .text('For queries: support@febeul.com | +91-XXXXXXXXXX', 50, footerY + 32, { 
               align: 'center', 
               width: doc.page.width - 100 
           });

    } catch (pdfGenError) {
        console.error("Error during PDF content generation:", pdfGenError);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'PDF content generation failed' });
        }
    } finally {
        doc.end();
    }
};

export { buildInvoicePDF };