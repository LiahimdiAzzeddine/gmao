import { Plus, Trash2 } from "lucide-react";
import { ValidityNote } from "../../types/devis";



type Props = {
  notes: ValidityNote[];
  setNotes: React.Dispatch<React.SetStateAction<ValidityNote[]>>;
};

export default function DevisValidityNotes({ notes, setNotes }: Props) {

  const addNote = () => {
    setNotes([
      ...notes,
      {
        contenu: "",
        ordre: notes.length + 1,
      },
    ]);
  };

  const updateNote = (index: number, value: string) => {
    const copy = [...notes];
    copy[index].contenu = value;
    setNotes(copy);
  };

  const removeNote = (index: number) => {
    const copy = notes.filter((_, i) => i !== index)
      .map((n, i) => ({ ...n, ordre: i + 1 }));
    setNotes(copy);
  };

  return (
    <div className="p-6 bg-white border-b border-orange-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Notes de validité
      </h3>

      <div className="space-y-3">
        {notes.map((note, index) => (
          <div key={index} className="flex gap-2 items-start">
            <textarea
              value={note.contenu}
              onChange={(e) => updateNote(index, e.target.value)}
              rows={2}
              placeholder="✓ Devis valable 15 jours à compter de la date d'émission"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />

            <button
              type="button"
              onClick={() => removeNote(index)}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addNote}
        className="mt-4 flex items-center gap-2 text-orange-600 font-medium hover:underline"
      >
        <Plus className="w-4 h-4" />
        Ajouter une note
      </button>
    </div>
  );
}
