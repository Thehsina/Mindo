export default function Notification({message}){

if(!message) return null

return(

<div className="fixed top-5 right-5 glass-card px-4 py-3 text-emerald-200 backdrop-blur-md">

✓ {message}

</div>

)

}