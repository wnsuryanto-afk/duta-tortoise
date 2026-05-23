import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Search, Filter, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { useCurrentUser } from "@/lib/useCurrentUser";

const actionColors = {
  create: "bg-green-100 text-green-700 border-green-300",
  update: "bg-blue-100 text-blue-700 border-blue-300",
  delete: "bg-red-100 text-red-700 border-red-300",
  login: "bg-purple-100 text-purple-700 border-purple-300",
  logout: "bg-gray-100 text-gray-700 border-gray-300",
};

const entityIcons = {
  Tortoise: "🐢",
  Breeding: "🥚",
  Sale: "💰",
  Enclosure: "🏠",
  HealthRecord: "🏥",
  UserProfile: "👤",
  FinanceTransaction: "💵",
  Kasbon: "📝",
  Attendance: "✅",
};

export default function ActivityLogPage() {
  const { role } = useCurrentUser();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("semua");
  const [entityFilter, setEntityFilter] = useState("semua");
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: () => base44.entities.ActivityLog.list("-timestamp", 500),
  });

  const entityTypes = [...new Set(logs.map(l => l.entity_type))].filter(Boolean);

  const filtered = logs.filter(log => {
    const matchSearch = !search || 
      log.entity_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === "semua" || log.action === actionFilter;
    const matchEntity = entityFilter === "semua" || log.entity_type === entityFilter;
    return matchSearch && matchAction && matchEntity;
  });

  const stats = {
    total: logs.length,
    create: logs.filter(l => l.action === "create").length,
    update: logs.filter(l => l.action === "update").length,
    delete: logs.filter(l => l.action === "delete").length,
  };

  if (role !== "owner") {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p className="text-lg font-medium">🔒 Akses Terbatas</p>
        <p className="text-sm mt-1">Halaman ini hanya dapat diakses oleh Owner</p>
        <p className="text-xs mt-2 text-muted-foreground/60">Hubungi Owner jika Anda memerlukan akses</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Riwayat Aktivitas</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor semua aktivitas penting di sistem</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Aktivitas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.create}</p>
            <p className="text-xs text-muted-foreground mt-1">Create</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.update}</p>
            <p className="text-xs text-muted-foreground mt-1">Update</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.delete}</p>
            <p className="text-xs text-muted-foreground mt-1">Delete</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari user, entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Aksi</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Entity</SelectItem>
            {entityTypes.map(type => (
              <SelectItem key={type} value={type}>
                {entityIcons[type] || "📄"} {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Activity Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Belum ada aktivitas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((log, index) => (
            <Card
              key={log.id || index}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedLog(log)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg">
                      {entityIcons[log.entity_type] || "📄"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={actionColors[log.action] || "bg-gray-100"}>
                          {log.action.toUpperCase()}
                        </Badge>
                        <span className="font-semibold text-sm">{log.entity_name}</span>
                        <span className="text-xs text-muted-foreground">({log.entity_type})</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <User className="w-3 h-3 inline mr-1" />
                        {log.user_name || log.user_email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {log.timestamp ? format(new Date(log.timestamp), "dd MMM yyyy, HH:mm") : "-"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <Eye className="w-4 h-4 mr-1" />
                    Detail
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Detail Aktivitas
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Aksi</p>
                  <Badge variant="outline" className={actionColors[selectedLog.action]}>
                    {selectedLog.action.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Entity Type</p>
                  <p className="font-medium">{selectedLog.entity_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Entity Name</p>
                  <p className="font-medium">{selectedLog.entity_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Entity ID</p>
                  <p className="font-mono text-xs">{selectedLog.entity_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">User</p>
                  <p className="font-medium">{selectedLog.user_name || selectedLog.user_email}</p>
                  <p className="text-xs text-muted-foreground">{selectedLog.user_email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Waktu</p>
                  <p className="font-medium">
                    {selectedLog.timestamp ? format(new Date(selectedLog.timestamp), "dd MMM yyyy, HH:mm:ss") : "-"}
                  </p>
                </div>
              </div>

              {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Perubahan
                  </p>
                  <ScrollArea className="h-64 border rounded-lg p-3 bg-muted/30">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedLog.notes && (
                <div>
                  <p className="text-sm font-semibold mb-1">Catatan</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.notes}</p>
                </div>
              )}

              {selectedLog.ip_address && (
                <div>
                  <p className="text-sm font-semibold mb-1">IP Address</p>
                  <p className="text-sm font-mono">{selectedLog.ip_address}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}