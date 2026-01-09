import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MessageSquare, ChevronDown, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

const faqs = [
  {
    question: "What is your return policy?",
    answer: "We offer a 2-day return/exchange policy for all unworn items with tags attached. Please visit our returns page for more details.",
  },
  {
    question: "How can I track my order?",
    answer: "Once your order has shipped, you will receive an email with a tracking number. You can use this number on the carrier's website to track your package.",
  },
  {
    question: "Do you offer international shipping?",
    answer: "Yes, we ship to most countries worldwide. Shipping costs and delivery times vary by location. Please proceed to checkout to see the options for your country.",
  },
  {
    question: "How do I find the right size?",
    answer: "We have a comprehensive size guide available on each product page. If you need further assistance, our fit experts are happy to help via chat or email.",
  },
];

const Support = () => {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, you would handle form submission here (e.g., API call)
    toast("💖 Thank you for your message! Our team will get back to you soon.");
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-pink-50/50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-800">Support Center</h1>
          <p className="mt-2 text-lg text-gray-600">We're here to help with any questions you may have.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormInput label="Full Name" name="name" value={formData.name} onChange={handleChange} placeholder="Your Name" required />
              <FormInput label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="your.email@example.com" required />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  rows="5"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-pink-500 text-white py-3 rounded-md font-semibold text-lg hover:bg-pink-600 transition-colors flex items-center justify-center space-x-2"
              >
                <span>Send Message</span>
              </button>
            </form>
          </motion.div>

          {/* FAQ and Contact Info Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center"><HelpCircle className="mr-2 text-pink-500"/>Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FaqItem key={index} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                <ContactInfoCard icon={Mail} title="Email Us" detail="support@febeul.com" />
                <ContactInfoCard icon={Phone} title="Call Us" detail="+91 9990310241" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const FormInput = ({ label, ...props }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input {...props} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm" />
    </div>
);

const FaqItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b last:border-b-0">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center py-4 text-left">
                <span className="font-semibold text-gray-700">{question}</span>
                <ChevronDown className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pb-4 text-gray-600">
                    {answer}
                </motion.div>
            )}
        </div>
    )
}

const ContactInfoCard = ({ icon: Icon, title, detail }) => (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
        <Icon className="w-10 h-10 text-pink-500 mb-3" />
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <p className="text-gray-600 text-sm">{detail}</p>
    </div>
)

export default Support;
