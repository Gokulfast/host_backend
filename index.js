const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const session = require("express-session")
const app = express()
require("dotenv").config({path:'config.env'})
const nodemailer = require("nodemailer")
const generateOTP = require('./generateOTP')

app.use(express.json())
app.use(express.urlencoded())
app.use(cors())
app.use(cookieParser())
app.use(session({
    secret:'secret',
    resave:false,
    saveUninitialzed:false,
    cookie:{
        secure:false,
        maxAge:1000 *60*60*24
    }
}))
mongoose.set('bufferCommands', false);
try {
mongoose.connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
console.log("Database connected")
} catch (err) {
console.error(err)
}

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
})
const User = new mongoose.model("User", userSchema)


//Mail Configuration
const transporter = nodemailer.createTransport({
    host:process.env.HOST,
    service:process.env.SERVICE,
    port:process.env.PORT,
    secure:Boolean(process.env.SECURE),
    auth:{
        user:process.env.USER,
        pass:process.env.PASS
    }
})

app.post("/register", (req, res)=> {
    const { name, email, password} = req.body
    User.findOne({email:email})
        .then((foundUser)=> {
            if(foundUser){
                res.send({message: "User already registerd"})
            } else {
                const user = new User({
                    name,
                    email,
                    password
                })
                user.save()
                res.send({message:"Registered Successfully"})
            }
    })   
}) 


app.post("/login", (req, res)=> {
    const { email, password} = req.body
    User.findOne({email:email})
        .then((foundUser)=> {
            if(foundUser && foundUser.password === password){
                res.send({message:"Welcome "+foundUser.name,user:foundUser,loginuser:true})
            } else {
                res.send({message:"Invalid Mail",loginuser:false})
            }
    })
            
    
}) 


// otp
app.post("/forgotPassword",(req,res)=>{
const {email} =req.body
User.findOne({email:email})
.then((foundUser)=>{
        if(foundUser){
            var OTP = generateOTP();
            console.log(OTP)
            res.send({
                message:"Enter OTP",
                otp:OTP,
                b:true
            })
            let content = `<p>Hi ${foundUser.name} your OTP to change Password ${OTP}</p>`
            let mailOptions = {
                from: process.env.USER,
                to: foundUser.email,
                subject: 'Reset Password',
                text: "Hi"+foundUser.name+" our OTP to change Password "+OTP,
                html:content,
                };
                console.log(foundUser.email)
            //   transporter.sendMail(mailOptions, (error, info) => {
            //     if (error) {
            //       console.log('Error occurred:', error);
            //     } else {
            //       console.log('Email sent:', info.response);
            //       setTimeout(()=>{
            //         OTP = 0
            //         console.log(OTP)
            //       },1000)

            //     }
            //   });
        }
        else{
            res.send({message:"Invalid Mail",b:false})
        }
    })
})

app.post('/setPassword',(req,res)=>{
    const {email,password} = req.body
    console.log(req.body);
    try{
    User.updateOne({ email:email },{$set:{password:password}})
    .then(
    res.send({message:"Password changed Successfully",b:true})
    )
    }
    catch{
        res.send({message:"Unable to change Password for a moment ",b:false})
    }
})


app.listen(5000,() => {console.log("Server Started on 5000")})


