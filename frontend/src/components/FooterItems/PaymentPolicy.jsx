import React from 'react';
import { motion } from 'framer-motion';

const paymentPolicyData = [
  {
    title: "PAYMENT POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: [10 DEC 2025]' },
      { type: 'paragraph', text: 'This Payment Policy (“Policy”) governs all payments made for purchases on the Febeul Website (“Website”). By placing an order and completing a transaction, the customer (“User”) agrees to comply with all terms and conditions mentioned herein.' },
      { type: 'paragraph', text: 'Febeul maintains strict security protocols to ensure safe, transparent, and compliant payment processing for all customers.' },
    ],
  },
  {
    title: "1. ACCEPTED PAYMENT METHODS",
    content: [
      { type: 'paragraph', text: 'Febeul accepts the following payment modes:' },
      { type: 'list', items: [
        'UPI (Unified Payments Interface)',
        'Debit Cards',
        'Credit Cards',
        'Net Banking',
        'Wallet Payments',
        'Pay-Later Services (if offered by gateway partners)',
        'Cash on Delivery (COD) — applicable conditions and fees outlined below',
      ]},
      { type: 'paragraph', text: 'All payments are processed through secure, encrypted, PCI-DSS compliant payment gateways.' },
    ],
  },
  {
    title: "2. PAYMENT SECURITY & ENCRYPTION",
    content: [
      { type: 'paragraph', text: 'All payment information entered by the User is encrypted during transmission using industry-standard SSL technology.' },
      { type: 'paragraph', text: 'Febeul does not store or have access to full debit card, credit card, or banking credentials.' },
      { type: 'paragraph', text: 'Customers may complete payments without hesitation, as all transactions are protected by bank-level and PCI-certified security protocols.' },
      { type: 'paragraph', text: 'For debit card, credit card, UPI, and net banking transactions, the customer’s financial information remains fully secure and confidential.' },
    ],
  },
  {
    title: "3. PAYMENT CONFIRMATION",
    content: [
      { type: 'paragraph', text: 'A payment is considered successful only when:' },
      { type: 'list', items: [
        'The payment gateway confirms the transaction',
        'The Website generates an order confirmation',
        'The User receives a confirmation email/SMS',
      ]},
      { type: 'paragraph', text: 'If confirmation is not received despite a successful deduction, the User must follow Section 4 of this Policy.' },
    ],
  },
  {
    title: "4. PAYMENT FAILURE & AMOUNT DEDUCTED",
    content: [
      { type: 'paragraph', text: 'If the User’s payment is deducted from their bank/wallet but the Website displays a “Payment Failed” or “Transaction Unsuccessful” message:' },
      { type: 'paragraph', text: 'The User must email proof of payment to support @febeul.com. Accepted proofs include:' },
      { type: 'list', items: [
        'Screenshot of bank statement',
        'UPI/PAY ID',
        'Transaction Reference Number',
        'SMS from bank or wallet',
      ]},
      { type: 'paragraph', text: 'After verification, the deducted amount will be refunded to the original payment method within 7 working days.' },
      { type: 'paragraph', text: 'Febeul is not liable for delays caused by banking systems, UPI networks, or payment gateway processors.' },
    ],
  },
  {
    title: "5. CASH ON DELIVERY (COD) PAYMENTS",
    content: [
      { type: 'paragraph', text: 'COD is available only for selected pin codes and order types.' },
      { type: 'paragraph', text: 'Orders must be paid in full at the time of delivery.' },
      { type: 'paragraph', text: 'If the User refuses delivery without valid reason, Febeul may restrict future COD availability.' },
      { type: 'paragraph', text: 'COD refunds (if applicable) are governed strictly under the Refund Policy.' },
    ],
  },
  {
    title: "6. PAYMENT PLATFORM FEE (PPF) FOR COD ORDERS",
    content: [
      { type: 'paragraph', text: 'Customers who do not hold a Febeul Luxe Membership must pay a Payment Platform Fee (PPF) on COD orders.' },
      { type: 'paragraph', text: 'This fee covers the cash handling fee.' },
      { type: 'paragraph', text: 'PPF is non-refundable.' },
      { type: 'paragraph', text: 'Only the product amount (excluding PPF) is eligible for refund.' },
    ],
  },
  {
    title: "7. COD REFUND PROCESS (IF APPLICABLE)",
    content: [
      { type: 'paragraph', text: 'COD refunds are issued through bank transfer only.' },
      { type: 'paragraph', text: 'The User must provide accurate bank details, including:' },
      { type: 'list', items: [
        'Account Holder Name',
        'Bank Name',
        'Account Number',
        'IFSC Code',
      ]},
      { type: 'paragraph', text: 'Febeul is not responsible for delays caused by incorrect or invalid bank information.' },
      { type: 'paragraph', text: 'If the refund fails due to incorrect details, the User must provide corrected details to support @febeul.com.' },
      { type: 'paragraph', text: 'Once corrected details are received, the refund will be reprocessed within 7 working days.' },
    ],
  },
  {
    title: "8. PRICING & TAXES",
    content: [
      { type: 'paragraph', text: 'All prices displayed on the Website are in Indian Rupees (INR).' },
      { type: 'paragraph', text: 'Prices are inclusive of applicable taxes unless stated otherwise.' },
      { type: 'paragraph', text: 'Febeul reserves the right to modify product prices at any time without prior notice.' },
      { type: 'paragraph', text: 'Pricing errors, if any, may result in order cancellation with full refund to the customer.' },
    ],
  },
  {
    title: "9. FRAUD PREVENTION & MISUSE",
    content: [
      { type: 'paragraph', text: 'Febeul reserves the right to:' },
      { type: 'list', items: [
        'Reject payments suspected of fraud or unauthorized use',
        'Cancel orders placed through illegal or suspicious payment attempts',
        'Block accounts involved in repeated payment disputes or fraudulent activity',
      ]},
      { type: 'paragraph', text: 'Legal action may be initiated in cases of deliberate misuse.' },
    ],
  },
  {
    title: "10. DISPUTE RESOLUTION",
    content: [
      { type: 'paragraph', text: 'Any disputes regarding payments shall be resolved as follows:' },
      { type: 'list', items: [
        'Initial resolution through Febeul’s customer support team',
        'If unresolved, escalation as per the terms in the “Terms & Conditions” document',
        'Final jurisdiction lies with the courts of Delhi, India',
      ]},
    ],
  },
  {
    title: "11. CONTACT INFORMATION",
    content: [
      { type: 'paragraph', text: 'For queries related to payments, failures, or refunds:' },
      { type: 'paragraph', text: '📩 Email: support @febeul.com' },
      { type: 'paragraph', text: '🕒 Support Hours: 10:00 AM – 6.30 PM (Mon–Sat)' },
    ],
  },
];

const Section = ({ title, content, index }) => {
    const variants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.1 } },
    };
  
    return (
      <motion.div variants={variants} className="mb-8">
        <h2 className="text-2xl font-bold text-[#f68a8b] mb-4">{title}</h2>
        <div className="space-y-4">
          {content.map((item, idx) => {
            switch (item.type) {
              case 'paragraph':
                return <p key={idx} className="text-gray-700 leading-relaxed">{item.text}</p>;
              case 'list':
                return (
                  <ul key={idx} className="list-disc list-inside space-y-2 text-gray-700 pl-4">
                    {item.items.map((li, i) => <li key={i}>{li}</li>)}
                  </ul>
                );
              case 'subheading':
                return <h3 key={idx} className="text-xl font-semibold text-gray-800 mt-6">{item.text}</h3>
              default:
                return null;
            }
          })}
        </div>
      </motion.div>
    );
};

const PaymentPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fde2e4] to-[#f9d1d1] py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="max-w-4xl mx-auto"
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: -40 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
          }}
          className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40 mb-10"
        >
            <h1 className="text-3xl md:text-5xl font-bold text-center mb-4 text-[#f47b7d]">
            PAYMENT POLICY
            </h1>

        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {paymentPolicyData.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentPolicy;
