const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const app = express()
require("dotenv").config({path:'config.env'})
const bcrypt = require('bcrypt')
const jwt  = require('jsonwebtoken')
const axios  = require("axios")
const currentDateTime = new Date();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(
    {
    origin:["https://gokuls-host-frontend.vercel.app"],
    methods:["POST","GET"],
    credentials:true
    }
))

mongoose.set('bufferCommands',true);
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
    password: String,
    logouttime:String,
    cart:[
    {
         items:[
            {

             _id: {
            type: Number,
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
          price: {
            type: Number,
            required: true,
          },
        },]
        
    } 
    ],
    otp:Number,
},
)
const User = new mongoose.model("User", userSchema)

//home page
app.get('/products',async (req, res) => {
try {
    const response =  await axios.get('https://gokuls0611.github.io/data/data.json');
    res.send(response.data);
} catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
}
});


//session
app.post("/",(req,res)=>{
    try {
        if (!req.body.t) {
          throw new Error('JWT token is missing.');
        }
        const decoded = jwt.verify(req.body.t,"process.env.KEY");
        console.log(decoded)
        const lgt = decoded.id
        User.findOne({_id:lgt})
        .then((foundUser)=>{
            console.log(new Date(foundUser.logouttime).toISOString())
            console.log(currentDateTime)
            const logtime = new Date(foundUser.logouttime)
            console.log(logtime.getTime() > currentDateTime.getTime())
            if (logtime.getTime() > currentDateTime.getTime()) {
                res.send({valid:true})
            } else {
              res.send({valid:false,message:"Session-expired"})
            }
        })
        
      } catch (err) {
        console.error('JWT verification failed:', err.message);
        res.send({valid:false,message:"Login to Continue"})
      }
})

app.get("/logout",(req,res)=>{
    console.log("Logged Out")
    res.send({message:"Logged Out Successfully"})
})

app.post("/register", (req, res)=> {
    const { name, email, password} = req.body
    User.findOne({email:email})
        .then((foundUser)=> {
            if(foundUser){
                res.send({message: "User already registerd",Login:true})
            } else {
                bcrypt.hash(password.toString(),process.env.SALT,(err,password)=>{
                    if(err){
                        console.log(err);
                    }
                const user = new User({
                    name,
                    email,
                    password,
                })
                user.save()
            })
                res.send({message:"Registered Successfully",Login:false})
            }
    })   
}) 
app.post("/login", (req, res)=> {
    console.log(req.body)
    const {email, password} = req.body
    
    User.findOne({email:email})
        .then((foundUser)=> {
            if(foundUser){
                bcrypt.compare(password.toString(),foundUser.password,(err,response)=>{
                    if(err){
                        console.log(err)
                        res.send({message:"Invalid Mail or Password",Login:false})
                    }
                    else if(response){
                        const id = foundUser._id
                        console.log(id)
                        const token = jwt.sign({id},"process.env.KEY")
                        res.send({message:"Welcome "+foundUser.name,Login:true,token:token})
                        console.log(token)
                        User.updateOne({ email:email },{$set:{logouttime:new Date(currentDateTime.getTime() + 60 * 60 * 1000)}})
                        .then(
                        console.log("Updated time")
                        )
                    }
                    else{
                        res.send({message:"Invalid Mail or Password",Login:false})
                    }
                })
            }
            else{
                res.send({message:"Invalid Mail or Password",Login:false})
            }
    })
    .catch((err)=>{
        console.log(err)
        res.send({message:"Invalid Mail or Password",Login:false})
    })
            
    
}) 

app.post('/verifyotp',(req,res)=>{
    const {email,otp} = req.body
    User.findOne({email:email})
    .then((foundUser)=>{
        console.log(foundUser)
        console.log("fo",foundUser.otp,"o",otp)
            if(parseInt(foundUser.otp)=== parseInt(otp)){
                User.updateOne({email:foundUser.email},{$unset:{otp:1}})
                .then(
                    res.send({verify:true,message:"OTP verfied"})
                )
            }
            else{
                res.send({verify:false,message:"Invalid OTP"})
            }
    }
    )
})

app.post('/setPassword',(req,res)=>{
    const {email,password} = req.body
    bcrypt.hash(password.toString(),process.env.process.env.SALT,(err,password)=>{
        if(err){
            console.log(err);
        }
        else if(password){
           
            User.updateOne({ email:email },{$set:{password:password}})
            .then(
            res.send({message:"Password changed Successfully",b:true})
            )
        }
        else{
            res.send({message:"Unable to change Password for a moment ",b:false})
        }
})
    console.log(req.body);
    
})
// place orders
app.post('/placeorders',(req,res)=>{
    const {cart,t} = req.body
    const decoded = jwt.verify(t,"process.env.KEY");
    console.log(decoded)
    const lgt = decoded.id
    User.findOne({_id:lgt})
    .then(
        User.updateOne({_id:lgt},{$push:{cart:[{items:cart}]}})
        .then(res.send(
            {message:"Order Placed"}
            ))
    )

    
}
)

app.post("/orderList",(req,res)=>{
    const {t} = req.body
    const decoded = jwt.verify(t,"process.env.KEY");
    const lgt = decoded.id
    User.findOne({_id:lgt})
    .then((foundUser)=>{
        if(!foundUser.cart){
            res.send({order:null}) 
        }
        else{   
        res.send({order:foundUser.cart})
        }
    })
})

app.post("/deleteOrder",(req,res)=>{
    const {t,id} = req.body
    const decoded = jwt.verify(t,"process.env.KEY");
    const lgt = decoded.id
    User.updateOne({_id:lgt},{$pull: {cart: {_id:id}}})
    .then((foundUser)=>{
        res.send({message:"Order Canceled"})
    })
})

app.listen(5000,() => {console.log("Server Started on 5000")})


