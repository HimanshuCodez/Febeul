import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const giftWrapPolicyData = [
  {
    title: "GIFT WRAP POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: [22 DEC 2025]' },
      { type: 'paragraph', text: 'Febeul offers gift wrap services as an optional add-on to enhance your shopping experience. This Gift Wrap Policy outlines the terms, conditions, charges, and limitations applicable to gift wrap purchases made on the Febeul website. By selecting the gift wrap option, the customer agrees to this Policy.' },
    ],
  },
  {
    title: "1. Availability of Gift Wrap Service",
    content: [
      { type: 'list', items: [
        'Gift wrap is available only with the purchase of a product.',
        'Gift wrap cannot be purchased separately as a standalone item.',
        'Gift wrap must be selected at the time of placing the order.',
      ]},
    ],
  },
  {
    title: "2. Gift Wrap Charges",
    content: [
      { type: 'list', items: [
        'Gift wrap is a paid add-on service, unless stated otherwise under promotional offers or Luxe Membership benefits.',
        'The gift wrap charge is applied per order or per item, as displayed during checkout.',
        'Prices are clearly shown before payment confirmation.',
      ]},
    ],
  },
  {
    title: "3. Gift Wrap & Returns",
    content: [
      { type: 'subheading', text: '3.1 Return Orders' },
      { type: 'paragraph', text: 'If an order is returned (full or partial):' },
      { type: 'list', items: [
        'Only the product price will be refunded.',
        'Gift wrap charges are strictly non-refundable.',
        'Gift wrap is a service-based offering and is considered consumed once applied, even if the product is returned.',
      ]},
    ],
  },
  {
    title: "4. Gift Wrap & Exchanges",
    content: [
      { type: 'paragraph', text: 'If an item is exchanged:' },
      { type: 'list', items: [
        'Gift wrap charges will not be refunded.',
        'If the customer wishes to receive the exchanged item with gift wrap again:',
        'A fresh gift wrap charge must be paid at the time of exchange order placement.',
      ]},
    ],
  },
  {
    title: "5. Luxe Membership Gift Wrap Benefit",
    content: [
      { type: 'list', items: [
        'Customers holding an active Febeul Luxe Membership are eligible for complimentary gift wraps as per Luxe Membership terms.',
        'The number of free gift wraps, validity, and usage limits are governed strictly by the Luxe Membership Policy.',
        'Luxe benefits apply only to eligible members and cannot be transferred or extended to non-members.',
      ]},
    ],
  },
  {
    title: "6. No Cash Value & No Transfer",
    content: [
      { type: 'paragraph', text: 'Gift wrap services have no cash value.' },
      { type: 'paragraph', text: 'Gift wrap benefits cannot be:' },
      { type: 'list', items: [
        'Exchanged for cash',
        'Transferred to another order or account',
        'Adjusted against product pricing',
      ]},
    ],
  },
  {
    title: "7. Quality & Presentation Disclaimer",
    content: [
      { type: 'list', items: [
        'Gift wrap design, color, or packaging style may vary based on availability.',
        'Febeul reserves the right to modify gift wrap materials or presentation without prior notice.',
        'Minor variations in wrapping style do not qualify for refunds or disputes.',
      ]},
    ],
  },
  {
    title: "8. Misuse & Abuse Prevention",
    content: [
      { type: 'paragraph', text: 'Febeul reserves the right to deny or restrict gift wrap services if:' },
      { type: 'list', items: [
        'Repeated misuse of return/exchange policies is detected',
        'Fraudulent activity is identified',
        'Policies are violated intentionally',
      ]},
      { type: 'paragraph', text: 'Such actions may lead to suspension of gift wrap privileges.' },
    ],
  },
  {
    title: "9. Policy Amendments",
    content: [
      { type: 'paragraph', text: 'Febeul reserves the right to update or modify this Gift Wrap Policy at any time without prior notice. Continued use of the service indicates acceptance of the updated Policy.' },
    ],
  },
  {
    title: "10. Contact Information",
    content: [
      { type: 'paragraph', text: 'For gift wrap related queries, please contact:' },
      { type: 'paragraph', text: '📩 support@febeul.com' },
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

const GiftWrapPolicy = () => {
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
            GIFT WRAP POLICY
            </h1>

        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {giftWrapPolicyData.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default GiftWrapPolicy;
