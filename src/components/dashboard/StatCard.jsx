import { Card } from "@/components/ui/card";

export default function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="p-5 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-heading font-bold mt-2">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${color} opacity-60`} />
    </Card>
  );
}