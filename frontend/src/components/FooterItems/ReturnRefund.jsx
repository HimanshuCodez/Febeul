import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const returnRefundData = [
  {
    title: "RETURN, EXCHANGE & REFUND POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: [10 DEC 2025]' },
      { type: 'paragraph', text: 'Febeul follows a strict 2-Days Return & Exchange Policy. All return or exchange requests must be raised within 2 days from the date of delivery. Any request submitted after 2 days will not be accepted under any circumstances.' },
      { type: 'paragraph', text: 'Febeul is committed to delivering high-quality products and ensuring customer satisfaction. This Return, Exchange & Refund Policy (“Policy”) governs the terms and conditions under which customers may request a return, exchange, or refund for orders placed through the Febeul Website. By placing an order, the customer acknowledges and agrees to comply with this Policy.' },
    ],
  },
  {
    title: "8.1 Eligibility for Return or Exchange",
    content: [
      { type: 'paragraph', text: 'A customer may request a return or exchange only if all of the following conditions are satisfied:' },
      { type: 'list', items: [
        'The request is submitted within 2 days from the date of delivery.',
        'The product delivered is damaged, defective, incorrect, or has a legitimate sizing/fit issue.',
        'The product is unused, unwashed, unaltered, and returned with all original tags, labels, packaging, and accessories intact.',
        'Hygiene-sensitive products (including panties and intimate wear) are non-returnable unless the product delivered is damaged or incorrect.',
      ]},
      { type: 'paragraph', text: 'Requests that do not meet the above eligibility conditions may be rejected at Febeul’s discretion.' },
    ],
  },
  {
    title: "8.2 Mandatory Visual Evidence Requirement",
    content: [
      { type: 'paragraph', text: 'To initiate a return or exchange, the customer must submit:' },
      { type: 'list', items: [
        'Clear and detailed images of the product showing the issue.',
        'A video clearly displaying the defect, incorrect item, or sizing issue.',
        'Visual evidence demonstrating that the product has not been used.',
        'Unboxing footage, if available, to support verification.',
      ]},
      { type: 'paragraph', text: 'Requests submitted without adequate visual proof will not be processed. Send files:- Support @Febeul.Com' },
    ],
  },
  {
    title: "8.3 Verification & Complaint Registration",
    content: [
      { type: 'paragraph', text: 'Upon receipt of the customer’s images and videos:' },
      { type: 'list', items: [
        'Febeul’s Quality Control Team will conduct a thorough verification.',
        'If satisfactory, a Complaint Ticket will be generated and shared with the customer.',
        'Only after successful verification will the return, exchange, or refund process begin.',
      ]},
      { type: 'paragraph', text: 'If misuse, mishandling, or discrepancies are identified, Febeul may reject the request or impose charges.' },
    ],
  },
  {
    title: "8.4 Liability Assessment & Return Charges",
    content: [
      { type: 'subheading', text: 'A. Issues Not Attributable to Febeul or Courier Partners' },
      { type: 'paragraph', text: 'If Febeul determines that:' },
      { type: 'list', items: [
        'Damage occurred after delivery,',
        'The issue is caused by customer mishandling, or',
        'The product condition does not match the visual evidence,',
      ]},
      { type: 'paragraph', text: 'then the customer must pay the applicable return/exchange logistics charges, including Channel Issue Not Found (CINF) charges.' },
      { type: 'subheading', text: 'B. Issues Attributable to Febeul or Courier Partners' },
      { type: 'paragraph', text: 'If Febeul or its courier partner is responsible for:' },
      { type: 'list', items: [
        'Delivering a damaged/defective product,',
        'Delivering an incorrect item or missing item, or',
        'A validated manufacturing defect,',
      ]},
      { type: 'paragraph', text: 'then the return/exchange will be processed free of cost, and CINF charges will not apply.' },
    ],
  },
  {
    title: "8.5 Pickup Process & Confirmation",
    content: [
      { type: 'paragraph', text: 'Upon approval:' },
      { type: 'list', items: [
        'Pickup will be scheduled with our authorized courier partner.',
        'The customer will receive a pickup confirmation email with tracking details.',
        'The customer may track pickup and shipment progress.',
        'The customer must ensure proper and secure packaging of the product.',
      ]},
    ],
  },
  {
    title: "8.6 Refund Policy & Processing Timelines",
    content: [
      { type: 'paragraph', text: 'Refunds are processed only after the returned product passes Febeul’s internal quality inspection.' },
      { type: 'subheading', text: 'A. Refunds for Prepaid Orders' },
      { type: 'list', items: [
        'Refunds will be credited to the original payment method.',
        'Refunds are processed within 7 working days after verification.',
        'Delays caused by banks/payment gateways are beyond Febeul’s control.',
      ]},
      { type: 'subheading', text: 'B. Refunds for COD Orders' },
      { type: 'subheading', text: '8.6.1 Refund Method' },
      { type: 'list', items: [
        'COD refunds will be issued to the bank account provided by the customer.',
        'Required bank details:',
        'Account Holder Name',
        'Bank Name',
        'Account Number',
        'IFSC Code',
      ]},
      { type: 'subheading', text: '8.6.2 Incorrect Bank Details' },
      { type: 'list', items: [
        'Febeul is not liable for delays caused due to incorrect bank details.',
        'Customers must email updated details to support@febeul.com.',
        'Refund will be reprocessed within 7 working days after corrected details are received.',
      ]},
      { type: 'subheading', text: 'C. Payment Platform Fee (PPF) for COD Orders' },
      { type: 'paragraph', text: 'If a customer has not purchased Febeul Luxe Membership, and places a COD order:' },
      { type: 'list', items: [
        'A Payment Platform Fee (PPF) will be charged.',
        'This fee covers COD handling Fee.',
        'PPF is strictly non-refundable,',
      ]},
    ],
  },
  {
    title: "8.7 Refund Timeline",
    content: [
      { type: 'paragraph', text: 'Refunds for both prepaid and COD orders will typically be credited:' },
      { type: 'list', items: [
        'Within 7 working days after quality clearance,',
        'Subject to banking and processing timelines.',
      ]},
      { type: 'paragraph', text: 'Febeul is not responsible for delays caused by banks or payment service providers.' },
    ],
  },
  {
    title: "8.8 Conditions for Return or Exchange Rejection",
    content: [
      { type: 'paragraph', text: 'A request may be rejected if:' },
      { type: 'list', items: [
        'The product is used, washed, altered, stained, or damaged.',
        'Tags, labels, original packaging, or accessories are missing.',
        'Adequate visual proof is not provided.',
        'The issue claimed does not match evidence.',
        'The return window (2 days) has expired.',
        'Fraudulent or misleading activity is identified.',
      ]},
      { type: 'paragraph', text: 'Febeul’s decision is final and binding.' },
    ],
  },
  {
    title: "8.9 Customer Obligations",
    content: [
      { type: 'paragraph', text: 'Customers must:' },
      { type: 'list', items: [
        'Provide accurate personal, contact, and pickup details.',
        'Ensure proper packing of the product.',
        'Cooperate fully during verification and pickup.',
        'Provide truthful and complete information at all stages.',
      ]},
      { type: 'paragraph', text: 'Failure to comply may result in rejection of the request.' },
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

const ReturnRefund = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
            RETURN, EXCHANGE & REFUND POLICY
            </h1>

        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {returnRefundData.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ReturnRefund;
