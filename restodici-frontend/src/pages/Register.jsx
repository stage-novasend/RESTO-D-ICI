// src/pages/Register.jsx
import { useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import LocationAssistant from "../components/maps/LocationAssistant";
import {
  FREQUENT_LOCATION_ZONES,
  appendUniqueCsvValue,
} from "../components/maps/locationAssistantData";
import {
  Mail,
  Lock,
  User,
  Store,
  Phone,
  Building2,
  ChefHat,
  UtensilsCrossed,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

function normalizeUserType(type) {
  const value = (type || "client").toLowerCase();
  if (value === "b2b" || value === "business" || value === "entreprise")
    return "business";
  if (value === "restaurant" || value === "restaurateur") return "restaurant";
  return "client";
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { register: authRegister } = useAuth(); // Rename to avoid conflict with react-hook-form register

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Determine user type from URL parameters
  const userType = normalizeUserType(searchParams.get("type"));
  const isRestaurant = userType === "restaurant";
  const watchedAddress = watch("adresse") || "";
  const watchedDeliveryZones = watch("zonesLivraison") || "";

  const onSubmit = async (data) => {
    setLoading(true);
    setError("");

    try {
      let payload;

      if (isRestaurant) {
        // Restaurant registration
        payload = {
          type: "RESTAURANT",
          nom: data.nom,
          email: data.email,
          telephone: data.telephone,
          password: data.password,
          restaurantNom: data.restaurantNom,
          description: data.description,
          adresse: data.adresse,
          restaurantTelephone: data.restaurantTelephone,
          restaurantEmail: data.restaurantEmail,
          horaires: data.horaires || "Lun-Dim: 08:00-22:00",
          zonesLivraison: data.zonesLivraison
            ?.split(",")
            .map((zone) => zone.trim()) || ["Abidjan"],
        };
      } else if (userType === "business") {
        // Business/Enterprise registration
        payload = {
          type: "BUSINESS_CLIENT",
          nom: data.nom,
          email: data.email,
          telephone: data.telephone,
          password: data.password,
          nomEntreprise: data.nomEntreprise,
          emailProfessionnel: data.emailProfessionnel,
          adresse: data.adresse,
          numeroFiscal: data.numeroFiscal || null,
          responsableCompte: data.responsableCompte || data.nom,
        };
      } else {
        // Client registration
        payload = {
          type: "CLIENT",
          nom: data.nom,
          email: data.email,
          telephone: data.telephone,
          password: data.password,
        };
      }

      // Use the useAuth register function instead of direct axios call
      const registerResult = await authRegister(payload);

      if (registerResult.success) {
        // Robust role-based redirection after registration
        const userRole = registerResult.user.role?.toUpperCase();

        if (userRole === "GERANT") {
          navigate("/gerant");
        } else if (userRole === "B2B") {
          navigate("/b2b/dashboard");
        } else {
          navigate("/menu");
        }
      } else {
        setError(registerResult.error);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F5] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl p-8 space-y-6 border border-[#E8E2D9]">
        {/* Logo + Titre */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#FFF5EB] mb-2">
            {userType === "restaurant" ? (
              <ChefHat className="w-8 h-8 text-[#D94500]" />
            ) : userType === "business" ? (
              <Building2 className="w-8 h-8 text-[#2ECC71]" />
            ) : (
              <UtensilsCrossed className="w-8 h-8 text-[#D94500]" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-[#2D2720]">
            {userType === "restaurant"
              ? "Inscription Restaurateur"
              : userType === "business"
                ? "Inscription Entreprise"
                : "Créer un compte"}
          </h1>
          <p className="text-[#8B7355] text-sm">
            {userType === "restaurant"
              ? "Gérez votre restaurant en temps réel"
              : userType === "business"
                ? "Gérez les repas de vos équipes efficacement"
                : "Rejoignez la table digitale."}
          </p>
        </div>

        {/* User Type Selector - Only show if not coming from specific type */}
        {(!searchParams.has("type") || userType === "client") && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => {
                navigate("/register?type=client");
              }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                !isRestaurant && userType !== "business"
                  ? "bg-[#D94500] text-white"
                  : "bg-[#F9F7F5] text-[#8B7355] hover:bg-[#E8E2D9]"
              }`}
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/register?type=restaurant");
              }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                isRestaurant
                  ? "bg-[#D94500] text-white"
                  : "bg-[#F9F7F5] text-[#8B7355] hover:bg-[#E8E2D9]"
              }`}
            >
              Restaurant
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/register?type=business");
              }}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                userType === "business"
                  ? "bg-[#2ECC71] text-white"
                  : "bg-[#F9F7F5] text-[#8B7355] hover:bg-[#E8E2D9]"
              }`}
            >
              Entreprise
            </button>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Client Registration Form */}
          {!isRestaurant && userType !== "business" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Nom complet *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("nom", { required: "Nom requis" })}
                      placeholder="Votre nom complet"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.nom && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.nom.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("telephone", {
                        required: "Téléphone requis",
                      })}
                      placeholder="+225 XX XX XX XX"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.telephone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.telephone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#2D2720]">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                  <input
                    {...register("email", {
                      required: "Email requis",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Email invalide",
                      },
                    })}
                    type="email"
                    placeholder="votre@email.com"
                    className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#2D2720]">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                  <input
                    {...register("password", {
                      required: "Mot de passe requis",
                      minLength: { value: 6, message: "Minimum 6 caractères" },
                    })}
                    type="password"
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Restaurant Registration Form */}
          {isRestaurant && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Nom du gérant *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("nom", { required: "Nom du gérant requis" })}
                      placeholder="Nom du propriétaire/gérant"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.nom && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.nom.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("telephone", {
                        required: "Téléphone requis",
                      })}
                      placeholder="+225 XX XX XX XX"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.telephone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.telephone.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#2D2720]">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                  <input
                    {...register("email", {
                      required: "Email requis",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Email invalide",
                      },
                    })}
                    type="email"
                    placeholder="gerant@restaurant.com"
                    className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#2D2720]">
                  Mot de passe *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                  <input
                    {...register("password", {
                      required: "Mot de passe requis",
                      minLength: { value: 6, message: "Minimum 6 caractères" },
                    })}
                    type="password"
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="border-t border-[#E8E2D9] pt-6 mt-6">
                <h3 className="text-lg font-bold text-[#2D2720] mb-4">
                  Informations du restaurant
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2D2720]">
                      Nom du restaurant *
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                      <input
                        {...register("restaurantNom", {
                          required: "Nom du restaurant requis",
                        })}
                        placeholder="Nom de votre restaurant"
                        className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                      />
                    </div>
                    {errors.restaurantNom && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.restaurantNom.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2D2720]">
                      Téléphone restaurant *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                      <input
                        {...register("restaurantTelephone", {
                          required: "Téléphone du restaurant requis",
                        })}
                        placeholder="+225 XX XX XX XX"
                        className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                      />
                    </div>
                    {errors.restaurantTelephone && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.restaurantTelephone.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2D2720]">
                      Email restaurant *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                      <input
                        {...register("restaurantEmail", {
                          required: "Email du restaurant requis",
                          pattern: {
                            value: /\S+@\S+\.\S+/,
                            message: "Email invalide",
                          },
                        })}
                        type="email"
                        placeholder="contact@restaurant.com"
                        className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                      />
                    </div>
                    {errors.restaurantEmail && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.restaurantEmail.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="hidden"
                      {...register("adresse", {
                        required: "Adresse requise",
                      })}
                    />
                    <input type="hidden" {...register("zonesLivraison")} />
                    <LocationAssistant
                      title="Adresse du restaurant"
                      description="Utilisez une zone fréquente ou la carte pour renseigner rapidement l’adresse et les zones de livraison."
                      tone="orange"
                      addressLabel="Adresse du restaurant"
                      addressValue={watchedAddress}
                      onAddressChange={(value) => {
                        setValue("adresse", value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      addressPlaceholder="Adresse complète du restaurant"
                      zoneLabel="Zones de livraison (CSV)"
                      zoneValue={watchedDeliveryZones}
                      onZoneChange={(value, zone) => {
                        const nextValue = zone
                          ? appendUniqueCsvValue(watchedDeliveryZones, zone.name)
                          : value;
                        setValue("zonesLivraison", nextValue, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      onMapChange={({ address }) => {
                        if (address) {
                          setValue("adresse", address, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      frequentZones={FREQUENT_LOCATION_ZONES}
                      errorAddress={errors.adresse?.message}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    placeholder="Décrivez votre restaurant (cuisine, ambiance, spécialités...)"
                    className="block w-full px-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                    rows="3"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2D2720]">
                      Horaires
                    </label>
                    <input
                      {...register("horaires")}
                      placeholder="Lun-Dim: 08:00-22:00"
                      className="block w-full px-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#2D2720]">
                      Zones de livraison
                    </label>
                    <textarea
                      value={watchedDeliveryZones}
                      onChange={(event) =>
                        setValue("zonesLivraison", event.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      placeholder="Abidjan, Cocody, Plateau (séparées par des virgules)"
                      className="block w-full px-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D94500] focus:border-transparent transition-all"
                      rows="2"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Business Registration Form */}
          {userType === "business" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Nom de l'entreprise *
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("nomEntreprise", {
                        required: "Nom de l'entreprise requis",
                      })}
                      placeholder="Nom de votre entreprise"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.nomEntreprise && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.nomEntreprise.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Responsable du compte *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("responsableCompte", {
                        required: "Responsable requis",
                      })}
                      placeholder="Nom du responsable"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.responsableCompte && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.responsableCompte.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Email professionnel *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("emailProfessionnel", {
                        required: "Email professionnel requis",
                        pattern: {
                          value: /\S+@\S+\.\S+/,
                          message: "Email invalide",
                        },
                      })}
                      type="email"
                      placeholder="entreprise@domaine.com"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.emailProfessionnel && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.emailProfessionnel.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Téléphone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("telephone", {
                        required: "Téléphone requis",
                      })}
                      placeholder="+225 XX XX XX XX"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.telephone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.telephone.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <input
                  type="hidden"
                  {...register("adresse", { required: "Adresse requise" })}
                />
                <LocationAssistant
                  title="Localisation de l'entreprise"
                  description="Choisissez une zone fréquente ou précisez le point exact sur la carte."
                  tone="green"
                  addressLabel="Adresse de l'entreprise"
                  addressValue={watchedAddress}
                  onAddressChange={(value) => {
                    setValue("adresse", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  onZoneChange={(value, zone) => {
                    const nextAddress = zone?.address || value;
                    if (nextAddress) {
                      setValue("adresse", nextAddress, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  onMapChange={({ address }) => {
                    if (address) {
                      setValue("adresse", address, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  zoneValue=""
                  showZoneField={false}
                  frequentZones={FREQUENT_LOCATION_ZONES}
                  errorAddress={errors.adresse?.message}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#2D2720]">
                  Numéro fiscal (optionnel)
                </label>
                <input
                  {...register("numeroFiscal")}
                  placeholder="Numéro d'identification fiscale"
                  className="block w-full px-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Email pour le compte *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("email", {
                        required: "Email requis",
                        pattern: {
                          value: /\S+@\S+\.\S+/,
                          message: "Email invalide",
                        },
                      })}
                      type="email"
                      placeholder="votre@email.com"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[#2D2720]">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-5 h-5 text-[#8B7355]" />
                    <input
                      {...register("password", {
                        required: "Mot de passe requis",
                        minLength: {
                          value: 6,
                          message: "Minimum 6 caractères",
                        },
                      })}
                      type="password"
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-3 py-3 bg-[#F9F7F5] border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2ECC71] focus:border-transparent transition-all"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center py-3.5 px-4 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ${
              userType === "business"
                ? "bg-[#2ECC71] hover:bg-[#27AE60] text-white"
                : "bg-[#D94500] hover:bg-[#B83A00] text-white"
            } disabled:opacity-50`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Inscription en cours...
              </span>
            ) : userType === "business" ? (
              "Créer mon compte entreprise"
            ) : isRestaurant ? (
              "Créer mon restaurant"
            ) : (
              "Créer mon compte"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-[#E8E2D9]">
          <p className="text-sm text-[#8B7355]">
            Vous avez déjà un compte ?{" "}
            <Link
              to={`/login${location.search}`}
              className="text-[#D94500] font-semibold hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
