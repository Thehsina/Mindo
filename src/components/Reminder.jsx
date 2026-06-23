export default function Reminder({task}){

const today = new Date()

const due = new Date(task.dueDate)

if(due < today && !task.completed){

return(

<div className="glass-card p-3 border-l-4 border-pink-500 bg-gradient-to-r from-pink-500/10 to-transparent">

⚠️ Task overdue: <span className="text-pink-200">{task.title}</span>

</div>

)

}

return null

}