import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const faqData = [
  {
    title: "GENERAL WEBSITE FAQs",
    content: [
      { type: 'paragraph', text: 'Below are common questions and answers about Febeul.' },
    ],
  },
  {
    title: "1. What products does Febeul offer?",
    content: [
      { type: 'paragraph', text: 'Febeul offers premium nightwear, lingerie, babydoll dresses, and intimate fashion designed for comfort, style, and confidence.' },
    ],
  },
  {
    title: "2. How do I place an order on the website?",
    content: [
      { type: 'paragraph', text: 'Simply browse the product catalog → select your size → add to cart → proceed to checkout → complete payment.' },
    ],
  },
  {
    title: "3. How do I choose the right size?",
    content: [
      { type: 'paragraph', text: 'Every product page includes a detailed size chart. Please measure your bust, waist, and hips and compare with the chart before ordering.' },
    ],
  },
  {
    title: "4. Does Febeul offer Cash on Delivery (COD)?",
    content: [
      { type: 'paragraph', text: 'Yes, COD is available for selected pin codes. COD charges or platform fees may apply.' },
    ],
  },
  {
    title: "5. How will I know if my order is confirmed?",
    content: [
      { type: 'paragraph', text: 'Once the payment is completed, you will receive:' },
      { type: 'list', items: [
        'An order confirmation email',
        'Order details and tracking link (once shipped)',
      ]},
    ],
  },
  {
    title: "6. How long does delivery take?",
    content: [
      { type: 'paragraph', text: 'Standard delivery usually takes 3–7 working days, depending on your location. Remote areas may take slightly longer. Need Fast Delivery: Join Luxe Membership.' },
    ],
  },
  {
    title: "7. Can I track my order?",
    content: [
      { type: 'paragraph', text: 'Yes. After your order is shipped, you will receive a tracking link via email/SMS. You can track your order in real-time.' },
    ],
  },
  {
    title: "8. What is your return or exchange policy?",
    content: [
      { type: 'paragraph', text: 'We offer a 2-day return/exchange window for eligible products. To request a return, customers must share:' },
      { type: 'list', items: [
        'Clear images',
        'A video showing the issue',
      ]},
      { type: 'paragraph', text: 'After verification, return/exchange will be processed as per policy.' },
    ],
  },
  {
    title: "9. What products are not eligible for return?",
    content: [
      { type: 'paragraph', text: 'For hygiene reasons, certain intimate items cannot be returned unless they are damaged, incorrect, or defective.' },
    ],
  },
  {
    title: "10. How do I request a return or exchange?",
    content: [
      { type: 'paragraph', text: 'Email us at support@febeul.com with:' },
      { type: 'list', items: [
        'Order ID',
        'Photos and video proof of the issue',
        'Reason for return/exchange',
      ]},
      { type: 'paragraph', text: 'Our team will verify and guide you through the process.' },
    ],
  },
  {
    title: "11. When will I receive my refund?",
    content: [
      { type: 'paragraph', text: 'Refunds are processed within 7 working days after the returned item passes quality inspection.' },
      { type: 'paragraph', text: 'Refund method:' },
      { type: 'list', items: [
        'Prepaid orders: Refunded to the original payment method',
        'COD orders: Refunded to your bank account (details required)',
      ]},
    ],
  },
  {
    title: "12. What if my payment is deducted but the order fails?",
    content: [
      { type: 'paragraph', text: 'Don’t worry— Send your payment screenshot + transaction ID to support@febeul.com. After verification, your refund will be issued within 7 working days.' },
    ],
  },
  {
    title: "13. Are my payment details safe?",
    content: [
      { type: 'paragraph', text: 'Yes. All payments are processed through secure, encrypted, PCI-DSS compliant gateways. We never store your card or banking details.' },
    ],
  },
  {
    title: "14. Can I cancel my order?",
    content: [
      { type: 'paragraph', text: 'You may cancel before the order is shipped. Once shipped, cancellation is not possible — you may request a return after delivery (if eligible).' },
    ],
  },
  {
    title: "15. Do you offer gift wrapping?",
    content: [
      { type: 'paragraph', text: 'Yes, we offer gift wrapping on selected products. Additional charges may apply unless included in promotions.' },
    ],
  },
  {
    title: "16. How do I contact customer support?",
    content: [
      { type: 'paragraph', text: 'You can reach us at:' },
      { type: 'paragraph', text: '📩 support@febeul.com' },
    ],
  },
  {
    title: "17. Is my personal data safe on Febeul?",
    content: [
      { type: 'paragraph', text: 'Yes. Your data is protected under our Data Privacy Policy and processed according to Indian data protection laws. We do not share or sell your personal information.' },
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

const Faq = () => {
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
            GENERAL WEBSITE FAQs
            </h1>

        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {faqData.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Faq;
