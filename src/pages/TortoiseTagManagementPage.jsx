import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Tag, X, Search, AlertCircle } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/useCurrentUser";

const DEFAULT_TAGS = [
  { name: "Indukan Premium", color: "#FFD700", icon: "🌟", description: "Tortoise indukan berkualitas tinggi" },
  { name: "Akan Dijual", color: "#22C55E", icon: "💰", description: "Siap untuk dijual" },
  { name: "Perlu Treatment", color: "#EF4444", icon: "🏥", description: "Memerlukan perawatan kesehatan" },
  { name: "Favorit Owner", color: "#EC4899", icon: "❤️", description: "Favorit pemilik" },
  { name: "Tidak Untuk Dijual", color: "#6B7280", icon: "🚫", description: "Tidak tersedia untuk dijual" },
  { name: "Pendatang Baru", color: "#3B82F6", icon: "🆕", description: "Baru masuk koleksi" },
  { name: "Juara Kontes", color: "#A855F7", icon: "🏆", description: "Pemenang kontes" }
];

export default function TortoiseTagManagementPage() {
  const { user } = useCurrentUser();
  const [showTagForm, setShowTagForm] = useState(false);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedTortoises, setSelectedTortoises] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTag, setFilterTag] = useState("");

  const queryClient = useQueryClient();

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => base44.entities.TortoiseTag.filter({ is_active: true }),
    initialData: [],
  });

  const { data: tortoises } = useQuery({
    queryKey: ['tortoises-all'],
    queryFn: () => base44.entities.Tortoise.list(),
    initialData: [],
  });

  const createTagMutation = useMutation({
    mutationFn: (data) => base44.entities.TortoiseTag.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setShowTagForm(false);
      toast.success("Tag berhasil ditambahkan");
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: (id) => base44.entities.TortoiseTag.update(id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast.success("Tag berhasil dihapus");
    },
  });

  const bulkAddTagMutation = useMutation({
    mutationFn: async ({ tortoiseIds, tagName }) => {
      const promises = tortoiseIds.map(async (id) => {
        const tortoise = tortoises.find(t => t.id === id);
        const currentTags = tortoise.tags || [];
        if (!currentTags.includes(tagName)) {
          currentTags.push(tagName);
          await base44.entities.Tortoise.update(id, { tags: currentTags });
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tortoises'] });
      setShowBulkTag(false);
      setSelectedTortoises([]);
      toast.success(`Tag ditambahkan ke ${selectedTortoises.length} tortoise`);
    },
  });

  const removeTagFromTortoiseMutation = useMutation({
    mutationFn: async ({ tortoiseId, tagName }) => {
      const tortoise = tortoises.find(t => t.id === tortoiseId);
      const currentTags = tortoise.tags || [];
      const newTags = currentTags.filter(t => t !== tagName);
      await base44.entities.Tortoise.update(tortoiseId, { tags: newTags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tortoises'] });
      toast.success("Tag dihapus dari tortoise");
    },
  });

  const handleBulkAddTag = (tagName) => {
    bulkAddTagMutation.mutate({ tortoiseIds: selectedTortoises, tagName });
  };

  const handleRemoveTag = (tortoiseId, tagName) => {
    removeTagFromTortoiseMutation.mutate({ tortoiseId, tagName });
  };

  const filteredTortoises = tortoises.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       t.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTag = !filterTag || (t.tags && t.tags.includes(filterTag));
    return matchSearch && matchTag;
  });

  const allTags = [...new Set([...DEFAULT_TAGS.map(t => t.name), ...tags.map(t => t.name)])];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Manajemen Tag</h1>
          <p className="text-muted-foreground">Kelola tag untuk kategorisasi tortoise</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkTag(true)} disabled={selectedTortoises.length === 0}>
            <Tag className="w-4 h-4 mr-2" />
            Bulk Tag ({selectedTortoises.length})
          </Button>
          <Dialog open={showTagForm} onOpenChange={setShowTagForm}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Tag Baru
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Tag Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                createTagMutation.mutate({
                  name: formData.get('name'),
                  color: formData.get('color'),
                  description: formData.get('description'),
                  icon: formData.get('icon'),
                  created_by: user?.email,
                  is_active: true
                });
              }} className="space-y-4">
                <div>
                  <Label>Nama Tag</Label>
                  <Input name="name" required placeholder="e.g., Premium" />
                </div>
                <div>
                  <Label>Warna (Hex)</Label>
                  <Input name="color" type="color" defaultValue="#FFD700" />
                </div>
                <div>
                  <Label>Icon (Emoji)</Label>
                  <Input name="icon" placeholder="e.g., 🌟" />
                </div>
                <div>
                  <Label>Deskripsi</Label>
                  <Input name="description" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowTagForm(false)}>Batal</Button>
                  <Button type="submit">Simpan</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Cari tortoise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          className="p-2 border rounded"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
        >
          <option value="">Semua Tag</option>
          {allTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Daftar Tag</h2>
        <div className="flex flex-wrap gap-2">
          {DEFAULT_TAGS.map(tag => (
            <Badge
              key={tag.name}
              className="cursor-pointer hover:opacity-80"
              style={{ backgroundColor: tag.color, color: '#fff' }}
              onClick={() => setFilterTag(tag.name)}
            >
              {tag.icon} {tag.name}
            </Badge>
          ))}
          {tags.map(tag => (
            <Badge
              key={tag.id}
              className="cursor-pointer hover:opacity-80 relative group"
              style={{ backgroundColor: tag.color, color: '#fff' }}
              onClick={() => setFilterTag(tag.name)}
            >
              {tag.icon} {tag.name}
              <X
                className="w-3 h-3 ml-2 cursor-pointer opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTagMutation.mutate(tag.id);
                }}
              />
            </Badge>
          ))}
        </div>
      </div>

      {filteredTortoises.length === 0 ? (
        <EmptyState
          title="Tidak Ada Tortoise"
          description="Tidak ada tortoise yang sesuai dengan filter"
          icon={AlertCircle}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTortoises.map(tortoise => (
            <Card key={tortoise.id} className="cursor-pointer hover:shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{tortoise.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{tortoise.code}</p>
                  </div>
                  <Checkbox
                    checked={selectedTortoises.includes(tortoise.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTortoises([...selectedTortoises, tortoise.id]);
                      } else {
                        setSelectedTortoises(selectedTortoises.filter(id => id !== tortoise.id));
                      }
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tortoise.tags?.map(tagName => {
                    const tagDef = DEFAULT_TAGS.find(t => t.name === tagName) || tags.find(t => t.name === tagName);
                    return tagDef ? (
                      <Badge
                        key={tagName}
                        className="text-xs cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: tagDef.color, color: '#fff' }}
                        onClick={() => handleRemoveTag(tortoise.id, tagName)}
                        title="Klik untuk hapus"
                      >
                        {tagDef.icon} {tagName}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showBulkTag && (
        <Dialog open={showBulkTag} onOpenChange={() => setShowBulkTag(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Tag ke {selectedTortoises.length} Tortoise</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Pilih tag yang ingin ditambahkan:</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tagName => {
                  const tagDef = DEFAULT_TAGS.find(t => t.name === tagName) || tags.find(t => t.name === tagName);
                  return (
                    <Badge
                      key={tagName}
                      className="cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: tagDef?.color || '#ccc', color: '#fff' }}
                      onClick={() => handleBulkAddTag(tagName)}
                    >
                      {tagDef?.icon} {tagName}
                    </Badge>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowBulkTag(false)}>Tutup</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}