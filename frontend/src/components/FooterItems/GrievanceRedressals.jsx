import React from 'react';
import { motion } from 'framer-motion';

const grievanceRedressalData = [
  {
    title: "GRIEVANCE REDRESSAL",
    content: [
      { type: 'paragraph', text: 'Last Updated: [10 DEC 2025]' },
      { type: 'subheading', text: '📌 GRIEVANCE OFFICER DETAILS' },
      { type: 'paragraph', text: 'In compliance with the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines & Digital Media Ethics Code) Rules, 2021, Febeul appoints the following Grievance Officer:' },
      { type: 'list', items: [
        'Name: Shree Yadav',
        'Designation: Grievance Officer, Febeul',
        'Email: grievance @febeul.com',
        'Address: New Swaroop Nagar, Delhi 110042-India',
      ]},
      { type: 'paragraph', text: 'The Grievance Officer is responsible for receiving, acknowledging, reviewing, and resolving customer grievances raised through the official channel.' },
    ],
  },
  {
    title: "1. PURPOSE OF THIS POLICY",
    content: [
      { type: 'paragraph', text: 'This Grievance Redressal Policy (“Policy”) is designed to:' },
      { type: 'list', items: [
        'Establish a transparent complaint-handling mechanism',
        'Ensure timely and fair resolution of customer grievances',
        'Provide an escalation channel for unresolved disputes',
        'Protect consumer rights under Indian laws',
        'Promote accountability and service quality within Febeul',
      ]},
      { type: 'paragraph', text: 'All grievances are handled objectively, confidentially, and professionally.' },
    ],
  },
  {
    title: "2. SCOPE OF GRIEVANCES",
    content: [
      { type: 'paragraph', text: 'This grievance mechanism is meant only for issues that remain unresolved through regular customer support channels or require formal escalation due to seriousness or complexity.' },
      { type: 'paragraph', text: 'A grievance may be submitted for the following:' },
      { type: 'subheading', text: '2.1 Unresolved Service Complaints' },
      { type: 'paragraph', text: 'Cases where the customer:' },
      { type: 'list', items: [
        'Contacted support but did not receive a satisfactory resolution,',
        'Received delayed or incomplete support, or',
        'Had their issue prematurely closed without proper investigation.',
      ]},
      { type: 'subheading', text: '2.2 Order Fulfillment Discrepancies' },
      { type: 'paragraph', text: 'Grievances related to:' },
      { type: 'list', items: [
        'Repeated delivery failures,',
        'Orders marked delivered but not received,',
        'Loss or misrouting of shipment,',
        'Incorrect or incomplete delivery unresolved by support.',
      ]},
      { type: 'subheading', text: '2.3 Payment-Related Escalations' },
      { type: 'paragraph', text: 'Including:' },
      { type: 'list', items: [
        'Refund not issued within committed timelines,',
        'Duplicate deductions or overcharging,',
        'Significant payment gateway failures,',
        'Unauthorized or incorrect charges.',
      ]},
      { type: 'subheading', text: '2.4 Policy Violation Concerns' },
      { type: 'paragraph', text: 'Matters where a customer believes Febeul has not followed:' },
      { type: 'list', items: [
        'Return & Refund Policy,',
        'Shipping Policy,',
        'Payment Policy,',
        'Privacy Policy,',
        'Legal requirements under e-commerce or IT regulations.',
      ]},
      { type: 'subheading', text: '2.5 Product-Related Escalations' },
      { type: 'paragraph', text: 'Such as:' },
      { type: 'list', items: [
        'Repeated delivery of defective/incorrect items,',
        'Manufacturing defects validated but unresolved,',
        'Quality mismatch contradicting product description.',
      ]},
      { type: 'subheading', text: '2.6 Consumer Rights Issues' },
      { type: 'paragraph', text: 'Concerns relating to:' },
      { type: 'list', items: [
        'Unfair trade practices,',
        'Lack of adherence to mandatory consumer standards,',
        'Service deficiency impacting customer rights.',
      ]},
      { type: 'subheading', text: '2.7 Data Privacy & Security Complaints' },
      { type: 'paragraph', text: 'Including:' },
      { type: 'list', items: [
        'Misuse or unauthorized access of customer data,',
        'Account security breaches,',
        'Privacy violations under applicable data protection laws.',
      ]},
      { type: 'subheading', text: '2.8 Service Misconduct Issues' },
      { type: 'paragraph', text: 'Instances of:' },
      { type: 'list', items: [
        'Unprofessional or unethical behavior by any Febeul representative,',
        'Miscommunication that results in loss, confusion, or service failure.',
      ]},
      { type: 'paragraph', text: '❗ Note: Routine inquiries such as delivery tracking, general product questions, size inquiries, or basic refund timelines do not qualify as grievances. These must be handled through normal customer support channels.' },
    ],
  },
  {
    title: "3. HOW TO FILE A GRIEVANCE",
    content: [
      { type: 'paragraph', text: 'Customers may submit formal grievances only via the official email:' },
      { type: 'paragraph', text: '📩 grievance @febeul.com' },
      { type: 'paragraph', text: 'A valid grievance must include:' },
      { type: 'list', items: [
        'Full Name',
        'Registered Email ID',
        'Order ID / Transaction ID',
        'Contact Number',
        'Detailed description of the issue',
        'Relevant supporting proof (images, videos, receipts, screenshots, etc.)',
      ]},
      { type: 'paragraph', text: 'Incomplete complaints may lead to delays in processing.' },
    ],
  },
  {
    title: "4. ACKNOWLEDGEMENT & RESOLUTION TIMELINES",
    content: [
      { type: 'subheading', text: '4.1 Acknowledgement Timeline' },
      { type: 'paragraph', text: 'All grievances will be acknowledged within 48 hours of receipt.' },
      { type: 'subheading', text: '4.2 Resolution Timeline' },
      { type: 'paragraph', text: 'Febeul will resolve grievances within 7–15 working days, depending on issue complexity.' },
      { type: 'paragraph', text: 'For issues requiring extended investigation, the customer will be informed with an updated timeline.' },
    ],
  },
  {
    title: "5. GRIEVANCE REVIEW PROCESS",
    content: [
      { type: 'paragraph', text: 'Once a grievance is filed:' },
      { type: 'list', items: [
        'The Grievance Officer reviews the complaint and supporting documents.',
        'Additional information may be requested from the customer.',
        'Internal departments (logistics, finance, warehouse, tech, etc.) may be consulted.',
        'Evidence is examined according to Febeul’s policies and applicable laws.',
        'A resolution is drafted and communicated in writing via email.',
        'All grievance proceedings are documented for compliance and audit.',
      ]},
    ],
  },
  {
    title: "6. CUSTOMER RESPONSIBILITIES DURING THE GRIEVANCE PROCESS",
    content: [
      { type: 'paragraph', text: 'Customers must:' },
      { type: 'list', items: [
        'Provide accurate, complete, and truthful information',
        'Respond promptly to requests for additional clarification',
        'Maintain courteous and respectful communication',
        'Cooperate during investigation and verification procedures',
        'Avoid filing false, misleading, or fraudulent complaints',
      ]},
      { type: 'paragraph', text: 'Failure to cooperate may result in delays or closure of the grievance.' },
    ],
  },
  {
    title: "7. GROUNDS FOR REJECTION OF GRIEVANCE",
    content: [
      { type: 'paragraph', text: 'A grievance may be rejected if:' },
      { type: 'list', items: [
        'It lacks sufficient details or proof',
        'The claim violates Febeul’s policies',
        'The customer submits false or manipulated evidence',
        'The matter has already been resolved through support',
        'The issue is outside Febeul’s scope (e.g., banking delays)',
        'The grievance is abusive, threatening, or malicious in nature',
      ]},
      { type: 'paragraph', text: 'Febeul’s decision in such matters shall be final and binding.' },
    ],
  },
  {
    title: "8. ESCALATION MECHANISM",
    content: [
      { type: 'paragraph', text: 'If the customer is unsatisfied with the resolution:' },
      { type: 'list', items: [
        'They may request a re-evaluation of their grievance by the Grievance Officer.',
        'They may escalate the matter to higher management through a formal written request.',
        'Customers retain the right to approach applicable consumer or legal authorities under Indian law.',
      ]},
    ],
  },
  {
    title: "9. CONFIDENTIALITY & DATA PROTECTION",
    content: [
      { type: 'paragraph', text: 'All grievance information is handled per applicable Indian data protection laws. Febeul:' },
      { type: 'list', items: [
        'Maintains strict confidentiality of customer information,',
        'Shares data only with authorized departments,',
        'Does not disclose personal details to third parties except when legally required.',
      ]},
    ],
  },
  {
    title: "10. POLICY CHANGES",
    content: [
      { type: 'paragraph', text: 'Febeul reserves the right to update, revise, or replace this Policy at any time without prior notice. Continued use of the Website signifies acceptance of such updates.' },
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

const GrievanceRedressals = () => {
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
            GRIEVANCE REDRESSAL
            </h1>
            <p className="text-center text-gray-600 mb-8">
            Last Updated: [10 DEC 2025]
            </p>
            <p className="text-gray-700 leading-relaxed text-center">
            In compliance with the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines & Digital Media Ethics Code) Rules, 2021, Febeul appoints the following Grievance Officer:
            </p>
        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {grievanceRedressalData.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default GrievanceRedressals;
