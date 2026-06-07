import axios from 'axios';
import jwt from 'jsonwebtoken';

// --- Configuration ---
const API_URL = 'http://localhost:4000/api/policy';
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "adminpassword";
const JWT_SECRET = "averysecretkeyadesignforthisproject";

// --- Data extracted from frontend components ---

const dataPrivacyPolicyData = [
  {
    title: "PRIVACY & COOKIES POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: 11 DEC 2025' },
      { type: 'paragraph', text: 'This Privacy & Cookies Policy (“Policy”) explains how Febeul (“Company”, “We”, “Us”, “Our”) collects, uses, processes, stores, and protects personal data of users (“You”, “Your”, “User”) who access or use the Febeul Website (“Website”).' },
      { type: 'paragraph', text: 'By using this Website, You consent to the data practices described in this Policy.' },
      { type: 'paragraph', text: 'This Policy complies with:' },
      { type: 'list', items: [
        'Digital Personal Data Protection Act, 2023 (DPDP Act)',
        'Information Technology Act, 2000',
        'IT (Reasonable Security Practices & Procedures) Rules, 2011',
        'IT Intermediary & Digital Media Ethics Code Rules 2021–2023',
        'CERT-In Cybersecurity Guidelines 2022',
        'Consumer Protection (E-Commerce) Rules, 2020',
      ]},
    ],
  },
  {
    title: "1. PERSONAL DATA WE COLLECT",
    content: [
      { type: 'paragraph', text: 'We collect only the minimum necessary data required for providing lawful services.' },
      { type: 'subheading', text: '1.1 Information You Provide Directly' },
      { type: 'list', items: [
        'Full Name',
        'Email Address',
        'Mobile Number',
        'Shipping & Billing Address',
        'Payment-related identifiers (masked; no card numbers stored)',
        'Bank details for COD refunds (optional & user-submitted)',
        'Images/videos for return, exchange, or dispute verification',
      ]},
      { type: 'subheading', text: '1.2 Automatically Collected Data (CERT-In Compliant)' },
      { type: 'paragraph', text: 'As per cybersecurity guidelines, we collect:' },
      { type: 'list', items: [
        'IP Address',
        'Device type & identifiers',
        'Browser type',
        'Access or login timestamps',
        'Website navigation patterns',
        'Cookies, scripts & tracking identifiers',
        'Log files (mandatory retention: 180 days)',
      ]},
    ],
  },
  {
    title: "2. PURPOSE OF DATA PROCESSING",
    content: [
      { type: 'paragraph', text: 'Your personal data is used for the following lawful purposes:' },
      { type: 'list', items: [
        'To process, ship, and deliver orders',
        'To authenticate transactions and prevent fraud',
        'To verify identity in return/exchange/refund cases',
        'To provide customer support and grievance resolution',
        'To enhance Website performance and personalization',
        'To comply with tax, audit, payment, and regulatory requirements',
        'To detect and prevent security threats, misuse, or suspicious activities',
      ]},
      { type: 'paragraph', text: 'We do not use personal data for any unlawful, harmful, or excessive purposes.' },
    ],
  },
];

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
];

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
];

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
        'Email: grievance@febeul.com',
        'Address: New Swaroop Nagar, Delhi 110042-India',
      ]},
    ],
  },
];

const luxePolicyData = [
  {
    title: "LUXE MEMBERSHIP POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: 11 DEC 2025' },
      { type: 'paragraph', text: 'The Febeul Luxe Membership (“Luxe Membership” or “Membership”) is a premium subscription program offered by Febeul (“Company”, “We”, “Us”, “Our”). This Policy outlines the terms, conditions, benefits, payment rules, renewal rules, cancellation, refund eligibility, and other operational aspects governing the Luxe Membership.' },
    ],
  },
  {
    title: "1. MEMBERSHIP BENEFITS",
    content: [
      { type: 'paragraph', text: 'Luxe Members receive the following exclusive benefits:' },
      { type: 'subheading', text: '1.1 Fast Priority Delivery' },
      { type: 'paragraph', text: 'Orders placed under a Luxe Membership are processed and shipped on priority.' },
    ],
  },
];

const paymentPolicyData = [
  {
    title: "PAYMENT POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: [10 DEC 2025]' },
      { type: 'paragraph', text: 'This Payment Policy (“Policy”) governs all payments made for purchases on the Febeul Website (“Website”). By placing an order and completing a transaction, the customer (“User”) agrees to comply with all terms and conditions mentioned herein.' },
    ],
  },
];

const returnRefundData = [
  {
    title: "RETURN, EXCHANGE & REFUND POLICY",
    content: [
      { type: 'paragraph', text: 'Last Updated: [10 DEC 2025]' },
      { type: 'paragraph', text: 'Febeul follows a strict 2-Days Return & Exchange Policy. All return or exchange requests must be raised within 2 days from the date of delivery. Any request submitted after 2 days will not be accepted under any circumstances.' },
    ],
  },
];

const reviewRatingPolicyData = [
  {
    title: "Febeul Review & Rating Policy",
    content: [
      { type: 'paragraph', text: 'The primary objective of this Policy is to:' },
    ]
  }
];

const termsAndConditionsData = [
  {
    title: "TERMS & CONDITIONS – FEBEUL",
    content: [
       { type: 'paragraph', text: 'By using this Website, you confirm that:' },
    ],
  },
];

// --- Main Migration Logic ---

const policies = [
    {
        policyName: "DataPrivacy",
        pageTitle: "PRIVACY & COOKIES POLICY",
        content: dataPrivacyPolicyData
    },
    {
        policyName: "Faq",
        pageTitle: "GENERAL WEBSITE FAQs",
        content: faqData
    },
    {
        policyName: "GiftWrapPolicy",
        pageTitle: "GIFT WRAP POLICY",
        content: giftWrapPolicyData
    },
    {
        policyName: "GrievanceRedressals",
        pageTitle: "GRIEVANCE REDRESSAL",
        content: grievanceRedressalData
    },
    {
        policyName: "LuxePolicy",
        pageTitle: "LUXE MEMBERSHIP POLICY",
        content: luxePolicyData
    },
    {
        policyName: "PaymentPolicy",
        pageTitle: "PAYMENT POLICY",
        content: paymentPolicyData
    },
    {
        policyName: "ReturnRefund",
        pageTitle: "RETURN, EXCHANGE & REFUND POLICY",
        content: returnRefundData
    },
    {
        policyName: "ReviewRating",
        pageTitle: "Febeul Review & Rating Policy",
        content: reviewRatingPolicyData
    },
    {
        policyName: "TermsConditions",
        pageTitle: "TERMS & CONDITIONS – FEBEUL",
        content: termsAndConditionsData
    }
];

// Generate the token
const payload = ADMIN_EMAIL + ADMIN_PASSWORD;
const token = jwt.sign(payload, JWT_SECRET);

const config = {
    headers: {
        'Content-Type': 'application/json',
        'token': token
    }
};

async function migrate() {
    console.log('Starting policy migration...');
    for (const policy of policies) {
        try {
            await axios.post(API_URL, policy, config);
            console.log(`Successfully migrated ${policy.policyName}`);
        } catch (error) {
            const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`Failed to migrate ${policy.policyName}:`, errorMessage);
        }
    }
    console.log('Policy migration finished.');
}

migrate();