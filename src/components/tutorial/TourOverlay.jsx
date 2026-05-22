import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTour, TOUR_STEPS } from "@/lib/tourContext";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X, CheckCircle2, Shell } from "lucide-react";
import { Link } from "react-router-dom";

export default function TourOverlay({ user, profile }) {
  const { isActive, currentStep, nextStep, prevStep, endTour, totalSteps, currentStepData } = useTour();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Navigate to target page when step changes
  useEffect(() => {
    if (isActive && currentStepData?.path) {
      navigate(currentStepData.path);
    }
  }, [isActive, currentStep, currentStepData?.path]);

  const handleFinish = async () => {
    endTour();
    if (profile?.id) {
      await base44.entities.UserProfile.update(profile.id, { tour_completed: true });
    } else if (user?.email) {
      await base44.entities.UserProfile.create({
        user_id: user.id || user.email,
        user_email: user.email,
        full_name: user.full_name || "",
        phone: "-",
        join_date: new Date().toISOString().split("T")[0],
        tour_completed: true,
      });
    }
    qc.invalidateQueries(["user-profile"]);
    navigate("/tortoise");
  };

  const handleSkip = async () => {
    endTour();
    if (profile?.id) {
      await base44.entities.UserProfile.update(profile.id, { tour_skipped: true });
    }
    qc.invalidateQueries(["user-profile"]);
  };

  const isFinal = currentStepData?.isFinal;
  const progressPct = ((currentStep + 1) / totalSteps) * 100;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[9998]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

          {/* Tour Card — bottom sheet on mobile, bottom-right on desktop */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 lg:bottom-6 lg:right-6 lg:left-auto lg:max-w-sm z-10"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            key={currentStep}
          >
            <div className="bg-[#1a3a2a] text-white rounded-t-2xl lg:rounded-2xl shadow-2xl overflow-hidden">
              {/* Progress bar */}
              <div className="h-1 bg-white/20">
                <motion.div
                  className="h-full bg-[#7ec8a0]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#7ec8a0]/20 flex items-center justify-center flex-shrink-0">
                      <Shell className="w-4 h-4 text-[#7ec8a0]" />
                    </div>
                    <div>
                      <p className="text-[11px] text-white/50 font-medium">
                        Step {currentStep + 1} dari {totalSteps}
                      </p>
                      <h3 className="font-heading font-bold text-white text-base leading-tight">
                        {currentStepData?.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="text-white/40 hover:text-white/70 p-1 rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-white/75 text-sm leading-relaxed mb-5">
                  {currentStepData?.description}
                </p>

                {/* Progress dots */}
                <div className="flex gap-1.5 justify-center mb-5">
                  {TOUR_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? "w-5 h-2 bg-[#7ec8a0]"
                          : i < currentStep
                          ? "w-2 h-2 bg-[#7ec8a0]/60"
                          : "w-2 h-2 bg-white/20"
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                {isFinal ? (
                  <div className="space-y-2">
                    <Button
                      asChild
                      className="w-full bg-[#7ec8a0] hover:bg-[#6ab88e] text-[#1a3a2a] font-semibold rounded-xl h-11"
                      onClick={handleFinish}
                    >
                      <Link to="/tortoise" onClick={handleFinish}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Tambah Kura-kura Sekarang
                      </Link>
                    </Button>
                    <button
                      onClick={endTour}
                      className="w-full text-center text-white/50 hover:text-white/70 text-xs py-1 transition-colors"
                    >
                      Tutup Tur
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="flex-1 text-white/60 hover:text-white hover:bg-white/10 rounded-xl h-10 text-sm disabled:opacity-30"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Kembali
                    </Button>
                    <Button
                      onClick={nextStep}
                      className="flex-[2] bg-[#7ec8a0] hover:bg-[#6ab88e] text-[#1a3a2a] font-semibold rounded-xl h-10 text-sm"
                    >
                      Lanjut
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}