import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/exportUtils";

/**
 * Reusable Export button for any entity list
 * @param {object[]} data - Array of records to export
 * @param {string} filename - Base filename (no extension)
 * @param {string} title - Display title for PDF header
 * @param {{key: string, label: string}[]} columns - Column definitions
 */
export default function ExportButton({ data, filename, title, columns }) {
  const [loading, setLoading] = useState(false);

  const handleCSV = () => {
    setLoading(true);
    exportToCSV(data, filename, columns);
    setLoading(false);
  };

  const handlePDF = () => {
    setLoading(true);
    exportToPDF(data, filename, columns, title);
    setLoading(false);
  };

  if (!data || data.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={loading}>
          <Download className="w-4 h-4" />
          Export ({data.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCSV} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-4 h-4 text-green-600" />
          Export Excel (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePDF} className="gap-2 cursor-pointer">
          <FileText className="w-4 h-4 text-red-600" />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}