import express from 'express';
import { createTicket, getUserTickets, listTickets, updateStatus, replyToTicket, getTicketById } from '../controllers/ticketController.js';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';

const ticketRouter = express.Router();

// User routes
ticketRouter.post('/create', auth, createTicket);
ticketRouter.get('/user', auth, getUserTickets);
ticketRouter.post('/reply', auth, replyToTicket); // User reply
ticketRouter.get('/:id', auth, getTicketById);

// Admin routes
ticketRouter.get('/list', adminAuth, listTickets);
ticketRouter.post('/update-status', adminAuth, updateStatus);
ticketRouter.post('/admin-reply', adminAuth, replyToTicket); // Admin reply endpoint distinction

export default ticketRouter;
