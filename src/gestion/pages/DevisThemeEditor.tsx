import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { DevisTheme } from "../../types/DevisTheme";
import DevisTestPreview from "../components/createTestDevis";
import {
    FileText,
    Package,
    Table,
    DollarSign,
    FileSignature,
    Save,
    X,
    RotateCcw,
    Palette,
    Copy,
    ChevronDown,
    Menu,
} from 'lucide-react';
import Sidebar from "../components/Sidebar";

// Composants UI réutilisables
const ColorField = ({
    label,
    description,
    value,
    onChange
}: {
    label: string;
    description: string;
    value: string;
    onChange: (value: string) => void;
}) => {
    return (
        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
            <div className="relative">
                <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 cursor-pointer rounded-md border-2 border-gray-300 group-hover:border-blue-400 transition-colors"
                />
                <div
                    className="absolute inset-0 rounded-md pointer-events-none border-2 border-white/50"
                    style={{ backgroundColor: value }}
                />
            </div>

            <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm mb-0.5">{label}</p>
                <p className="text-xs text-gray-600 mb-1">{description}</p>
                <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">
                        {value.toUpperCase()}
                    </code>
                    <button
                        onClick={() => navigator.clipboard.writeText(value)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Copier la couleur"
                    >
                        <Copy size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ThemeSection = ({
    title,
    icon: Icon,
    children
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon size={18} className="text-blue-600" />
                    <h2 className="text-sm font-bold text-gray-900">{title}</h2>
                </div>
                <ChevronDown
                    size={16}
                    className={`transform transition-transform text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="p-3 pt-0 space-y-2">
                    {children}
                </div>
            )}
        </section>
    );
};

const ActionBar = ({
    hasChanges,
    saving,
    onSave,
    onCancel,
}: {
    hasChanges: boolean;
    saving: boolean;
    onSave: () => void;
    onCancel: () => void;
}) => {
    if (!hasChanges) return null;

    return (
        
        <div className="sticky top-0 z-20 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200 shadow-md">
            <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Palette size={20} className="text-blue-600" />
                    <div>
                        <p className="font-semibold text-blue-900 text-sm">Modifications non enregistrées</p>
                        <p className="text-xs text-blue-700">N'oubliez pas de sauvegarder vos changements</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        disabled={saving}
                        className="px-4 py-2 text-xs font-medium border-2 border-gray-300 bg-white rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                    >
                        <X size={14} />
                        Annuler
                    </button>
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save size={14} />
                                Enregistrer
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Thème par défaut
const DEFAULT_THEME: DevisTheme = {
    header: {
        borderBottom: "#2563eb",
        devisNumber: "#1e40af"
    },
    boxes: {
        background: "#f3f4f6",
        border: "#d1d5db",
        titleText: "#374151"
    },
    table: {
        headerBackground: "#2563eb",
        headerText: "#ffffff",
        rowAltBackground: "#f9fafb",
        border: "#e5e7eb"
    },
    summary: {
        htBackground: "#f3f4f6",
        tvaBackground: "#f3f4f6",
        totalBackground: "#2563eb",
        totalText: "#ffffff"
    },
    footer: {
        borderTop: "#d1d5db",
        text: "#6b7280"
    }
};

// Composant principal
export default function DevisThemeEditor() {
    const navigate = useNavigate();
    const [theme, setTheme] = useState<DevisTheme | null>(null);
    const [originalTheme, setOriginalTheme] = useState<DevisTheme | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [currentView, setCurrentView] = useState<string>('devis-liste');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Détecter si on est sur mobile
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setIsSidebarOpen(false);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleNavigate = (view: string) => {
        if (view === 'devis-liste') {
            navigate('/gestion/devis-liste');
        } else {
            navigate(`/gestion/${view}`);
        }
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    };

    const handleToggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleCloseSidebar = () => {
        setIsSidebarOpen(false);
    };
    useEffect(() => {
        fetchTheme();
    }, []);

    useEffect(() => {
        if (theme && originalTheme) {
            const changed = JSON.stringify(theme) !== JSON.stringify(originalTheme);
            setHasChanges(changed);
        }
    }, [theme, originalTheme]);

    const fetchTheme = async () => {
        try {
            setLoading(true);
            setError(null);

            const { data, error } = await supabase
                .from('settings')
                .select('data')
                .eq('id', 'ca3c2d25-ebd3-4bfd-81dc-b9a9ec656b96')
                .single();

            if (error) throw error;

            if (!data?.data) {
                throw new Error("Aucun thème trouvé dans les paramètres");
            }

            console.log("Thème chargé:", data.data);
            setTheme(data.data);
            setOriginalTheme(structuredClone(data.data));
            setHasChanges(false);
        } catch (err) {
            console.error("Erreur lors du chargement:", err);
            setError(err instanceof Error ? err.message : "Erreur de chargement");
        } finally {
            setLoading(false);
        }
    };

    const update = (path: string[], value: string) => {
        if (!theme) return;

        const updated = structuredClone(theme);
        let obj: any = updated;
        path.slice(0, -1).forEach(k => (obj = obj[k]));
        obj[path[path.length - 1]] = value;
        setTheme(updated);
    };

    const saveChanges = async () => {
        if (!theme || !hasChanges) return;

        try {
            setSaving(true);
            setError(null);

            const { error } = await supabase
                .from('settings')
                .update({ data: theme })
                .eq('id', 'ca3c2d25-ebd3-4bfd-81dc-b9a9ec656b96');

            if (error) throw error;

            setOriginalTheme(structuredClone(theme));
            setHasChanges(false);
            setSuccessMessage("✅ Modifications enregistrées avec succès");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Erreur de sauvegarde:", err);
            setError("Erreur lors de l'enregistrement des modifications");
        } finally {
            setSaving(false);
        }
    };

    const cancelChanges = () => {
        if (!hasChanges) return;

        if (confirm("Êtes-vous sûr de vouloir annuler vos modifications ?")) {
            setTheme(structuredClone(originalTheme));
            setHasChanges(false);
            setSuccessMessage("↩️ Modifications annulées");
            setTimeout(() => setSuccessMessage(null), 2000);
        }
    };

    const resetToDefault = async () => {
        if (!confirm("Êtes-vous sûr de vouloir réinitialiser le thème par défaut ?")) {
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const { error } = await supabase
                .from('settings')
                .update({ data: DEFAULT_THEME })
                .eq('id', 'ca3c2d25-ebd3-4bfd-81dc-b9a9ec656b96');

            if (error) throw error;

            setTheme(DEFAULT_THEME);
            setOriginalTheme(structuredClone(DEFAULT_THEME));
            setHasChanges(false);
            setSuccessMessage("🔄 Thème réinitialisé par défaut");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Erreur de réinitialisation:", err);
            setError("Erreur lors de la réinitialisation");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Chargement du thème...</p>
                </div>
            </div>
        );
    }

    if (error && !theme) {
        return (
            
            <div className="flex items-center justify-center min-h-screen p-6">
                <div className="max-w-md w-full p-6 bg-red-50 border-2 border-red-200 rounded-xl">
                    <h3 className="text-red-800 font-bold text-xl mb-2">⌘ Erreur de chargement</h3>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={fetchTheme}
                        className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                    >
                        🔄 Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!theme) {
        return (
            <div className="flex items-center justify-center min-h-screen p-6">
                <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                    <p className="text-yellow-800 font-medium">⚠️ Aucun thème trouvé</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Bouton menu mobile */}
            <button
                onClick={handleToggleSidebar}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-orange-600 text-white rounded-lg shadow-lg hover:bg-orange-700 transition-colors"
                aria-label="Toggle menu"
            >
                <Menu size={24} />
            </button>

            {/* Overlay pour mobile */}
            {isSidebarOpen && isMobile && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-30"
                    onClick={handleCloseSidebar}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                currentView={currentView}
                onNavigate={handleNavigate}
                isOpen={isSidebarOpen}
                onClose={handleCloseSidebar}
                onToggle={handleToggleSidebar}
            />

            <main className={`
                flex-1 overflow-hidden transition-all duration-300
                ${isMobile ? 'pt-16' : 'pt-0'}
            `}>
                <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100">
                    <ActionBar
                        hasChanges={hasChanges}
                        saving={saving}
                        onSave={saveChanges}
                        onCancel={cancelChanges}
                    />

                    <div className="flex h-full overflow-hidden">
                        {/* Preview à gauche */}
                        <div className="flex-1 bg-gray-100 overflow-hidden">
                            <DevisTestPreview theme={theme} />
                        </div>

                        {/* Formulaire à droite */}
                        <div className="w-[400px] bg-white border-l border-gray-200 overflow-y-auto">
                            <div className="p-4">
                                {/* Header */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Palette size={20} className="text-blue-600" />
                                                <h1 className="text-xl font-bold text-gray-900">
                                                    Personnalisation
                                                </h1>
                                            </div>
                                            <p className="text-xs text-gray-600">
                                                Modifiez les couleurs de votre devis
                                            </p>
                                        </div>

                                        <button
                                            onClick={resetToDefault}
                                            disabled={saving}
                                            className="p-2 text-xs font-medium border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            title="Réinitialiser"
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    </div>

                                    {successMessage && (
                                        <div className="p-2 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs font-medium mb-2">
                                            {successMessage}
                                        </div>
                                    )}

                                    {error && theme && (
                                        <div className="p-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium mb-2">
                                            ⌘ {error}
                                        </div>
                                    )}
                                </div>

                                {/* Sections du thème */}
                                <div className="space-y-3">
                                    <ThemeSection title="En-tête" icon={FileText}>
                                        <ColorField
                                            label="Bordure basse"
                                            description="Ligne sous le logo"
                                            value={theme.header.borderBottom}
                                            onChange={(v) => update(['header', 'borderBottom'], v)}
                                        />
                                        <ColorField
                                            label="Numéro du devis"
                                            description="Couleur 'Devis N°'"
                                            value={theme.header.devisNumber}
                                            onChange={(v) => update(['header', 'devisNumber'], v)}
                                        />
                                    </ThemeSection>

                                    <ThemeSection title="Blocs info" icon={Package}>
                                        <ColorField
                                            label="Fond des blocs"
                                            description="Arrière-plan des blocs"
                                            value={theme.boxes.background}
                                            onChange={(v) => update(['boxes', 'background'], v)}
                                        />
                                        <ColorField
                                            label="Bordure"
                                            description="Contour des blocs"
                                            value={theme.boxes.border}
                                            onChange={(v) => update(['boxes', 'border'], v)}
                                        />
                                        <ColorField
                                            label="Titre"
                                            description="Texte DESTINATAIRE/EXPÉDITEUR"
                                            value={theme.boxes.titleText}
                                            onChange={(v) => update(['boxes', 'titleText'], v)}
                                        />
                                    </ThemeSection>

                                    <ThemeSection title="Tableau" icon={Table}>
                                        <ColorField
                                            label="Header (fond)"
                                            description="Fond de l'en-tête"
                                            value={theme.table.headerBackground}
                                            onChange={(v) => update(['table', 'headerBackground'], v)}
                                        />
                                        <ColorField
                                            label="Header (texte)"
                                            description="Texte de l'en-tête"
                                            value={theme.table.headerText}
                                            onChange={(v) => update(['table', 'headerText'], v)}
                                        />
                                        <ColorField
                                            label="Lignes alternées"
                                            description="Fond lignes paires"
                                            value={theme.table.rowAltBackground}
                                            onChange={(v) => update(['table', 'rowAltBackground'], v)}
                                        />
                                        <ColorField
                                            label="Bordure"
                                            description="Contour du tableau"
                                            value={theme.table.border}
                                            onChange={(v) => update(['table', 'border'], v)}
                                        />
                                    </ThemeSection>

                                    <ThemeSection title="Totaux" icon={DollarSign}>
                                        <ColorField
                                            label="HT/TVA (fond)"
                                            description="Fond lignes HT et TVA"
                                            value={theme.summary.htBackground}
                                            onChange={(v) => update(['summary', 'htBackground'], v)}
                                        />
                                        <ColorField
                                            label="Total (fond)"
                                            description="Fond NET À PAYER"
                                            value={theme.summary.totalBackground}
                                            onChange={(v) => update(['summary', 'totalBackground'], v)}
                                        />
                                        <ColorField
                                            label="Total (texte)"
                                            description="Texte total final"
                                            value={theme.summary.totalText}
                                            onChange={(v) => update(['summary', 'totalText'], v)}
                                        />
                                    </ThemeSection>

                                    <ThemeSection title="Pied de page" icon={FileSignature}>
                                        <ColorField
                                            label="Bordure"
                                            description="Ligne au-dessus"
                                            value={theme.footer.borderTop}
                                            onChange={(v) => update(['footer', 'borderTop'], v)}
                                        />
                                        <ColorField
                                            label="Texte"
                                            description="Infos légales"
                                            value={theme.footer.text}
                                            onChange={(v) => update(['footer', 'text'], v)}
                                        />
                                    </ThemeSection>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}