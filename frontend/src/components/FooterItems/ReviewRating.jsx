import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const policySections = [
  {
    title: "1. Purpose of This Policy",
    content: [
      {
        type: 'paragraph',
        text: 'The primary objective of this Policy is to:'
      },
      {
        type: 'list',
        items: [
          'Ensure transparency and fairness in customer feedback',
          'Maintain compliance with Amazon and Flipkart community guidelines',
          'Promote accurate and genuine product experience sharing',
          'Enhance the overall product development and customer satisfaction',
          'Prevent fraudulent or incentivized review practices',
        ],
      },
      {
        type: 'paragraph',
        text: 'This Policy exists to protect both customers and the brand from misleading or unfair rating activities.'
      }
    ]
  },
  {
    title: "2. Eligibility to Submit Reviews",
    content: [
      {
        type: 'paragraph',
        text: 'A User may submit a Review if:'
      },
      {
        type: 'list',
        items: [
          'They have purchased a Febeul product from an authorized online marketplace;',
          'They have personally used or experienced the product;',
          'They comply with the platform’s Review eligibility requirements (such as Verified Purchase rules on Amazon/Flipkart).',
        ],
      },
      {
        type: 'paragraph',
        text: 'Only Reviews based on real usage of Febeul products are permitted.'
      }
    ]
  },
  {
    title: "3. Authenticity & Integrity Requirements",
    content: [
      {
        type: 'paragraph',
        text: 'All Reviews must be:'
      },
      {
        type: 'list',
        items: ['Genuine', 'Honest', 'Based on actual product experience', 'Free from external influence', 'Factually accurate'],
      },
      {
        type: 'paragraph',
        text: 'The following are strictly prohibited:'
      },
      {
        type: 'list',
        items: [
          'Fake reviews',
          'Paid reviews',
          'Reviews written in exchange for rewards, refunds, discounts, or gifts',
          'Reviews by individuals who have not used the product',
          'Reviews intended to manipulate ratings or mislead customers',
        ],
      },
      {
        type: 'paragraph',
        text: 'Febeul maintains a zero-tolerance policy toward fraudulent or incentivized feedback.'
      }
    ]
  },
  {
    title: '4. No Incentivized or Manipulated Reviews',
    content: [
      {
        type: 'paragraph',
        text: 'To comply with Amazon and Flipkart policies, Febeul does not:'
      },
      {
        type: 'list',
        items: [
          'Pay for reviews',
          'Offer refunds in exchange for positive feedback',
          'Provide free or discounted products for review submission',
          'Request modification or deletion of negative reviews',
          'Influence customer opinions in any form',
        ]
      },
      {
        type: 'paragraph',
        text: 'Any Reviewer found engaging in such activities may be reported to the platform.'
      }
    ]
  },
  {
    title: '5. Review Content Standards',
    content: [
        {
            type: 'paragraph',
            text: 'Review content must follow the community guidelines set by the marketplace and must NOT include:'
        },
        {
            type: 'subheading',
            text: 'Prohibited Elements'
        },
        {
            type: 'list',
            items: [
                'Abusive, offensive, vulgar, or defamatory language',
                'Hate speech or discriminatory remarks',
                'Irrelevant complaints unrelated to the product',
                'Threats, harassment, or personal attacks',
                'Promotion of other brands or external products',
                'Spam or misleading information',
                'Personal data such as phone numbers, email IDs, or addresses',
                'Explicit, inappropriate, or sensitive images or videos',
            ]
        },
        {
            type: 'paragraph',
            text: 'Reviews may be moderated or removed if they violate these standards.'
        }
    ]
  },
  {
      title: '6. Use of Photos and Videos',
      content: [
          {
              type: 'paragraph',
              text: 'Reviewers may upload images or videos of the product, provided that:'
          },
          {
              type: 'list',
              items: [
                'The media content is original and owned by the Reviewer',
                'The content accurately represents the purchased product',
                'The content complies with marketplace and legal guidelines',
                'The content does not infringe on copyrights, trademarks, or privacy rights',
              ]
          },
          {
            type: 'paragraph',
            text: 'Inappropriate or misleading media content may be rejected.'
          }
      ]
  },
  {
      title: '7. License & Rights Granted to Febeul',
      content: [
          {
              type: 'paragraph',
              text: 'By submitting a Review, the User grants Febeul a non-exclusive, royalty-free, worldwide, perpetual license to:'
          },
          {
              type: 'list',
              items: [
                'Reproduce',
                'Display',
                'Publish',
                'Share',
                'Use for marketing, product improvement, and customer experience purposes',
              ]
          },
          {
              type: 'paragraph',
              text: 'All usage will remain compliant with the policies of Amazon, Flipkart, and any other platform where the Review was posted.'
          }
      ]
  },
  {
    title: '8. Moderation & Platform Compliance',
    content: [
        {
            type: 'list',
            items: [
              'Amazon and Flipkart reserve full rights to evaluate, filter, restrict, or remove Reviews that violate their policies.',
              'Febeul may report reviews to the platform that appear fraudulent, harmful, or non-compliant.',
              'Febeul does not guarantee the publication of any Review submitted by a User.',
              'The final decision regarding the approval of Reviews rests solely with the marketplace.',
            ]
        }
    ]
  },
  {
    title: '9. Privacy & Confidentiality',
    content: [
        {
            type: 'paragraph',
            text: 'Febeul respects customer privacy. We do not:'
        },
        {
            type: 'list',
            items: [
                'Share customer contact details publicly',
                'Request personal information beyond platform requirements',
                'Use any reviewer information outside the permitted legal framework',
            ]
        },
        {
            type: 'paragraph',
            text: 'Review display names and identifiers will appear only as allowed by marketplace systems.'
        }
    ]
  },
  {
    title: '10. Non-Retaliation Commitment',
    content: [
        {
            type: 'paragraph',
            text: 'Febeul does not retaliate, penalize, or discriminate against any Reviewer for posting honest and negative feedback, provided it is compliant with this Policy.'
        },
        {
            type: 'paragraph',
            text: 'Critical feedback is considered valuable and is used to improve product quality and service efficiency.'
        }
    ]
  },
  {
    title: '11. Reporting Concerns or Issues',
    content: [
        {
            type: 'paragraph',
            text: 'If a customer faces any issue with a Febeul product, we encourage them to:'
        },
        {
            type: 'list',
            items: [
                'Contact customer support directly before or after posting a Review',
                'Share accurate details so that corrective actions can be taken',
                'Allow Febeul an opportunity to resolve concerns professionally',
            ]
        },
        {
            type: 'paragraph',
            text: 'Febeul is committed to delivering solutions promptly and effectively.'
        }
    ]
  },
  {
    title: '12. Updates to This Policy',
    content: [
        {
            type: 'paragraph',
            text: 'Febeul reserves the right to update, amend, or revise this Policy at any time to maintain compliance with marketplace rules, legal requirements, or internal quality standards.'
        },
        {
            type: 'paragraph',
            text: 'Any changes become effective immediately upon publication.'
        }
    ]
  }
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
                return <h3 key={idx} className="text-lg font-semibold text-gray-800 mt-4">{item.text}</h3>
              default:
                return null;
            }
          })}
        </div>
      </motion.div>
    );
};
  

const ReviewRating = () => {
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
            Febeul Review & Rating Policy
            </h1>

        </motion.div>

        <motion.div
            variants={{
                hidden: { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.3 } },
            }}
            className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-2xl p-8 md:p-12 border border-white/40"
        >
          {policySections.map((section, index) => (
            <Section key={index} index={index} title={section.title} content={section.content} />
          ))}

            <motion.div 
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { duration: 0.5, delay: policySections.length * 0.1 } },
                }}
                className="mt-12 pt-6 border-t border-gray-300"
            >
                <h2 className="text-2xl font-bold text-center text-[#f68a8b] mb-4">Conclusion</h2>
                <p className="text-center text-gray-700 leading-relaxed">
                This Policy ensures that all Reviews related to Febeul remain authentic, helpful, legally compliant, respectful, and transparent. By maintaining these standards, Febeul aims to create a fair review ecosystem that benefits both customers and the brand.
                </p>
            </motion.div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default ReviewRating;
