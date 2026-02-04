import express from 'express';
import { createTicket, getUserTickets, listTickets, updateStatus, replyToTicket, getTicketById } from '../controllers/ticketController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import upload from '../middleware/multer.js'; // Import multer middleware

const ticketRouter = express.Router();

// User routes
ticketRouter.post('/create', auth, upload.array('images', 2), createTicket); // Add multer middleware here
ticketRouter.get('/user', auth, getUserTickets);
ticketRouter.post('/reply', auth, replyToTicket); // User reply
ticketRouter.get('/:id', auth, getTicketById);

// Admin routes
ticketRouter.get('/list', auth, listTickets);
ticketRouter.post('/update-status', adminAuth, updateStatus);
ticketRouter.post('/admin-reply', adminAuth, replyToTicket); // Admin reply endpoint distinction

export default ticketRouter;
