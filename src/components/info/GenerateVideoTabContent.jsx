import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Youtube, Trash2, Sparkles, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const TOPICS = [
  { label: "Perawatan Harian", query: "cara merawat sulcata tortoise harian", category: "dasar" },
  { label: "Pakan Terbaik", query: "pakan terbaik sulcata tortoise", category: "pakan" },
  { label: "Setup Kandang", query: "setup kandang sulcata ideal", category: "kandang" },
  { label: "Tanda Sakit", query: "tanda sulcata sakit dan penanganannya", category: "kesehatan" },
  { label: "Soak & Mandi", query: "cara mandi dan soak sulcata", category: "kesehatan" },
  { label: "Breeding", query: "breeding sulcata tortoise pemula", category: "breeding" },
  { label: "Baby Sulcata", query: "merawat baby sulcata tortoise", category: "dasar" },
];

export default function GenerateVideoTabContent() {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(null); // topic label yang sedang di-generate
  const [deleting, setDeleting] = useState(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["tutorials-generated-videos"],
    queryFn: () => base44.entities.TutorialContent.filter({ type: "video", is_published: true }),
  });

  const handleGenerate = async (topic) => {
    setGenerating(topic.label);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Carikan 1 video YouTube edukatif terbaik tentang: "${topic.query}" untuk peternak sulcata tortoise profesional.
Kembalikan JSON dengan field: title (string, judul video), youtube_url (URL YouTube lengkap dan valid, format: https://www.youtube.com/watch?v=XXXXXXXXXXX), summary (1 kalimat singkat bahasa Indonesia menjelaskan isi video), category ("${topic.category}").
Pastikan youtube_url valid dan merupakan URL YouTube nyata.`,
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
      await base44.entities.TutorialContent.create({
        title: result.title,
        type: "video",
        category: result.category || topic.category,
        summary: result.summary || "",
        video_url: result.youtube_url,
        is_published: true,
      });
      qc.invalidateQueries({ queryKey: ["tutorials-generated-videos"] });
      qc.invalidateQueries({ queryKey: ["tutorials"] });
      qc.invalidateQueries({ queryKey: ["tutorials-video"] });
    }
    setGenerating(null);
  };

  const handleGenerateAll = async () => {
    for (const topic of TOPICS) {
      await handleGenerate(topic);
    }
  };

  const handleDelete = async (video) => {
    if (!confirm(`Hapus video "${video.title}"?`)) return;
    setDeleting(video.id);
    await base44.entities.TutorialContent.delete(video.id);
    qc.invalidateQueries({ queryKey: ["tutorials-generated-videos"] });
    qc.invalidateQueries({ queryKey: ["tutorials"] });
    qc.invalidateQueries({ queryKey: ["tutorials-video"] });
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      {/* Penjelasan */}
      <Card className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <div className="flex items-start gap-3">
          <Youtube className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Auto Generate Video YouTube dengan AI</p>
            <p className="text-xs text-muted-foreground mt-1">
              AI akan mencari video YouTube terbaik untuk setiap tema perawatan sulcata. 
              Video yang di-generate akan masuk ke SOP harian feeder sebagai konten wajib tonton.
            </p>
          </div>
        </div>
      </Card>

      {/* Generate per topik */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Generate per Tema</h3>
          <Button
            size="sm"
            onClick={handleGenerateAll}
            disabled={!!generating}
            className="gap-1.5"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate Semua Tema
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {TOPICS.map((topic) => (
            <Card key={topic.label} className="p-4 space-y-3">
              <div>
                <p className="font-medium text-sm">{topic.label}</p>
                <Badge variant="outline" className="text-[10px] capitalize mt-1">{topic.category}</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => handleGenerate(topic)}
                disabled={!!generating}
              >
                {generating === topic.label
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Mencari...</>
                  : <><Youtube className="w-3 h-3 text-red-600" /> Generate</>
                }
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Daftar video yang sudah ada */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Video Tersimpan ({videos.length})</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : videos.length === 0 ? (
          <Card className="py-12 text-center text-muted-foreground text-sm">
            <Youtube className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Belum ada video. Klik "Generate" untuk menambahkan.
          </Card>
        ) : (
          <div className="space-y-2">
            {videos.map((v) => (
              <Card key={v.id} className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <PlayCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px] capitalize">{v.category}</Badge>
                    {v.summary && <p className="text-xs text-muted-foreground truncate">{v.summary}</p>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive flex-shrink-0"
                  onClick={() => handleDelete(v)}
                  disabled={deleting === v.id}
                >
                  {deleting === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}