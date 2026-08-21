import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, supabaseAnon } from "../lib/supabase";
import { Save, X, Upload, Copy, Check, User, Mail, Lock, Building2, Phone, MapPin, CreditCard, ImageIcon } from "lucide-react";
import AdminHeader from "./AdminHeader";

type FormDataState = {
  nom: string;
  prenom: string;
  cin: string;
  telephone: string;
  adresse: string;
  raison_sociale: string;
  logo_url: string | null;
  email: string;
  password: string;
};

type FieldError = keyof FormDataState | null;

export default function ClientForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== "new";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldError>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<FormDataState>({
    nom: "",
    prenom: "",
    cin: "",
    telephone: "",
    adresse: "",
    raison_sociale: "",
    logo_url: null,
    email: "",
    password: "",
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);

    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("L'image ne doit pas dépasser 2 Mo.");
        return;
      }

      const url = URL.createObjectURL(file);
      setPreviewLogo(url);
    }
  };

  useEffect(() => {
    if (isEdit) loadClient();
    
    return () => {
      if (previewLogo && previewLogo.startsWith("blob:")) {
        URL.revokeObjectURL(previewLogo);
      }
    };
  }, [id, isEdit]);

  useEffect(() => {
    if (formData.logo_url && !logoFile) {
      setPreviewLogo(formData.logo_url);
    }
  }, [formData.logo_url, logoFile]);

  async function loadClient() {
    if (!id || id === "new") return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          profiles(
            id,
            nom,
            email,
            password
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError("Client introuvable");
        return;
      }

      const profile = (data as any).profiles ?? null;
      setProfileId(profile?.id ?? null);

      setFormData({
        nom: profile?.nom ?? "",
        prenom: data.prenom ?? "",
        cin: data.cin ?? "",
        telephone: data.telephone ?? "",
        adresse: data.adresse ?? "",
        raison_sociale: data.raison_sociale ?? "",
        logo_url: data.logo_url ?? null,
        email: profile?.email ?? "",
        password: profile?.password ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(prefixId: string): Promise<string | null> {
    if (!logoFile) return formData.logo_url;

    try {
      const ext = logoFile.name.split(".").pop() || "jpg";
      const fileName = `client_${prefixId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("gmao-photos")
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("gmao-photos")
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Erreur upload logo:", err);
      throw new Error("Échec de l'upload de l'image");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldError(null);

    try {
      if (isEdit) {
        await handleUpdate();
      } else {
        await handleCreate();
      }

      navigate("/admin/clients");
    } catch (err: any) {
      setError(err?.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!id) throw new Error("ID client manquant");

    if (profileId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ nom: formData.nom })
        .eq("id", profileId);
      
      if (profileError) throw profileError;
    }

    let logo_url = formData.logo_url;
    if (logoFile) {
      const prefix = profileId ?? id;
      logo_url = await handleLogoUpload(String(prefix));
    }

    const clientData = {
      prenom: formData.prenom || null,
      cin: formData.cin || null,
      telephone: formData.telephone || null,
      adresse: formData.adresse || null,
      raison_sociale: formData.raison_sociale || null,
      logo_url,
      updated_at: new Date().toISOString(),
    };

    const { error: clientError } = await supabase
      .from("clients")
      .update(clientData)
      .eq("id", id);

    if (clientError) throw clientError;
  }

  async function handleCreate() {
    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      setFieldError("email");
      throw new Error("L'email est requis.");
    }

    if (!password || password.length < 6) {
      setFieldError("password");
      throw new Error("Mot de passe trop court (min. 6 caractères).");
    }

    const { data: signUpData, error: signUpError } = await supabaseAnon.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      if (signUpError.message.includes("already") || signUpError.code === "user_already_exists") {
        setFieldError("email");
        throw new Error("Cet email est déjà utilisé.");
      }
      throw signUpError;
    }

    const userId = signUpData.user?.id;
    if (!userId) throw new Error("Impossible de récupérer l'ID utilisateur.");

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      nom: formData.nom,
      role: "consultant",
      email: formData.email,
      password: formData.password,
    });

    if (profileError) throw profileError;

    let logo_url: string | null = null;
    if (logoFile) {
      logo_url = await handleLogoUpload(userId);
    }

    const { error: clientError } = await supabase.from("clients").insert({
      profile_id: userId,
      prenom: formData.prenom || null,
      cin: formData.cin || null,
      telephone: formData.telephone || null,
      adresse: formData.adresse || null,
      raison_sociale: formData.raison_sociale || null,
      logo_url,
      created_at: new Date().toISOString(),
    });

    if (clientError) throw clientError;
  }

  const inputClass = (name: keyof FormDataState) => {
    return `w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all ${
      fieldError === name
        ? "border-red-400 focus:ring-red-400 bg-red-50"
        : "border-slate-200 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-slate-300"
    }`;
  };

  const updateField = <K extends keyof FormDataState>(field: K, value: FormDataState[K]) => {
    setFieldError(null);
    setError(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const copyAccountInfo = () => {
    const text = `Email: ${formData.email}\nMot de passe: ${formData.password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      alert("Erreur lors de la copie");
    });
  };

  const removeLogo = () => {
    if (previewLogo && previewLogo.startsWith("blob:")) {
      URL.revokeObjectURL(previewLogo);
    }
    setLogoFile(null);
    setPreviewLogo(null);
    setFormData(prev => ({ ...prev, logo_url: null }));
  };

  return (
    <>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Header avec dégradé */}
          <div className="bg-gradient-to-r from-[#d94f00] to-[#e66317] px-8 py-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <User className="w-7 h-7" />
              {isEdit ? "Modification du client" : "Création d'un nouveau client"}
            </h2>
            <p className="text-blue-100 mt-1 text-sm">
              {isEdit ? "Modifiez les informations du client existant" : "Remplissez les informations pour créer un compte client"}
            </p>
          </div>

          <div className="p-8">
            {/* Section Logo */}
            <div className="mb-8 pb-8 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#d94f00]" />
                Logo de l'entreprise
              </h3>
              
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {previewLogo ? (
                    <div className="relative">
                      <img
                        src={previewLogo}
                        alt="Logo"
                        className="h-32 w-32 rounded-2xl object-cover border-2 border-slate-200 shadow-lg group-hover:shadow-xl transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 hover:scale-110"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="h-32 w-32 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-[#da763c] hover:bg-blue-50 hover:text-[#d94f00] transition-all cursor-pointer group">
                      <ImageIcon className="w-10 h-10 mb-2" />
                      <span className="text-xs font-medium">Aucun logo</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#d94f00] to-[#e66317] text-white rounded-xl cursor-pointer shadow-md hover:shadow-lg hover:from-[#e66317] hover:to-[#d94f00] transition-all">
                    <Upload size={18} />
                    <span className="font-medium">Choisir une image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-3 ml-1">
                    Formats acceptés: PNG, JPG, WEBP • Taille max: 2 Mo
                  </p>
                </div>
              </div>
            </div>

            {/* Informations personnelles */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <User className="w-5 h-5 text-[#d94f00]" />
                Informations personnelles
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nom */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => updateField("nom", e.target.value)}
                      className={inputClass("nom")}
                      placeholder="Ex: Mohamed Alami"
                      required
                    />
                  </div>
                </div>

                {/* Prénom */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Prénom
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => updateField("prenom", e.target.value)}
                      className={inputClass("prenom")}
                      placeholder="Ex: Ahmed"
                    />
                  </div>
                </div>

                {/* CIN */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    CIN
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.cin}
                      onChange={(e) => updateField("cin", e.target.value)}
                      className={inputClass("cin")}
                      placeholder="Ex: AB123456"
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => updateField("telephone", e.target.value)}
                      className={inputClass("telephone")}
                      placeholder="Ex: +212 6 12 34 56 78"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informations entreprise */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#d94f00]" />
                Informations de l'entreprise
              </h3>
              
              <div className="space-y-6">
                {/* Raison sociale */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Raison Sociale 
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.raison_sociale}
                      onChange={(e) => updateField("raison_sociale", e.target.value)}
                      className={inputClass("raison_sociale")}
                      placeholder="Ex: Tech Solutions SARL"
                    />
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Adresse complète
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-4 w-5 h-5 text-slate-400" />
                    <textarea
                      value={formData.adresse}
                      onChange={(e) => updateField("adresse", e.target.value)}
                      className={`${inputClass("adresse")} pt-3`}
                      rows={3}
                      placeholder="Ex: 123 Avenue Mohammed V, Casablanca 20000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informations de connexion */}
            {!isEdit ? (
              <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#d94f00]" />
                  Informations de connexion
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        className={inputClass("email")}
                        placeholder="Ex: contact@entreprise.ma"
                        required
                      />
                    </div>
                    {fieldError === "email" && (
                      <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                        <span>⚠️</span> {error || "Email invalide"}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Mot de passe <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => updateField("password", e.target.value)}
                        className={inputClass("password")}
                        placeholder="Minimum 6 caractères"
                        required
                        minLength={6}
                      />
                    </div>
                    {fieldError === "password" && (
                      <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                        <span>⚠️</span> {error || "Mot de passe trop court"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : formData.email && (
              <div className="mb-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-slate-600" />
                  Informations de connexion
                </h3>
                
                <div className="bg-white rounded-lg p-4 border border-slate-200 mb-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-600">Email:</span>
                      <span className="text-slate-800 font-mono">{formData.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-600">Mot de passe:</span>
                      <span className="text-slate-800 font-mono">{formData.password || "••••••••"}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyAccountInfo}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                    copied
                      ? "bg-green-500 text-white"
                      : "bg-[#d94f00] text-white hover:bg-blue-700"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={18} />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copier les informations de connexion
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Message d'erreur global */}
            {error && !fieldError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <div className="flex-1">
                  <p className="text-red-800 font-medium text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#d94f00] to-[#e66317] text-white py-4 rounded-xl hover:from-[#e66317] hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-semibold shadow-lg hover:shadow-xl  "
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Enregistrement en cours...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {isEdit ? "Mettre à jour" : "Créer le client"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/clients")}
                className="px-8 py-4 border-2 border-slate-300 rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-700 hover:border-slate-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}