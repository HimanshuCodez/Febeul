import { ticketModel } from '../models/ticketModel.js';
import userModel from '../models/userModel.js';
import { v2 as cloudinary } from 'cloudinary'; // Import cloudinary

// User: Create a new ticket
export const createTicket = async (req, res) => {
    // When using multer for multipart/form-data, text fields are in req.body and files in req.files
    const { subject, description, message } = req.body;
    const files = req.files; // This will contain the uploaded image files

    console.log("req.userId in createTicket:", req.userId); // Debugging line

    try {
        if (!subject || !description || !message) {
            return res.status(400).json({ success: false, message: 'Please provide subject, description, and a message.' });
        }

        const user = await userModel.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const imageUrls = [];
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'AdiLove_Tickets', // Specify your folder
                    });
                    imageUrls.push(result.secure_url);
                } catch (uploadError) {
                    console.error('Error uploading image to Cloudinary:', uploadError);
                    // Decide how to handle upload errors: either fail the ticket creation or continue without the image
                    // For now, we'll log and continue without the image, but a more robust solution might fail
                    // return res.status(500).json({ success: false, message: 'Failed to upload image.' });
                }
            }
        }

        const newTicket = new ticketModel({
            user: req.userId,
            subject,
            description,
            messages: [{ sender: 'user', message }],
            images: imageUrls, // Store the uploaded image URLs
        });

        await newTicket.save();

        res.json({ success: true, message: 'Ticket created successfully.', ticket: newTicket });

    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ success: false, message: 'Error creating ticket.' });
    }
};

// User: Get all tickets for the logged-in user
export const getUserTickets = async (req, res) => {
    try {
        const tickets = await ticketModel.find({ user: req.userId }).sort({ updatedAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ success: false, message: 'Error fetching tickets.' });
    }
};

// Admin: Get all tickets
export const listTickets = async (req, res) => {
    try {
        const tickets = await ticketModel.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error listing tickets:', error);
        res.status(500).json({ success: false, message: 'Error listing tickets' });
    }
};

// Admin: Update ticket status
export const updateStatus = async (req, res) => {
    const { ticketId, status } = req.body;
    try {
        const ticket = await ticketModel.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }

        ticket.status = status;
        await ticket.save();

        res.json({ success: true, message: 'Ticket status updated.' });

    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Error updating status.' });
    }
};

// User: Add a reply to a ticket (This is for user's own replies)
export const userReplyToTicket = async (req, res) => {
    const { ticketId, message } = req.body;
    const files = req.files; // Get uploaded files from multer
    
    // Always senderType 'user' for user-initiated replies from their panel
    const senderType = 'user';

    try {
        const ticket = await ticketModel.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }
        
        // Security check: user can only reply to their own ticket
        if (ticket.user.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        const imageUrls = [];
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'AdiLove_Ticket_Replies', // Specify a different folder for replies if needed
                    });
                    imageUrls.push(result.secure_url);
                } catch (uploadError) {
                    console.error('Error uploading image to Cloudinary:', uploadError);
                    // Handle error, e.g., return res.status(500).json({ success: false, message: 'Failed to upload image.' });
                }
            }
        }

        const newMessage = {
            sender: senderType,
            message,
            images: imageUrls, // Add image URLs to the message
            createdAt: new Date()
        };

        ticket.messages.push(newMessage);
        await ticket.save();

        res.json({ success: true, message: 'Reply sent.', newImages: imageUrls, newMessage });

    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ success: false, message: 'Error sending reply.' });
    }
};

// Admin Panel: Reply to a ticket (This is for replies originating from the dedicated admin panel)
export const adminPanelReplyToTicket = async (req, res) => {
    const { ticketId, message, sender } = req.body;
    const files = req.files; // Get uploaded files from multer
    
    // Use the sender provided in the request body (should be 'admin' from the admin panel)
    const senderType = sender;

    try {
        const ticket = await ticketModel.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }
        
        // NO ownership security check for admin panel replies (as per user's request)

        const imageUrls = [];
        if (files && files.length > 0) {
            for (const file of files) {
                try {
                    const result = await cloudinary.uploader.upload(file.path, {
                        folder: 'AdiLove_Ticket_Replies', // Specify a different folder for replies if needed
                    });
                    imageUrls.push(result.secure_url);
                } catch (uploadError) {
                    console.error('Error uploading image to Cloudinary:', uploadError);
                    // Handle error, e.g., return res.status(500).json({ success: false, message: 'Failed to upload image.' });
                }
            }
        }

        const newMessage = {
            sender: senderType,
            message,
            images: imageUrls, // Add image URLs to the message
            createdAt: new Date()
        };

        ticket.messages.push(newMessage);
        await ticket.save();

        res.json({ success: true, message: 'Reply sent.', newImages: imageUrls, newMessage });

    } catch (error) {
        console.error('Error sending admin panel reply:', error);
        res.status(500).json({ success: false, message: 'Error sending admin panel reply.' });
    }
};


// User & Admin: Get a single ticket by ID
export const getTicketById = async (req, res) => {
    try {
        const ticket = await ticketModel.findById(req.params.id).populate('user', 'name email');
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        // Security check for users
        if (!req.body.isAdmin && ticket.user._id.toString() !== req.userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        res.json({ success: true, ticket });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error fetching ticket details' });
    }
};