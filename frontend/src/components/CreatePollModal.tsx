import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { createPortal } from "react-dom";

type CreatePollModalProps = {
  onClose: () => void;
};

const CreatePollModal = ({ onClose }: CreatePollModalProps) => {
  const { sendMessage } = useChatStore();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const updateOption = (index: number, val: string) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    if (!question.trim()) return;
    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) return;

    await sendMessage({
      poll: {
        question: question.trim(),
        options: validOptions.map(text => ({ text, votes: [] }))
      }
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
        <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle absolute top-4 right-4">
          <X className="size-5" />
        </button>
        
        <h3 className="font-bold text-lg mb-4">Create a Poll</h3>
        
        <div className="space-y-4">
          <div className="form-control w-full">
            <label className="label"><span className="label-text font-medium">Question</span></label>
            <input type="text" className="input input-bordered w-full" placeholder="Ask a question..." value={question} onChange={e => setQuestion(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="label"><span className="label-text font-medium">Options</span></label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" className="input input-bordered w-full input-sm" placeholder={`Option ${i + 1}`} value={opt} onChange={e => updateOption(i, e.target.value)} />
                {options.length > 2 && (
                  <button onClick={() => removeOption(i)} className="btn btn-ghost btn-sm btn-square text-error">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 10 && (
            <button onClick={addOption} className="btn btn-sm btn-outline btn-block text-primary">
              <Plus className="size-4 mr-1" /> Add Option
            </button>
          )}

          <button onClick={handleCreate} disabled={!question.trim() || options.filter(o => o.trim()).length < 2} className="btn btn-primary w-full mt-4">
            Send Poll
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default CreatePollModal;
