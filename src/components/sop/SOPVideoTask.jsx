import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle2, Loader2, Youtube } from "lucide-react";
import { format } from "date-fns";

function getYoutubeEmbed(url) {
  if (!url) return null;
  if (url.includes("youtube.com/embed/")) return url;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

export default function SOPVideoTask({ onWatched }) {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const [loadingGen, setLoadingGen] = useState(false);
  const [videoOfDay, setVideoOfDay] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [marking, setMarking] = useState(false);

  // Ambil semua video dari TutorialContent
  const { data: tutorials = [] } = useQuery({
    queryKey: ["tutorials-video"],
    queryFn: () => base44.entities.TutorialContent.filter({ type: "video", is_published: true }),
  });

  // Cek apakah sudah nonton hari ini
  const { data: watchRecord } = useQuery({
    queryKey: ["video-watch-today", user?.email, today],
    queryFn: async () => {
      const res = await base44.entities.DailyVideoWatch.filter({
        employee_email: user.email,
        date: today,
      });
      return res[0] || null;
    },
    enabled: !!user?.email,
  });

  // Auto-pilih video of the day berdasarkan tanggal (deterministik)
  useEffect(() => {
    if (tutorials.length === 0) return;
    const dayNum = new Date().getDate();
    const idx = dayNum % tutorials.length;
    setVideoOfDay(tutorials[idx]);
  }, [tutorials]);

  // Generate video baru pakai AI jika belum ada video
  const handleGenerateVideo = async () => {
    setLoadingGen(true);
    const topics = [
      "cara merawat sulcata tortoise harian",
      "pakan terbaik untuk sulcata",
      "setup kandang sulcata yang ideal",
      "tanda-tanda sulcata sakit",
      "cara mandi dan soak sulcata",
      "breeding sulcata untuk pemula",
      "pertumbuhan baby sulcata",
    ];
    const todayIdx = new Date().getDate() % topics.length;
    const topic = topics[todayIdx];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Carikan 1 video YouTube terbaik tentang: "${topic}". 
Cari video yang informatif dan berkualitas dalam Bahasa Indonesia atau Bahasa Inggris. 
Kembalikan dalam JSON dengan field: title (string), youtube_url (URL YouTube lengkap, contoh: https://www.youtube.com/watch?v=xxxxx), summary (string, 1 kalimat, bahasa Indonesia), category (salah satu: pakan/kandang/kesehatan/breeding/dasar/lainnya).
Pastikan youtube_url adalah URL yang valid dan nyata.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          youtube_url: { type: "string" },
          summary: { type: "string" },
          category: { type: "string" },
        },
      },
    });

    if (result?.youtube_url && result?.title) {
      // Simpan ke database
      const saved = await base44.entities.TutorialContent.create({
        title: result.title,
        type: "video",
        category: result.category || "lainnya",
        summary: result.summary || "",
        video_url: result.youtube_url,
        is_published: true,
      });
      queryClient.invalidateQueries({ queryKey: ["tutorials-video"] });
      queryClient.invalidateQueries({ queryKey: ["tutorials"] });
      setVideoOfDay(saved);
    }
    setLoadingGen(false);
  };

  const handleMarkWatched = async () => {
    if (!user || !videoOfDay || watchRecord) return;
    setMarking(true);
    await base44.entities.DailyVideoWatch.create({
      employee_email: user.email,
      employee_name: user.full_name || user.email,
      date: today,
      video_id: videoOfDay.id,
      video_title: videoOfDay.title,
    });
    queryClient.invalidateQueries({ queryKey: ["video-watch-today"] });
    setMarking(false);
    if (onWatched) onWatched();
  };

  const isWatched = !!watchRecord;
  const embedUrl = videoOfDay?.video_url ? getYoutubeEmbed(videoOfDay.video_url) : null;

  return (
    <Card className={`border-2 ${isWatched ? "border-green-300 bg-green-50/30" : "border-red-200 bg-red-50/20"}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-600" />
          Video Wajib Tonton Hari Ini
          {isWatched ? (
            <Badge className="bg-green-100 text-green-700 ml-auto text-[11px]">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Sudah Ditonton
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700 ml-auto text-[11px]">Belum Ditonton</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!videoOfDay && tutorials.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <Youtube className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Belum ada video konten tersedia</p>
            <Button size="sm" onClick={handleGenerateVideo} disabled={loadingGen} className="gap-2">
              {loadingGen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Youtube className="w-3.5 h-3.5" />}
              {loadingGen ? "Mencari video..." : "Cari Video Dari YouTube"}
            </Button>
          </div>
        ) : videoOfDay ? (
          <>
            {showPlayer && embedUrl ? (
              <div className="rounded-xl overflow-hidden aspect-video bg-black">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={videoOfDay.title}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowPlayer(true)}
                className="w-full relative rounded-xl overflow-hidden bg-slate-800 aspect-video flex items-center justify-center group hover:opacity-90 transition-opacity"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-9 h-9 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-left">
                  <p className="text-white text-xs font-medium line-clamp-2">{videoOfDay.title}</p>
                </div>
              </button>
            )}

            <div>
              <p className="text-sm font-medium">{videoOfDay.title}</p>
              {videoOfDay.summary && <p className="text-xs text-muted-foreground mt-0.5">{videoOfDay.summary}</p>}
              <Badge variant="outline" className="text-[10px] capitalize mt-1">{videoOfDay.category}</Badge>
            </div>

            {!isWatched ? (
              <Button
                onClick={handleMarkWatched}
                disabled={marking}
                className="w-full gap-2"
                variant="outline"
              >
                {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {marking ? "Menyimpan..." : "Tandai Sudah Ditonton (+5 poin)"}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Video sudah ditonton hari ini
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}