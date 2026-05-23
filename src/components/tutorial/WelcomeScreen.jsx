import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useTour, markTutorialCompletedLocally, markTutorialCompletedInDB } from "@/lib/tourContext";
import { Shell, Clock } from "lucide-react";

export default function WelcomeScreen({ user, profile }) {
  const { showWelcome, startTour, dismissWelcome } = useTour();

  const handleSkip = async () => {
    dismissWelcome();
    markTutorialCompletedLocally(user?.email);
    await markTutorialCompletedInDB(user?.email);
  };

  return (
    <AnimatePresence>
      {showWelcome && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center z-10"
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <Shell className="w-10 h-10 text-primary" />
            </div>

            <h2 className="text-2xl font-heading font-bold text-primary mb-2">
              Selamat Datang di Duta Tortoise! 🐢
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Kami akan memandu kamu mengenal fitur-fitur utama aplikasi ini. Tur singkat ini akan sangat membantumu memulai.
            </p>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-6 bg-muted/40 rounded-full px-4 py-2 w-fit mx-auto">
              <Clock className="w-3.5 h-3.5" />
              Butuh waktu sekitar 3 menit
            </div>

            <div className="space-y-3">
              <Button
                onClick={startTour}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl h-11 text-base font-medium"
              >
                Mulai Tur 🚀
              </Button>
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full text-muted-foreground hover:text-foreground text-sm"
              >
                Lewati untuk Sekarang
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}