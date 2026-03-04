const API = "https://intercomdesk-v2.onrender.com";

async function loadCategories(){

const res = await fetch(API + "/api/categories");

const data = await res.json();

const select = document.getElementById("category");

data.forEach(c => {

const option = document.createElement("option");

option.value = c.id;

option.text = c.name;

select.appendChild(option);

});

}

async function loadSubIssues(){

const category = document.getElementById("category").value;

const res = await fetch(API + "/api/categories/" + category);

const data = await res.json();

const select = document.getElementById("subIssue");

select.innerHTML = "";

data.forEach(issue => {

const option = document.createElement("option");

option.value = issue;

option.text = issue;

select.appendChild(option);

});

}

document.getElementById("category").addEventListener("change", loadSubIssues);

async function submitComplaint(){

const category = document.getElementById("category").value;

const subIssue = document.getElementById("subIssue").value;

const description = document.getElementById("description").value;

const res = await fetch(API + "/api/complaints", {

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
category,
subIssue,
description
})

});

const data = await res.json();

document.getElementById("result").innerText =
"Complaint submitted. Ref: " + data.reference;

}

loadCategories();


async function submitComplaint(){

const category=document.getElementById("category").value
const subIssue=document.getElementById("subIssue").value
const description=document.getElementById("description").value

const res = await fetch(API + "/api/complaints",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
category,
subIssue,
description
})
})

const data=await res.json()

document.getElementById("result").innerHTML =
"✅ Complaint submitted<br>Reference ID: <b>"+data.reference+"</b>"

}

async function checkStatus(){

const id=document.getElementById("ticketId").value

const res=await fetch(API+"/api/complaints/"+id)

const data=await res.json()

if(data.error){
document.getElementById("statusResult").innerHTML="Ticket not found"
return
}

document.getElementById("statusResult").innerHTML =
"Status: "+data.status

}
