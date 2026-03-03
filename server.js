const express = require("express")
const app = express()

const PORT = process.env.PORT || 10000

app.use(express.json())

// Root
app.get("/", (req,res)=>{
  res.send("Intercom Desk API running 🚀")
})

// Categories API
app.get("/api/categories", (req,res)=>{
  res.json([
    { id:"payment", name:"Payment Issues"},
    { id:"login", name:"Login Problems"},
    { id:"bug", name:"Bug Report"},
    { id:"other", name:"Other"}
  ])
})

// Sub issues
app.get("/api/categories/:id",(req,res)=>{
  const issues = {
    payment:["failed_transaction","double_charge","refund"],
    login:["cannot_login","reset_password"],
    bug:["ui_bug","feature_not_working"],
    other:["general_question"]
  }

  res.json(issues[req.params.id] || [])
})

app.listen(PORT, ()=>{
  console.log("API server running on port", PORT)
})
