const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const categories = [
  { id: "payment", name: "Payment Issues" },
  { id: "login", name: "Login Problems" },
  { id: "bug", name: "Bug Report" },
  { id: "other", name: "Other" }
];

const subIssues = {
  payment: ["failed_transaction", "double_charge"],
  login: ["cannot_login", "reset_password"],
  bug: ["ui_bug", "feature_not_working"],
  other: ["general_question"]
};

app.get("/", (req,res)=>{

res.send("Intercom Desk API running 🚀")

})

app.get("/api/categories",(req,res)=>{

res.json(categories)

})

app.get("/api/categories/:id",(req,res)=>{

res.json(subIssues[req.params.id]||[])

})

app.post("/api/complaints",(req,res)=>{

const {category,subIssue,description}=req.body

if(!category||!subIssue||!description){

return res.status(400).json({error:"Missing fields"})

}

const reference="ICD-"+Math.random().toString(16).slice(2,8).toUpperCase()

res.json({success:true,reference})

})

const PORT=process.env.PORT||3001

app.listen(PORT,()=>{

console.log("API running on port",PORT)

})
