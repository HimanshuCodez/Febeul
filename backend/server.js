import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import connectCloudinary from './config/cloudinary.js'
import userRouter from './routes/userRoute.js'
import productRouter from './routes/productRoute.js'
import cartRouter from './routes/cartRoute.js'
import orderRouter from './routes/orderRoute.js'
import reviewRouter from './routes/reviewRoute.js'
import otpRouter from './routes/otpRoute.js'
import giftWrapRouter from './routes/giftWrapRoute.js'
import webhookRouter from './routes/webhookRoute.js'
import refundRouter from './routes/refundRoute.js' // Import refundRouter
import policyRouter from './routes/policyRoute.js'
import errorHandler from './middleware/errorHandler.js'

// App Config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// api endpoints
app.use('/api/user',userRouter)
app.use('/api/product',productRouter)
app.use('/api/cart',cartRouter)
app.use('/api/order',orderRouter)
app.use('/api/review',reviewRouter)
app.use('/api/otp',otpRouter)
app.use('/api/giftwrap',giftWrapRouter)
app.use('/api/tracking',webhookRouter)
app.use('/api/refund',refundRouter) // Use refundRouter
app.use('/api/policy',policyRouter)

app.get('/',(req,res)=>{
    res.send("API Working")
})
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use(errorHandler)

app.listen(port, ()=> console.log('Server started on PORT : '+ port))