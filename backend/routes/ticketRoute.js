const express = require('express');
const { createTicket, getUserTickets, listTickets, updateStatus, replyToTicket, getTicketById } = require('../controllers/ticketController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

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

module.exports = ticketRouter;
