import axios from 'axios';

const API_URL = 'http://localhost:4000/api/policy';

const policies = [
    {
        policyName: "DataPrivacy",
        pageTitle: "PRIVACY & COOKIES POLICY",
        content: [
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
          {
            title: "3. LEGAL BASIS FOR DATA PROCESSING",
            content: [
              { type: 'paragraph', text: 'Your data is processed under the following legal grounds:' },
              { type: 'subheading', text: '✔ Consent' },
              { type: 'paragraph', text: 'When You voluntarily provide personal data.' },
              { type: 'subheading', text: '✔ Contractual Necessity' },
              { type: 'paragraph', text: 'Required to deliver products and fulfill orders.' },
              { type: 'subheading', text: '✔ Legal Obligation' },
              { type: 'paragraph', text: 'Compliance with IT Act, E-Commerce Rules, taxation, cybersecurity, and banking regulations.' },
              { type: 'subheading', text: '✔ Legitimate Interest' },
              { type: 'paragraph', text: 'Fraud prevention, platform security, dispute management, Website improvement.' },
            ],
          },
          {
            title: "4. DATA STORAGE & SECURITY MEASURES",
            content: [
              { type: 'paragraph', text: 'We implement strict technical and organizational safeguards, including:' },
              { type: 'list', items: [
                'SSL/TLS encryption',
                'Encrypted databases',
                'PCI-DSS compliant payment gateways',
                'Access control & role-based permissions',
                'Secure server infrastructure',
                'Regular vulnerability scans',
                'CERT-In compliant log retention & monitoring',
                'Secure handling of refund-related bank information',
              ]},
              { type: 'paragraph', text: 'While we apply reasonable security practices, no online system can guarantee absolute protection.' },
            ],
          },
          {
            title: "5. SHARING OF PERSONAL DATA",
            content: [
              { type: 'paragraph', text: 'Your personal data may be shared strictly on a need-to-know basis with:' },
              { type: 'subheading', text: '5.1 Operational Partners' },
              { type: 'list', items: [
                'Payment gateways',
                'Logistics and courier partners',
                'Customer support and verification teams',
              ]},
              { type: 'subheading', text: '5.2 Technology Partners' },
              { type: 'list', items: [
                'Hosting service providers',
                'Analytics platforms',
                'Security and fraud-detection partners',
              ]},
              { type: 'subheading', text: '5.3 Legal or Government Authorities' },
              { type: 'paragraph', text: 'Data may be provided when:' },
              { type: 'list', items: [
                'Required by law',
                'Requested by courts or regulatory bodies',
                'Required for cybersecurity reporting to CERT-In',
                'Necessary for fraud or dispute investigations',
              ]},
              { type: 'paragraph', text: 'We never sell, rent, or trade personal data to third parties.' },
            ],
          },
          {
            title: "6. DATA RETENTION POLICY",
            content: [
              { type: 'paragraph', text: 'We retain data only for as long as necessary:' },
              { type: 'list', items: [
                'Order, refund, and dispute data: as required for service fulfillment',
                'Legal, audit, and taxation data: up to 5 years',
                'CERT-In mandated logs: minimum 180 days',
              ]},
              { type: 'paragraph', text: 'Once retention periods expire, data is securely deleted or anonymized' },
            ],
          },
          {
            title: "7. USER RIGHTS UNDER THE DPDP ACT",
            content: [
              { type: 'paragraph', text: 'Users have the right to:' },
              { type: 'subheading', text: '✔ Access' },
              { type: 'paragraph', text: 'Obtain a summary of personal data held by Febeul.' },
              { type: 'subheading', text: '✔ Correction' },
              { type: 'paragraph', text: 'Request corrections to inaccurate or incomplete data.' },
              { type: 'subheading', text: '✔ Deletion' },
              { type: 'paragraph', text: 'Request deletion of personal data (subject to legal exceptions).' },
              { type: 'subheading', text: '✔ Consent Withdrawal' },
              { type: 'paragraph', text: 'Withdraw consent for non-essential processing.' },
              { type: 'subheading', text: '✔ Grievance Redressal' },
              { type: 'paragraph', text: 'Raise a complaint regarding data misuse or privacy concerns.' },
              { type: 'paragraph', text: 'All rights requests must be submitted to:' },
              { type: 'paragraph', text: '📩 support@febeul.com' },
            ],
          },
          {
            title: "8. CHILDREN’S PRIVACY",
            content: [
              { type: 'paragraph', text: 'Febeul does not knowingly collect data of minors.' },
              { type: 'paragraph', text: 'If any data of a minor is discovered, it will be deleted upon verification.' },
              { type: 'paragraph', text: 'Parents/guardians may contact us for such deletion requests.' },
            ],
          },
          {
            title: "9. COOKIES & TRACKING TECHNOLOGIES",
            content: [
              { type: 'paragraph', text: 'Febeul uses cookies to provide a secure, smooth, and personalized browsing experience.' },
              { type: 'subheading', text: '9.1 Types of Cookies We Use' },
              { type: 'subheading', text: 'a. Essential Cookies' },
              { type: 'paragraph', text: 'Required for:' },
              { type: 'list', items: [
                'Website functionality',
                'Secure login & checkout',
                'Payment processing',
                'Maintaining cart sessions',
              ]},
              { type: 'paragraph', text: 'Cannot be disabled.' },
              { type: 'subheading', text: 'b. Functional Cookies' },
              { type: 'paragraph', text: 'Used for:' },
              { type: 'list', items: [
                'Remembering preferences',
                'Improving usability and customer experience',
              ]},
              { type: 'subheading', text: 'c. Analytical Cookies' },
              { type: 'paragraph', text: 'Used for:' },
              { type: 'list', items: [
                'Website performance monitoring',
                'Traffic and behavior analysis',
                'Identifying improvements',
              ]},
              { type: 'subheading', text: 'd. Advertising Cookies' },
              { type: 'paragraph', text: 'Used for:' },
              { type: 'list', items: [
                'Delivering relevant promotions',
                'Frequency capping',
                'Measuring marketing performance',
              ]},
              { type: 'paragraph', text: 'No sale or commercial trade of cookie data occurs.' },
              { type: 'subheading', text: '9.2 Third-Party Cookies' },
              { type: 'paragraph', text: 'Used by:' },
              { type: 'list', items: [
                'Google Analytics',
                'Payment gateway partners',
                'Live chat/communication tools',
                'Logistics tracking tools',
              ]},
              { type: 'paragraph', text: 'These third parties follow their own privacy policies.' },
              { type: 'subheading', text: '9.3 Managing Cookies' },
              { type: 'paragraph', text: 'You can disable cookies via your browser. However, doing so may result in:' },
              { type: 'list', items: [
                'Limited Website functionality',
                'Checkout errors',
                'Incorrect loading of pages',
              ]},
              { type: 'paragraph', text: 'Essential cookies cannot be disabled.' },
            ],
          },
          {
            title: "10. DATA BREACH RESPONSE",
            content: [
              { type: 'paragraph', text: 'In the event of a data breach:' },
              { type: 'list', items: [
                'CERT-In will be notified within required legal timelines',
                'Affected users will be informed (if required)',
                'Immediate mitigation, blocking, and investigation steps will be taken',
                'Security measures will be strengthened to prevent recurrence',
              ]},
            ],
          },
          {
            title: "11. GRIEVANCE REDRESSAL (PRIVACY-SPECIFIC)",
            content: [
              { type: 'paragraph', text: 'For all privacy-related complaints:' },
              { type: 'list', items: [
                'Grievance Officer: Shree Yadav',
                '📩 grievance@febeul.com',
                '🕒 Response: within 48 hours',
                '🕒 Resolution: 7–15 working days',
              ]},
            ],
          },
          {
            title: "12. POLICY UPDATES",
            content: [
              { type: 'paragraph', text: 'This Policy may be amended to comply with:' },
              { type: 'list', items: [
                'Updated DPDP Rules',
                'Changes in IT or E-Commerce laws',
                'CERT-In cybersecurity directives',
                'Technical or business updates',
              ]},
              { type: 'paragraph', text: 'Continued use of the Website implies acceptance of updated policies.' },
            ],
          },
          {
            title: "13. CONTACT INFORMATION",
            content: [
              { type: 'paragraph', text: 'For data protection requests' },
              { type: 'paragraph', text: '📩 support@febeul.com' },
            ],
          },
        ]
    }
];

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2YTAxZDVmMTEyYjYwZWMxM2I1MzM4ZiIsImlhdCI6MTcyMTc2OTg3OH0.52ad8322c3CVqk8R9q9se9tM53v5xO2-s-y9St5b2jQ'; // I will need to get a valid token

const config = {
    headers: {
        'Content-Type': 'application/json',
        'token': token
    }
};

async function migrate() {
    for (const policy of policies) {
        try {
            await axios.post(API_URL, policy, config);
            console.log(`Successfully migrated ${policy.policyName}`);
        } catch (error) {
            console.error(`Failed to migrate ${policy.policyName}:`, error.response ? error.response.data : error.message);
        }
    }
}

migrate();
