import express from 'express';
import { createTicket, getUserTickets, listTickets, updateStatus, replyToTicket, getTicketById } from '../controllers/ticketController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js'; // Import multer middleware

const ticketRouter = express.Router();

// Admin routes
ticketRouter.get('/list', auth, listTickets); // This should be before /:id
ticketRouter.post('/update-status', auth, updateStatus);
ticketRouter.post('/admin-reply', auth, replyToTicket); // Admin reply endpoint distinction

// User routes
ticketRouter.post('/create', auth, upload.array('images', 2), createTicket);
ticketRouter.get('/user', auth, getUserTickets);
ticketRouter.post('/reply', auth, replyToTicket); // User reply
ticketRouter.get('/:id', auth, getTicketById);

export default ticketRouter;
