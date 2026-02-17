import express from 'express';
import { createTicket, getUserTickets, listTickets, updateStatus, userReplyToTicket, adminPanelReplyToTicket, getTicketById } from '../controllers/ticketController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js'; // Import adminAuth middleware
import upload from '../middleware/multer.js'; // Import multer middleware

const ticketRouter = express.Router();

// Admin routes
ticketRouter.get('/list', auth, listTickets); // This should be before /:id
ticketRouter.post('/update-status', adminAuth, updateStatus);
ticketRouter.post('/admin-reply', adminAuth, upload.array('images', 2), adminPanelReplyToTicket); // Admin panel reply

// User routes
ticketRouter.post('/create', auth, upload.array('images', 2), createTicket);
ticketRouter.get('/user', auth, getUserTickets);
ticketRouter.post('/reply', auth, upload.array('images', 2), userReplyToTicket); // User's own reply
ticketRouter.get('/:id', auth, getTicketById);

export default ticketRouter;
