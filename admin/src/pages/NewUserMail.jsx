import React, { useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Loading from '../components/Loading';

const NewUserMail = ({ token }) => {
    const [subject, setSubject] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [buttonText, setButtonText] = useState('');
    const [buttonLink, setButtonLink] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [target, setTarget] = useState('all');
    const [specificEmails, setSpecificEmails] = useState('');
    const [loading, setLoading] = useState(false);

    const emailPreviewHtml = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; font-weight: 700;">FEBEUL</h1>
                </div>
                
                ${imageUrl ? `<img src="${imageUrl}" style="width: 100%; height: auto; display: block;" alt="Promotion Image" />` : ''}
                
                <div style="padding: 40px 30px; line-height: 1.6;">
                    <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px; font-weight: 600;">${title || 'Your Title Here'}</h2>
                    <div style="color: #555; font-size: 16px; margin-bottom: 30px;">
                        ${body || 'Your message will appear here. Start typing to see the preview...'}
                    </div>
                    
                    ${buttonText && buttonLink ? `
                        <div style="text-align: center; margin-top: 40px;">
                            <a href="${buttonLink}" style="background-color: #1a1a1a; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s ease;">
                                ${buttonText}
                            </a>
                        </div>
                    ` : ''}
                </div>
                
                <div style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #eeeeee;">
                    <p style="color: #999; font-size: 13px; margin: 0;">&copy; ${new Date().getFullYear()} Febeul. All rights reserved.</p>
                    <p style="color: #999; font-size: 13px; margin: 5px 0 0;">You're receiving this because you're a valued member of Febeul.</p>
                </div>
            </div>
        </div>
    `;

    const handleSendMail = async (e) => {
        e.preventDefault();
        if (!subject || !title || !body) {
            toast.error("Subject, Title, and Body are required.");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                backendUrl + '/api/admin/send-marketing-mail',
                {
                    subject,
                    title,
                    body,
                    buttonText,
                    buttonLink,
                    imageUrl,
                    target,
                    specificEmails,
                    htmlContent: emailPreviewHtml
                },
                { headers: { token } }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setSubject('');
                setTitle('');
                setBody('');
                setButtonText('');
                setButtonLink('');
                setImageUrl('');
                setSpecificEmails('');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to send email.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto p-4">
            <div className="flex justify-between items-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800">Email Marketing Campaign</h1>
                <p className="text-sm text-gray-500">Design and send professional emails to all your users</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Editor Section */}
                <div className="flex flex-col gap-5 bg-white p-6 rounded-xl shadow-sm border">
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Composer
                    </h2>
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Email Subject Line</label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            type="text"
                            placeholder="e.g. Exclusive Festive Sale is Here!"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Target Audience</label>
                        <select
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all bg-white font-medium"
                        >
                            <option value="all">All Registered Users</option>
                            <option value="luxe">Luxe Members Only</option>
                            <option value="new">New Users (Joined in last 30 days)</option>
                            <option value="specific">Specific Email IDs</option>
                        </select>
                    </div>

                    {target === 'specific' && (
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">Specific Email IDs (Comma separated)</label>
                            <textarea
                                value={specificEmails}
                                onChange={(e) => setSpecificEmails(e.target.value)}
                                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all min-h-[100px]"
                                placeholder="user1@example.com, user2@example.com, user3@example.com"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Main Heading (Inside Email)</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            type="text"
                            placeholder="e.g. Celebrate with Febeul"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-gray-700">Feature Image URL (Optional)</label>
                        <input
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            type="text"
                            placeholder="https://example.com/banner.jpg"
                        />
                    </div>

                    <div className="flex flex-col gap-1 h-[250px] mb-12">
                        <label className="text-sm font-medium text-gray-700">Message Content</label>
                        <ReactQuill
                            theme="snow"
                            value={body}
                            onChange={setBody}
                            className="h-[180px]"
                            placeholder="Write your marketing message here..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">Button Text</label>
                            <input
                                value={buttonText}
                                onChange={(e) => setButtonText(e.target.value)}
                                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                type="text"
                                placeholder="e.g. Shop Now"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-gray-700">Button Link</label>
                            <input
                                value={buttonLink}
                                onChange={(e) => setButtonLink(e.target.value)}
                                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                type="text"
                                placeholder="https://febeul.com/collection"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSendMail}
                        disabled={loading}
                        className={`mt-6 py-3 px-6 rounded-lg font-bold text-white transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 active:scale-95 shadow-md hover:shadow-lg'}`}
                    >
                        {loading ? 'Sending Emails...' : 'Broadcast Email to All Users'}
                    </button>
                </div>

                {/* Preview Section */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Live Preview
                    </h2>
                    <div className="border rounded-xl overflow-hidden shadow-inner bg-gray-100 min-h-[600px] flex items-start justify-center p-4">
                        <div 
                            className="bg-white w-full max-w-[600px] shadow-2xl rounded-lg overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: emailPreviewHtml }}
                        />
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-700">
                        <strong>Tip:</strong> Ensure your image URL is publicly accessible. Test links before broadcasting to all users.
                    </div>
                </div>
            </div>
            {loading && <Loading />}
        </div>
    );
};

export default NewUserMail;
