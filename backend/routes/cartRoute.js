import express from 'express'
import { addToCart, getUserCart, updateCart, removeFromCart, addGiftWrapToCart, removeGiftWrapFromCart } from '../controllers/cartController.js'
import authUser from '../middleware/auth.js'

const cartRouter = express.Router()

cartRouter.get('/get',authUser, getUserCart)
cartRouter.post('/add',authUser, addToCart)
cartRouter.post('/update',authUser, updateCart)
cartRouter.post('/remove',authUser, removeFromCart)
cartRouter.post('/add-giftwrap', authUser, addGiftWrapToCart)
cartRouter.post('/remove-giftwrap', authUser, removeGiftWrapFromCart)

export default cartRouter