import Navbar from "../components/Navbar";
import { useSelector } from "react-redux";

export default function DashboardPage(){

const tasks = useSelector((state)=>state.tasks.tasks)

const completed = tasks.filter(t=>t.completed).length
const pending = tasks.length - completed

return(

<div>

<Navbar/>

<div className="p-8">

<h2 className="text-3xl font-bold mb-6">Dashboard</h2>

<div className="grid grid-cols-3 gap-4">

<div className="bg-white p-6 shadow rounded">
<h3>Total Tasks</h3>
<p className="text-2xl">{tasks.length}</p>
</div>

<div className="bg-white p-6 shadow rounded">
<h3>Completed</h3>
<p className="text-2xl text-green-500">{completed}</p>
</div>

<div className="bg-white p-6 shadow rounded">
<h3>Pending</h3>
<p className="text-2xl text-orange-500">{pending}</p>
</div>

</div>

</div>

</div>

)

}