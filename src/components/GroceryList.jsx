import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroceryFirestore, addItemFirestore, deleteItemFirestore, updateItemFirestore } from "../redux/grocerySlice";
import { EditIcon, DeleteIcon } from "./Icons";

export default function GroceryList() {
  const dispatch = useDispatch();
  const items = useSelector(state => state.grocery);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [listType, setListType] = useState("weekly");
  const [bucketLabel, setBucketLabel] = useState("");
  const [activeBucket, setActiveBucket] = useState(null);

  useEffect(() => {
    dispatch(fetchGroceryFirestore());
  }, [dispatch]);

  const handleAdd = () => {
    if (!name.trim()) return;
    const label = bucketLabel.trim() || (listType === "monthly" ? "This month" : "This week");
    dispatch(addItemFirestore({ name: name.trim(), createdAt: Date.now(), listType, bucketLabel: label }));
    setName("");
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
  };

  const saveEdit = (item) => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      // Don't close edit mode if name is empty
      return;
    }
    // Find the current item from Redux state to ensure all properties are included
    const currentItem = items.find(i => i.id === item.id);
    if (currentItem) {
      dispatch(updateItemFirestore({ ...currentItem, name: trimmedName }));
    }
    setEditingId(null);
  };

  const filteredItems = items.filter(item => item.listType === listType);

  const grouped = filteredItems.reduce((acc, item) => {
    const key = item.bucketLabel || "Unlabeled";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const bucketKeys = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <div className="inline-flex rounded-xl gap-1 backdrop-blur-md bg-white/10 border border-white/20 p-1">
          <button
            type="button"
            onClick={() => setListType("weekly")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${
              listType === "weekly"
                ? "glass-button"
                : "glass-button-outline"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setListType("monthly")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition ${
              listType === "monthly"
                ? "glass-button"
                : "glass-button-outline"
            }`}
          >
            Monthly
          </button>
        </div>
        <div className="text-sm text-cyan-300/70">
          {listType === "weekly" ? "🛒 Frequent staples" : "📦 Stock-up items"}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={`🛒 Add ${listType} item...`}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="glass-input flex-1"
        />
        <button
          onClick={handleAdd}
          className="glass-button shrink-0"
        >
          Add
        </button>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder={listType === "monthly" ? "📅 Month label (e.g. January 2026)" : "📅 Week label (e.g. Week 1 Jan)"}
          value={bucketLabel}
          onChange={e => setBucketLabel(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="glass-input text-sm flex-1"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {bucketKeys.length === 0 && (
          <p className="text-sm text-cyan-300/40">No items yet for this list.</p>
        )}
        {bucketKeys.map(key => (
          <div
            key={key}
            className="glass-card p-3 cursor-pointer hover:shadow-2xl transition"
            onClick={() => setActiveBucket(key)}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-cyan-300">{key}</div>
                <div className="text-xs text-cyan-300/60 mt-1">
                  {grouped[key].length} item{grouped[key].length > 1 ? "s" : ""}
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-500/50">
                View items
              </span>
            </div>
          </div>
        ))}
      </div>

      {activeBucket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="glass-card w-full max-w-md mx-4 p-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-cyan-300">
                {listType === "monthly" ? "📦 Monthly items" : "🛒 Weekly items"} – {activeBucket}
              </h3>
              <button
                onClick={() => setActiveBucket(null)}
                className="text-sm text-cyan-300/70 hover:text-cyan-300 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {grouped[activeBucket]?.map(item => (
                <div
                  key={item.id}
                  className="glass flex justify-between items-center p-2"
                >
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && saveEdit(item)}
                        className="glass-input text-sm flex-1 min-w-0"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit(item)}
                        disabled={!editName.trim()}
                        className={`text-xs px-2 py-1 rounded cursor-pointer transition ${
                          editName.trim()
                            ? "glass-button"
                            : "backdrop-blur-md bg-white/5 border border-white/10 text-white/40"
                        }`}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs px-2 py-1 glass-button-outline rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={!!item.completed}
                          onChange={() =>
                            dispatch(
                              updateItemFirestore({
                                ...item,
                                completed: !item.completed,
                              })
                            )
                          }
                          className="w-4 h-4 accent-purple-500 cursor-pointer shrink-0"
                        />
                        <span
                          className={`flex-1 min-w-0 truncate text-sm ${
                            item.completed ? "line-through text-cyan-300/40" : "text-white"
                          }`}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1 text-cyan-300/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded cursor-pointer transition"
                          aria-label="Edit"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => dispatch(deleteItemFirestore(item.id))}
                          className="p-1 text-pink-300/60 hover:text-pink-300 hover:bg-pink-500/10 rounded cursor-pointer transition"
                          aria-label="Delete"
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
