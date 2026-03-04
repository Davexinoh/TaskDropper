const express = require("express")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 10000

let complaints = []

function generateId(){
return "ICD-" + Math.random().toString(16).slice(2,7).toUpperCase()
}

const categories = [
{id:"payment",name:"Payment Issues"},
{id:"login",name:"Login Problems"},
{id:"bug",name:"Bug Report"},
{id:"other",name:"Other"}
]

const subIssues = {
payment:["failed_transaction","refund_request"],
login:["reset_password","cannot_login"],
bug:["ui_bug","system_error"],
other:["general_question"]
}

app.get("/api/categories",(req,res)=>{
res.json(categories)
})

app.get("/api/categories/:id",(req,res)=>{
res.json(subIssues[req.params.id] || [])
})

app.post("/api/complaints",(req,res)=>{

const id = generateId()

const complaint={
id,
category:req.body.category,
subIssue:req.body.subIssue,
description:req.body.description,
status:"pending",
createdAt:Date.now()
}

complaints.push(complaint)

res.json({
success:true,
reference:id
})

})

app.get("/api/complaints/:id",(req,res)=>{

const complaint=complaints.find(c=>c.id===req.params.id)

if(!complaint){
return res.json({error:"not found"})
}

res.json(complaint)

})

app.listen(PORT,()=>{
console.log("API running on port",PORT)
})
