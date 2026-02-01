const ticketModel = require('../models/ticketModel');
const userModel = require('../models/userModel');

// User: Create a new ticket
const createTicket = async (req, res) => {
    const { subject, description, message } = req.body;
    try {
        if (!subject || !description || !message) {
            return res.status(400).json({ success: false, message: 'Please provide subject, description, and a message.' });
        }

        const user = await userModel.findById(req.body.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const newTicket = new ticketModel({
            user: req.body.userId,
            subject,
            description,
            messages: [{ sender: 'user', message }]
        });

        await newTicket.save();

        res.json({ success: true, message: 'Ticket created successfully.', ticket: newTicket });

    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ success: false, message: 'Error creating ticket.' });
    }
};

// User: Get all tickets for the logged-in user
const getUserTickets = async (req, res) => {
    try {
        const tickets = await ticketModel.find({ user: req.body.userId }).sort({ updatedAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ success: false, message: 'Error fetching tickets.' });
    }
};

// Admin: Get all tickets
const listTickets = async (req, res) => {
    try {
        const tickets = await ticketModel.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        res.json({ success: true, tickets });
    } catch (error) {
        console.error('Error listing tickets:', error);
        res.status(500).json({ success: false, message: 'Error listing tickets' });
    }
};

// Admin: Update ticket status
const updateStatus = async (req, res) => {
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

// User & Admin: Add a reply to a ticket
const replyToTicket = async (req, res) => {
    const { ticketId, message } = req.body;
    
    // The adminAuth middleware adds `isAdmin:true` to the body.
    const senderType = req.body.isAdmin ? 'admin' : 'user';

    try {
        const ticket = await ticketModel.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }
        
        // Security check: if user, ensure they own the ticket
        if (senderType === 'user' && ticket.user.toString() !== req.body.userId) {
            return res.status(403).json({ success: false, message: 'Unauthorized.' });
        }

        const newMessage = {
            sender: senderType,
            message,
            createdAt: new Date()
        };

        ticket.messages.push(newMessage);
        await ticket.save();

        const populatedTicket = await ticketModel.findById(ticketId).populate('user', 'name email');

        res.json({ success: true, message: 'Reply sent.', newMessage, ticket: populatedTicket });

    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({ success: false, message: 'Error sending reply.' });
    }
};


// User & Admin: Get a single ticket by ID
const getTicketById = async (req, res) => {
    try {
        const ticket = await ticketModel.findById(req.params.id).populate('user', 'name email');
        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found' });
        }
        // Security check for users
        if (!req.body.isAdmin && ticket.user._id.toString() !== req.body.userId) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }
        res.json({ success: true, ticket });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Error fetching ticket details' });
    }
};


module.exports = { createTicket, getUserTickets, listTickets, updateStatus, replyToTicket, getTicketById };