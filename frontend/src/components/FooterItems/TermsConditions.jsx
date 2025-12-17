import React from 'react';
import { motion } from 'framer-motion';

const termsAndConditionsData = [
  {
    title: "1. ACCEPTANCE OF TERMS",
    content: [
      { type: 'paragraph', text: 'By using this Website, you confirm that:' },
      { type: 'list', items: [
        'You have read, understood, and agreed to these Terms.',
        'You are at least 18 years of age or using the Website under adult supervision.',
        'You will comply with all applicable laws and regulations while using our Website and services.',
      ]},
    ],
  },
  {
    title: "2. ABOUT FEBEUL",
    content: [
      { type: 'paragraph', text: 'Febeul is an e-commerce brand offering lingerie, babydoll nightwear, and related products. We reserve the right to modify product offerings, pricing, content, or policies without prior notice.' },
    ],
  },
  {
    title: "3. USER ACCOUNT & RESPONSIBILITIES",
    content: [
      { type: 'paragraph', text: 'To make a purchase, you may need to create an account.' },
      { type: 'paragraph', text: 'You are responsible for maintaining the confidentiality of your account credentials.' },
      { type: 'paragraph', text: 'Any activity made through your account will be considered authorized by you.' },
      { type: 'paragraph', text: 'Febeul reserves the right to suspend or terminate accounts suspected of misuse or fraud.' },
    ],
  },
  {
    title: "4. PRODUCT INFORMATION",
    content: [
      { type: 'paragraph', text: 'We try our best to provide accurate product descriptions, colors, and sizing details. However:' },
      { type: 'list', items: [
        'Colors may vary slightly due to screen settings.',
        'Measurements are approximate.',
        'Febeul is not liable for minor variations in appearance.',
      ]},
      { type: 'paragraph', text: 'If you believe a product is misrepresented, please contact our support team.' },
    ],
  },
  {
    title: "5. PRICING & PAYMENT",
    content: [
      { type: 'paragraph', text: 'All prices displayed on the Website are in Indian Rupees (INR) and are subject to change without prior notice.' },
      { type: 'paragraph', text: 'Febeul reserves the right to modify product prices, offers, and discounts at any time.' },
      { type: 'paragraph', text: 'We accept all major payment methods supported by our secure payment gateway partners.' },
      { type: 'subheading', text: '5.1 Payment Failure Handling' },
      { type: 'paragraph', text: 'If your payment is deducted from your bank or wallet, but you receive a “payment failed” message on our Website:' },
      { type: 'list', items: [
        'You must contact us at Support @Febeul.Com with valid proof of payment (screenshot, transaction ID, bank SMS, etc.).',
        'Upon verification, any such amount will be refunded to the original payment method within 7 working days, as per banking timelines.',
        'Febeul is not responsible for additional delays caused by banks or third-party payment processors.',
      ]},
      { type: 'subheading', text: '5.2 Payment Security Guarantee' },
      { type: 'paragraph', text: 'All payments made on the Febeul Website are processed through 100% secure and encrypted gateways to ensure full data protection. Your transaction details are handled in compliance with industry-standard security protocols.' },
      { type: 'subheading', text: '5.3 Debit Card / Banking Safety' },
      { type: 'paragraph', text: 'If you choose to pay using a debit card, credit card, UPI, or net banking, your banking information and personal financial details remain completely secure.' },
      { type: 'list', items: [
        'Febeul does not store or access your full card details at any point.',
        'You may make payments without hesitation, as our payment infrastructure follows strict data-security rules (RBI & PCI-DSS compliant).',
      ]},
      { type: 'paragraph', text: 'If you experience any payment-related issues, you may contact us at support @febeul.com for assistance.' },
    ],
  },
  {
    title: "6. ORDER CONFIRMATION & CANCELLATION",
    content: [
      { type: 'paragraph', text: 'Once an order is placed, you will receive a confirmation email/SMS.' },
      { type: 'paragraph', text: 'Febeul reserves the right to cancel orders due to:' },
      { type: 'list', items: [
        'Stock unavailability',
        'Pricing errors',
        'Payment issues',
        'Suspicious/fraudulent activity',
      ]},
      { type: 'paragraph', text: 'If an order is cancelled, a refund will be issued as per our Refund Policy.' },
    ],
  },
  {
    title: "7. SHIPPING & DELIVERY",
    content: [
      { type: 'paragraph', text: 'Orders are shipped within our standard dispatch timelines mentioned on the Website.' },
      { type: 'paragraph', text: 'Delivery timelines may vary based on location, logistics partners, or unforeseen delays.' },
      { type: 'paragraph', text: 'Febeul is not responsible for delays caused by courier companies.' },
      { type: 'paragraph', text: 'Customers must provide accurate delivery information.' },
      { type: 'paragraph', text: 'Incorrect address may result in failed delivery or RTO (Return to Origin).' },
    ],
  },
  {
    title: "8. RETURN, EXCHANGE & REFUND POLICY",
    content: [
      { type: 'paragraph', text: 'Febeul is committed to ensuring customer satisfaction and maintaining transparency in all return, exchange, and refund processes. This Policy applies to all orders placed through the Febeul Website and outlines the conditions under which customers may request a return or exchange, along with the applicable refund procedures.' },
      { type: 'subheading', text: '8.1 Eligibility for Return or Exchange' },
      { type: 'paragraph', text: 'A customer may request a return or exchange within the stipulated return window provided that:' },
      { type: 'list', items: [
        'The product delivered is damaged, defective, incorrect, or has a legitimate sizing issue.',
        'The item is unused, unwashed, unaltered, and returned with all original tags, labels, and packaging intact.',
        'Hygiene-sensitive items (such as panties or intimate apparel) are not eligible for return unless the product delivered is damaged or incorrect.',
        'All requests must be raised within the specified return period as stated on the Website.',
      ]},
      { type: 'subheading', text: '8.2 Mandatory Visual Evidence Requirement' },
      { type: 'paragraph', text: 'To initiate a return or exchange, the customer must:' },
      { type: 'list', items: [
        'Submit clear images and a detailed video showing the exact defect, damage, incorrect item, or sizing issue.',
        'Provide unboxing footage if available, as it aids the verification process.',
        'Ensure that the visual proof clearly establishes that the product has not been used.',
      ]},
      { type: 'paragraph', text: 'Return or exchange requests submitted without appropriate visual evidence may be declined.' },
      { type: 'subheading', text: '8.3 Verification & Complaint Registration' },
      { type: 'paragraph', text: 'Upon receiving the customer\'s images/videos:' },
      { type: 'list', items: [
        'Febeul’s Quality Control Team will conduct a thorough verification.',
        'If the evidence provided is satisfactory, a Complaint Ticket will be generated and shared with the customer.',
        'Only after verification will the return, exchange, or refund process be initiated.',
      ]},
      { type: 'paragraph', text: 'If the issue arises due to customer misuse or mishandling, the request may be rejected or additional charges may apply.' },
      { type: 'subheading', text: '8.4 Liability Assessment & Return Charges' },
      { type: 'paragraph', text: 'Return or exchange processing is determined as follows:' },
      { type: 'subheading', text: 'A. Issues Not Attributable to Febeul or Courier Partners' },
      { type: 'paragraph', text: 'If Febeul determines that:' },
      { type: 'list', items: [
        'The damage occurred after delivery,',
        'The issue results from customer mishandling, or',
        'The item differs from the visual proof submitted,',
      ]},
      { type: 'paragraph', text: 'the customer will be responsible for paying the applicable return or exchange logistics. Channel issue not found(CINF) charges Applicable.' },
      { type: 'subheading', text: 'B. Issues Attributable to Febeul or Courier Partners' },
      { type: 'paragraph', text: 'If Febeul or its delivery partners are responsible for:' },
      { type: 'list', items: [
        'Delivery of a damaged or defective product,',
        'Delivery of an incorrect item or missing item, or',
        'A genuine manufacturing issue,',
      ]},
      { type: 'paragraph', text: 'the return or exchange will be processed free of cost, and no charges shall be imposed on the customer CINF not pay.' },
      { type: 'subheading', text: '8.5 Pickup Process & Confirmation' },
      { type: 'paragraph', text: 'Upon approval of the return/exchange:' },
      { type: 'list', items: [
        'A pickup request will be assigned to our authorized courier partner.',
        'The customer will receive a pickup confirmation email that includes tracking details.',
        'The customer may monitor the pickup and shipment status via the tracking link provided.',
        'It is the customer\'s responsibility to ensure the product is securely packed at the time of pickup.',
      ]},
      { type: 'subheading', text: '8.6 Refund Policy & Processing Timelines' },
      { type: 'paragraph', text: 'Refunds will be processed only after the returned product passes Febeul’s internal quality inspection.' },
      { type: 'subheading', text: 'A. Refund Processing for Prepaid Orders' },
      { type: 'list', items: [
        'Refunds for prepaid orders (UPI, Debit Card, Credit Card, Net Banking, Wallet, etc.) will be credited to the original payment method.',
        'The refund will be processed within 7 working days after successful verification.',
        'Febeul is not responsible for delays caused by banks or third-party payment gateways.',
      ]},
      { type: 'subheading', text: 'B. Refund Processing for COD Orders' },
      { type: 'subheading', text: '8.6.1 Refund Method' },
      { type: 'list', items: [
        'COD refunds shall be issued to the bank account provided by the customer during the return initiation process.',
        'Customers must provide accurate bank details including:',
        'Account Holder Name',
        'Bank Name',
        'Account Number',
        'IFSC Code',
      ]},
      { type: 'subheading', text: '8.6.2 Incorrect Bank Details' },
      { type: 'list', items: [
        'If the customer provides incorrect or invalid banking information, Febeul shall not be liable for failed or delayed refunds.',
        'In the event of a refund failure due to incorrect details, the customer must contact support @febeul.com and furnish correct banking details.',
        'Once updated information is provided, the refund will be re-processed within 7 working days.',
      ]},
      { type: 'subheading', text: 'C. Payment Platform Fee (PPF) for COD Orders' },
      { type: 'subheading', text: '8.6.3 PPF Charges for Non-Members' },
      { type: 'paragraph', text: 'If a customer has not purchased the Febeul Luxe Membership, and chooses to place a Cash on Delivery (COD) order:' },
      { type: 'list', items: [
        'A Payment Platform Fee (PPF) will be charged.',
        'This PPF covers COD handling charges.',
        'PPF is strictly non-refundable.',
      ]},
      { type: 'subheading', text: '8.7 Refund Timeline' },
      { type: 'paragraph', text: 'Refunds (both prepaid and COD) will typically be credited:' },
      { type: 'list', items: [
        'Within 7 working days after the returned product clears quality checks,',
        'Subject to banking and processing timelines.',
      ]},
      { type: 'paragraph', text: 'Febeul bears no responsibility for additional delays arising from banking institutions or payment service providers.' },
      { type: 'subheading', text: '8.8 Conditions for Return or Exchange Rejection' },
      { type: 'paragraph', text: 'A return or exchange request may be declined if:' },
      { type: 'list', items: [
        'The product is used, washed, damaged due to customer handling, or altered.',
        'The product is returned without original packaging or tags.',
        'Visual proof is not provided or is insufficient.',
        'The request is raised beyond the return window.',
        'The issue claimed does not match the evidence submitted.',
      ]},
      { type: 'paragraph', text: 'Febeul’s decision regarding eligibility is final and binding.' },
      { type: 'subheading', text: '8.9 Customer Obligations' },
      { type: 'paragraph', text: 'Customers must:' },
      { type: 'list', items: [
        'Provide accurate and complete contact and address details.',
        'Pack the return item properly to avoid transit damage.',
        'Cooperate during verification or inspection procedures.',
        'Maintain transparency during the entire return/refund process.',
      ]},
    ],
  },
  {
    title: "9. REVIEWS & CUSTOMER FEEDBACK",
    content: [
      { type: 'paragraph', text: 'By submitting reviews, photos, or feedback:' },
      { type: 'list', items: [
        'You grant Febeul permission to use such content for marketing and quality improvement.',
        'You must not post offensive, fake, or incentivized reviews.',
        'Content violating guidelines may be removed.',
      ]},
      { type: 'paragraph', text: '(Already aligned with your Review & Rating Policy.)' },
    ],
  },
  {
    title: "10. PROHIBITED USES",
    content: [
      { type: 'paragraph', text: 'You agree NOT to use the Website for:' },
      { type: 'list', items: [
        'Fraudulent activities',
        'Posting false or harmful information',
        'Attempting to hack, modify, or disrupt Website functioning',
        'Violating any law or third-party rights',
        'Copying Website content, product images, or designs without permission',
      ]},
      { type: 'paragraph', text: 'Any violation may lead to account suspension and legal action.' },
    ],
  },
  {
    title: "11. INTELLECTUAL PROPERTY RIGHTS",
    content: [
      { type: 'paragraph', text: 'All content on the Website—including text, graphics, logos, images, videos, designs, and product descriptions—is the exclusive property of Febeul.' },
      { type: 'paragraph', text: 'Users may not:' },
      { type: 'list', items: [
        'Reproduce',
        'Copy',
        'Distribute',
        'Modify',
        'Use our content for commercial purposes',
      ]},
      { type: 'paragraph', text: 'without written permission.' },
    ],
  },
  {
    title: "12. THIRD-PARTY LINKS",
    content: [
      { type: 'paragraph', text: 'The Website may contain links to external sites. Febeul does not control or guarantee the accuracy of such external content and is not responsible for:' },
      { type: 'list', items: [
        'Their policies',
        'Their actions',
        'Any damages caused by third-party websites',
      ]},
      { type: 'paragraph', text: 'Users are advised to review third-party terms before interacting.' },
    ],
  },
  {
    title: "13. LIMITATION OF LIABILITY",
    content: [
      { type: 'paragraph', text: 'To the maximum extent permitted by law:' },
      { type: 'list', items: [
        'Febeul is not liable for indirect, incidental, or consequential damages.',
        'We are not responsible for losses arising from delayed deliveries, website downtime, or incorrect customer input.',
        'All purchases are made at the customer\'s discretion and risk.',
      ]},
      { type: 'paragraph', text: 'Our liability is limited to the value of the product purchased.' },
    ],
  },
  {
    title: "14. INDEMNIFICATION",
    content: [
      { type: 'paragraph', text: 'You agree to indemnify and hold Febeul harmless against any claims, damages, liabilities, or losses resulting from:' },
      { type: 'list', items: [
        'Misuse of the Website',
        'Violation of these Terms',
        'Infringement of third-party rights',
      ]},
    ],
  },
  {
    title: "15. PRIVACY POLICY",
    content: [
      { type: 'paragraph', text: 'Use of the Website is also governed by our Privacy Policy, which explains how your data is collected, stored, and protected.' },
    ],
  },
  {
    title: "16. CHANGES TO TERMS & CONDITIONS",
    content: [
      { type: 'paragraph', text: 'Febeul reserves the right to modify or update these Terms at any time without prior notice. Continued use of the Website after changes indicates acceptance of the revised Terms.' },
    ],
  },
  {
    title: "17. GOVERNING LAW & DISPUTE RESOLUTION",
    content: [
      { type: 'paragraph', text: 'These Terms shall be governed by the laws of India.' },
      { type: 'paragraph', text: 'Any disputes shall be resolved through:' },
      { type: 'list', items: [
        'Initial negotiation',
        'Mediation/arbitration (if needed)',
      ]},
      { type: 'paragraph', text: 'Courts located in Delhi, India shall have jurisdiction' },
    ],
  },
  {
    title: "18. CONTACT INFORMATION",
    content: [
      { type: 'paragraph', text: 'For any concerns, issues, or legal queries, please contact:' },
      { type: 'list', items: [
        'Febeul Customer Support',
        'Email: Support @Febeul.com',
        'Working Hours: 10:00 AM – 6:30PM (Mon–Sat)',
      ]},
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

const TermsConditions = () => {
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
            TERMS & CONDITIONS – FEBEUL
            </h1>
            <p className="text-center text-gray-600 mb-8">
            Last Updated: 10 DEC 2025
            </p>
            <p className="text-gray-700 leading-relaxed text-center">
            Welcome to Febeul (“Company”, “We”, “Us”, “Our”). These Terms & Conditions (“Terms”) govern your access to and use of our website www.febeul.com (“Website”), and all products or services offered through it. By accessing or using our Website, you agree to be bound by these Terms. If you do not agree, please discontinue use immediately.
            </p>
        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {termsAndConditionsData.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default TermsConditions;
