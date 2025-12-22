import React from 'react';
import { motion } from 'framer-motion';

const luxePolicyData = [
  {
    title: "LUXE MEMBERSHIP POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: 11 DEC 2025' },
      { type: 'paragraph', text: 'The Febeul Luxe Membership (“Luxe Membership” or “Membership”) is a premium subscription program offered by Febeul (“Company”, “We”, “Us”, “Our”). This Policy outlines the terms, conditions, benefits, payment rules, renewal rules, cancellation, refund eligibility, and other operational aspects governing the Luxe Membership.' },
      { type: 'paragraph', text: 'By purchasing or using the Febeul Luxe Membership, the customer (“You”, “User”, “Member”) agrees to comply with this Policy.' },
    ],
  },
  {
    title: "1. MEMBERSHIP BENEFITS",
    content: [
      { type: 'paragraph', text: 'Luxe Members receive the following exclusive benefits:' },
      { type: 'subheading', text: '1.1 Fast Priority Delivery' },
      { type: 'paragraph', text: 'Orders placed under a Luxe Membership are processed and shipped on priority.' },
      { type: 'subheading', text: '1.2 15 Complimentary Gift Wraps' },
      { type: 'paragraph', text: 'Members receive up to 15 free gift wraps per billing cycle.' },
      { type: 'subheading', text: '1.3 Luxe Privé Sales Access' },
      { type: 'paragraph', text: 'Exclusive early access to private sales, limited drops, and special offers.' },
      { type: 'subheading', text: '1.4 Coupons on Every Purchase' },
      { type: 'paragraph', text: 'Members receive exclusive discount coupons with every eligible purchase.' },
      { type: 'subheading', text: '1.5 Dedicated Customer Support' },
      { type: 'paragraph', text: 'Members receive priority access to our support team for faster resolution.' },
      { type: 'subheading', text: '1.6 Free Delivery on All Orders' },
      { type: 'paragraph', text: 'No delivery fees will be charged for orders placed by Luxe Members (terms apply).' },
      { type: 'paragraph', text: 'Note: Febeul may modify, upgrade, or discontinue specific features at any time with or without prior notice.' },
    ],
  },
  {
    title: "2. MEMBERSHIP FEE & BILLING",
    content: [
      { type: 'subheading', text: '2.1 Pricing' },
      { type: 'paragraph', text: 'The Febeul Luxe Membership is currently offered at:' },
      { type: 'paragraph', text: '₹129 per month' },
      { type: 'paragraph', text: '(Discounted from ₹152 — introductory offer)' },
      { type: 'paragraph', text: 'Prices may be updated periodically based on Company discretion.' },
      { type: 'subheading', text: '2.2 Payment Terms' },
      { type: 'list', items: [
        'Payment must be made at the time of signup.',
        'Accepted payment methods include UPI, Debit Card, Credit Card, Net Banking, Wallets, or any method available on our payment gateway.',
        'Membership will become active only after successful payment confirmation.',
      ]},
      { type: 'subheading', text: '2.3 Auto-Renewal (If Enabled on Your Website)' },
      { type: 'paragraph', text: 'If your website enables Auto-renewal:' },
      { type: 'list', items: [
        'Membership will automatically renew every month at the prevailing rate.',
        'By purchasing the Membership, you authorize Febeul to charge your selected payment method automatically.',
      ]},
      { type: 'paragraph', text: 'If Auto-renewal is NOT enabled, the membership must be manually renewed by the customer.' },
      { type: 'paragraph', text: '(You can tell me if you want the Auto-renewal section ON or OFF — I’ll revise accordingly.)' },
    ],
  },
  {
    title: "3. PAYMENT FAILURE & ERRORS",
    content: [
      { type: 'subheading', text: '3.1 Payment Deducted but Membership Not Activated' },
      { type: 'paragraph', text: 'If your payment is deducted but membership is not activated:' },
      { type: 'paragraph', text: 'You must contact us at support @febeul.com with:' },
      { type: 'list', items: [
        'Payment screenshot',
        'Transaction ID / UTR number',
        'Date & Time of transaction',
        'Registered mobile number and email',
      ]},
      { type: 'paragraph', text: 'After verification:' },
      { type: 'list', items: [
        'Either your membership will be activated manually, OR',
        'Refunds will be issued to your original payment method within 7 working days.',
      ]},
      { type: 'subheading', text: '3.2 Duplicate Charges' },
      { type: 'list', items: [
        'If the payment gateway charges you twice:',
        'Share proof via email',
        'The extra amount will be refunded within 7 working days after verification.',
      ]},
      { type: 'subheading', text: '3.3 Payment Failure from Customer’s Bank' },
      { type: 'list', items: [
        'If the bank or UPI app shows “transaction failed” but money is deducted:',
        'The refund will be processed by your bank automatically.',
        'Febeul is NOT responsible for delays from banking networks.',
        'You may need to contact your bank for updates.',
      ]},
    ],
  },
  {
    title: "4. MEMBERSHIP ACTIVATION",
    content: [
      { type: 'paragraph', text: 'Membership becomes active instantly upon successful payment.' },
      { type: 'paragraph', text: 'In exceptional cases (system delay), activation may take up to 24 hours.' },
      { type: 'paragraph', text: 'Activation confirmation will be sent via email/SMS.' },
    ],
  },
  {
    title: "5. MEMBERSHIP VALIDITY",
    content: [
      { type: 'paragraph', text: 'The Luxe Membership is valid for 1 month (30 days) from the date of activation unless otherwise mentioned on the Website.' },
    ],
  },
  {
    title: "6. CANCELLATION POLICY",
    content: [
      { type: 'subheading', text: '6.1 Member-Initiated Cancellation' },
      { type: 'list', items: [
        'You may cancel your Membership anytime by contacting customer support.',
        'Cancellation will stop future renewals (if auto-renewal exists).',
      ]},
      { type: 'subheading', text: '6.2 Cancellation is NOT Available in These Cases' },
      { type: 'paragraph', text: 'Febeul does not allow cancellation:' },
      { type: 'list', items: [
        'Mid-cycle cancellations',
        'If benefits were already used (priority delivery, gift wrap, coupons, etc.)',
        'If Membership was purchased by mistake by the customer',
      ]},
    ],
  },
  {
    title: "7. REFUND POLICY",
    content: [
      { type: 'paragraph', text: 'Membership fees are non-refundable, except in the following cases:' },
      { type: 'subheading', text: '✔ Refund Allowed Only If:' },
      { type: 'list', items: [
        'Payment was deducted but membership not activated',
        'Duplicate payment was made due to technical error',
        'Febeul fails to provide membership services due to internal system issues',
      ]},
      { type: 'subheading', text: '✖ Refund NOT Allowed If:' },
      { type: 'list', items: [
        'You voluntarily cancel membership',
        'You do not use membership benefits',
        'You forgot to cancel auto-renewal',
        'You claim dissatisfaction after using benefits',
        'You entered wrong account details during COD refunds (not related to membership fee)',
      ]},
      { type: 'paragraph', text: 'Refunds, when approved, will be credited within 7 working days.' },
    ],
  },
  {
    title: "8. MISUSE OR ABUSE OF MEMBERSHIP",
    content: [
      { type: 'paragraph', text: 'Febeul reserves the right to suspend or terminate membership without refund if:' },
      { type: 'list', items: [
        'Fraudulent activity is detected',
        'Multiple fake return claims are raised',
        'Membership benefits are abused (e.g., using gift wraps for resale)',
        'User violates Febeul’s Terms & Conditions',
        'System manipulation or unauthorized access is detected',
      ]},
    ],
  },
  {
    title: "9. CHANGES TO MEMBERSHIP FEATURES",
    content: [
      { type: 'paragraph', text: 'Febeul may:' },
      { type: 'list', items: [
        'Update benefits',
        'Modify pricing',
        'Add new features',
        'Remove features',
        'Update terms',
      ]},
      { type: 'paragraph', text: 'These changes may occur with or without prior notice.' },
    ],
  },
  {
    title: "10. LIABILITY LIMITATION",
    content: [
      { type: 'paragraph', text: 'Febeul will not be liable for:' },
      { type: 'list', items: [
        'Delays caused by courier partners',
        'Bank or payment gateway issues',
        'Unavailability of benefits due to force majeure (technical outage, server issues, etc.)',
        'Incorrect information provided by customers',
      ]},
    ],
  },
  {
    title: "11. CONTACT INFORMATION",
    content: [
      { type: 'paragraph', text: 'For membership-related queries:' },
      { type: 'paragraph', text: '📩 Email: support @febeul.com' },
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

const LuxePolicy = () => {
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
            LUXE MEMBERSHIP POLICY
            </h1>
            <p className="text-center text-gray-600 mb-8">
            Last Updated: 11 DEC 2025
            </p>
            <p className="text-gray-700 leading-relaxed text-center">
            The Febeul Luxe Membership (“Luxe Membership” or “Membership”) is a premium subscription program offered by Febeul (“Company”, “We”, “Us”, “Our”). This Policy outlines the terms, conditions, benefits, payment rules, renewal rules, cancellation, refund eligibility, and other operational aspects governing the Luxe Membership.
            </p>
        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {luxePolicyData.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LuxePolicy;
